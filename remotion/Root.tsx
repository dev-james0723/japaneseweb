import { Composition } from "remotion";
import { CulturalArticleRecap } from "../components/remotion/CulturalArticleRecap";
import {
  CULTURAL_ARTICLE_RECAP_COMPOSITION,
  CULTURAL_ARTICLE_RECAP_DEFAULT_PROPS,
} from "../lib/motion/culturalArticleRecapConfig";

export function RemotionRoot() {
  return (
    <Composition
      id={CULTURAL_ARTICLE_RECAP_COMPOSITION.id}
      component={CulturalArticleRecap}
      durationInFrames={CULTURAL_ARTICLE_RECAP_COMPOSITION.durationInFrames}
      fps={CULTURAL_ARTICLE_RECAP_COMPOSITION.fps}
      width={CULTURAL_ARTICLE_RECAP_COMPOSITION.width}
      height={CULTURAL_ARTICLE_RECAP_COMPOSITION.height}
      defaultProps={CULTURAL_ARTICLE_RECAP_DEFAULT_PROPS}
    />
  );
}
