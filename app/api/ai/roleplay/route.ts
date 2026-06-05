import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI, getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";
import { recordOutputCorrections, type GrammarDoctorResult } from "@/lib/output/grammarDoctor";
import { completeLatestDailyOutputPrompt } from "@/lib/output/dailyOutputPrompts";
import { refreshSkillRadarSnapshot, type SkillRadarRefreshResult } from "@/lib/learning/skillRadar";
import { todayDateString } from "@/lib/os/types";

export const runtime = "nodejs";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const ROLEPLAY_PERSONA_IDS = [
  "mission-default",
  "tokyo-friend",
  "sensei",
  "konbini",
  "senpai",
  "examiner",
] as const;

type RoleplayPersonaId = (typeof ROLEPLAY_PERSONA_IDS)[number];

const ROLEPLAY_PERSONAS: Record<RoleplayPersonaId, {
  label: string;
  partnerRole: string;
  register: string;
  speechPace: string;
  correctionStyle: string;
  hintStyle: string;
  missionPressure: string;
}> = {
  "mission-default": {
    label: "Mission default",
    partnerRole: "場景對手",
    register: "follow the selected Can-Do scenario",
    speechPace: "normal learner-paced",
    correctionStyle: "correct only the most useful error",
    hintStyle: "give one practical next line",
    missionPressure: "medium",
  },
  "tokyo-friend": {
    label: "Tokyo Friend",
    partnerRole: "東京の友だち",
    register: "casual, warm, natural spoken Japanese",
    speechPace: "relaxed and conversational",
    correctionStyle: "light correction after replying naturally",
    hintStyle: "offer friend-like phrasing and everyday alternatives",
    missionPressure: "low",
  },
  sensei: {
    label: "Japanese Sensei",
    partnerRole: "日本語の先生",
    register: "clear classroom Japanese with precise Cantonese explanations",
    speechPace: "slow and structured",
    correctionStyle: "strictly identify grammar, particle, register, or word-choice errors",
    hintStyle: "give a model sentence plus the reason it works",
    missionPressure: "medium",
  },
  konbini: {
    label: "Konbini Staff",
    partnerRole: "コンビニ店員",
    register: "polite service Japanese with short realistic turns",
    speechPace: "brisk but simple",
    correctionStyle: "focus on survival clarity and polite set phrases",
    hintStyle: "suggest the next transactional phrase",
    missionPressure: "medium-high",
  },
  senpai: {
    label: "Work Senpai",
    partnerRole: "会社の先輩",
    register: "workplace Japanese, soft hierarchy, practical politeness",
    speechPace: "measured and pragmatic",
    correctionStyle: "prioritize register, hedging, and natural business phrasing",
    hintStyle: "offer a safer professional phrasing",
    missionPressure: "medium-high",
  },
  examiner: {
    label: "JLPT Examiner",
    partnerRole: "JLPT 試験官",
    register: "examiner-style neutral Japanese",
    speechPace: "concise and controlled",
    correctionStyle: "score-focused correction tied to task criteria",
    hintStyle: "give minimal scaffolding; keep pressure on output",
    missionPressure: "high",
  },
};

const BodySchema = z.object({
  sessionId: z.string().uuid().nullable().optional(),
  missionId: z.string().max(120).optional(),
  personaId: z.enum(ROLEPLAY_PERSONA_IDS).default("mission-default"),
  scenario: z.string().max(300),
  partnerRole: z.string().max(100).default("店員"),
  difficulty: z.enum(["N5", "N4", "N3", "N2", "N1"]).default("N4"),
  canDo: z.string().max(400).optional(),
  successCriteria: z.array(z.string().max(140)).max(6).default([]),
  requiredPhrases: z.array(z.string().max(80)).max(8).default([]),
  history: z.array(MessageSchema).max(40),
});

