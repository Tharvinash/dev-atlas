"use client";

import * as React from "react";
import { FolderOpen, Lock, RotateCcw } from "lucide-react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { cn } from "@/lib/utils";

interface FolderPickerProps {
  /** "demo" while the bundled sample repo is active, "local" after picking. */
  mode: "demo" | "local";
  /** Repo name to display. "sample-jutro-repo" for demo mode. */
  repoName: string;
  loading: boolean;
  error: string | null;
  supported: boolean;
  onPick: () => void;
  onReset: () => void;
}

export function FolderPicker({
  mode,
  repoName,
  loading,
  error,
  supported,
  onPick,
  onReset,
}: FolderPickerProps) {
  return (
    <div className="border-b border-border-subtle px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
          Repository
        </span>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            mode === "local"
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          )}
        >
          {mode === "local" ? "Local Folder" : "Demo Repo"}
        </Badge>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={onPick}
        disabled={loading || !supported}
        className="w-full justify-center"
      >
        <FolderOpen size={11} />
        {loading ? "Scanning…" : "Select Folder"}
      </Button>
      <div className="mt-2 text-[11px] text-fg-secondary">
        <span className="text-fg-muted">Selected:</span>{" "}
        <span className="font-mono text-fg-primary">{repoName}</span>
      </div>
      {mode === "local" ? (
        <button
          type="button"
          onClick={onReset}
          disabled={loading}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg-primary disabled:opacity-50"
        >
          <RotateCcw size={10} />
          Reset to Demo Repo
        </button>
      ) : null}
      {error ? (
        <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200">
          {error}
        </div>
      ) : null}
      {!supported ? (
        <div className="mt-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2 py-1.5 text-[11px] text-yellow-200">
          Folder selection is supported in Chrome/Edge for this demo.
        </div>
      ) : null}
      <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-fg-muted">
        <Lock size={9} />
        Local-only analysis. Files are not uploaded.
      </div>
    </div>
  );
}
