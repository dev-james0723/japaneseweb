"use client";

import { Player } from "@remotion/player";
import { CulturalArticleRecap } from "@/components/remotion/CulturalArticleRecap";
import {
  CULTURAL_ARTICLE_RECAP_COMPOSITION,
  type CulturalArticleRecapProps,
} from "@/lib/motion/culturalArticleRecapConfig";

export function CulturalMotionPreview(props: CulturalArticleRecapProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
      <Player
        component={CulturalArticleRecap}
        inputProps={props}
        durationInFrames={CULTURAL_ARTICLE_RECAP_COMPOSITION.durationInFrames}
        compositionWidth={CULTURAL_ARTICLE_RECAP_COMPOSITION.width}
        compositionHeight={CULTURAL_ARTICLE_RECAP_COMPOSITION.height}
        fps={CULTURAL_ARTICLE_RECAP_COMPOSITION.fps}
        controls
        clickToPlay
        loop
        style={{ width: "100%", aspectRatio: "16 / 9" }}
      />
    </div>
  );
}
