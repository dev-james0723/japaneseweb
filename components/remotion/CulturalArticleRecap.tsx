import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { CSSProperties } from "react";
import type {
  CulturalArticleRecapProps,
  CulturalArticleRecapScene,
} from "@/lib/motion/culturalArticleRecapConfig";

const ACCENTS = ["#d7ef69", "#91d5e8", "#f3a9c8", "#efbd63"];

export function CulturalArticleRecap({
  titleJa,
  titleZh,
  summaryZh,
  vocab,
  specificityKeywords,
  scenes,
  visualMood,
}: CulturalArticleRecapProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const keywords = (specificityKeywords?.length ? specificityKeywords : vocab)
    .filter(Boolean)
    .slice(0, 4);
  const sceneCards = normalizeScenes({ titleZh, summaryZh, scenes });
  const intro = fade(frame, 0, 14, 54, 68);
  const evidence = fade(frame, 58, 72, 112, 126);
  const language = fade(frame, 118, 132, 178, 180);
  const railProgress = interpolate(frame, [0, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 19, stiffness: 88 },
  });
  const drift = interpolate(frame, [0, 180], [-48, 42], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = interpolate(frame, [0, 88, 180], [0.17, 0.31, 0.22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const firstScene = sceneCards[0];
  const secondScene = sceneCards[1] ?? firstScene;
  const titleSize = titleJa.length > 28 ? 46 : titleJa.length > 18 ? 54 : 64;

  return (
    <AbsoluteFill style={styles.root}>
      <div
        style={{
          ...styles.texture,
          transform: `translateX(${drift}px)`,
        }}
      />
      <div
        style={{
          ...styles.frame,
          boxShadow: `0 0 92px rgba(215,239,105,${glow})`,
        }}
      />
      <ProgressRail progress={railProgress} />

      <section
        style={{
          ...styles.slide,
          opacity: intro,
          transform: `translateY(${(1 - titleProgress) * 24}px)`,
        }}
      >
        <div style={styles.kicker}>文章回顧</div>
        <h1 style={{ ...styles.title, fontSize: titleSize }}>
          {trimForFrame(titleJa, 44)}
        </h1>
        <p style={styles.subtitle}>{trimForFrame(titleZh, 62)}</p>
        <p style={styles.summary}>{trimForFrame(summaryZh || firstScene.onScreenText, 96)}</p>
        <KeywordRow words={keywords} />
      </section>

      <section
        style={{
          ...styles.slide,
          opacity: evidence,
          transform: `translateY(${(1 - evidence) * 24}px)`,
        }}
      >
        <div style={styles.smallTitle}>文化細節</div>
        <div style={styles.evidenceCard}>
          <div style={styles.evidenceAccent} />
          <div>
            <div style={styles.cardHeadline}>{trimForFrame(firstScene.headline, 26)}</div>
            <p style={styles.cardText}>{trimForFrame(firstScene.onScreenText, 110)}</p>
          </div>
          <div style={styles.evidenceBlock}>
            <div style={styles.evidenceLabel}>文章證據</div>
            <p style={styles.evidenceText}>{trimForFrame(firstScene.articleEvidence, 150)}</p>
          </div>
        </div>
      </section>

      <section
        style={{
          ...styles.slide,
          opacity: language,
          transform: `translateY(${(1 - language) * 24}px)`,
        }}
      >
        <div style={styles.smallTitle}>語言線索</div>
        <div style={styles.languageGrid}>
          <div style={styles.wordGrid}>
            {(keywords.length ? keywords : vocab).slice(0, 4).map((word, index) => (
              <div
                key={`${word}-${index}`}
                style={{
                  ...styles.wordChip,
                  boxShadow: `inset 5px 0 0 ${ACCENTS[index] ?? "#fff"}`,
                }}
              >
                {trimForFrame(word, 16)}
              </div>
            ))}
          </div>
          <div style={styles.languageCard}>
            <div style={styles.cardHeadline}>{trimForFrame(secondScene.headline, 24)}</div>
            <p style={styles.languageText}>
              {trimForFrame(secondScene.onScreenText || secondScene.articleEvidence, 118)}
            </p>
            <p style={styles.mood}>{visualMood || "文章專屬文化說明"}</p>
          </div>
        </div>
      </section>
    </AbsoluteFill>
  );
}

function ProgressRail({ progress }: { progress: number }) {
  return (
    <div style={styles.rail}>
      <div
        style={{
          width: `${Math.round(progress * 100)}%`,
          height: "100%",
          background: "linear-gradient(90deg, #d7ef69, #91d5e8, #f3a9c8)",
        }}
      />
    </div>
  );
}

function KeywordRow({ words }: { words: string[] }) {
  return (
    <div style={styles.keywordRow}>
      {(words.length ? words : ["文化", "語感", "日文"]).slice(0, 4).map((word, index) => (
        <span
          key={`${word}-${index}`}
          style={{
            ...styles.keywordPill,
            borderColor: `${ACCENTS[index] ?? "#ffffff"}55`,
            color: ACCENTS[index] ?? "#ffffff",
          }}
        >
          {trimForFrame(word, 14)}
        </span>
      ))}
    </div>
  );
}

function normalizeScenes({
  titleZh,
  summaryZh,
  scenes,
}: {
  titleZh: string;
  summaryZh?: string | null;
  scenes?: CulturalArticleRecapScene[];
}) {
  if (scenes?.length) return scenes.slice(0, 3);
  return [
    {
      headline: titleZh,
      onScreenText: summaryZh || "讀一段文化故事，帶走幾個可以即刻用的日文觀察。",
      articleEvidence: "Article-specific evidence appears here after generation.",
    },
  ];
}

function fade(frame: number, inStart: number, inEnd: number, outStart: number, outEnd: number) {
  const enter = interpolate(frame, [inStart, inEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(frame, [outStart, outEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return enter * exit;
}

function trimForFrame(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(0, max - 1))}…`;
}

const styles: Record<string, CSSProperties> = {
  root: {
    background:
      "linear-gradient(135deg, rgba(215,239,105,0.14), transparent 26%), linear-gradient(315deg, rgba(145,213,232,0.13), transparent 30%), linear-gradient(145deg, #17130f 0%, #090806 62%, #020202 100%)",
    color: "white",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans JP", "Noto Sans TC", sans-serif',
    overflow: "hidden",
  },
  texture: {
    position: "absolute",
    inset: 0,
    background:
      "repeating-linear-gradient(105deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 96px)",
    opacity: 0.24,
  },
  frame: {
    position: "absolute",
    inset: 58,
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 32,
    background: "rgba(255,255,255,0.052)",
  },
  rail: {
    position: "absolute",
    left: 98,
    right: 98,
    top: 74,
    height: 4,
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  slide: {
    position: "absolute",
    inset: "96px 98px 84px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 18,
  },
  kicker: {
    color: "#d7ef69",
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: 6,
    textTransform: "uppercase",
  },
  title: {
    maxWidth: 820,
    margin: 0,
    lineHeight: 1.08,
    fontWeight: 850,
  },
  subtitle: {
    maxWidth: 700,
    margin: 0,
    color: "rgba(255,255,255,0.78)",
    fontSize: 28,
    lineHeight: 1.32,
  },
  summary: {
    maxWidth: 780,
    margin: "10px 0 0",
    color: "rgba(255,255,255,0.68)",
    fontSize: 22,
    lineHeight: 1.45,
  },
  keywordRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    maxWidth: 800,
    marginTop: 10,
  },
  keywordPill: {
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 999,
    background: "rgba(0,0,0,0.22)",
    padding: "9px 14px",
    fontSize: 18,
    fontWeight: 750,
  },
  smallTitle: {
    color: "#d7ef69",
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 5,
    textTransform: "uppercase",
  },
  evidenceCard: {
    display: "grid",
    gridTemplateColumns: "10px minmax(0, 0.95fr) minmax(0, 0.8fr)",
    alignItems: "stretch",
    gap: 24,
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 26,
    background: "rgba(0,0,0,0.25)",
    padding: 28,
  },
  evidenceAccent: {
    width: 10,
    borderRadius: 999,
    background: "linear-gradient(180deg, #d7ef69, #91d5e8, #f3a9c8)",
  },
  cardHeadline: {
    color: "#91d5e8",
    fontSize: 34,
    fontWeight: 850,
    lineHeight: 1.1,
  },
  cardText: {
    margin: "18px 0 0",
    color: "rgba(255,255,255,0.84)",
    fontSize: 28,
    fontWeight: 650,
    lineHeight: 1.38,
  },
  evidenceBlock: {
    borderLeft: "1px solid rgba(255,255,255,0.12)",
    paddingLeft: 22,
    alignSelf: "stretch",
  },
  evidenceLabel: {
    color: "#f3a9c8",
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  evidenceText: {
    margin: "14px 0 0",
    color: "rgba(255,255,255,0.62)",
    fontSize: 20,
    lineHeight: 1.48,
  },
  languageGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 0.78fr) minmax(0, 1fr)",
    gap: 24,
    alignItems: "stretch",
  },
  wordGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  wordChip: {
    minHeight: 92,
    display: "flex",
    alignItems: "center",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 20,
    background: "rgba(0,0,0,0.25)",
    padding: "16px 18px",
    fontSize: 27,
    fontWeight: 800,
    lineHeight: 1.15,
  },
  languageCard: {
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 24,
    background: "rgba(255,255,255,0.055)",
    padding: 26,
  },
  languageText: {
    margin: "18px 0 0",
    color: "rgba(255,255,255,0.78)",
    fontSize: 25,
    lineHeight: 1.42,
  },
  mood: {
    margin: "24px 0 0",
    color: "rgba(255,255,255,0.42)",
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
};
