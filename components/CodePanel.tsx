import * as React from "react";
import { FileText, GitBranch, Loader2, AlertCircle } from "lucide-react";
import type { FileView } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { ImpactGraph } from "./ImpactGraph";

interface CodePanelProps {
  file: FileView;
  codeLoading: boolean;
  codeError: string | null;
}

export function CodePanel({ file, codeLoading, codeError }: CodePanelProps) {
  return (
    <main className="flex min-h-0 flex-col overflow-hidden bg-bg-base">
      <div className="border-b border-border-subtle bg-bg-panel/70 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-fg-muted">
              <FileText size={12} />
              <span className="truncate font-mono">{file.path}</span>
            </div>
            <h1 className="mt-1 truncate text-lg font-semibold tracking-tight">
              {file.name}
            </h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-fg-secondary">
              {file.analysis.description}
              {file.analysis.isFallback ? (
                <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                  Auto-generated
                </Badge>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline" className="capitalize">
              {file.type}
            </Badge>
            <Badge variant={`risk-${file.risk}` as const}>
              Risk · {file.risk}
            </Badge>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Source preview</CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {extLabel(file.name)}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-fg-muted">
                <GitBranch size={11} />
                <span>local</span>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <CodeBlock code={file.code} loading={codeLoading} error={codeError} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Impact Map</CardTitle>
              <span className="text-[11px] text-fg-muted">
                Dependencies → Target File → Downstream Impact
              </span>
            </CardHeader>
            <CardContent>
              <ImpactGraph file={file} />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function extLabel(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1) : "txt";
}

function CodeBlock({
  code,
  loading,
  error,
}: {
  code: string;
  loading: boolean;
  error: string | null;
}) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div className="overflow-hidden rounded-b-lg border-t border-border-subtle bg-[#0a0c10]">
      <div className="flex items-center gap-1.5 border-b border-border-subtle px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-red-500/60" />
        <span className="h-2 w-2 rounded-full bg-yellow-500/60" />
        <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
      </div>
      {error ? (
        <div className="flex items-center gap-2 px-4 py-6 text-[12px] text-red-300">
          <AlertCircle size={14} />
          <span>Failed to load source: {error}</span>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 px-4 py-6 text-[12px] text-fg-muted">
          <Loader2 size={14} className="animate-spin text-accent" />
          <span>Loading source…</span>
        </div>
      ) : code === "" ? (
        <div className="px-4 py-6 text-[12px] italic text-fg-muted">
          (empty file)
        </div>
      ) : (
        <pre className="overflow-x-auto px-0 py-3 font-mono text-[12px] leading-[1.55]">
          <code className="block">
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span
                  className="select-none px-3 text-right text-fg-muted/60 tabular-nums"
                  style={{ minWidth: "3.25rem" }}
                >
                  {i + 1}
                </span>
                <span className="whitespace-pre pr-6 text-fg-primary">
                  {line || " "}
                </span>
              </div>
            ))}
          </code>
        </pre>
      )}
    </div>
  );
}
