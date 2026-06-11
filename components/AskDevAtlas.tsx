"use client";

import * as React from "react";
import { Bot, Loader2, AlertCircle, Send, Sparkles } from "lucide-react";
import type {
  ConfluenceDocMatch,
  GitHistoryResponse,
  JiraTicketDetail,
} from "./AppShell";
import type { FileView, ImpactScoreSnapshot } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";

interface AskDevAtlasProps {
  file: FileView;
  impactScore: ImpactScoreSnapshot | null;
  gitHistory: GitHistoryResponse | null;
  jiraTickets: JiraTicketDetail[] | null;
  confluenceDocs: ConfluenceDocMatch[] | null;
  /** Pulled from the analyzer fetch in AppShell — same slot the summary uses. */
  analysis: {
    jutroComponents: string[];
    customComponents: string[];
    localDependencies: string[];
    externalDependencies: string[];
    apiCalls: string[];
    hooks: string[];
    exportedComponents: string[];
    usedBy: string[];
    impactSummary: string;
  };
}

interface AskResponse {
  source: "claude" | "fallback";
  answer: string;
  referencedSources: string[];
  model?: string;
  fallbackReason?: string;
  error?: string;
}

interface AnswerState {
  question: string;
  data: AskResponse;
}

const SUGGESTED: string[] = [
  "Why was this file changed?",
  "What could break if I modify this?",
  "Explain this file to a new Jutro developer.",
  "What should I review before changing this?",
  "Which Jira requirements influenced this file?",
];

export function AskDevAtlas({
  file,
  impactScore,
  gitHistory,
  jiraTickets,
  confluenceDocs,
  analysis,
}: AskDevAtlasProps) {
  const [question, setQuestion] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [answer, setAnswer] = React.useState<AnswerState | null>(null);
  const cancelRef = React.useRef(false);

  // When the user switches files, clear any prior answer so it doesn't look
  // like the new file is what was asked about.
  React.useEffect(() => {
    setAnswer(null);
    setError(null);
    setQuestion("");
  }, [file.path]);

  const ask = React.useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      cancelRef.current = false;
      setLoading(true);
      setError(null);
      setAnswer(null);
      try {
        const payload = {
          question: trimmed,
          fileName: file.name,
          filePath: file.path,
          code: file.code,
          analysis,
          gitHistory: gitHistory
            ? {
                source: gitHistory.source,
                lastChangedBy: gitHistory.lastChangedBy,
                lastChangedDate: gitHistory.lastChangedDate,
                commitCount: gitHistory.commits.length,
                ticketIds: gitHistory.ticketIds,
              }
            : null,
          jiraTickets: (jiraTickets ?? []).map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            type: t.type,
            source: t.source,
          })),
          confluenceDocs: (confluenceDocs ?? []).map((d) => ({
            title: d.title,
            description: d.description,
            matchedKeywords: d.matchedKeywords,
          })),
          impact: impactScore
            ? {
                riskScore: impactScore.riskScore,
                riskLevel: impactScore.riskLevel,
                counts: impactScore.counts,
                explanation: impactScore.explanation,
                changeConfidence: impactScore.changeConfidence,
              }
            : null,
          riskLevel: impactScore?.riskLevel ?? file.risk,
        };

        const res = await fetch("/api/ai/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as AskResponse;
        if (cancelRef.current) return;
        if (!res.ok || !json.answer) {
          setError(json.error ?? `Unable to answer (HTTP ${res.status})`);
          return;
        }
        setAnswer({ question: trimmed, data: json });
      } catch (err) {
        if (cancelRef.current) return;
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        if (!cancelRef.current) setLoading(false);
      }
    },
    [
      file.name,
      file.path,
      file.code,
      file.risk,
      analysis,
      gitHistory,
      jiraTickets,
      confluenceDocs,
      impactScore,
    ]
  );

  React.useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-0.5">
          <CardTitle>
            <span className="inline-flex items-center gap-1.5">
              <Bot size={11} className="text-accent" />
              Ask DevAtlas AI
            </span>
          </CardTitle>
          <p className="text-[10.5px] text-fg-muted">
            Ask questions using code, Git, Jira, and Confluence context.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-accent/40 bg-accent/10 text-[10px] text-accent"
        >
          <Bot size={9} className="mr-0.5" />
          Claude AI
        </Badge>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading) ask(question);
          }}
          className="flex items-stretch gap-1.5"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask about ${file.name}…`}
            disabled={loading}
            className="flex-1 rounded-md border border-border-subtle bg-bg-subtle px-2.5 py-1.5 text-[12.5px] text-fg-primary placeholder:text-fg-muted focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
          />
          <Button
            type="submit"
            size="sm"
            disabled={loading || question.trim().length === 0}
          >
            {loading ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <>
                <Send size={11} />
                Ask
              </>
            )}
          </Button>
        </form>

        <div className="mt-2 flex flex-wrap gap-1">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              disabled={loading}
              onClick={() => {
                setQuestion(s);
                ask(s);
              }}
              className={cn(
                "rounded-full border border-border-subtle bg-bg-subtle px-2 py-0.5 text-[11px] text-fg-secondary transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-fg-primary",
                loading && "cursor-not-allowed opacity-50"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-3 rounded-md border border-border-subtle bg-bg-subtle px-2.5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-fg-muted">
              <Loader2 size={12} className="animate-spin text-accent" />
              <span>
                DevAtlas is reasoning over code, Git, Jira, and Confluence…
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-[12px] text-red-200">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : answer ? (
          <AnswerCard answer={answer} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function AnswerCard({ answer }: { answer: AnswerState }) {
  const sourceBadge =
    answer.data.source === "claude" ? (
      <Badge
        variant="outline"
        className="border-accent/40 bg-accent/10 text-[10px] text-accent"
      >
        <Bot size={9} className="mr-0.5" />
        Claude AI
      </Badge>
    ) : (
      <Badge variant="outline" className="text-[10px]">
        Heuristic
      </Badge>
    );

  return (
    <div className="mt-3 rounded-md border border-border-subtle bg-bg-subtle px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] uppercase tracking-wider text-fg-muted">
            You asked
          </div>
          <div className="text-[12.5px] italic leading-snug text-fg-secondary">
            “{answer.question}”
          </div>
        </div>
        {sourceBadge}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-fg-primary">
        {answer.data.answer}
      </p>
      {answer.data.referencedSources.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-fg-muted">
            Sources
          </span>
          {answer.data.referencedSources.map((s) => (
            <Badge key={s} variant="outline" className="text-[10px]">
              {s}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
