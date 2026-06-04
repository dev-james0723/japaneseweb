import clsx from "clsx";

const KANJI_RE = /[\u3400-\u9fff\uf900-\ufaff々〆]/;

type KanaKanjiBridgeProps = {
  japanese: string;
  kana?: string | null;
  romaji?: string | null;
  meaning?: string | null;
  compact?: boolean;
  className?: string;
};

export function KanaKanjiBridge({
  japanese,
  kana,
  romaji,
  meaning,
  compact = false,
  className,
}: KanaKanjiBridgeProps) {
  const hasReading = Boolean(kana || romaji);

  return (
    <div className={clsx("border-t border-white/10 pt-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          讀音橋
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">音 → 字 → 義</div>
      </div>

      <div className={clsx("grid gap-2", compact ? "text-xs" : "sm:grid-cols-3")}>
        <BridgeStep label="先讀音">
          {kana ? (
            <span className="font-jp text-[var(--accent-sky)]">{kana}</span>
          ) : hasReading ? (
            <span className="text-[var(--text-romaji)]">{romaji}</span>
          ) : (
            <span className="text-[var(--text-muted)]">讀一次</span>
          )}
        </BridgeStep>
        <BridgeStep label="再認字">
          <span className="font-jp">{renderKanji(japanese)}</span>
        </BridgeStep>
        <BridgeStep label="最後說義">
          <span className="text-[var(--zh-text)]">{meaning ?? "自己講出意思"}</span>
        </BridgeStep>
      </div>

      {!compact && romaji && kana && (
        <div className="mt-2 text-[10px] text-[var(--text-romaji)]">{romaji}</div>
      )}
    </div>
  );
}

function BridgeStep({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10px] text-[var(--text-muted)]">{label}</div>
      <div className="min-h-7 text-sm leading-7">{children}</div>
    </div>
  );
}

function renderKanji(text: string) {
  return Array.from(text).map((char, index) => {
    const isKanji = KANJI_RE.test(char);
    return (
      <span
        key={`${char}-${index}`}
        className={clsx(
          "mr-0.5 inline-grid h-7 min-w-7 place-items-center rounded-md px-1",
          isKanji
            ? "border border-[var(--accent-lime)]/25 bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
            : "text-[var(--text-secondary)]",
        )}
      >
        {char}
      </span>
    );
  });
}
