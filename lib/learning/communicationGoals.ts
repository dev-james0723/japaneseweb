import type { DailyMode } from "@/lib/os/types";

export type CommunicationMode = "interpretive" | "interpersonal" | "presentational";

export type CanDoGoal = {
  id: string;
  phase: number;
  title: string;
  canDo: string;
  mode: CommunicationMode;
  proof: string;
  primaryRoute: string;
  supportRoutes: string[];
  roleplay: {
    scenario: string;
    partner: string;
    successCriteria: string[];
    requiredPhrases: string[];
    starter: string;
  };
  miningPrompt: string;
  journalPrompt: string;
  shadowingSentences: string[];
};

export type CommunicationPhaseInfo = {
  phase: number;
  name: string;
  focus: string;
  dailyAssignment: Record<DailyMode, string>;
};

export const COMMUNICATION_PHASES: Record<number, CommunicationPhaseInfo> = {
  1: {
    phase: 1,
    name: "Survival setup",
    focus: "聲音、假名、基本自我介紹，建立每日開口最低量。",
    dailyAssignment: {
      min: "聽 1 句，跟讀 3 次，講 1 句自我狀態。",
      standard: "主動回想到期卡，採 1 句真日文，寫 1 句日記。",
      deep: "完成一個短 roleplay，再把其中 1 句加入跟讀。",
    },
  },
  2: {
    phase: 2,
    name: "Daily exchange",
    focus: "把單字移入日常任務：點餐、問路、買東西、講今日行程。",
    dailyAssignment: {
      min: "複習 due 卡，再用 1 個詞講今天要做的事。",
      standard: "完成 1 個日常 Can-Do 任務，保存 1 句可重用句型。",
      deep: "角色扮演 8 回合，結束後寫 3 句自然日文。",
    },
  },
  3: {
    phase: 3,
    name: "Connected speech",
    focus: "用連接句講理由、時間順序和個人偏好。",
    dailyAssignment: {
      min: "聽 1 句理由句，遮字復述。",
      standard: "採 1 句理由/順序句，做 cloze + production。",
      deep: "用今天採礦句型做一段 5 句日記。",
    },
  },
  4: {
    phase: 4,
    name: "Immersion transfer",
    focus: "從文章、影片和 podcast 抽出能立刻拿去對話的句子。",
    dailyAssignment: {
      min: "從沉浸內容抽 1 句，做聽音回想。",
      standard: "完成輸入、採礦、跟讀、輸出四步閉環。",
      deep: "把文化內容改寫成 60 秒口頭摘要。",
    },
  },
  5: {
    phase: 5,
    name: "Output launch",
    focus: "用語言島反覆練熟固定場景，提升即時反應。",
    dailyAssignment: {
      min: "重練一個語言島的核心 3 句。",
      standard: "完成 1 個任務 roleplay 並保存錯誤修正。",
      deep: "同一任務做兩輪：提示版一次，無提示版一次。",
    },
  },
  6: {
    phase: 6,
    name: "Refinement",
    focus: "修正敬語、語氣、自然度，讓長句和對話更像真人。",
    dailyAssignment: {
      min: "重聽一段舊錄音，標記 1 個自然度問題。",
      standard: "做一輪任務對話，整理 1 個 register gap。",
      deep: "完成 N2/N3 題材的口頭摘要 + 追問。",
    },
  },
};

