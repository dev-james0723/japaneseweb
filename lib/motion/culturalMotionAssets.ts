export type CulturalMotionEngine = "remotion" | "hyperframes";
export type CulturalMotionAssetType = "video" | "image" | "source";
export type CulturalMotionIcon = "film" | "clapperboard" | "image" | "code";

export type CulturalMotionAsset = {
  id: string;
  title: string;
  shortTitle: string;
  engine: CulturalMotionEngine;
  type: CulturalMotionAssetType;
  icon: CulturalMotionIcon;
  href: string;
  meta: string;
  articleMeta: string;
  description: string;
};

export const culturalMotionAssets = [
  {
    id: "remotion-mp4",
    title: "Remotion MP4",
    shortTitle: "Remotion MP4",
    engine: "remotion",
    type: "video",
    icon: "film",
    href: "/renders/cultural-article-recap.mp4",
    meta: "1280x720 · 140 frames",
    articleMeta: "React video render",
    description: "Rendered MP4 from the React Remotion composition.",
  },
  {
    id: "hyperframes-mp4",
    title: "Hyperframes MP4",
    shortTitle: "Hyperframes MP4",
    engine: "hyperframes",
    type: "video",
    icon: "clapperboard",
    href: "/renders/hyperframes-cultural-recap.mp4",
    meta: "1920x1080 · 8 sec",
    articleMeta: "HTML + GSAP export",
    description: "Rendered MP4 from the Hyperframes HTML and GSAP timeline.",
  },
  {
    id: "remotion-still",
    title: "Remotion Still",
    shortTitle: "Remotion Still",
    engine: "remotion",
    type: "image",
    icon: "image",
    href: "/renders/cultural-article-recap-frame60.png",
    meta: "Frame 60 · PNG",
    articleMeta: "Poster frame",
    description: "Still image from frame 60 of the Remotion composition.",
  },
  {
    id: "hyperframes-still",
    title: "Hyperframes Still",
    shortTitle: "HF Still",
    engine: "hyperframes",
    type: "image",
    icon: "image",
    href: "/renders/hyperframes-cultural-recap-frame2.png",
    meta: "Frame 2s · PNG",
    articleMeta: "Poster frame",
    description: "Still image extracted from the Hyperframes render.",
  },
  {
    id: "hyperframes-source",
    title: "Hyperframes Source",
    shortTitle: "Source HTML",
    engine: "hyperframes",
    type: "source",
    icon: "code",
    href: "/api/motion/hyperframes-source",
    meta: "HTML · GSAP timeline",
    articleMeta: "Timeline source",
    description: "Downloadable Hyperframes source HTML for the cultural recap timeline.",
  },
] as const satisfies readonly CulturalMotionAsset[];

export const culturalMotionRenderPreviews = [
  {
    id: "remotion-preview",
    title: "Remotion render",
    subtitle: "React composition · 1280x720",
    src: "/renders/cultural-article-recap.mp4",
    poster: "/renders/cultural-article-recap-frame60.png",
  },
  {
    id: "hyperframes-preview",
    title: "Hyperframes render",
    subtitle: "HTML + GSAP timeline · 1920x1080",
    src: "/renders/hyperframes-cultural-recap.mp4",
    poster: "/renders/hyperframes-cultural-recap-frame2.png",
  },
] as const;

export const culturalMotionPipelineStatus = [
  "remotion:render",
  "remotion:still",
  "motion:check",
  "motion:render",
] as const;

export const culturalMotionManifest = {
  id: "cultural-article-recap",
  title: "Cultural Article Recap",
  engines: ["remotion", "hyperframes"] as const,
  assets: culturalMotionAssets,
  previews: culturalMotionRenderPreviews,
  pipelineStatus: culturalMotionPipelineStatus,
} as const;
