import type {
  OSBuddyCompanionKind,
  OSBuddyCompanionResponse,
  OSBuddyJapaneseContext,
} from "./os-buddy-types";

const GLOBAL_CLICK_LINES = [
  "我喺度。今日先開一層就得。",
  "Koto 陪你慢慢砌返個日文系統。",
  "先做最細一步，日文會自己累積。",
  "如果卡住，去複習一張或者採一句真日文。",
  "今日都開機，已經贏咗一半。",
];

const FALLBACK_CONTEXT: OSBuddyJapaneseContext = {
  displayName: null,
  today: new Date().toISOString().slice(0, 10),
  pathname: "/dashboard",
  os: {
    currentPhase: 1,
    phaseName: "基礎安裝",
    dailyMode: "standard",
    targetJlpt: "N5",
    bootCompletion: 0,
    nextIncompleteLayer: "boot",
    completedLayers: [],
  },
  review: { dueCount: 0, weakCount: 0, sentencePromptCount: 0, lastRating: null },
  decks: { recentTitles: [], weeklyNewVocab: 0, weeklyQuota: 20 },
  learning: { recentMinedSentences: [], recentJournalSnippets: [], recentGrammar: [], talkMeMinutesThisWeek: 0 },
  preferences: { showRomaji: true, preferredVoice: "Takumi", defaultJlptLevel: "N5" },
  games: ["kana-catch", "focus-tap", "study-desk-reset", "play-ball"],
};

export function fallbackOSBuddyContext(pathname = "/dashboard"): OSBuddyJapaneseContext {
  return { ...FALLBACK_CONTEXT, pathname };
}

export function chooseOSBuddyCompanionKind(context: OSBuddyJapaneseContext): OSBuddyCompanionKind {
  const pathname = context.pathname;
  if (context.review.lastRating) return "review";
  if (context.os.nextIncompleteLayer) return "boot";
  if (context.review.dueCount > 0 || context.review.weakCount > 0) return "review";
  if (pathname.startsWith("/review")) return "review";
  if (pathname.startsWith("/decks")) return "deck";
  if (pathname.startsWith("/grammar")) return "grammar";
  if (pathname.startsWith("/mining")) return "mining";
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/roleplay")) return "roleplay";
  if (pathname.startsWith("/talk-me")) return "tts";
  if (pathname.startsWith("/settings")) return "settings";
  if (Math.random() < 0.08) return "game";
  return "fallback";
}

export function buildLocalOSBuddyLine(
  input?: Partial<OSBuddyJapaneseContext> | null,
  requestedKind?: OSBuddyCompanionKind,
): OSBuddyCompanionResponse {
  const context = { ...FALLBACK_CONTEXT, ...(input ?? {}) } as OSBuddyJapaneseContext;
  const kind = requestedKind ?? chooseOSBuddyCompanionKind(context);
  const message = lineForKind(kind, context);
  return {
    message,
    kind,
    source: "local",
    cta: kind === "game" ? { label: "玩一小局", game: "focus-tap" } : null,
  };
}

function lineForKind(kind: OSBuddyCompanionKind, context: OSBuddyJapaneseContext): string {
  switch (kind) {
    case "boot":
      return bootLine(context);
    case "review":
      return reviewLine(context);
    case "deck":
      return deckLine(context);
    case "grammar":
      return pick([
        "文法唔係規則表，係句子引擎。加一個自己的例句。",
        "相似句型先分功能，再分語感。",
        "今日只要搞清一個 pattern 就好。",
      ]);
    case "mining":
      return pick([
        "採句時揀你真係會講出口嗰句。",
        "呢句可以變成 cloze 卡，再放返複習。",
        "先保存一句真日文，之後再整理都得。",
      ]);
    case "journal":
      return pick([
        "日記唔使完美。先寫出嚟，再俾教授修。",
        "今日試三句：事實、心情、下一步。",
        "用一個新詞寫自己的句子，記憶會深好多。",
      ]);
    case "roleplay":
      return pick([
        "角色扮演先求完成任務，唔求句句完美。",
        "講唔出就用短句。自然度係練返嚟。",
        "今日目標：聽懂、回應、再追問一句。",
      ]);
    case "tts":
      return pick([
        "聽完要跟讀一次，聲音先會入肌肉。",
        "如果讀音卡住，開 Romaji 望一眼就好。",
        "影子跟讀五秒，都算輸出。",
      ]);
    case "streak":
      return "保底日都算數。精簡模式係為咗唔斷線。";
    case "settings":
      return pick([
        "你可以喺設定改我個名、位置同快捷鍵。",
        "Romaji 可以做腳手架，但記得慢慢拆。",
      ]);
    case "game":
      return pick([
        "要唔要玩一小局？玩完返去複習。",
        "一分鐘 reset 下注意力，再開下一層。",
      ]);
    default:
      return pick([...GLOBAL_CLICK_LINES, "Koto 喺度。先做一件最細嘅日文事。"]);
  }
}

function bootLine(context: OSBuddyJapaneseContext): string {
  if (!context.os.nextIncompleteLayer && context.os.bootCompletion >= 100) {
    return "今日五層完成。收工前記低一個明日焦點。";
  }
  switch (context.os.nextIncompleteLayer) {
    case "boot":
      return "開機暖身先。今日用一句「今日は...です」開始。";
    case "input":
      return "輸入層到你。聽一段真日文，再抽一句可模仿。";
    case "review":
      return "到複習層。先主動回想，再揭曉答案。";
    case "output":
      return "輸出層唔使長，三句日記已經有效。";
    case "debug":
      return "除錯層只修一個痛點。太多反而散。";
    default:
      return "先做開機層：用日文講今日日期、天氣同心情。";
  }
}

function reviewLine(context: OSBuddyJapaneseContext): string {
  if (context.review.lastRating === "again") return "忘記唔係失敗，係系統提醒你要再見一次。";
  if (context.review.lastRating === "hard") return "吃力卡最值錢。短間隔返嚟就啱。";
  if (context.review.lastRating === "good") return "記得。下一張保持主動回想。";
  if (context.review.lastRating === "easy") return "太易就放遠啲，留空間畀難卡。";
  if (context.review.weakCount > 0) return `${context.review.weakCount} 張救援卡。慢慢拆音、字、義。`;
  if (context.review.dueCount > 0) return `有 ${context.review.dueCount} 張待複習。先打一張最弱嘅。`;
  return "複習完成。今日大腦已經做咗一輪整理。";
}

function deckLine(context: OSBuddyJapaneseContext): string {
  if (context.decks.weeklyQuota > 0) {
    return `今日新詞 ${context.decks.weeklyNewVocab}/${context.decks.weeklyQuota}。夠用就去輸出。`;
  }
  return pick([
    "建立詞庫時，主題越具體，AI 越準。",
    "新詞唔好貪多。要有例句、聲音同回憶鉤。",
    "一個好詞庫，要可以講得出口。",
  ]);
}

function pick(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0] ?? "Koto 喺度。";
}

