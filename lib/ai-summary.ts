import Anthropic from "@anthropic-ai/sdk";

export type AiSource = "claude" | "fallback";

export interface AiContextSummary {
  source: AiSource;
  summary: string;
  businessContext: string;
  technicalContext: string;
  changeHistorySummary: string;
  impactAnalysis: string;
  riskExplanation: string;
  recommendedNextSteps: string[];
  /** Optional model id used; only set when source === "claude". */
  model?: string;
  /** When source === "fallback", a short reason — for UI/debug only. */
  fallbackReason?: string;
}

/** What the route hands us. Server-side after path validation + truncation. */
export interface SummaryInput {
  fileName: string;
  filePath: string;
  /** Source code, already truncated to MAX_CODE_CHARS. */
  code: string;
  analysis: SummaryAnalysisInput;
  gitHistory: SummaryGitInput | null;
  jiraTickets: SummaryJiraInput[];
  confluenceDocs: SummaryConfluenceInput[];
  riskLevel: "low" | "medium" | "high";
}

export interface SummaryAnalysisInput {
  jutroComponents: string[];
  customComponents: string[];
  localDependencies: string[];
  externalDependencies: string[];
  apiCalls: string[];
  hooks: string[];
  exportedComponents: string[];
  usedBy: string[];
  impactSummary: string;
}

export interface SummaryGitInput {
  source: "real" | "mock";
  lastChangedBy: string | null;
  lastChangedDate: string | null;
  commitCount: number;
  ticketIds: string[];
}

export interface SummaryJiraInput {
  id: string;
  title: string;
  status: string;
  type: string;
  source: "real" | "fallback";
}

export interface SummaryConfluenceInput {
  title: string;
  description: string;
  matchedKeywords: string[];
}

export const MAX_CODE_CHARS = 8000;
const MODEL_ID = "claude-opus-4-8";

export async function generateContextSummary(
  input: SummaryInput
): Promise<AiContextSummary> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return buildFallback(input, "ANTHROPIC_API_KEY not configured");
  }
  try {
    return await callClaude(input, apiKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Claude call failed";
    return buildFallback(input, message);
  }
}

/* ------------------------------------------------------------------ */
/* Claude path                                                        */
/* ------------------------------------------------------------------ */

async function callClaude(
  input: SummaryInput,
  apiKey: string
): Promise<AiContextSummary> {
  const client = new Anthropic({ apiKey });

  const system = SYSTEM_PROMPT;
  const userMessage = renderUserPrompt(input);

  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = extractText(response.content);
  const parsed = tryParseJson(text);
  if (!parsed) {
    throw new Error("Claude returned non-JSON response");
  }
  return {
    source: "claude",
    model: MODEL_ID,
    summary: stringField(parsed.summary, "Summary unavailable."),
    businessContext: stringField(parsed.businessContext, "Business context unavailable."),
    technicalContext: stringField(parsed.technicalContext, "Technical context unavailable."),
    changeHistorySummary: stringField(
      parsed.changeHistorySummary,
      "Change history unavailable."
    ),
    impactAnalysis: stringField(parsed.impactAnalysis, "Impact analysis unavailable."),
    riskExplanation: stringField(parsed.riskExplanation, "Risk explanation unavailable."),
    recommendedNextSteps: stringArrayField(parsed.recommendedNextSteps),
  };
}

const SYSTEM_PROMPT = `You are DevAtlas, an assistant that explains files inside a Guidewire Jutro frontend codebase to engineers who are deciding whether to modify them.

Constraints — follow exactly:
- Use ONLY the data provided in the user message. Do not invent commits, tickets, components, owners, dates, packages, or APIs that are not present in the input.
- When data for a section is missing or sparse, say so plainly (e.g. "No commit history was provided.") instead of speculating.
- Distinguish OOTB Jutro components (imported from @jutro / jutro / @guidewire packages) from custom project components, and reference them by the exact names supplied.
- Risk explanation must be grounded in the supplied risk level, usedBy count, API call count, and custom component count — name the specific signals.
- Recommended next steps must be concrete pre-change actions a developer can take given this file (e.g. files to read, surfaces to verify, owners to consult, tests to inspect). Keep each step actionable and short.

Output format — return a single JSON object, nothing else. No prose before or after, no markdown fences. Schema:
{
  "summary": string,
  "businessContext": string,
  "technicalContext": string,
  "changeHistorySummary": string,
  "impactAnalysis": string,
  "riskExplanation": string,
  "recommendedNextSteps": string[]
}

Field guidance:
- summary: 1-2 sentence developer-friendly explanation of what this file is and why it matters.
- businessContext: what real-world Guidewire workflow this file supports; tie to Jira/Confluence content when present.
- technicalContext: how the file is structured — Jutro vs custom composition, hooks, API calls, key exports.
- changeHistorySummary: who changed it recently and what those changes were about; if no commits, say so.
- impactAnalysis: what consumers depend on it and what breaks downstream when its contract changes.
- riskExplanation: why the risk level is what it is, citing the input signals.
- recommendedNextSteps: 3-5 concrete actions before modifying this file.`;

