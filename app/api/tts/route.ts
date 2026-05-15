import { NextResponse } from "next/server";
import { z } from "zod";
import { PollyClient, SynthesizeSpeechCommand, type Engine } from "@aws-sdk/client-polly";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { ttsCacheKey } from "@/lib/hash";

const BodySchema = z.object({
  text: z.string().min(1).max(2000),
  voiceId: z.string().max(40).optional(),
  languageCode: z.string().max(20).optional(),
});

const NEURAL_JA_VOICES = new Set(["Kazuha", "Tomoko"]);

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "輸入錯誤" }, { status: 400 });
  }

  // Look up user voice preference if not specified.
  let voiceId: string;
  if (parsed.data.voiceId) {
    voiceId = parsed.data.voiceId;
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_voice")
      .eq("id", user.id)
      .maybeSingle();
    voiceId = profile?.preferred_voice ?? process.env.AWS_POLLY_VOICE_ID ?? "Takumi";
  }
  const languageCode = parsed.data.languageCode ?? "ja-JP";

  const provider = "polly";
  const { normalized, hash } = ttsCacheKey({
    text: parsed.data.text,
    provider,
    voiceId,
    languageCode,
  });

  const service = createSupabaseServiceClient();

  // 1. Check cache
  const { data: cached } = await service
    .from("tts_audio_cache")
    .select("id, audio_url, storage_path, access_count")
    .eq("text_hash", hash)
    .eq("voice_id", voiceId)
    .eq("language_code", languageCode)
    .eq("provider", provider)
    .maybeSingle();

  if (cached?.audio_url) {
    await service
      .from("tts_audio_cache")
      .update({
        access_count: (cached.access_count ?? 0) + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq("id", cached.id);
    return NextResponse.json({ url: cached.audio_url, cached: true });
  }

  // 2. Synthesize with Polly
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    return NextResponse.json(
      { error: "尚未設定 AWS Polly 環境變數（AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION）。" },
      { status: 503 },
    );
  }

  const polly = new PollyClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const engine: Engine = NEURAL_JA_VOICES.has(voiceId) ? "neural" : "standard";

  let audioBytes: Uint8Array;
  try {
    const result = await polly.send(
      new SynthesizeSpeechCommand({
        Text: normalized,
        VoiceId: voiceId as any,
        LanguageCode: languageCode as any,
        OutputFormat: "mp3",
        Engine: engine,
        TextType: "text",
      }),
    );
    if (!result.AudioStream) {
      return NextResponse.json({ error: "Polly 未回傳音訊。" }, { status: 502 });
    }
    audioBytes = await result.AudioStream.transformToByteArray();
  } catch (e: any) {
    return NextResponse.json(
      { error: "Polly 呼叫失敗：" + (e?.message ?? "未知") },
      { status: 502 },
    );
  }

  // 3. Upload to Supabase Storage
  const storagePath = `${hash.slice(0, 2)}/${hash}-${voiceId}.mp3`;
  const { error: uploadErr } = await service.storage
    .from("tts-audio")
    .upload(storagePath, audioBytes, {
      contentType: "audio/mpeg",
      upsert: true,
    });
  if (uploadErr) {
    return NextResponse.json(
      { error: "音訊儲存失敗：" + uploadErr.message },
      { status: 500 },
    );
  }
  const { data: pub } = service.storage.from("tts-audio").getPublicUrl(storagePath);

  // 4. Persist cache row
  await service.from("tts_audio_cache").upsert(
    {
      user_id: user.id,
      text: parsed.data.text,
      normalized_text: normalized,
      text_hash: hash,
      provider,
      voice_id: voiceId,
      language_code: languageCode,
      storage_path: storagePath,
      audio_url: pub.publicUrl,
      access_count: 1,
      last_accessed_at: new Date().toISOString(),
    },
    { onConflict: "text_hash,voice_id,language_code,provider" },
  );

  return NextResponse.json({ url: pub.publicUrl, cached: false });
}
