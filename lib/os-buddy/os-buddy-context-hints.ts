export const OS_BUDDY_ROUTE_HINTS: { pattern: RegExp; message: string }[] = [
  { pattern: /^\/dashboard/, message: "今日開機睇下一層未完成邊個。" },
  { pattern: /^\/review/, message: "複習前先回想，唔好即刻揭答案。" },
  { pattern: /^\/decks\/new/, message: "主題越具體，新詞越貼近你會用嘅日文。" },
  { pattern: /^\/decks/, message: "詞庫要有聲音、例句同圖像鉤。" },
  { pattern: /^\/grammar/, message: "每個文法點至少寫一句自己的例句。" },
  { pattern: /^\/journal/, message: "日記先求輸出，再求自然。" },
  { pattern: /^\/mining/, message: "採一句你真係想講出口嘅真日文。" },
  { pattern: /^\/talk-me/, message: "聽完抽一句可模仿句，唔好只記時數。" },
  { pattern: /^\/roleplay/, message: "角色扮演先完成任務，再修語法。" },
  { pattern: /^\/notebook/, message: "筆記本要變成可複習嘅卡，唔好只收藏。" },
  { pattern: /^\/stats/, message: "睇數據只為揀下一個痛點。" },
  { pattern: /^\/weekly-review/, message: "本週只揀一個下週焦點。" },
  { pattern: /^\/monthly-audit/, message: "月檢討要調整系統，唔係責怪自己。" },
  { pattern: /^\/settings/, message: "你可以喺度改我個名、位置同快捷鍵。" },
];

export function hintForPathname(pathname: string): string | null {
  return OS_BUDDY_ROUTE_HINTS.find((hint) => hint.pattern.test(pathname))?.message ?? null;
}