function renderUserPrompt(input: SummaryInput): string {
  const lines: string[] = [];
  lines.push(`File: ${input.fileName}`);
  lines.push(`Path: ${input.filePath}`);
  lines.push(`Risk level (computed by static analyzer): ${input.riskLevel}`);
  lines.push("");

  lines.push("--- Static analysis ---");
  lines.push(`Jutro components used: ${formatList(input.analysis.jutroComponents)}`);
  lines.push(`Custom components used: ${formatList(input.analysis.customComponents)}`);
  lines.push(`Local dependencies: ${formatList(input.analysis.localDependencies)}`);
  lines.push(`External dependencies: ${formatList(input.analysis.externalDependencies)}`);
  lines.push(`React hooks: ${formatList(input.analysis.hooks)}`);
  lines.push(`API call sites: ${formatList(input.analysis.apiCalls)}`);
  lines.push(`Exports: ${formatList(input.analysis.exportedComponents)}`);
  lines.push(`Used by: ${formatList(input.analysis.usedBy)}`);
  lines.push(`Analyzer impact summary: ${input.analysis.impactSummary || "(none)"}`);
  lines.push("");

  lines.push("--- Git history ---");
  if (!input.gitHistory) {
    lines.push("No git history was provided.");
  } else {
    lines.push(`Source: ${input.gitHistory.source}`);
    lines.push(
      `Last changed by: ${input.gitHistory.lastChangedBy ?? "unknown"} on ${
        input.gitHistory.lastChangedDate ?? "unknown date"
      }`
    );
    lines.push(`Commit count: ${input.gitHistory.commitCount}`);
    lines.push(`Ticket IDs in commits: ${formatList(input.gitHistory.ticketIds)}`);
  }
  lines.push("");

  lines.push("--- Jira tickets ---");
  if (input.jiraTickets.length === 0) {
    lines.push("No Jira tickets were resolved for this file.");
  } else {
    for (const t of input.jiraTickets) {
      lines.push(
        `- ${t.id} [${t.type} / ${t.status}] (${t.source}): ${t.title}`
      );
    }
  }
  lines.push("");

  lines.push("--- Confluence docs ---");
  if (input.confluenceDocs.length === 0) {
    lines.push("No Confluence docs were matched for this file.");
  } else {
    for (const d of input.confluenceDocs) {
      lines.push(
        `- ${d.title} (matched on ${formatList(d.matchedKeywords)}) — ${d.description}`
      );
    }
  }
  lines.push("");

  lines.push(`--- Source code (truncated to ${MAX_CODE_CHARS} characters) ---`);
  lines.push("```tsx");
  lines.push(input.code);
  lines.push("```");

  return lines.join("\n");
}

