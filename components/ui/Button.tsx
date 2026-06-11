import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  default:
    "bg-accent text-white hover:bg-accent-hover border border-transparent",
  secondary:
    "bg-bg-subtle text-fg-primary hover:bg-bg-hover border border-border-subtle",
  ghost:
    "bg-transparent text-fg-secondary hover:bg-bg-hover hover:text-fg-primary border border-transparent",
  outline:
    "bg-transparent text-fg-primary hover:bg-bg-hover border border-border-strong",
};

const SIZE: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3 text-[13px]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50",
        VARIANT[variant],
        SIZE[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
