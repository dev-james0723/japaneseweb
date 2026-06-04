import clsx from "clsx";
import { toFuriganaHtml } from "@/lib/furigana";

type Size = "xs" | "sm" | "md" | "lg";

const sizeClass: Record<Size, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export async function FuriganaText({
  text,
  size = "sm",
  className,
  inline = false,
  preWrap = false,
}: {
  text: string;
  size?: Size;
  className?: string;
  inline?: boolean;
  preWrap?: boolean;
}) {
  const html = await toFuriganaHtml(text);
  const Tag = inline ? "span" : "div";

  return (
    <Tag
      className={clsx(
        "font-jp japanese-ruby leading-relaxed",
        sizeClass[size],
        preWrap && "whitespace-pre-wrap",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
