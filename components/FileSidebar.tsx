"use client";

import * as React from "react";
import {
  Search,
  FileCode2,
  Layers,
  Loader2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import type { RepoFile, RiskLevel } from "@/lib/types";
import { Badge } from "./ui/Badge";
import { cn } from "@/lib/utils";

interface FileSidebarProps {
  files: RepoFile[] | null;
  loading: boolean;
  error: string | null;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
};

export function FileSidebar({
  files,
  loading,
  error,
  selectedPath,
  onSelect,
}: FileSidebarProps) {
  const [query, setQuery] = React.useState("");

  const filtered = (files ?? []).filter(
    (f) =>
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.path.toLowerCase().includes(query.toLowerCase())
  );

  const pages = filtered.filter((f) => f.type === "page");
  const components = filtered.filter((f) => f.type === "component");
  const others = filtered.filter((f) => f.type === "other");

  return (
    <aside className="flex min-h-0 flex-col border-r border-border-subtle bg-bg-panel">
      <div className="px-3 pt-3 pb-2">
        <label className="relative block">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            disabled={!files}
            className="w-full rounded-md border border-border-subtle bg-bg-subtle px-7 py-1.5 text-[12px] text-fg-primary placeholder:text-fg-muted focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
        {error ? (
          <SidebarStatus
            tone="error"
            icon={<AlertCircle size={14} />}
            title="Scan failed"
            detail={error}
          />
        ) : loading ? (
          <SidebarStatus
            tone="muted"
            icon={<Loader2 size={14} className="animate-spin" />}
            title="Indexing sample repository…"
          />
        ) : files && files.length === 0 ? (
          <SidebarStatus
            tone="muted"
            icon={<FolderOpen size={14} />}
            title="No source files found"
            detail="The sample repository contains no .ts or .tsx files."
          />
        ) : (
          <>
            <FileGroup
              label="Pages"
              icon={<Layers size={11} />}
              files={pages}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
            <FileGroup
              label="Components"
              icon={<FileCode2 size={11} />}
              files={components}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
            <FileGroup
              label="Other"
              icon={<FileCode2 size={11} />}
              files={others}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-fg-muted">
                No files match “{query}”.
              </div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}

function SidebarStatus({
  tone,
  icon,
  title,
  detail,
}: {
  tone: "muted" | "error";
  icon: React.ReactNode;
  title: string;
  detail?: string;
}) {
  return (
    <div
      className={cn(
        "mx-2 mt-3 flex flex-col items-start gap-1 rounded-md border px-3 py-3 text-[11.5px]",
        tone === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : "border-border-subtle bg-bg-subtle text-fg-secondary"
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      {detail ? <span className="text-fg-muted">{detail}</span> : null}
    </div>
  );
}

function FileGroup({
  label,
  icon,
  files,
  selectedPath,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  files: RepoFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center gap-1.5 px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
        {icon}
        <span>{label}</span>
        <span className="ml-auto text-fg-muted/70">{files.length}</span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {files.map((f) => (
          <li key={f.path}>
            <FileRow
              file={f}
              active={f.path === selectedPath}
              onSelect={() => onSelect(f.path)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FileRow({
  file,
  active,
  onSelect,
}: {
  file: RepoFile;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full flex-col items-start gap-1 rounded-md border px-2.5 py-2 text-left transition-colors",
        active
          ? "border-accent/40 bg-accent/10"
          : "border-transparent hover:border-border-subtle hover:bg-bg-hover"
      )}
    >
      <div className="flex w-full items-center gap-2">
        <FileCode2
          size={13}
          className={cn(
            "shrink-0",
            active ? "text-accent" : "text-fg-muted group-hover:text-fg-secondary"
          )}
        />
        <span
          className={cn(
            "truncate font-mono text-[12px]",
            active ? "text-fg-primary" : "text-fg-secondary"
          )}
        >
          {file.name}
        </span>
      </div>
      <div className="flex w-full items-center gap-1.5 pl-[21px]">
        <Badge variant="outline" className="text-[10px] capitalize">
          {file.type}
        </Badge>
        <Badge variant={`risk-${file.risk}` as const} className="text-[10px]">
          {RISK_LABEL[file.risk]}
        </Badge>
      </div>
    </button>
  );
}
