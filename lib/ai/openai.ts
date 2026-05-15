import OpenAI from "openai";

/** Some new OpenAI models (o-series, gpt-5) reject custom temperature. */
export function modelAllowsCustomTemperature(model: string): boolean {
  const base = model.trim().toLowerCase().split("/").pop() ?? model;
  if (/^o[134]/.test(base)) return false;
  if (/^gpt-5/.test(base)) return false;
  return true;
}

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export function getTextModel() {
  return process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini";
}

export function getImageModel() {
  return process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
}
