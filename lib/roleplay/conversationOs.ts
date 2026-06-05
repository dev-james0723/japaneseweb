import type { SupabaseClient } from "@supabase/supabase-js";

export type ConversationOsSession = {
  id: string;
  missionId: string | null;
  scenario: string;
  partnerRole: string;
  personaId: string;
  personaLabel: string;
  difficulty: string;
  startedAt: string;
  completedAt: string | null;
  taskComplete: boolean;
  score: number | null;
  bestSentence: string | null;
  biggestGrammarIssue: string | null;
  reusablePatterns: string[];
  nextAssignment: string | null;
  turnCount: number;
  correctionCount: number;
  evidenceCount: number;
  shadowSentence: string | null;
  reviewSentence: string | null;
  journalPrompt: string;
};

export type ConversationOsPattern = {
  id: string;
  sessionId: string;
  pattern: string;
  savedToReview: boolean;
  createdAt: string;
};

export type ConversationOsCorrection = {
  id: string;
  sessionId: string;
  original: string;
  corrected: string;
  explanationZh: string | null;
  savedToReview: boolean;
  createdAt: string;
};

export type ConversationOsContext = {
  sessions: ConversationOsSession[];
  patterns: ConversationOsPattern[];
  corrections: ConversationOsCorrection[];
  stats: {
    totalSessions: number;
    completedSessions: number;
    averageScore: number | null;
    evidenceCount: number;
    reusablePatternCount: number;
    correctionCount: number;
  };
  errors: string[];
};

type SessionRow = {
  id: string;
  mission_id: string | null;
  scenario: string;
  partner_role: string;
  persona_id: string | null;
  difficulty: string;
  started_at: string;
  completed_at: string | null;
  task_complete: boolean | null;
  score: number | null;
  best_sentence: string | null;
  biggest_grammar_issue: string | null;
  reusable_patterns: string[] | null;
  next_assignment: string | null;
};

type TurnRow = {
  session_id: string;
  speaker: string;
  text_ja: string;
  created_at: string;
};

type EvidenceRow = {
  session_id: string;
  proof_text: string;
  score: number | null;
  saved_to_review: boolean | null;
  created_at: string;
};

