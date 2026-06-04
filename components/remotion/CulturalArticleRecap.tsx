import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type CulturalArticleRecapProps = {
  titleJa: string;
  titleZh: string;
  summaryZh?: string | null;
  vocab: string[];
};

export function CulturalArticleRecap({
  titleJa,
  titleZh,
  summaryZh,
  vocab,
}: CulturalArticleRecapProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 90 },
  });
  const glow = interpolate(frame, [0, 80, 140], [0.18, 0.36, 0.22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 16% 10%, rgba(215,239,105,0.20), transparent 30%), radial-gradient(circle at 86% 78%, rgba(145,213,232,0.18), transparent 34%), linear-gradient(145deg, #17130f 0%, #090806 62%, #020202 100%)",
        color: "white",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans JP", "Noto Sans TC", sans-serif',
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 72,
          border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: 38,
          background: "rgba(255,255,255,0.06)",
          boxShadow: `0 0 90px rgba(215,239,105,${glow})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 116,
          top: 104,
          width: 980,
          opacity: titleProgress,
          transform: `translateY(${(1 - titleProgress) * 28}px)`,
        }}
      >
        <div
          style={{
            color: "#d7ef69",
            fontSize: 26,
            letterSpacing: 5,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Cultural Recap
        </div>
        <h1 style={{ fontSize: 78, lineHeight: 1.08, marginTop: 26, fontWeight: 800 }}>
          {titleJa}
        </h1>
        <p style={{ marginTop: 26, fontSize: 34, color: "rgba(255,255,255,0.76)" }}>
          {titleZh}
        </p>
      </div>

      <Sequence from={32}>
        <div
          style={{
            position: "absolute",
            left: 116,
            bottom: 132,
            width: 860,
            fontSize: 28,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.78)",
            opacity: interpolate(frame, [32, 54], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {summaryZh || "讀一段文化故事，帶走幾個可以即刻用的日文觀察。"}
        </div>
      </Sequence>

      <Sequence from={52}>
        <div
          style={{
            position: "absolute",
            right: 116,
            bottom: 118,
            width: 520,
            display: "grid",
            gap: 18,
          }}
        >
          {vocab.slice(0, 4).map((word, index) => {
            const itemOpacity = interpolate(frame, [52 + index * 9, 66 + index * 9], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={`${word}-${index}`}
                style={{
                  opacity: itemOpacity,
                  transform: `translateX(${(1 - itemOpacity) * 30}px)`,
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 20,
                  padding: "18px 22px",
                  background: "rgba(0,0,0,0.25)",
                  fontSize: 30,
                  fontWeight: 700,
                }}
              >
                {word}
              </div>
            );
          })}
        </div>
      </Sequence>
    </AbsoluteFill>
  );
}
