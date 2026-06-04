"use client";

import { Player } from "@remotion/player";
import {
  CulturalArticleRecap,
  type CulturalArticleRecapProps,
} from "@/components/remotion/CulturalArticleRecap";

export function CulturalMotionPreview(props: CulturalArticleRecapProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
      <Player
        component={CulturalArticleRecap}
        inputProps={props}
        durationInFrames={140}
        compositionWidth={1280}
        compositionHeight={720}
        fps={30}
        controls
        clickToPlay
        loop
        style={{ width: "100%", aspectRatio: "16 / 9" }}
      />
    </div>
  );
}
