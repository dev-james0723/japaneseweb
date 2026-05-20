import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveGeminiApiKey } from "@/lib/ai/geminiEnv";

const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";

export function resolveGeminiTextModel(): string {
  const raw = (process.env.GEMINI_TEXT_MODEL ?? "").trim();
  return raw || DEFAULT_TEXT_MODEL;
}

export function stripJsonFences(text: string): string {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return s;
}

export async function geminiGenerateJson(prompt: string, temperature = 0.7): Promise<string> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_NOT_SET");
  }
  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({
    model: resolveGeminiTextModel(),
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
    },
  });
  const result = await model.generateContent(prompt);
  return stripJsonFences(result.response.text());
}