const RoleplayReplySchema = z.object({
  reply_ja: z.string().default(""),
  kana: z.string().default(""),
  translation_zh: z.string().default(""),
  correction: z.object({
    original: z.string(),
    corrected: z.string(),
    explanation_zh: z.string(),
  }).nullable().default(null),
  suggestion_ja: z.string().nullable().default(null),
  suggestion_zh: z.string().nullable().default(null),
  task_complete: z.boolean().default(false),
  rubric: z.array(z.object({
    criterion: z.string(),
    passed: z.boolean(),
    evidence_zh: z.string(),
  })).default([]),
  reusable_patterns: z.array(z.string()).default([]),
  next_assignment: z.string().nullable().default(null),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "未登入。" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤。" }, { status: 400 });

  const openai = getOpenAI();
  if (!openai) return NextResponse.json({ error: "未設定 OPENAI_API_KEY。" }, { status: 500 });

  const {
    sessionId,
    missionId,
    personaId,
    scenario,
    partnerRole,
    difficulty,
    canDo,
    successCriteria,
    requiredPhrases,
    history,
  } = parsed.data;
  const persona = ROLEPLAY_PERSONAS[personaId];
  const effectivePartnerRole = partnerRole.trim() || persona.partnerRole;
  const weaknessProfile = await fetchRoleplayWeaknessProfile({
    supabase,
    userId: user.id,
  });
  if (weaknessProfile.error) {
    console.error("[roleplay] weakness profile:", weaknessProfile.error);
  }

  let roleplaySessionId = sessionId ?? null;
  if (roleplaySessionId) {
    const { data: existingSession, error: existingSessionError } = await supabase
      .from("roleplay_sessions")
      .select("id")
      .eq("id", roleplaySessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingSessionError) {
      console.error("[roleplay] session lookup:", existingSessionError.message);
      roleplaySessionId = null;
    } else if (!existingSession?.id) {
      roleplaySessionId = null;
    }
  }

  if (!roleplaySessionId) {
    const { data: createdSession, error: createSessionError } = await supabase
      .from("roleplay_sessions")
      .insert({
        user_id: user.id,
        mission_id: missionId ?? null,
        scenario,
        partner_role: effectivePartnerRole,
        persona_id: personaId,
        difficulty,
        can_do: canDo ?? null,
      })
      .select("id")
      .single();
    if (createSessionError) {
      console.error("[roleplay] session create:", createSessionError.message);
    } else {
      roleplaySessionId = createdSession.id;
    }
  } else {
    const { error: updateSessionError } = await supabase
      .from("roleplay_sessions")
      .update({
        scenario,
        partner_role: effectivePartnerRole,
        persona_id: personaId,
        difficulty,
        can_do: canDo ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roleplaySessionId)
      .eq("user_id", user.id);
    if (updateSessionError) {
      console.error("[roleplay] session persona update:", updateSessionError.message);
    }
  }

  const system = `你係日文 roleplay 對話伙伴。
- Scenario: ${scenario}
- Persona: ${persona.label} (${personaId})
- 你嘅角色: ${effectivePartnerRole}
- 學生程度: JLPT ${difficulty} (香港人，母語廣東話)
- Can-Do 任務: ${canDo ?? "完成場景內的實用溝通"}
- 成功條件: ${successCriteria.length ? successCriteria.map((criterion, index) => `${index + 1}. ${criterion}`).join(" / ") : "按場景自然完成任務"}
- 必用/建議句型: ${requiredPhrases.length ? requiredPhrases.join("、") : "無"}
- Persona 行為:
  - Register: ${persona.register}
  - Speech pace: ${persona.speechPace}
  - Correction style: ${persona.correctionStyle}
  - Hint style: ${persona.hintStyle}
  - Mission pressure: ${persona.missionPressure}
- Learner weakness memory（最近輸出／review 錯誤）:
${weaknessProfile.focusLines.length ? weaknessProfile.focusLines.map((line) => `  - ${line}`).join("\n") : "  - 暫時無可用弱點記錄；按場景和 Can-Do 任務自然調整。"}
- Weakness 使用規則:
  1. 每輪自然引出最多 1 個 weakness focus，不要硬塞所有弱點。
  2. 如果學生犯到 memory 入面嘅弱點，correction 要直接點名該 pattern / skill，並用廣東話解釋。
  3. 如果學生無犯錯，就用 suggestion_ja 輕輕引導下一句練到其中一個弱點。
- 規則:
  1. 每次回應只輸出 strict JSON，schema:
     {"reply_ja": string, "kana": string, "translation_zh": string, "correction": null | {"original": string, "corrected": string, "explanation_zh": string}, "suggestion_ja": string | null, "suggestion_zh": string | null, "task_complete": boolean, "rubric": [{"criterion": string, "passed": boolean, "evidence_zh": string}], "reusable_patterns": string[], "next_assignment": string | null}
  2. reply_ja: 你嘅日文回應，控制喺 ${difficulty} 程度，一句到兩句
  3. kana: reply_ja 全句假名 reading
  4. translation_zh: 繁體中文翻譯
  5. correction: 如果學生上一句有錯（語法／助詞／用詞／敬語），列出修正；否則 null
  6. suggestion_ja: 建議學生下一步可以點答嘅 sample（${difficulty} 程度），或 null
  7. suggestion_zh: suggestion 嘅中文意思
  8. task_complete: 根據成功條件判斷學生是否已完成任務；不要因為只講一句就過早判定完成
  9. rubric: 對每個成功條件回傳 passed 和簡短廣東話/繁中 evidence
  10. reusable_patterns: 從本輪對話抽 1-3 個可重用日文句型
  11. next_assignment: 未完成時給下一句要做甚麼；完成時給一個延伸任務
- 對話保持自然友善，鼓勵學生繼續講`;

  const messages = [
    { role: "system" as const, content: system },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const model = getTextModel();
  let raw = "";
  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      ...(modelAllowsCustomTemperature(model) ? { temperature: 0.7 } : {}),
      messages,
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知";
    return NextResponse.json({ error: "AI 呼叫失敗：" + msg }, { status: 500 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "AI 輸出格式錯誤。", raw }, { status: 500 });
  }

  const reply = RoleplayReplySchema.safeParse(parsedJson);
  if (!reply.success) {
    return NextResponse.json({ error: "AI 輸出驗證失敗。", raw }, { status: 500 });
  }

  let grammarDoctor: GrammarDoctorResult | null = null;
  let skillRadar: SkillRadarRefreshResult | null = null;
  if (roleplaySessionId) {
    grammarDoctor = await persistRoleplayTurn({
      supabase,
      sessionId: roleplaySessionId,
      userId: user.id,
      missionId: missionId ?? null,
      latestUserText: latestUserMessage(history),
      difficulty,
      reply: reply.data,
    });
    skillRadar = await refreshSkillRadarSnapshot({ supabase, userId: user.id });
    if (skillRadar.errors.length) {
      console.error("[roleplay] skill radar:", skillRadar.errors.join(" / "));
    }
  }

  return NextResponse.json({
    ...reply.data,
    session_id: roleplaySessionId,
    grammar_doctor: grammarDoctor,
    skill_radar: skillRadar,
  });
}

type WeaknessEventRow = {
  source: string | null;
  skill_area: string | null;
  severity: string | null;
  prompt: string | null;
  correct_answer: string | null;
  metadata: Record<string, unknown> | null;
};

type RoleplayWeaknessProfile = {
  focusLines: string[];
  error: string | null;
};

async function fetchRoleplayWeaknessProfile({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}): Promise<RoleplayWeaknessProfile> {
  const since = new Date();
  since.setDate(since.getDate() - 45);

  const { data, error } = await supabase
    .from("weakness_events")
    .select("source, skill_area, severity, prompt, correct_answer, metadata")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    return { focusLines: [], error: error.message };
  }

  const rows = ((data ?? []) as unknown as WeaknessEventRow[]).map((row) => ({
    ...row,
    metadata: normalizeMetadata(row.metadata),
  }));
  const buckets = new Map<string, {
    label: string;
    skillArea: string;
    score: number;
    count: number;
    sources: Set<string>;
    prompt: string | null;
    correctAnswer: string | null;
  }>();

  for (const row of rows) {
    const skillArea = row.skill_area?.trim() || "output";
    const label = weaknessLabel(row.metadata, skillArea);
    const key = `${skillArea}:${label}`;
    const existing = buckets.get(key) ?? {
      label,
      skillArea,
      score: 0,
      count: 0,
      sources: new Set<string>(),
      prompt: null,
      correctAnswer: null,
    };
    existing.score += severityWeight(row.severity);
    existing.count += 1;
    if (row.source?.trim()) existing.sources.add(row.source.trim());
    existing.prompt ??= row.prompt?.trim() || null;
    existing.correctAnswer ??= row.correct_answer?.trim() || null;
    buckets.set(key, existing);
  }

  const focusLines = [...buckets.values()]
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, 5)
    .map((item, index) => {
      const sources = [...item.sources].slice(0, 2).join(", ") || "recent practice";
      const repair = item.correctAnswer ? `；repair target: ${trimForPrompt(item.correctAnswer, 80)}` : "";
      return `${index + 1}. ${item.label} (${formatSkillArea(item.skillArea)}；${item.count} signals from ${sources}${repair})`;
    });

  return { focusLines, error: null };
}

