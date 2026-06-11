"use client";

import * as React from "react";
import {
  Sparkles,
  Boxes,
  Component as ComponentIcon,
  GitCommit,
  Ticket,
  BookOpen,
  AlertTriangle,
  ShieldAlert,
  ExternalLink,
  Loader2,
  AlertCircle,
  Activity,
  Plug,
  Workflow,
  User,
  Hash,
  Bot,
  Check,
} from "lucide-react";
import type { FileView, ImpactScoreSnapshot, RiskLevel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { AskDevAtlas } from "./AskDevAtlas";
import type {
  AiContextSummaryResponse,
  ConfluenceDocMatch,
  GitHistoryResponse,
  JiraTicketDetail,
} from "./AppShell";

interface InsightPanelProps {
  file: FileView;
  impactScore: ImpactScoreSnapshot | null;
  analysisLoading: boolean;
  analysisError: string | null;
  gitHistory: GitHistoryResponse | null;
  gitLoading: boolean;
  gitError: string | null;
  jiraTickets: JiraTicketDetail[] | null;
  jiraLoading: boolean;
  jiraError: string | null;
  confluenceDocs: ConfluenceDocMatch[] | null;
  confluenceLoading: boolean;
  confluenceError: string | null;
  aiSummary: AiContextSummaryResponse | null;
  aiLoading: boolean;
  aiError: string | null;
}

export function InsightPanel({
  file,
  impactScore,
  analysisLoading,
  analysisError,
  gitHistory,
  gitLoading,
  gitError,
  jiraTickets,
  jiraLoading,
  jiraError,
  confluenceDocs,
  confluenceLoading,
  confluenceError,
  aiSummary,
  aiLoading,
  aiError,
}: InsightPanelProps) {
  const a = file.analysis;
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden border-l border-border-subtle bg-bg-panel">
      <header className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <span className="text-[13px] font-semibold tracking-tight">
            Unified Engineering Context
          </span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {analysisLoading
            ? "Analyzing"
            : analysisError
            ? "Limited"
            : a.isAnalyzed
            ? "Live"
            : a.isFallback
            ? "Limited"
            : "Live"}
        </Badge>
      </header>

      <AnalysisStatusBanner loading={analysisLoading} error={analysisError} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {/* AI Context Summary (Claude or deterministic fallback) */}
          <AiContextSummaryCard
            summary={aiSummary}
            loading={aiLoading}
            error={aiError}
            staticAiSummary={a.aiSummary}
          />

          {/* Why This Code Exists — deterministic narrative tying commits, tickets, docs */}
          <WhyChangedCard
            fileName={file.name}
            gitHistory={gitHistory}
            jiraTickets={jiraTickets}
            confluenceDocs={confluenceDocs}
          />

          {/* AI Recommendation — actionable advice keyed to the impact tier */}
          <AiRecommendationCard
            impactScore={impactScore}
            fileRisk={file.risk}
            usedBy={a.usedBy}
            customComponents={a.customComponents}
            apiCalls={a.apiCalls}
            jiraTicketIds={gitHistory?.ticketIds ?? []}
          />

          {/* Ask DevAtlas — free-form Q&A grounded in all the assembled context */}
          <AskDevAtlas
            file={file}
            impactScore={impactScore}
            gitHistory={gitHistory}
            jiraTickets={jiraTickets}
            confluenceDocs={confluenceDocs}
            analysis={{
              jutroComponents: a.jutroComponents,
              customComponents: a.customComponents,
              localDependencies: a.dependencies,
              externalDependencies: [],
              apiCalls: a.apiCalls,
              hooks: a.hooks,
              exportedComponents: a.exportedComponents,
              usedBy: a.usedBy,
              impactSummary: a.impactSummary,
            }}
          />

          {/* OOTB Jutro Components */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-1.5">
                  <Boxes size={11} className="text-blue-300" />
                  OOTB Jutro Components
                </span>
              </CardTitle>
              <span className="text-[11px] text-fg-muted">
                {a.jutroComponents.length}
              </span>
            </CardHeader>
            <CardContent>
              {a.jutroComponents.length === 0 ? (
                <EmptyHint>None detected.</EmptyHint>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {a.jutroComponents.map((c) => (
                    <Badge key={c} variant="jutro">{c}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Components */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-1.5">
                  <ComponentIcon size={11} className="text-purple-300" />
                  Custom Components
                </span>
              </CardTitle>
              <span className="text-[11px] text-fg-muted">
                {a.customComponents.length}
              </span>
            </CardHeader>
            <CardContent>
              {a.customComponents.length === 0 ? (
                <EmptyHint>No custom components — pure Jutro composition.</EmptyHint>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {a.customComponents.map((c) => (
                    <Badge key={c} variant="custom">{c}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hooks (analyzer-derived) */}
          {a.isAnalyzed ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-1.5">
                    <Activity size={11} className="text-emerald-300" />
                    Hooks
                  </span>
                </CardTitle>
                <span className="text-[11px] text-fg-muted">{a.hooks.length}</span>
              </CardHeader>
              <CardContent>
                {a.hooks.length === 0 ? (
                  <EmptyHint>No React hooks detected.</EmptyHint>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {a.hooks.map((h) => (
                      <Badge key={h} variant="git" className="font-mono">{h}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* API call sites (analyzer-derived) */}
          {a.isAnalyzed ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-1.5">
                    <Plug size={11} className="text-amber-300" />
                    API Calls
                  </span>
                </CardTitle>
                <span className="text-[11px] text-fg-muted">{a.apiCalls.length}</span>
              </CardHeader>
              <CardContent>
                {a.apiCalls.length === 0 ? (
                  <EmptyHint>No API call sites detected.</EmptyHint>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {a.apiCalls.map((c) => (
                      <Badge key={c} variant="custom" className="font-mono">{c}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Exported components (analyzer-derived) */}
          {a.isAnalyzed && a.exportedComponents.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-1.5">
                    <Workflow size={11} className="text-cyan-300" />
                    Exports
                  </span>
                </CardTitle>
                <span className="text-[11px] text-fg-muted">
                  {a.exportedComponents.length}
                </span>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {a.exportedComponents.map((e) => (
                    <Badge key={e} variant="confluence" className="font-mono">{e}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Last Changed By */}
          <LastChangedCard
            history={gitHistory}
            loading={gitLoading}
            error={gitError}
          />

          {/* Recent Git History (live or mock fallback) */}
          <GitHistoryCard
            history={gitHistory}
            loading={gitLoading}
            error={gitError}
            mockCommits={a.commits}
          />

          {/* Extracted Ticket IDs (from commit messages) */}
          <TicketIdsCard
            history={gitHistory}
            loading={gitLoading}
            error={gitError}
          />

          {/* Linked Jira Tickets (resolved from extracted Git ticket IDs) */}
          <JiraTicketsCard
            tickets={jiraTickets}
            loading={jiraLoading}
            error={jiraError}
          />

          {/* Related Confluence Docs (resolved by keyword search) */}
          <ConfluenceDocsCard
            docs={confluenceDocs}
            loading={confluenceLoading}
            error={confluenceError}
          />

          {/* Impact Summary (engine-driven) */}
          <ImpactSummaryCard
            file={file}
            impactScore={impactScore}
          />

          {/* Change Confidence */}
          <ChangeConfidenceCard impactScore={impactScore} fileRisk={file.risk} />
        </div>
      </div>
    </aside>
  );
}

function AnalysisStatusBanner({
  loading,
  error,
}: {
  loading: boolean;
  error: string | null;
}) {
  if (!loading && !error) return null;
  return (
    <div
      className={
        error
          ? "flex items-center gap-2 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-[11.5px] text-red-200"
          : "flex items-center gap-2 border-b border-border-subtle bg-bg-subtle px-4 py-2 text-[11.5px] text-fg-secondary"
      }
    >
      {error ? (
        <>
          <AlertCircle size={12} className="text-red-300" />
          <span>Unable to analyze file: {error}</span>
        </>
      ) : (
        <>
          <Loader2 size={12} className="animate-spin text-accent" />
          <span>Analyzing file context…</span>
        </>
      )}
    </div>
  );
}

function AiRecommendationCard({
  impactScore,
  fileRisk,
  usedBy,
  customComponents,
  apiCalls,
  jiraTicketIds,
}: {
  impactScore: ImpactScoreSnapshot | null;
  fileRisk: RiskLevel;
  usedBy: string[];
  customComponents: string[];
  apiCalls: string[];
  jiraTicketIds: string[];
}) {
  const level = impactScore?.riskLevel ?? fileRisk;
  const recs = buildRecommendations({
    level,
    usedBy,
    customComponents,
    apiCalls,
    jiraTicketIds,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <Bot size={11} className="text-accent" />
            AI Recommendation
          </span>
        </CardTitle>
        <Badge variant={`risk-${level}` as const} className="capitalize">
          {level} risk
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-[12px] text-fg-muted">
          {recs.headline}
        </p>
        <ul className="space-y-1.5">
          {recs.items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12.5px] leading-snug text-fg-primary"
            >
              <Check size={11} className="mt-0.5 shrink-0 text-emerald-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function buildRecommendations(args: {
  level: RiskLevel;
  usedBy: string[];
  customComponents: string[];
  apiCalls: string[];
  jiraTicketIds: string[];
}): { headline: string; items: string[] } {
  const consumerHint =
    args.usedBy.length > 0
      ? args.usedBy.length === 1
        ? `1 downstream consumer (${args.usedBy[0]})`
        : `${args.usedBy.length} downstream consumers (e.g. ${args.usedBy.slice(0, 2).join(", ")})`
      : null;

  const customHint =
    args.customComponents.length > 0
      ? args.customComponents.length === 1
        ? `1 embedded custom component (${args.customComponents[0]})`
        : `${args.customComponents.length} embedded custom components (e.g. ${args.customComponents.slice(0, 2).join(", ")})`
      : null;

  const ticketHint =
    args.jiraTicketIds.length > 0
      ? args.jiraTicketIds.slice(0, 3).join(", ")
      : null;

  if (args.level === "low") {
    return {
      headline: "Low risk — straightforward to ship.",
      items: [
        "Safe to modify with normal validation.",
        customHint
          ? `Smoke-test ${customHint} after changes.`
          : "Run the existing test suite and visually verify the rendered output.",
        "Verify UI behavior in the affected surface before merge.",
      ],
    };
  }

  if (args.level === "high") {
    return {
      headline: "High risk — coordinate before changing.",
      items: [
        "Coordinate with the module owner before structural changes.",
        consumerHint
          ? `Walk every consumer end-to-end: ${args.usedBy.slice(0, 4).join(", ")}.`
          : "Confirm there are no out-of-tree consumers in adjacent repos.",
        ticketHint
          ? `Re-read historical context in ${ticketHint} to make sure your change still satisfies acceptance criteria.`
          : "Review the historical commits for any prior decisions that constrain this surface.",
        args.apiCalls.length > 0
          ? `Add regression coverage for the ${args.apiCalls.length} API call site${args.apiCalls.length === 1 ? "" : "s"}.`
          : "Perform full regression testing across affected flows before merging.",
      ],
    };
  }

  return {
    headline: "Medium risk — review before changing.",
    items: [
      consumerHint
        ? `Review the downstream consumers: ${consumerHint}.`
        : "Confirm there are no out-of-tree consumers before structural changes.",
      ticketHint
        ? `Validate the Jira requirements behind the latest changes (${ticketHint}).`
        : "Re-check the linked Jira tickets for the original acceptance criteria.",
      "Execute regression testing on the affected surfaces before merging.",
      customHint
        ? `Smoke-test ${customHint} so contract changes don't ripple.`
        : "Add a visual snapshot or regression test to pin current behavior.",
    ],
  };
}

function WhyChangedCard({
  fileName,
  gitHistory,
  jiraTickets,
  confluenceDocs,
}: {
  fileName: string;
  gitHistory: GitHistoryResponse | null;
  jiraTickets: JiraTicketDetail[] | null;
  confluenceDocs: ConfluenceDocMatch[] | null;
}) {
  // Pick the most recent commit (git history is returned newest-first).
  const latestCommit = gitHistory?.commits[0] ?? null;

  // Prefer the ticket from the latest commit; otherwise the first resolved one.
  const ticketIdFromCommit = latestCommit?.ticketId ?? null;
  const ticket =
    (ticketIdFromCommit
      ? jiraTickets?.find((t) => t.id === ticketIdFromCommit)
      : null) ?? jiraTickets?.[0] ?? null;

  // Prefer the doc with the most matched keywords (already sorted that way).
  const doc = confluenceDocs?.[0] ?? null;

  const narrative = buildWhyNarrative({
    fileName,
    commit: latestCommit,
    ticket,
    ticketIdFromCommit,
    doc,
  });

  const hasAnyEvidence = !!latestCommit || !!ticket || !!doc;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={11} className="text-accent" />
            Why This Code Exists
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasAnyEvidence ? (
          <p className="text-[13px] leading-relaxed text-fg-secondary">
            {narrative}
          </p>
        ) : (
          <EmptyHint>
            No commit, ticket, or documentation evidence is available for this file yet.
          </EmptyHint>
        )}
        {hasAnyEvidence ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {ticket ? (
              <Badge variant="jira" className="font-mono">{ticket.id}</Badge>
            ) : ticketIdFromCommit ? (
              <Badge variant="jira" className="font-mono">{ticketIdFromCommit}</Badge>
            ) : null}
            {latestCommit ? (
              <Badge variant="git" className="font-mono">
                {latestCommit.hash.slice(0, 7)}
              </Badge>
            ) : null}
            {doc ? <Badge variant="confluence">Confluence</Badge> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildWhyNarrative(args: {
  fileName: string;
  commit: GitHistoryResponse["commits"][number] | null;
  ticket: JiraTicketDetail | null;
  ticketIdFromCommit: string | null;
  doc: ConfluenceDocMatch | null;
}): string {
  const parts: string[] = [];
  const ticketRef =
    args.ticket?.id ?? args.ticketIdFromCommit ?? null;

  // Sentence 1: ticket → file (use the ticket title when we have it).
  if (ticketRef && args.ticket) {
    parts.push(
      `${ticketRef} introduced "${args.ticket.title}" in ${args.fileName}.`
    );
  } else if (ticketRef) {
    parts.push(`${ticketRef} drove the latest changes to ${args.fileName}.`);
  } else if (args.commit) {
    parts.push(
      `${args.fileName} was last shaped by the commit "${args.commit.message}".`
    );
  } else {
    parts.push(
      `${args.fileName} has no commit-linked work item recorded in this repository.`
    );
  }

  // Sentence 2: author + commit message context.
  if (args.commit) {
    const who = args.commit.author && args.commit.author !== "unknown"
      ? args.commit.author
      : null;
    if (who && ticketRef) {
      parts.push(
        `The change was made by ${who} on ${args.commit.date} ("${args.commit.message}").`
      );
    } else if (who) {
      parts.push(`The change was made by ${who} on ${args.commit.date}.`);
    } else if (ticketRef) {
      parts.push(`Latest commit message: "${args.commit.message}".`);
    }
  }

  // Sentence 3: documentation pointer.
  if (args.doc) {
    parts.push(
      `Background and acceptance criteria live in the "${args.doc.title}" documentation.`
    );
  }

  return parts.join(" ");
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] italic text-fg-muted">{children}</p>;
}

function ImpactSummaryCard({
  file,
  impactScore,
}: {
  file: FileView;
  impactScore: ImpactScoreSnapshot | null;
}) {
  const a = file.analysis;
  // Counts always come from the analyzer view (or 0 when unavailable). The
  // engine provides the score, level, and explanation only when analysis ran.
  const counts = impactScore?.counts ?? {
    dependencyCount: a.dependencies.length,
    usedByCount: a.usedBy.length,
    apiCallCount: a.apiCalls.length,
    customComponentCount: a.customComponents.length,
    jutroComponentCount: a.jutroComponents.length,
  };
  const score = impactScore?.riskScore ?? null;
  const level = impactScore?.riskLevel ?? file.risk;
  const explanation = impactScore?.explanation ?? a.impactSummary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle size={11} className="text-amber-300" />
            Change Impact
          </span>
        </CardTitle>
        <Badge variant={`risk-${level}` as const} className="capitalize">
          {level}
        </Badge>
      </CardHeader>
      <CardContent>
        {score !== null ? (
          <ImpactScoreBar score={score} level={level} />
        ) : (
          <p className="text-[11.5px] italic text-fg-muted">
            Score will be computed once static analysis completes.
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
          <CountRow label="Used by" value={counts.usedByCount} tone="usedBy" />
          <CountRow label="API calls" value={counts.apiCallCount} tone="api" />
          <CountRow
            label="Local deps"
            value={counts.dependencyCount}
            tone="dependency"
          />
          <CountRow
            label="Custom components"
            value={counts.customComponentCount}
            tone="custom"
          />
          <CountRow
            label="Jutro OOTB"
            value={counts.jutroComponentCount}
            tone="jutro"
          />
        </div>

        <div className="mt-3">
          <SectionLabel>Risk Drivers</SectionLabel>
          <ul className="mt-1 space-y-1">
            <RiskDriver
              label="Local dependencies"
              value={counts.dependencyCount}
            />
            <RiskDriver
              label="Custom components"
              value={counts.customComponentCount}
            />
            <RiskDriver
              label="Downstream consumers"
              value={counts.usedByCount}
            />
            <RiskDriver
              label="API integrations"
              value={counts.apiCallCount}
            />
          </ul>
        </div>

        <p className="mt-3 text-[12.5px] leading-relaxed text-fg-secondary">
          {explanation}
        </p>

        {a.usedBy.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] uppercase tracking-wider text-fg-muted">
              Downstream
            </span>
            {a.usedBy.map((u) => (
              <Badge key={u} variant="custom" className="font-mono">
                {u}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ImpactScoreBar({
  score,
  level,
}: {
  score: number;
  level: RiskLevel;
}) {
  const fillClass =
    level === "high"
      ? "bg-red-500/70"
      : level === "medium"
      ? "bg-yellow-500/70"
      : "bg-emerald-500/70";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10.5px] uppercase tracking-wider text-fg-muted">
          Risk score
        </span>
        <span className="font-mono text-[14px] font-semibold tabular-nums text-fg-primary">
          {score}
          <span className="text-fg-muted">/100</span>
        </span>
      </div>
      <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
        <div
          className={`h-full ${fillClass} transition-all`}
          style={{ width: `${score}%` }}
        />
        {/* Threshold ticks at 30 and 65 to show the level boundaries. */}
        <div className="absolute inset-y-0 left-[31%] w-px bg-border-strong/60" />
        <div className="absolute inset-y-0 left-[66%] w-px bg-border-strong/60" />
      </div>
      <div className="mt-0.5 flex justify-between text-[9.5px] uppercase tracking-wider text-fg-muted">
        <span>0</span>
        <span className="text-emerald-300/70">low</span>
        <span className="text-yellow-300/70">med</span>
        <span className="text-red-300/70">high</span>
        <span>100</span>
      </div>
    </div>
  );
}

const COUNT_TONE: Record<
  "usedBy" | "api" | "dependency" | "custom" | "jutro",
  string
> = {
  usedBy: "text-red-300",
  api: "text-orange-300",
  dependency: "text-zinc-300",
  custom: "text-purple-300",
  jutro: "text-blue-300",
};

function CountRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof COUNT_TONE;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-md border border-border-subtle bg-bg-subtle px-2 py-1">
      <span className="text-[11px] text-fg-muted">{label}</span>
      <span className={`font-mono text-[13px] font-semibold tabular-nums ${COUNT_TONE[tone]}`}>
        {value}
      </span>
    </div>
  );
}

function RiskDriver({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between gap-3 text-[12.5px] leading-snug">
      <span className="inline-flex items-center gap-1.5 text-fg-secondary">
        <Check size={11} className="shrink-0 text-emerald-300" />
        {label}
      </span>
      <span className="font-mono text-[12.5px] tabular-nums text-fg-primary">
        {value}
      </span>
    </li>
  );
}

function ChangeConfidenceCard({
  impactScore,
  fileRisk,
}: {
  impactScore: ImpactScoreSnapshot | null;
  fileRisk: RiskLevel;
}) {
  // Use engine confidence when available; fall back to a derived one based on
  // the file's mock-or-default risk so the card is always populated.
  const confidence =
    impactScore?.changeConfidence ?? fallbackConfidence(fileRisk);
  const level = impactScore?.riskLevel ?? fileRisk;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <ShieldAlert size={11} className="text-red-300" />
            Developer Confidence
          </span>
        </CardTitle>
        <Badge variant={`risk-${level}` as const} className="capitalize">
          {level}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="mb-2">
          <RiskMeter risk={level} />
        </div>
        <div className="text-[13px] font-semibold leading-snug text-fg-primary">
          {confidence.headline}
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-fg-secondary">
          {confidence.detail}
        </p>
      </CardContent>
    </Card>
  );
}

function fallbackConfidence(level: RiskLevel) {
  switch (level) {
    case "low":
      return {
        headline: "Safe to modify with normal validation",
        detail:
          "Run the existing test suite, sanity-check the rendered output, and ship.",
      };
    case "medium":
      return {
        headline: "Review downstream usages before modifying",
        detail:
          "Skim every consumer in the impact graph, confirm the prop contract still holds, and consider a regression test before merging.",
      };
    case "high":
      return {
        headline: "Requires senior review and regression testing",
        detail:
          "Coordinate with feature owners, walk the dependency graph end-to-end, and extend the test suite to cover the affected surfaces before merging.",
      };
  }
}

function AiContextSummaryCard({
  summary,
  loading,
  error,
  staticAiSummary,
}: {
  summary: AiContextSummaryResponse | null;
  loading: boolean;
  error: string | null;
  /** Mock-supplied per-file blurb shown until the AI summary lands. */
  staticAiSummary: string;
}) {
  const sourceBadge =
    summary?.source === "claude" ? (
      <Badge
        variant="outline"
        className="border-accent/50 bg-accent/15 text-[10px] text-accent"
      >
        <Bot size={9} className="mr-0.5" /> Claude AI
      </Badge>
    ) : summary?.source === "fallback" ? (
      <Badge variant="outline" className="text-[10px]">
        Heuristic
      </Badge>
    ) : null;

  return (
    <div className="rounded-lg bg-gradient-to-br from-accent/30 via-accent/5 to-transparent p-px shadow-[0_0_24px_-8px_rgba(91,141,239,0.45)]">
      <Card className="border-accent/30 bg-gradient-to-br from-accent/10 via-bg-panel to-bg-panel">
        <CardHeader className="pt-4 pb-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-[11.5px] text-accent">
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent/20">
                  <Bot size={11} className="text-accent" />
                </span>
                AI Engineering Brief
              </span>
            </CardTitle>
            <p className="pl-7 text-[10.5px] text-fg-muted">
              Generated from Code · Git · Jira · Confluence
            </p>
          </div>
          {loading ? (
            <Badge
              variant="outline"
              className="border-accent/40 bg-accent/10 text-[10px] text-accent"
            >
              Synthesizing
            </Badge>
          ) : (
            sourceBadge
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-[12.5px] text-fg-secondary">
              <Loader2 size={13} className="animate-spin text-accent" />
              <span>
                DevAtlas AI is synthesizing all engineering context…
              </span>
            </div>
          ) : error ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[12px] text-red-300">
                <AlertCircle size={12} />
                <span>Unable to generate the brief.</span>
              </div>
              <p className="text-[13px] leading-relaxed text-fg-secondary">
                {staticAiSummary}
              </p>
            </div>
          ) : !summary ? (
            <p className="text-[13px] leading-relaxed text-fg-secondary">
              {staticAiSummary}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[14px] font-medium leading-relaxed text-fg-primary">
                {summary.summary}
              </p>
              <BriefSection title="Business Context">
                {summary.businessContext}
              </BriefSection>
              <BriefSection title="Technical Context">
                {summary.technicalContext}
              </BriefSection>
              <BriefSection title="Change History">
                {summary.changeHistorySummary}
              </BriefSection>
              <BriefSection title="Impact Analysis">
                {summary.impactAnalysis}
              </BriefSection>
              <BriefSection title="Risk Explanation">
                {summary.riskExplanation}
              </BriefSection>
              <div>
                <SectionLabel>Recommended Next Steps</SectionLabel>
                {summary.recommendedNextSteps.length === 0 ? (
                  <p className="text-[12.5px] italic text-fg-muted">
                    No recommendations.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {summary.recommendedNextSteps.map((step, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-[12.5px] leading-snug text-fg-primary"
                      >
                        <Check
                          size={11}
                          className="mt-0.5 shrink-0 text-emerald-300"
                        />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BriefSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <p className="mt-1 text-[12.5px] leading-relaxed text-fg-secondary">
        {children}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
      {children}
    </div>
  );
}

const JIRA_STATUS_CLASS: Record<JiraTicketDetail["status"], string> = {
  Open: "text-fg-muted",
  "In Progress": "text-blue-300",
  "In Review": "text-yellow-300",
  Done: "text-emerald-300",
  Unknown: "text-fg-muted",
};

const JIRA_TYPE_CLASS: Record<JiraTicketDetail["type"], string> = {
  Story: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  Bug: "border-red-500/40 bg-red-500/10 text-red-200",
  Task: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  Epic: "border-purple-500/40 bg-purple-500/10 text-purple-200",
  Unknown: "border-border-strong bg-bg-subtle text-fg-muted",
};

function JiraTicketsCard({
  tickets,
  loading,
  error,
}: {
  tickets: JiraTicketDetail[] | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <Ticket size={11} className="text-yellow-300" />
            Linked Jira Tickets
          </span>
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-fg-muted">
            Linked from Git commits
          </span>
          <span className="text-[11px] text-fg-muted">
            {tickets?.length ?? 0}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-[12px] text-fg-muted">
            <Loader2 size={12} className="animate-spin text-accent" />
            <span>Loading Jira context…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-[12px] text-red-300">
            <AlertCircle size={12} />
            <span>Unable to load Jira tickets.</span>
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <EmptyHint>
            No Jira ticket IDs were extracted from this file&apos;s commit history.
          </EmptyHint>
        ) : (
          <ul className="flex flex-col gap-2">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-border-subtle bg-bg-subtle px-2.5 py-2"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="jira" className="font-mono">{t.id}</Badge>
                  <span
                    className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${JIRA_TYPE_CLASS[t.type]}`}
                  >
                    {t.type}
                  </span>
                  <span
                    className={`text-[10.5px] uppercase tracking-wider ${JIRA_STATUS_CLASS[t.status]}`}
                  >
                    {t.status}
                  </span>
                  {t.source === "fallback" ? (
                    <Badge variant="outline" className="text-[10px]">
                      Sample
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-1.5 text-[12.5px] font-medium leading-snug text-fg-primary">
                  {t.title}
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-fg-secondary">
                  {t.summary}
                </p>
                <div className="mt-1 text-[11px] text-fg-muted">
                  Assignee · {t.assignee}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ConfluenceDocsCard({
  docs,
  loading,
  error,
}: {
  docs: ConfluenceDocMatch[] | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={11} className="text-cyan-300" />
            Knowledge Sources
          </span>
        </CardTitle>
        <span className="text-[11px] text-fg-muted">{docs?.length ?? 0}</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-[12px] text-fg-muted">
            <Loader2 size={12} className="animate-spin text-accent" />
            <span>Searching documentation…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-[12px] text-red-300">
            <AlertCircle size={12} />
            <span>Unable to search documentation.</span>
          </div>
        ) : !docs || docs.length === 0 ? (
          <EmptyHint>No related documentation found.</EmptyHint>
        ) : (
          <ul className="flex flex-col gap-2">
            {docs.map((d) => (
              <li
                key={d.url}
                className="rounded-md border border-border-subtle bg-bg-subtle px-2.5 py-2"
              >
                <div className="flex items-center gap-1.5">
                  <Badge variant="confluence">Confluence</Badge>
                </div>
                <div className="mt-1.5 text-[12.5px] font-medium leading-snug text-fg-primary">
                  {d.title}
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-fg-secondary">
                  {d.description}
                </p>
                {d.matchedKeywords.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-fg-muted">
                      Matched
                    </span>
                    {d.matchedKeywords.map((k) => (
                      <Badge
                        key={k}
                        variant="outline"
                        className="border-cyan-500/40 bg-cyan-500/10 text-[10px] text-cyan-200"
                      >
                        {k}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <div className="mt-1.5">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11.5px] font-medium text-cyan-300 hover:text-cyan-200"
                  >
                    Open doc
                    <ExternalLink size={10} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function GitSourceBadge({ source }: { source: "real" | "mock" }) {
  return source === "mock" ? (
    <Badge variant="outline" className="text-[10px]">
      Sample
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-300"
    >
      Live
    </Badge>
  );
}

function LastChangedCard({
  history,
  loading,
  error,
}: {
  history: GitHistoryResponse | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <User size={11} className="text-blue-300" />
            Last Changed By
          </span>
        </CardTitle>
        {history ? <GitSourceBadge source={history.source} /> : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-[12px] text-fg-muted">
            <Loader2 size={12} className="animate-spin text-accent" />
            <span>Loading Git history…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-[12px] text-red-300">
            <AlertCircle size={12} />
            <span>Unable to load Git history.</span>
          </div>
        ) : !history || !history.lastChangedBy ? (
          <EmptyHint>No history yet.</EmptyHint>
        ) : (
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[15px] font-semibold tracking-tight text-fg-primary">
              {history.lastChangedBy}
            </div>
            <div className="text-[11px] text-fg-muted">
              last edit · {history.lastChangedDate}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GitHistoryCard({
  history,
  loading,
  error,
  mockCommits,
}: {
  history: GitHistoryResponse | null;
  loading: boolean;
  error: string | null;
  mockCommits: { id: string; author: string; date: string; message: string; ticketId: string }[];
}) {
  // Render priority: API result (real or mock) → analyzer/mock entry's commits.
  const apiCommits = history?.commits ?? null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <GitCommit size={11} className="text-emerald-300" />
            Recent Git History
          </span>
        </CardTitle>
        <div className="flex items-center gap-1.5">
          {history ? <GitSourceBadge source={history.source} /> : null}
          <span className="text-[11px] text-fg-muted">
            {(apiCommits ?? mockCommits).length}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-[12px] text-fg-muted">
            <Loader2 size={12} className="animate-spin text-accent" />
            <span>Loading Git history…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-[12px] text-red-300">
            <AlertCircle size={12} />
            <span>Unable to load Git history.</span>
          </div>
        ) : apiCommits && apiCommits.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {apiCommits.map((c) => (
              <li
                key={c.hash}
                className="rounded-md border border-border-subtle bg-bg-subtle px-2.5 py-2"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="git" className="font-mono">
                    {c.hash.slice(0, 7)}
                  </Badge>
                  {c.ticketId ? (
                    <Badge variant="jira" className="font-mono">
                      {c.ticketId}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[12.5px] leading-snug text-fg-primary">
                  {c.message}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-fg-muted">
                  <span>{c.author}</span>
                  <span>·</span>
                  <span>{c.date}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : mockCommits.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {mockCommits.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-border-subtle bg-bg-subtle px-2.5 py-2"
              >
                <div className="flex items-center gap-1.5">
                  <Badge variant="git" className="font-mono">
                    {c.id.slice(0, 7)}
                  </Badge>
                  <Badge variant="jira" className="font-mono">
                    {c.ticketId}
                  </Badge>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-snug text-fg-primary">
                  {c.message}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-fg-muted">
                  <span>{c.author}</span>
                  <span>·</span>
                  <span>{c.date}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyHint>No commits available for this file.</EmptyHint>
        )}
      </CardContent>
    </Card>
  );
}

function TicketIdsCard({
  history,
  loading,
  error,
}: {
  history: GitHistoryResponse | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <Hash size={11} className="text-yellow-300" />
            Extracted Ticket IDs
          </span>
        </CardTitle>
        <div className="flex items-center gap-1.5">
          {history ? <GitSourceBadge source={history.source} /> : null}
          <span className="text-[11px] text-fg-muted">
            {history?.ticketIds.length ?? 0}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-[12px] text-fg-muted">
            <Loader2 size={12} className="animate-spin text-accent" />
            <span>Loading Git history…</span>
          </div>
        ) : error ? (
          <EmptyHint>Unable to extract ticket IDs.</EmptyHint>
        ) : !history || history.ticketIds.length === 0 ? (
          <EmptyHint>No ticket IDs detected in commit messages.</EmptyHint>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {history.ticketIds.map((id) => (
              <Badge key={id} variant="jira" className="font-mono">
                {id}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RiskMeter({ risk }: { risk: RiskLevel }) {
  const segments: { label: string; key: RiskLevel; barClass: string; textClass: string }[] = [
    { label: "Low", key: "low", barClass: "bg-emerald-500/70", textClass: "text-emerald-300" },
    { label: "Medium", key: "medium", barClass: "bg-yellow-500/70", textClass: "text-yellow-300" },
    { label: "High", key: "high", barClass: "bg-red-500/70", textClass: "text-red-300" },
  ];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-bg-subtle">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`flex-1 ${s.key === risk ? s.barClass : "bg-border-subtle"}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10.5px] uppercase tracking-wider text-fg-muted">
        {segments.map((s) => (
          <span
            key={s.key}
            className={s.key === risk ? `${s.textClass} font-semibold` : ""}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
