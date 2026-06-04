import clsx from "clsx";
import { FuriganaText } from "@/components/FuriganaText";
import { SpeakerButton } from "@/components/SpeakerButton";

type Size = "xs" | "sm" | "md" | "lg";
type SpeakerSize = "sm" | "md" | "lg";

export async function JapaneseSentence({
  text,
  size = "sm",
  speakerSize = "sm",
  className,
  textClassName,
  showSpeaker = true,
  inline = false,
  preWrap = false,
}: {
  text: string;
  size?: Size;
  speakerSize?: SpeakerSize;
  className?: string;
  textClassName?: string;
  showSpeaker?: boolean;
  inline?: boolean;
  preWrap?: boolean;
}) {
  if (!text.trim()) return null;

  return (
    <div className={clsx("flex items-start gap-2", className)}>
      <FuriganaText
        text={text}
        size={size}
        inline={inline}
        preWrap={preWrap}
        className={clsx("flex-1 min-w-0", textClassName)}
      />
      {showSpeaker && (
        <SpeakerButton text={text} size={speakerSize} className="shrink-0 mt-0.5" />
      )}
    </div>
  );
}