export async function fetchConversationOsContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConversationOsContext> {
  const sessionsResult = await supabase
    .from("roleplay_sessions")
    .select("id, mission_id, scenario, partner_role, persona_id, difficulty, started_at, completed_at, task_complete, score, best_sentence, biggest_grammar_issue, reusable_patterns, next_assignment")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(10);

  const sessionRows = sessionsResult.error ? [] : ((sessionsResult.data ?? []) as unknown as SessionRow[]);
  const sessionIds = sessionRows.map((session) => session.id);

  const [turnsResult, correctionsResult, patternsResult, evidenceResult] = sessionIds.length
    ? await Promise.all([
        supabase
          .from("roleplay_turns")
          .select("session_id, speaker, text_ja, created_at")
          .eq("user_id", userId)
          .in("session_id", sessionIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("roleplay_corrections")
          .select("id, session_id, original, corrected, explanation_zh, saved_to_review, created_at")
          .eq("user_id", userId)
          .in("session_id", sessionIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("roleplay_reusable_patterns")
          .select("id, session_id, pattern, saved_to_review, created_at")
          .eq("user_id", userId)
          .in("session_id", sessionIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("roleplay_evidence")
          .select("session_id, proof_text, score, saved_to_review, created_at")
          .eq("user_id", userId)
          .in("session_id", sessionIds)
          .order("created_at", { ascending: false }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  const turns = turnsResult.error ? [] : ((turnsResult.data ?? []) as unknown as TurnRow[]);
  const corrections = correctionsResult.error ? [] : normalizeCorrections((correctionsResult.data ?? []) as unknown[]);
  const patterns = patternsResult.error ? [] : normalizePatterns((patternsResult.data ?? []) as unknown[]);
  const evidence = evidenceResult.error ? [] : ((evidenceResult.data ?? []) as unknown as EvidenceRow[]);

  const sessions = sessionRows.map((session) => {
    const sessionTurns = turns.filter((turn) => turn.session_id === session.id);
    const sessionCorrections = corrections.filter((correction) => correction.sessionId === session.id);
    const sessionPatterns = patterns.filter((pattern) => pattern.sessionId === session.id);
    const sessionEvidence = evidence.filter((item) => item.session_id === session.id);
    const latestAssistant = sessionTurns.find((turn) => turn.speaker === "ai")?.text_ja ?? null;
    const bestSentence = session.best_sentence || sessionEvidence[0]?.proof_text || null;
    const reviewSentence = sessionCorrections[0]?.corrected ?? bestSentence ?? sessionPatterns[0]?.pattern ?? null;
    const shadowSentence = bestSentence ?? latestAssistant ?? reviewSentence;

    return {
      id: session.id,
      missionId: session.mission_id,
      scenario: session.scenario,
      partnerRole: session.partner_role,
      personaId: session.persona_id ?? "mission-default",
      personaLabel: personaLabel(session.persona_id, session.partner_role),
      difficulty: session.difficulty,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      taskComplete: Boolean(session.task_complete),
      score: session.score,
      bestSentence,
      biggestGrammarIssue: session.biggest_grammar_issue ?? sessionCorrections[0]?.explanationZh ?? null,
      reusablePatterns: compact([...(session.reusable_patterns ?? []), ...sessionPatterns.map((pattern) => pattern.pattern)]).slice(0, 5),
      nextAssignment: session.next_assignment,
      turnCount: sessionTurns.length,
      correctionCount: sessionCorrections.length,
      evidenceCount: sessionEvidence.length,
      shadowSentence,
      reviewSentence,
      journalPrompt: buildJournalPrompt(session.next_assignment, bestSentence, sessionPatterns[0]?.pattern),
    };
  });

  const scores = sessions.map((session) => session.score).filter((score): score is number => typeof score === "number");

  return {
    sessions,
    patterns,
    corrections,
    stats: {
      totalSessions: sessions.length,
      completedSessions: sessions.filter((session) => session.taskComplete).length,
      averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      evidenceCount: evidence.length,
      reusablePatternCount: patterns.length,
      correctionCount: corrections.length,
    },
    errors: [
      sessionsResult.error?.message,
      turnsResult.error?.message,
      correctionsResult.error?.message,
      patternsResult.error?.message,
      evidenceResult.error?.message,
    ].filter((message): message is string => Boolean(message)),
  };
}

function normalizePatterns(rows: unknown[]): ConversationOsPattern[] {
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map((row) => ({
      id: String(row.id ?? ""),
      sessionId: String(row.session_id ?? ""),
      pattern: String(row.pattern ?? ""),
      savedToReview: Boolean(row.saved_to_review),
      createdAt: String(row.created_at ?? ""),
    }))
    .filter((row) => row.id && row.sessionId && row.pattern);
}

function normalizeCorrections(rows: unknown[]): ConversationOsCorrection[] {
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map((row) => ({
      id: String(row.id ?? ""),
      sessionId: String(row.session_id ?? ""),
      original: String(row.original ?? ""),
      corrected: String(row.corrected ?? ""),
      explanationZh: typeof row.explanation_zh === "string" ? row.explanation_zh : null,
      savedToReview: Boolean(row.saved_to_review),
      createdAt: String(row.created_at ?? ""),
    }))
    .filter((row) => row.id && row.sessionId && row.corrected);
}

function personaLabel(personaId: string | null, partnerRole: string) {
  const labels: Record<string, string> = {
    "mission-default": "Mission default",
    "tokyo-friend": "Tokyo Friend",
    sensei: "Japanese Sensei",
    konbini: "Konbini Staff",
    senpai: "Work Senpai",
    examiner: "JLPT Examiner",
  };
  if (personaId && labels[personaId]) return labels[personaId];
  return partnerRole || "Mission default";
}

function compact(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function buildJournalPrompt(nextAssignment: string | null, bestSentence: string | null, pattern: string | null) {
  if (nextAssignment) return `用 3 句日文完成：${nextAssignment}`;
  if (pattern) return `用「${pattern}」寫 3 句，換一個自己的真實場景。`;
  if (bestSentence) return `把「${bestSentence}」改寫成今天自己的情境。`;
  return "用今日角色扮演場景寫 3 句：你想做甚麼、對方點答、你點確認。";
}