async function persistRoleplayTurn({
  supabase,
  sessionId,
  userId,
  missionId,
  latestUserText,
  difficulty,
  reply,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  sessionId: string;
  userId: string;
  missionId: string | null;
  latestUserText: string;
  difficulty: "N5" | "N4" | "N3" | "N2" | "N1";
  reply: z.infer<typeof RoleplayReplySchema>;
}): Promise<GrammarDoctorResult | null> {
  const now = new Date().toISOString();
  const score = rubricScore(reply.rubric);
  const turnRows: Array<Record<string, unknown>> = [];
  if (latestUserText) {
    turnRows.push({
      session_id: sessionId,
      user_id: userId,
      speaker: "user",
      text_ja: latestUserText,
    });
  }
  turnRows.push({
    session_id: sessionId,
    user_id: userId,
    speaker: "ai",
    text_ja: reply.reply_ja,
    kana: reply.kana || null,
    translation_zh: reply.translation_zh || null,
    correction_json: reply.correction,
    reusable_patterns: reply.reusable_patterns,
    rubric: reply.rubric,
    task_complete: reply.task_complete,
  });

  const { data: savedTurns, error: turnError } = await supabase
    .from("roleplay_turns")
    .insert(turnRows)
    .select("id, speaker");
  if (turnError) {
    console.error("[roleplay] turns:", turnError.message);
  }
  const assistantTurnId = (savedTurns ?? []).find((turn) => turn.speaker === "ai")?.id ?? null;

  const { error: sessionError } = await supabase
    .from("roleplay_sessions")
    .update({
      task_complete: reply.task_complete,
      completed_at: reply.task_complete ? now : null,
      score,
      best_sentence: latestUserText || null,
      biggest_grammar_issue: reply.correction?.explanation_zh ?? null,
      reusable_patterns: reply.reusable_patterns,
      next_assignment: reply.next_assignment,
      updated_at: now,
    })
    .eq("id", sessionId)
    .eq("user_id", userId);
  if (sessionError) {
    console.error("[roleplay] session update:", sessionError.message);
  }

  if (reply.correction) {
    const { error } = await supabase.from("roleplay_corrections").insert({
      session_id: sessionId,
      turn_id: assistantTurnId,
      user_id: userId,
      original: reply.correction.original,
      corrected: reply.correction.corrected,
      explanation_zh: reply.correction.explanation_zh,
    });
    if (error) console.error("[roleplay] correction:", error.message);
  }

  let grammarDoctor: GrammarDoctorResult | null = null;
  if (reply.correction) {
    grammarDoctor = await recordOutputCorrections({
      supabase,
      userId,
      source: "roleplay",
      sourceReference: sessionId,
      difficultyJlpt: difficulty,
      corrections: [{
        original: reply.correction.original,
        corrected: reply.correction.corrected,
        category: "grammar",
        explanationZh: reply.correction.explanation_zh,
      }],
    });
    if (grammarDoctor.errors.length) {
      console.error("[roleplay] grammar doctor:", grammarDoctor.errors.join(" / "));
    }
  }

  if (reply.reusable_patterns.length) {
    const { error } = await supabase
      .from("roleplay_reusable_patterns")
      .upsert(
        reply.reusable_patterns.map((pattern) => ({
          session_id: sessionId,
          turn_id: assistantTurnId,
          user_id: userId,
          pattern,
        })),
        { onConflict: "session_id,pattern", ignoreDuplicates: true },
      );
    if (error) console.error("[roleplay] patterns:", error.message);
  }

  if (reply.task_complete && latestUserText) {
    const { error } = await supabase.from("roleplay_evidence").insert({
      session_id: sessionId,
      user_id: userId,
      can_do_id: missionId,
      proof_text: latestUserText,
      score,
    });
    if (error) console.error("[roleplay] evidence:", error.message);

    const outputPrompt = await completeLatestDailyOutputPrompt({
      supabase,
      userId,
      promptDate: todayDateString(),
      responseTextJa: latestUserText,
      proofReference: `roleplay:${sessionId}`,
      sourceSurface: "roleplay",
      metadata: {
        mission_id: missionId,
        score,
        reusable_patterns: reply.reusable_patterns,
      },
    });
    if (!outputPrompt.ok) {
      console.error("[roleplay] daily output prompt:", outputPrompt.reason);
    }
  }

  return grammarDoctor;
}

