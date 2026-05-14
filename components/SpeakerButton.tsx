"use client";

import { Volume2, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import clsx from "clsx";

type Size = "sm" | "md" | "lg";
const sizeMap: Record<Size, string> = {
  sm: "w-7 h-7",
  md: "w-9 h-9",
  lg: "w-11 h-11",
};
const iconSize: Record<Size, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function SpeakerButton({
  text,
  voiceId,
  languageCode = "ja-JP",
  size = "md",
  className,
}: {
  text: string;
  voiceId?: string;
  languageCode?: string;
  size?: Size;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function onClick() {
    if (state === "loading") return;
    if (audioRef.current && state === "playing") {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState("idle");
      return;
    }
    try {
      setState("loading");
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, voiceId, languageCode }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = (await res.json()) as { url: string };
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      audio.onerror = () => setState("error");
      setState("playing");
      await audio.play();
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1500);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`播放發音：${text}`}
      className={clsx(
        "speaker-button",
        sizeMap[size],
        state === "playing" && "animate-pulseRing",
        state === "error" && "!text-[var(--danger)] !border-red-400/40 !bg-red-500/10",
        className,
      )}
    >
      {state === "loading" ? (
        <Loader2 className={clsx(iconSize[size], "animate-spin")} />
      ) : (
        <Volume2 className={iconSize[size]} />
      )}
    </button>
  );
}
