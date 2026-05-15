import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { GEMINI_OCR_INSTRUCTION } from "@/lib/ai/prompts/geminiOcrPrompt";
import { OCRResultSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUPPORTED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "尚未設定 GEMINI_API_KEY。" },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "請上傳一張圖片。" }, { status: 400 });
  }
  const mimeType = (file as File).type || "image/jpeg";
  if (!SUPPORTED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: `不支援的圖片格式：${mimeType}` },
      { status: 400 },
    );
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "圖片太大（上限 8MB）。" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // 1. Save the raw image to private storage so the user can revisit it.
  const service = createSupabaseServiceClient();
  const ext = mimeType.split("/")[1] || "bin";
  const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: uploadErr } = await service.storage
    .from("ocr-uploads")
    .upload(storagePath, buf, { contentType: mimeType, upsert: false });
  if (uploadErr) {
    return NextResponse.json(
      { error: "圖片儲存失敗：" + uploadErr.message },
      { status: 500 },
    );
  }

  // 2. Call Gemini
  const genai = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_OCR_MODEL || "gemini-2.0-flash";
  const model = genai.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });

  let raw = "";
  try {
    const result = await model.generateContent([
      GEMINI_OCR_INSTRUCTION,
      { inlineData: { data: buf.toString("base64"), mimeType } },
    ]);
    raw = result.response.text();
  } catch (e: any) {
    return NextResponse.json(
      { error: "Gemini 呼叫失敗：" + (e?.message ?? "未知") },
      { status: 502 },
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Gemini 回傳格式錯誤。", raw },
      { status: 502 },
    );
  }

  const validated = OCRResultSchema.safeParse(json);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Gemini 輸出格式驗證失敗：" + validated.error.issues[0]?.message, raw: json },
      { status: 502 },
    );
  }

  // 3. Persist the unconfirmed import for user review.
  const { data: ocr, error: ocrErr } = await service
    .from("ocr_imports")
    .insert({
      user_id: user.id,
      image_storage_path: storagePath,
      raw_gemini_response: { text: raw },
      extracted_json: validated.data,
      confirmed: false,
    })
    .select("id")
    .single();

  if (ocrErr) {
    return NextResponse.json(
      { error: "OCR 結果儲存失敗：" + ocrErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ocrId: ocr.id,
    title: validated.data.title,
    items: validated.data.items,
  });
}
