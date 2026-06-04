import {
  CULTURAL_ARTICLE_RECAP_COMPOSITION,
  type CulturalArticleRecapProps,
} from "@/lib/motion/culturalArticleRecapConfig";
import type { CulturalArticleMotionManifest } from "@/lib/motion/culturalArticleMotionManifest";

type CulturalArticleMotionInput = {
  articleId: string;
  titleJa?: string;
  titleZh?: string;
  summaryZh?: string | null;
  vocab?: string[];
  manifest?: CulturalArticleMotionManifest;
};

export function buildCulturalArticleRecapProps({
  titleJa,
  titleZh,
  summaryZh,
  vocab,
  manifest,
}: Omit<CulturalArticleMotionInput, "articleId">): CulturalArticleRecapProps {
  const words = (vocab ?? manifest?.specificity_keywords ?? []).filter(Boolean).slice(0, 4);
  const scenes = manifest?.scenes.slice(0, 3).map((scene) => ({
    headline: scene.headline,
    onScreenText: scene.on_screen_text,
    articleEvidence: scene.article_evidence,
    visualPrompt: scene.visual_prompt,
  }));
  return {
    titleJa: titleJa || manifest?.video_title || "日本文化沉浸",
    titleZh: titleZh || manifest?.scenes[0]?.headline || "一篇文章，幾個可帶走的日文觀察。",
    summaryZh: summaryZh || manifest?.scenes[0]?.on_screen_text || "讀一段文化故事，帶走幾個可以即刻用的日文觀察。",
    vocab: words.length > 0 ? words : ["文化", "語感", "記憶", "日文"],
    specificityKeywords: manifest?.specificity_keywords ?? words,
    scenes,
    visualMood: manifest?.style.mood,
  };
}

export function buildCulturalArticleMotionHandoff(input: CulturalArticleMotionInput) {
  const props = buildCulturalArticleRecapProps(input);
  const firstScene = props.scenes?.[0];
  const secondScene = props.scenes?.[1];
  const hyperframesVariables = {
    title: props.titleJa,
    subtitle: props.titleZh,
    summary: props.summaryZh || "讀一段文化故事，帶走幾個可以即刻用的日文觀察。",
    vocab: props.vocab.join(","),
    keywords: (props.specificityKeywords ?? props.vocab).join(","),
    scene_headline: firstScene?.headline || props.titleZh,
    scene_text: firstScene?.onScreenText || props.summaryZh || "",
    evidence: firstScene?.articleEvidence || secondScene?.articleEvidence || "",
    visual_prompt: firstScene?.visualPrompt || "",
  };
  const outputBase = `cultural-article-recap-${input.articleId}`;

  return {
    articleId: input.articleId,
    composition: CULTURAL_ARTICLE_RECAP_COMPOSITION,
    remotion: {
      props,
      output: `/renders/${outputBase}-remotion.mp4`,
      stillOutput: `/renders/${outputBase}-remotion-frame60.png`,
      renderCommand: [
        "npm exec -- remotion render remotion/index.ts",
        CULTURAL_ARTICLE_RECAP_COMPOSITION.id,
        `public/renders/${outputBase}-remotion.mp4`,
        `--props=${shellJsonArg(props)}`,
      ].join(" "),
      stillCommand: [
        "npm exec -- remotion still remotion/index.ts",
        CULTURAL_ARTICLE_RECAP_COMPOSITION.id,
        `public/renders/${outputBase}-remotion-frame60.png`,
        "--frame=60",
        `--props=${shellJsonArg(props)}`,
      ].join(" "),
    },
    hyperframes: {
      variables: hyperframesVariables,
      output: `/renders/${outputBase}-hyperframes.mp4`,
      renderCommand: [
        "npm --prefix hyperframes/cultural-recap exec -- hyperframes render",
        `--output ../../public/renders/${outputBase}-hyperframes.mp4`,
        `--variables=${shellJsonArg(hyperframesVariables)}`,
        "--strict-variables",
      ].join(" "),
    },
  };
}

export type CulturalArticleMotionHandoff = ReturnType<typeof buildCulturalArticleMotionHandoff>;

function shellJsonArg(value: unknown) {
  return `'${JSON.stringify(value).replaceAll("'", "'\"'\"'")}'`;
}