export const CAN_DO_GOALS: CanDoGoal[] = [
  {
    id: "self-intro-basic",
    phase: 1,
    title: "自我介紹",
    canDo: "我可以用 3 句日文介紹自己、今天的狀態和學日文的原因。",
    mode: "presentational",
    proof: "錄下或寫下 3 句，包含姓名/身份、今日狀態、學習理由。",
    primaryRoute: "/journal",
    supportRoutes: ["/review", "/roleplay", "/talk-me"],
    roleplay: {
      scenario: "你第一次參加日文交流會，要向一位日本朋友簡單介紹自己。",
      partner: "交流會朋友",
      successCriteria: ["說出名字或稱呼", "說出今天的狀態", "說出學日文的原因"],
      requiredPhrases: ["はじめまして", "香港から来ました", "日本語を勉強しています"],
      starter: "はじめまして。香港から来ました。",
    },
    miningPrompt: "找一個日本人自我介紹或近況句，保存可以改寫成自己的版本。",
    journalPrompt: "用 3 句日文寫：我是誰、今天怎樣、為甚麼學日文。",
    shadowingSentences: ["はじめまして。香港から来ました。", "日本語を勉強しています。"],
  },
  {
    id: "order-cafe",
    phase: 2,
    title: "Café 點餐",
    canDo: "我可以在 café 點一杯飲品，確認大小，並禮貌地結帳。",
    mode: "interpersonal",
    proof: "完成 6 回合點餐 roleplay，至少使用 2 個禮貌請求句。",
    primaryRoute: "/roleplay",
    supportRoutes: ["/review", "/mining", "/talk-me"],
    roleplay: {
      scenario: "你喺東京一間 café 想點咖啡和蛋糕，店員會問大小、內用外帶和付款方式。",
      partner: "店員",
      successCriteria: ["點出飲品或食物", "回答內用/外帶", "用禮貌句完成付款"],
      requiredPhrases: ["これをください", "店内でお願いします", "カードで払えますか"],
      starter: "すみません、これをください。",
    },
    miningPrompt: "貼上一段餐廳或 café 對話，抽出可直接點餐的句子。",
    journalPrompt: "寫 3 句：你想點甚麼、內用還是外帶、怎樣付款。",
    shadowingSentences: ["すみません、これをください。", "店内でお願いします。", "カードで払えますか。"],
  },
  {
    id: "ask-directions",
    phase: 2,
    title: "問路",
    canDo: "我可以問目的地在哪裡，聽懂簡短方向，並確認自己理解對不對。",
    mode: "interpersonal",
    proof: "完成問路 roleplay，能問路、確認方向、道謝。",
    primaryRoute: "/roleplay",
    supportRoutes: ["/mining", "/review", "/notebook"],
    roleplay: {
      scenario: "你在新宿站附近迷路了，要問路人怎樣去最近的藥妝店。",
      partner: "路人",
      successCriteria: ["問目的地在哪裡", "確認左右/直行/車站出口", "用自然方式道謝"],
      requiredPhrases: ["どこですか", "まっすぐ行って", "右に曲がりますか", "ありがとうございます"],
      starter: "すみません、薬局はどこですか。",
    },
    miningPrompt: "找一段旅遊/問路日文，保存方向詞和確認句。",
    journalPrompt: "用 3 句描述由車站去一個地方的路線。",
    shadowingSentences: ["すみません、駅はどこですか。", "まっすぐ行って、右に曲がります。"],
  },
  {
    id: "describe-schedule",
    phase: 3,
    title: "講今日行程",
    canDo: "我可以用時間順序講今天做了甚麼、接下來要做甚麼。",
    mode: "presentational",
    proof: "寫或講 5 句，包含過去、現在、未來各一個動作。",
    primaryRoute: "/journal",
    supportRoutes: ["/review", "/mining", "/self-talk"],
    roleplay: {
      scenario: "午飯時，同事問你今天忙不忙，你要自然講今天的安排。",
      partner: "同事",
      successCriteria: ["講早上做了甚麼", "講現在/下午安排", "用 から/あとで 連接句子"],
      requiredPhrases: ["朝は", "午後は", "あとで", "少し忙しいです"],
      starter: "今日は少し忙しいです。",
    },
    miningPrompt: "找一個含時間順序的日文句子，留意 朝/午後/あとで/それから。",
    journalPrompt: "用 5 句日文寫今天行程：早上、現在、下午、晚上、感想。",
    shadowingSentences: ["朝は勉強しました。午後は仕事があります。", "あとで友だちに会います。"],
  },
  {
    id: "explain-preference",
    phase: 3,
    title: "講喜好和理由",
    canDo: "我可以說明自己喜歡甚麼，並用簡單理由解釋為甚麼。",
    mode: "interpersonal",
    proof: "完成 8 回合閒聊，至少說出 2 個理由。",
    primaryRoute: "/roleplay",
    supportRoutes: ["/journal", "/mining", "/review"],
    roleplay: {
      scenario: "你和日本朋友聊喜歡的節目、食物或地方，對方會追問為甚麼。",
      partner: "日本朋友",
      successCriteria: ["說出偏好", "用 から/ので 給理由", "反問對方意見"],
      requiredPhrases: ["が好きです", "なぜなら", "からです", "どう思いますか"],
      starter: "日本のドラマが好きです。",
    },
    miningPrompt: "從文章或影片抽一句表達喜好/理由的句子。",
    journalPrompt: "寫 5 句：你喜歡的一樣東西、兩個理由、反面比較、總結。",
    shadowingSentences: ["日本のドラマが好きです。会話が自然だからです。", "あなたはどう思いますか。"],
  },
  {
    id: "summarize-culture",
    phase: 4,
    title: "文化內容摘要",
    canDo: "我可以用 60 秒日文摘要一段日本文化內容，並說出自己的看法。",
    mode: "presentational",
    proof: "保存一段文化輸入，採 3 句，輸出 5 句摘要。",
    primaryRoute: "/cultural",
    supportRoutes: ["/mining", "/journal", "/roleplay"],
    roleplay: {
      scenario: "朋友問你最近看了甚麼日本文化內容，你要用簡單日文介紹並講感想。",
      partner: "朋友",
      successCriteria: ["說出主題", "摘要 2 個重點", "說出自己的看法"],
      requiredPhrases: ["について読みました", "一番面白かったのは", "と思います"],
      starter: "昨日、日本の文化について読みました。",
    },
    miningPrompt: "從文化文章抽 3 句：一個定義句、一個例子句、一個感想句。",
    journalPrompt: "用 5 句摘要今天看的文化內容，最後一句講你的看法。",
    shadowingSentences: ["一番面白かったのは、地域によって習慣が違うことです。", "私はとても面白いと思いました。"],
  },
  {
    id: "language-island",
    phase: 5,
    title: "語言島自動化",
    canDo: "我可以在一個常用場景裡不用看提示完成 10 回合對話。",
    mode: "interpersonal",
    proof: "同一場景連續完成提示版和無提示版 roleplay。",
    primaryRoute: "/roleplay",
    supportRoutes: ["/talk-me", "/review", "/weekly-review"],
    roleplay: {
      scenario: "你在日本旅行中需要處理一個小問題：買錯票、想換時間、或想確認規則。",
      partner: "服務人員",
      successCriteria: ["說明問題", "提出請求", "確認對方回答", "禮貌結束"],
      requiredPhrases: ["すみません、確認したいんですが", "変更できますか", "どうすればいいですか"],
      starter: "すみません、確認したいんですが。",
    },
    miningPrompt: "找一個請求/確認/解決問題的句子，加入語言島。",
    journalPrompt: "寫一段 8 句問題解決對話，包含請求和確認。",
    shadowingSentences: ["すみません、確認したいんですが。", "時間を変更できますか。", "どうすればいいですか。"],
  },
  {
    id: "natural-register",
    phase: 6,
    title: "自然度精煉",
    canDo: "我可以把直譯句修成更自然的日文，並控制禮貌程度。",
    mode: "presentational",
    proof: "從日記或 roleplay 中修正 3 個 register/style gap。",
    primaryRoute: "/journal",
    supportRoutes: ["/roleplay", "/notebook", "/monthly-audit"],
    roleplay: {
      scenario: "你要把一段偏直譯的日文改成更自然、更適合對方的說法。",
      partner: "日文老師",
      successCriteria: ["指出不自然處", "改寫成自然句", "說明禮貌程度"],
      requiredPhrases: ["自然に言うと", "この場合は", "のほうがいいです"],
      starter: "この文は少し不自然かもしれません。",
    },
    miningPrompt: "找一個日本人自然表達的句子，和自己的直譯句比較。",
    journalPrompt: "貼 3 句舊日記，逐句改成更自然的日文。",
    shadowingSentences: ["この場合は、こちらのほうが自然です。", "もう少し丁寧に言うと、こうなります。"],
  },
];

export function getCommunicationPhase(phase: number): CommunicationPhaseInfo {
  return COMMUNICATION_PHASES[phase] ?? COMMUNICATION_PHASES[1];
}

export function getCanDoGoalsForPhase(phase: number): CanDoGoal[] {
  const goals = CAN_DO_GOALS.filter((goal) => goal.phase === phase);
  return goals.length ? goals : CAN_DO_GOALS.filter((goal) => goal.phase === 1);
}

export function pickCanDoGoal(phase: number, dayIndex = 1): CanDoGoal {
  const goals = getCanDoGoalsForPhase(phase);
  const index = Math.max(0, dayIndex - 1) % goals.length;
  return goals[index];
}

export function getCanDoGoal(id: string | null | undefined): CanDoGoal | null {
  if (!id) return null;
  return CAN_DO_GOALS.find((goal) => goal.id === id) ?? null;
}
