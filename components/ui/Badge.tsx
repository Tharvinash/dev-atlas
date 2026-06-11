import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "outline"
  | "jutro"
  | "custom"
  | "jira"
  | "git"
  | "confluence"
  | "risk-low"
  | "risk-medium"
  | "risk-high";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-bg-subtle text-fg-secondary border-border-subtle",
  outline: "bg-transparent text-fg-secondary border-border-strong",
  jutro: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  custom: "bg-purple-500/10 text-purple-300 border-purple-500/30",
  jira: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
  git: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  confluence: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  "risk-low": "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  "risk-medium": "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
  "risk-high": "bg-red-500/10 text-red-300 border-red-500/30",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}