function extractText(content: Anthropic.ContentBlock[]): string {
  for (const block of content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

function tryParseJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  // Tolerate fenced JSON in case the model wraps it despite instructions.
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");
  try {
    const parsed = JSON.parse(stripped);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* fall through */
  }
  return null;
}

function stringField(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return fallback;
}

function stringArrayField(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

function formatList(items: string[]): string {
  return items.length === 0 ? "(none)" : items.join(", ");
}

/* ------------------------------------------------------------------ */
/* Deterministic fallback                                             */
/* ------------------------------------------------------------------ */

function buildFallback(input: SummaryInput, reason: string): AiContextSummary {
  const fileName = input.fileName;
  const jutroCount = input.analysis.jutroComponents.length;
  const customCount = input.analysis.customComponents.length;
  const usedByCount = input.analysis.usedBy.length;
  const commitCount = input.gitHistory?.commitCount ?? 0;
  const ticketCount = input.jiraTickets.length;
  const docCount = input.confluenceDocs.length;
  const risk = input.riskLevel;

  const summary = `${fileName} composes ${jutroCount} Jutro OOTB component${
    jutroCount === 1 ? "" : "s"
  } with ${customCount} custom component${customCount === 1 ? "" : "s"}, and is referenced by ${usedByCount} other file${
    usedByCount === 1 ? "" : "s"
  } in this repository.`;

  const businessContext = ticketCount === 0
    ? "No Jira correlation is available, so the business intent of this file isn't surfaced here."
    : `Linked to ${ticketCount} Jira ticket${ticketCount === 1 ? "" : "s"} ${joinShort(input.jiraTickets.map((t) => t.id))}.`;

  const techParts: string[] = [];
  if (jutroCount > 0) {
    techParts.push(
      `Jutro primitives: ${joinShort(input.analysis.jutroComponents)}.`
    );
  }
  if (customCount > 0) {
    techParts.push(
      `Custom widgets: ${joinShort(input.analysis.customComponents)}.`
    );
  }
  if (input.analysis.hooks.length > 0) {
    techParts.push(`Hooks: ${joinShort(input.analysis.hooks)}.`);
  }
  if (input.analysis.apiCalls.length > 0) {
    techParts.push(`API call sites: ${joinShort(input.analysis.apiCalls)}.`);
  } else {
    techParts.push("No API call sites detected — this file is presentational.");
  }
  const technicalContext = techParts.join(" ");

  const changeHistorySummary =
    commitCount === 0
      ? "No commit history is available for this file."
      : `${commitCount} commit${commitCount === 1 ? "" : "s"} on record; last edit by ${
          input.gitHistory?.lastChangedBy ?? "unknown"
        } on ${input.gitHistory?.lastChangedDate ?? "unknown date"}.`;

  const impactAnalysis = input.analysis.impactSummary
    ? input.analysis.impactSummary
    : usedByCount === 0
    ? "No detected consumers in this repository — impact is local."
    : `${usedByCount} other file${usedByCount === 1 ? "" : "s"} reference this file directly.`;

  const riskExplanation = explainRisk(risk, {
    usedByCount,
    apiCallCount: input.analysis.apiCalls.length,
    customCount,
  });

  const recommendedNextSteps = buildSteps({
    fileName,
    usedBy: input.analysis.usedBy,
    customComponents: input.analysis.customComponents,
    ticketIds: input.gitHistory?.ticketIds ?? [],
    docCount,
    risk,
  });

  return {
    source: "fallback",
    fallbackReason: reason,
    summary,
    businessContext,
    technicalContext,
    changeHistorySummary,
    impactAnalysis,
    riskExplanation,
    recommendedNextSteps,
  };
}

function joinShort(items: string[], cap = 5): string {
  if (items.length === 0) return "(none)";
  if (items.length <= cap) return items.join(", ");
  return items.slice(0, cap).join(", ") + `, +${items.length - cap} more`;
}

function explainRisk(
  risk: "low" | "medium" | "high",
  signals: { usedByCount: number; apiCallCount: number; customCount: number }
): string {
  const reasons: string[] = [];
  if (signals.usedByCount >= 3) {
    reasons.push(`${signals.usedByCount} consumers in this repository`);
  } else if (signals.usedByCount >= 1) {
    reasons.push(`${signals.usedByCount} consumer${signals.usedByCount === 1 ? "" : "s"}`);
  }
  if (signals.apiCallCount >= 2) {
    reasons.push(`${signals.apiCallCount} API call sites`);
  } else if (signals.apiCallCount === 1) {
    reasons.push("an API call site");
  }
  if (signals.customCount >= 2) {
    reasons.push(`${signals.customCount} embedded custom components`);
  }
  const because = reasons.length > 0 ? ` Driven by: ${reasons.join("; ")}.` : "";
  switch (risk) {
    case "high":
      return `High risk — changes here are likely cross-cutting.${because}`;
    case "medium":
      return `Medium risk — scoped to this file's consumers and embedded widgets.${because}`;
    case "low":
      return `Low risk — visual or leaf-level changes only.${because}`;
  }
}

function buildSteps(args: {
  fileName: string;
  usedBy: string[];
  customComponents: string[];
  ticketIds: string[];
  docCount: number;
  risk: "low" | "medium" | "high";
}): string[] {
  const steps: string[] = [];
  if (args.usedBy.length > 0) {
    steps.push(
      `Open the consumers (${joinShort(args.usedBy, 3)}) and confirm the prop contract you're about to change is still respected.`
    );
  } else {
    steps.push(
      `Confirm there are no out-of-tree consumers of ${args.fileName} (search the broader codebase, not just this sample).`
    );
  }
  if (args.customComponents.length > 0) {
    steps.push(
      `Review the embedded custom components (${joinShort(args.customComponents, 3)}) to make sure your edit doesn't break their contracts.`
    );
  }
  if (args.ticketIds.length > 0) {
    steps.push(
      `Read linked Jira tickets (${joinShort(args.ticketIds, 3)}) for the original business intent before modifying the behavior.`
    );
  }
  if (args.docCount > 0) {
    steps.push(
      "Skim the related Confluence docs in the right panel for the canonical UX flow."
    );
  }
  if (args.risk === "high") {
    steps.push(
      "Coordinate with the feature owners before any structural change — this surface is high-risk."
    );
  } else if (args.risk === "medium") {
    steps.push(
      "Add a regression test or visual snapshot that pins the current behavior before refactoring."
    );
  } else {
    steps.push(
      "Run the existing test suite locally; localized changes are unlikely to ripple."
    );
  }
  return steps.slice(0, 5);
}
