import OpenAI from "openai";
import {
  VocabularyMemoryPlanningSchema,
  type VocabularyMemoryPlanning,
} from "@/lib/ai/schemas/vocabularyMemoryPlanning";
import {
  buildVocabularyMemoryPlanningPrompt,
  buildVocabularyMemoryPlanningRepairPrompt,
} from "@/lib/ai/prompts/vocabularyMemoryPlanningPrompt";
import { getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";
import { validateVocabularyMemoryPlanning } from "@/lib/vocabularyMemory/validatePlanning";
import type { VocabPlanningInputItem } from "@/lib/ai/prompts/vocabularyMemoryPlanningPrompt";

function tryParseJson(raw: string): unknown {
  const t = raw.trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(t.slice(start, end + 1));
    }
    throw new Error("not json");
  }
}

async function callPlanningModel(
  openai: InstanceType<typeof OpenAI>,
  userContent: string,
): Promise<{ raw: string; parsed: VocabularyMemoryPlanning }> {
  const model = getTextModel();
  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    ...(modelAllowsCustomTemperature(model) ? { temperature: 0.45 } : {}),
    messages: [
      {
        role: "system",
        content:
          "You output ONLY strict JSON (no markdown fences, no commentary). Follow the user's requested JSON shape exactly.",
      },
      { role: "user", content: userContent },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  let json: unknown;
  try {
    json = tryParseJson(raw);
  } catch {
    throw new Error("AI 輸出不是有效 JSON。");
  }
  const validated = VocabularyMemoryPlanningSchema.safeParse(json);
  if (!validated.success) {
    throw new Error("AI 輸出結構驗證失敗：" + validated.error.issues[0]?.message);
  }
  return { raw, parsed: validated.data };
}

export async function runVocabularyMemoryPlanning(opts: {
  openai: InstanceType<typeof OpenAI>;
  items: VocabPlanningInputItem[];
  topicHint?: string | null;
  expectedJapaneseWords: string[];
}): Promise<{ planning: VocabularyMemoryPlanning; raw: string }> {
  const primary = await callPlanningModel(
    opts.openai,
    buildVocabularyMemoryPlanningPrompt(opts.items, opts.topicHint),
  );
  let planning = primary.parsed;
  let raw = primary.raw;

  let v = validateVocabularyMemoryPlanning(planning, opts.expectedJapaneseWords);
  if (!v.ok) {
    const repairContent = buildVocabularyMemoryPlanningRepairPrompt({
      expectedWords: opts.expectedJapaneseWords,
      previousJson: planning,
      validationErrors: v.errors,
    });
    const repaired = await callPlanningModel(opts.openai, repairContent);
    planning = repaired.parsed;
    raw = repaired.raw;
    v = validateVocabularyMemoryPlanning(planning, opts.expectedJapaneseWords);
    if (!v.ok) {
      throw new Error("規劃驗證仍失敗：" + v.errors.join("；"));
    }
  }

  return { planning, raw };
}
