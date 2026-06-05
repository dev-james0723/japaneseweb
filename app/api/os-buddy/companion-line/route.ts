import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchOsSettings, fetchTodayBootLog, fetchWeeklyStats } from "@/lib/os/queries";
import { LAYER_ORDER, PHASE_INFO, layerCompletion, todayDateString } from "@/lib/os/types";
import { buildLocalOSBuddyLine, fallbackOSBuddyContext } from "@/lib/os-buddy/os-buddy-companion";
import { OSBuddyCompanionRequestSchema, OSBuddyCompanionResponseSchema } from "@/lib/os-buddy/os-buddy-companion-schema";
import type { OSBuddyJapaneseContext } from "@/lib/os-buddy/os-buddy-types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = OSBuddyCompanionRequestSchema.safeParse(await request.json().catch(() => ({})));
  const pathname = body.success ? (body.data.pathname ?? "/dashboard") : "/dashboard";
  const requestedKind = body.success ? body.data.kind : undefined;

  try {
    const context = await buildContext(pathname);
    const response = buildLocalOSBuddyLine(context, requestedKind);
    return NextResponse.json(OSBuddyCompanionResponseSchema.parse(response));
  } catch {
    const response = buildLocalOSBuddyLine(fallbackOSBuddyContext(pathname), requestedKind);
    return NextResponse.json(OSBuddyCompanionResponseSchema.parse({ ...response, source: "fallback" }));
  }
}

async function buildContext(pathname: string): Promise<OSBuddyJapaneseContext> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return fallbackOSBuddyContext(pathname);

  const [profileResult, settings, bootLog, weeklyStats, weakReviews, decks, mined, journals, grammar, talkMe] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, show_romaji, preferred_voice, default_jlpt_level")
        .eq("id", userId)
        .maybeSingle(),
      fetchOsSettings(supabase, userId).catch(() => null),
      fetchTodayBootLog(supabase, userId).catch(() => null),
      fetchWeeklyStats(supabase, userId).catch(() => null),
      supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_leech", true),
      supabase
        .from("decks")
        .select("title")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("mined_sentences")
        .select("sentence_ja")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("journal_entries")
        .select("content")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(2),
      supabase
        .from("grammar_points")
        .select("pattern")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("talk_me_sessions")
        .select("duration_minutes")
        .eq("user_id", userId),
    ]);

  const profile = profileResult.data;
  const completedLayers = bootLog
    ? LAYER_ORDER.filter((layer) => Boolean(bootLog[`${layer}_layer_done` as keyof typeof bootLog]))
    : [];
  const nextIncompleteLayer = LAYER_ORDER.find((layer) => !completedLayers.includes(layer)) ?? null;
  const phase = settings?.current_phase ?? 1;
  const weeklyQuota = settings?.weekly_new_vocab_quota ?? PHASE_INFO[phase]?.weeklyVocabQuota ?? 20;

  return {
    displayName: profile?.display_name ?? null,
    today: todayDateString(),
    pathname,
    os: {
      currentPhase: phase,
      phaseName: PHASE_INFO[phase]?.name ?? "基礎安裝",
      dailyMode: settings?.daily_mode ?? "standard",
      targetJlpt: settings?.target_jlpt ?? profile?.default_jlpt_level ?? "N5",
      bootCompletion: layerCompletion(bootLog),
      nextIncompleteLayer,
      completedLayers,
    },
    review: {
      dueCount: weeklyStats?.dueCount ?? 0,
      weakCount: weakReviews.count ?? 0,
      sentencePromptCount: weeklyStats?.dueSentencePromptCount ?? 0,
      lastRating: null,
    },
    decks: {
      recentTitles: (decks.data ?? []).map((deck) => deck.title).filter(Boolean).slice(0, 3),
      weeklyNewVocab: weeklyStats?.newVocab ?? 0,
      weeklyQuota,
    },
    learning: {
      recentMinedSentences: (mined.data ?? []).map((item) => item.sentence_ja).filter(Boolean).slice(0, 3),
      recentJournalSnippets: (journals.data ?? []).map((item) => item.content).filter(Boolean).slice(0, 2),
      recentGrammar: (grammar.data ?? []).map((item) => item.pattern).filter(Boolean).slice(0, 3),
      talkMeMinutesThisWeek: (talkMe.data ?? []).reduce((sum, item) => sum + (item.duration_minutes ?? 0), 0),
    },
    preferences: {
      showRomaji: profile?.show_romaji ?? true,
      preferredVoice: profile?.preferred_voice ?? "Takumi",
      defaultJlptLevel: profile?.default_jlpt_level ?? "N5",
    },
    games: ["kana-catch", "focus-tap", "study-desk-reset", "play-ball"],
  };
}
