export type LanguageBlend = {
  mode: "full_ja" | "bilingual" | "zh_heavy";
  ja_ratio: number;
  zh_ratio: number;
  show_kana_ruby: boolean;
};

export function getLanguageBlend(
  phase: number,
  override?: string | null,
): LanguageBlend {
  if (override === "full_ja") {
    return { mode: "full_ja", ja_ratio: 0.8, zh_ratio: 0.2, show_kana_ruby: false };
  }
  if (override === "zh_heavy") {
    return { mode: "zh_heavy", ja_ratio: 0.3, zh_ratio: 0.7, show_kana_ruby: true };
  }
  if (override === "bilingual") {
    return { mode: "bilingual", ja_ratio: 0.5, zh_ratio: 0.5, show_kana_ruby: true };
  }
  if (phase <= 2) {
    return { mode: "zh_heavy", ja_ratio: 0.3, zh_ratio: 0.7, show_kana_ruby: true };
  }
  if (phase <= 4) {
    return { mode: "bilingual", ja_ratio: 0.5, zh_ratio: 0.5, show_kana_ruby: true };
  }
  return { mode: "full_ja", ja_ratio: 0.8, zh_ratio: 0.2, show_kana_ruby: false };
}

export function phaseToJlpt(phase: number): "N5" | "N4" | "N3" | "N2" | "N1" {
  if (phase <= 1) return "N5";
  if (phase === 2) return "N4";
  if (phase <= 4) return "N3";
  if (phase === 5) return "N2";
  return "N2";
}