function latestUserMessage(history: z.infer<typeof BodySchema>["history"]) {
  return [...history].reverse().find((message) => message.role === "user")?.content ?? "";
}

function rubricScore(rubric: z.infer<typeof RoleplayReplySchema>["rubric"]) {
  if (!rubric.length) return null;
  const passed = rubric.filter((item) => item.passed).length;
  return Math.round((passed / rubric.length) * 100);
}

function normalizeMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function weaknessLabel(metadata: Record<string, unknown> | null, skillArea: string) {
  return firstNonEmpty([
    stringMeta(metadata, "grammar_point"),
    stringMeta(metadata, "pattern"),
    ...stringArrayMeta(metadata, "grammar_tags"),
    stringMeta(metadata, "error_type"),
    stringMeta(metadata, "category"),
    formatSkillArea(skillArea),
  ]) ?? "output";
}

function severityWeight(severity: string | null) {
  if (severity === "leech") return 5;
  if (severity === "miss") return 3;
  if (severity === "hard") return 2;
  return 1;
}

function stringMeta(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArrayMeta(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? null;
}

function trimForPrompt(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function formatSkillArea(skillArea: string) {
  const labels: Record<string, string> = {
    vocab_recognition: "vocab recognition",
    vocab_production: "vocab production",
    listening: "listening",
    sentence_cloze: "sentence cloze",
    sentence_production: "sentence production",
    shadowing: "shadowing",
    grammar: "grammar",
    kanji: "kanji",
    pronunciation: "pronunciation",
    pragmatics: "pragmatics / register",
    output: "output",
  };
  return labels[skillArea] ?? skillArea.replace(/_/g, " ");
}
