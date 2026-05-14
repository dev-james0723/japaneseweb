import clsx from "clsx";

type Variant = "default" | "dark" | "subtle";

export function GlassPanel({
  variant = "default",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return (
    <div
      className={clsx(
        variant === "default" && "glass-panel",
        variant === "dark" && "glass-panel-dark",
        variant === "subtle" && "glass-panel-subtle",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
