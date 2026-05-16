import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  DEFAULT_GEMINI_OCR_MODEL,
  resolveGeminiApiKey,
  resolveGeminiOcrModel,
} from "@/lib/ai/geminiEnv";
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

  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "尚未設定 Gemini API 金鑰。請在 .env.local 或 Vercel 設定 GEMINI_API_KEY（或 Google 官方範例用的 GOOGLE_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY），然後重新部署。",
      },
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
  const modelName = resolveGeminiOcrModel();
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
    const msg = String(e?.message ?? "未知");
    const invalidKey =
      /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|REQUEST_DENIED/i.test(msg) ||
      (/400 Bad Request/i.test(msg) && /api\s*key|API_KEY|API key/i.test(msg));
    if (invalidKey) {
      return NextResponse.json(
        {
          error:
            "Gemini 拒絕咗你而家部伺服器用到嘅 API 金鑰（API_KEY_INVALID）——呢個唔係「睇唔到張相」，係 Google 喺呼叫模型之前就已經擋咗個 key。\n\n" +
            "請逐項檢查：\n" +
            "1) Vercel → Settings → Environment Variables：變數名要係 GEMINI_API_KEY（或試 GOOGLE_API_KEY），值要同 AI Studio 複製嘅完全一致；**Production** 同你實際瀏覽嘅環境（Preview / Development）都要有，改完要 **Redeploy**。\n" +
            "2) 金鑰來源：https://aistudio.google.com/apikey 建立嘅 **API key**（唔係 OAuth Client Secret、唔係 Vertex service account JSON）。\n" +
            "3) 若你喺 Google Cloud Console 改過呢個 key：**應用程式限制** 請設「無」；純 **HTTP 網站** 限制會令 Vercel 伺服器端呼叫失敗。**API 限制** 要包含 **Generative Language API**，或暫時設「不要限制」。\n" +
            "4) 本機測試：喺專案根目錄 `vercel env pull .env.vercel` 再對照 `.env.local`，確認冇多餘引號、空格或換行。",
        },
        { status: 502 },
      );
    }
    if (/NOT_FOUND|not found|does not exist|Unsupported model/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            `Gemini 模型「${modelName}」唔可用或已改名。請喺 Vercel / .env.local 設定 GEMINI_OCR_MODEL（例如 ${DEFAULT_GEMINI_OCR_MODEL}），或改用官方文件列出嘅模型 ID，然後重新部署。原始錯誤：${msg}`,
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Gemini 呼叫失敗：" + msg }, { status: 502 });
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
