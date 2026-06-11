import Anthropic from "@anthropic-ai/sdk";
import type {
  SummaryAnalysisInput,
  SummaryConfluenceInput,
  SummaryGitInput,
  SummaryJiraInput,
} from "./ai-summary";

export type AskSource = "claude" | "fallback";

export interface AskInput {
  question: string;
  fileName: string;
  filePath: string;
  /** Source code, already truncated to MAX_CODE_CHARS by the route. */
  code: string;
  analysis: SummaryAnalysisInput;
  gitHistory: SummaryGitInput | null;
  jiraTickets: SummaryJiraInput[];
  confluenceDocs: SummaryConfluenceInput[];
  impact: AskImpactInput | null;
  riskLevel: "low" | "medium" | "high";
}

export interface AskImpactInput {
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  counts: {
    dependencyCount: number;
    usedByCount: number;
    apiCallCount: number;
    customComponentCount: number;
    jutroComponentCount: number;
  };
  explanation: string;
  changeConfidence: { headline: string; detail: string };
}

export interface AskResult {
  source: AskSource;
  answer: string;
  /** Short labels naming which context buckets were drawn from. */
  referencedSources: string[];
  model?: string;
  fallbackReason?: string;
}

export const MAX_CODE_CHARS = 8000;
export const MAX_QUESTION_CHARS = 1000;
const MODEL_ID = "claude-opus-4-8";

export async function askDevAtlas(input: AskInput): Promise<AskResult> {
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

async function callClaude(input: AskInput, apiKey: string): Promise<AskResult> {
  const client = new Anthropic({ apiKey });

  const userPrompt = renderUserPrompt(input);
  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 1500,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = extractText(response.content);
  const parsed = tryParseJson(text);
  if (!parsed) {
    throw new Error("Claude returned non-JSON response");
  }

  const answer = stringField(parsed.answer, "");
  if (!answer) {
    throw new Error("Claude returned an empty answer");
  }
  const referencedSources = stringArrayField(parsed.referencedSources);

  return {
    source: "claude",
    answer,
    referencedSources,
    model: MODEL_ID,
  };
}

const SYSTEM_PROMPT = `You are DevAtlas, an assistant that answers natural-language questions about a single Guidewire Jutro frontend file using only the context the user supplies.

Hard rules:
- Use ONLY the supplied data (file source, static analysis, git history, Jira tickets, Confluence docs, impact analysis). Do not invent commits, tickets, owners, dates, packages, components, or business facts.
- If the supplied context is missing what's needed to answer, say so plainly — e.g. "No commit history was provided." — instead of guessing.
- Distinguish OOTB Jutro components (imported from @jutro / jutro / @guidewire) from custom project components, by the exact names supplied.
- When the answer touches Jira tickets, Confluence docs, commit authors, custom components, or downstream consumers, name them by their supplied IDs/titles/names.
- Stay concise and developer-friendly. Prefer 2-5 sentences over a long monologue. Use bullet points only when listing items.
- Frame the answer for engineers working in this Guidewire Jutro frontend codebase.

Output format — return a single JSON object, nothing else. No prose before or after, no markdown fences. Schema:
{
  "answer": string,
  "referencedSources": string[]
}

referencedSources should list which context buckets you actually drew from, using ONLY these labels (in any combination): "Source code", "Static analysis", "Git history", "Jira", "Confluence", "Impact analysis". Omit buckets you didn't use. If you couldn't answer due to missing data, return an empty array.`;

function renderUserPrompt(input: AskInput): string {
  const lines: string[] = [];
  lines.push(`Question: ${input.question}`);
  lines.push("");
  lines.push(`File: ${input.fileName}`);
  lines.push(`Path: ${input.filePath}`);
  lines.push(`Risk level (computed): ${input.riskLevel}`);
  lines.push("");

  lines.push("--- Static analysis ---");
  lines.push(`Jutro components: ${formatList(input.analysis.jutroComponents)}`);
  lines.push(`Custom components: ${formatList(input.analysis.customComponents)}`);
  lines.push(`Local dependencies: ${formatList(input.analysis.localDependencies)}`);
  lines.push(`External dependencies: ${formatList(input.analysis.externalDependencies)}`);
  lines.push(`React hooks: ${formatList(input.analysis.hooks)}`);
  lines.push(`API call sites: ${formatList(input.analysis.apiCalls)}`);
  lines.push(`Exports: ${formatList(input.analysis.exportedComponents)}`);
  lines.push(`Used by: ${formatList(input.analysis.usedBy)}`);
  if (input.analysis.impactSummary) {
    lines.push(`Analyzer impact summary: ${input.analysis.impactSummary}`);
  }
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
      lines.push(`- ${t.id} [${t.type} / ${t.status}] (${t.source}): ${t.title}`);
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

  lines.push("--- Impact analysis ---");
  if (!input.impact) {
    lines.push("No impact score was provided.");
  } else {
    lines.push(`Risk score: ${input.impact.riskScore}/100 (${input.impact.riskLevel})`);
    lines.push(
      `Counts — usedBy ${input.impact.counts.usedByCount}, API calls ${input.impact.counts.apiCallCount}, custom components ${input.impact.counts.customComponentCount}, dependencies ${input.impact.counts.dependencyCount}, Jutro components ${input.impact.counts.jutroComponentCount}`
    );
    lines.push(`Explanation: ${input.impact.explanation}`);
    lines.push(`Change confidence: ${input.impact.changeConfidence.headline}. ${input.impact.changeConfidence.detail}`);
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

type Category =
  | "risk"
  | "change-history"
  | "components"
  | "tickets"
  | "tests"
  | "general";

function classifyQuestion(q: string): Category {
  const lower = q.toLowerCase();
  if (
    /(risk|impact|break|safe|blast radius|side effect|regress|cascade)/.test(
      lower
    )
  ) {
    return "risk";
  }
  if (/(why|reason|chang(e|ed)|history|recent|when|who|author)/.test(lower)) {
    return "change-history";
  }
  if (
    /(component|jutro|widget|render|ootb|imports?|dependenc|hook|api call|fetch|axios)/.test(
      lower
    )
  ) {
    return "components";
  }
  if (/(jira|ticket|story|bug|epic|gw-\d+|claim-\d+|jutro-\d+)/.test(lower)) {
    return "tickets";
  }
  if (/(test|verify|check|qa|coverage|regression|review|before)/.test(lower)) {
    return "tests";
  }
  return "general";
}

function buildFallback(input: AskInput, reason: string): AskResult {
  const category = classifyQuestion(input.question);
  const referenced = new Set<string>();
  let answer: string;

  switch (category) {
    case "risk":
      answer = answerRisk(input, referenced);
      break;
    case "change-history":
      answer = answerChangeHistory(input, referenced);
      break;
    case "components":
      answer = answerComponents(input, referenced);
      break;
    case "tickets":
      answer = answerTickets(input, referenced);
      break;
    case "tests":
      answer = answerTests(input, referenced);
      break;
    default:
      answer = answerGeneral(input, referenced);
  }

  return {
    source: "fallback",
    fallbackReason: reason,
    answer,
    referencedSources: [...referenced],
  };
}

function answerRisk(input: AskInput, ref: Set<string>): string {
  if (input.impact) {
    ref.add("Impact analysis");
    const c = input.impact.counts;
    const drivers: string[] = [];
    if (c.usedByCount > 0) drivers.push(`${c.usedByCount} downstream consumer${c.usedByCount === 1 ? "" : "s"}`);
    if (c.apiCallCount > 0) drivers.push(`${c.apiCallCount} API call site${c.apiCallCount === 1 ? "" : "s"}`);
    if (c.customComponentCount > 0) drivers.push(`${c.customComponentCount} custom component${c.customComponentCount === 1 ? "" : "s"}`);
    if (c.dependencyCount > 0) drivers.push(`${c.dependencyCount} local dependenc${c.dependencyCount === 1 ? "y" : "ies"}`);
    const reason = drivers.length === 0
      ? "no significant signals (no consumers, no API calls, no custom widgets, no local dependencies)"
      : drivers.join(", ");
    if (input.analysis.usedBy.length > 0) ref.add("Static analysis");
    return `Risk score is ${input.impact.riskScore}/100 (${input.impact.riskLevel}). Driven by ${reason}. ${input.impact.changeConfidence.headline} — ${input.impact.changeConfidence.detail}`;
  }
  ref.add("Static analysis");
  return `Risk score is not available yet, but static analysis shows ${input.analysis.usedBy.length} consumer(s), ${input.analysis.apiCalls.length} API call site(s), and ${input.analysis.customComponents.length} embedded custom component(s). Treat the change with care if any of those are non-zero.`;
}

function answerChangeHistory(input: AskInput, ref: Set<string>): string {
  const parts: string[] = [];
  if (input.gitHistory && input.gitHistory.commitCount > 0) {
    ref.add("Git history");
    parts.push(
      `Last edited by ${input.gitHistory.lastChangedBy ?? "unknown"} on ${
        input.gitHistory.lastChangedDate ?? "unknown date"
      } across ${input.gitHistory.commitCount} commit${input.gitHistory.commitCount === 1 ? "" : "s"}.`
    );
    if (input.gitHistory.ticketIds.length > 0) {
      ref.add("Jira");
      parts.push(
        `Commits reference: ${input.gitHistory.ticketIds.slice(0, 5).join(", ")}.`
      );
    }
  } else {
    parts.push("No commit history is available for this file.");
  }
  if (input.jiraTickets.length > 0) {
    ref.add("Jira");
    const t = input.jiraTickets[0];
    parts.push(`Latest linked ticket: ${t.id} — "${t.title}" (${t.status}).`);
  }
  if (input.confluenceDocs.length > 0) {
    ref.add("Confluence");
    parts.push(
      `Background lives in "${input.confluenceDocs[0].title}".`
    );
  }
  return parts.join(" ");
}

function answerComponents(input: AskInput, ref: Set<string>): string {
  ref.add("Static analysis");
  const lines: string[] = [];
  if (input.analysis.jutroComponents.length > 0) {
    lines.push(`Jutro OOTB: ${input.analysis.jutroComponents.join(", ")}.`);
  } else {
    lines.push("No OOTB Jutro components detected.");
  }
  if (input.analysis.customComponents.length > 0) {
    lines.push(`Custom: ${input.analysis.customComponents.join(", ")}.`);
  } else {
    lines.push("No custom components composed inline.");
  }
  if (input.analysis.hooks.length > 0) {
    lines.push(`Hooks in use: ${input.analysis.hooks.join(", ")}.`);
  }
  if (input.analysis.apiCalls.length > 0) {
    lines.push(`API call sites: ${input.analysis.apiCalls.join(", ")}.`);
  } else {
    lines.push("No API call sites detected — this file is presentational.");
  }
  return lines.join(" ");
}

function answerTickets(input: AskInput, ref: Set<string>): string {
  if (input.jiraTickets.length === 0) {
    if (input.gitHistory && input.gitHistory.ticketIds.length > 0) {
      ref.add("Git history");
      return `No Jira details were resolved, but commits reference: ${input.gitHistory.ticketIds.join(", ")}.`;
    }
    return "No Jira tickets are linked to this file in the supplied data.";
  }
  ref.add("Jira");
  const lines = input.jiraTickets
    .slice(0, 5)
    .map((t) => `- ${t.id} (${t.status}, ${t.type}): ${t.title}`);
  return `Linked tickets:\n${lines.join("\n")}`;
}

function answerTests(input: AskInput, ref: Set<string>): string {
  const parts: string[] = [];
  if (input.analysis.usedBy.length > 0) {
    ref.add("Static analysis");
    parts.push(
      `Verify the consumers still render correctly: ${input.analysis.usedBy.slice(0, 5).join(", ")}.`
    );
  }
  if (input.analysis.customComponents.length > 0) {
    ref.add("Static analysis");
    parts.push(
      `Smoke-test the embedded custom components: ${input.analysis.customComponents.join(", ")}.`
    );
  }
  if (input.analysis.apiCalls.length > 0) {
    ref.add("Static analysis");
    parts.push(
      `Cover the data path — ${input.analysis.apiCalls.length} API call site(s) detected.`
    );
  }
  if (input.gitHistory && input.gitHistory.ticketIds.length > 0) {
    ref.add("Jira");
    parts.push(
      `Re-read linked tickets (${input.gitHistory.ticketIds.slice(0, 3).join(", ")}) to make sure your change still satisfies their acceptance criteria.`
    );
  }
  if (input.confluenceDocs.length > 0) {
    ref.add("Confluence");
    parts.push(
      `Cross-check against "${input.confluenceDocs[0].title}".`
    );
  }
  if (parts.length === 0) {
    return "No specific signals to validate against — run the standard test suite and visually verify the rendered output.";
  }
  return parts.join(" ");
}

function answerGeneral(input: AskInput, ref: Set<string>): string {
  ref.add("Static analysis");
  const a = input.analysis;
  const lines: string[] = [];
  lines.push(
    `${input.fileName} composes ${a.jutroComponents.length} Jutro OOTB component${a.jutroComponents.length === 1 ? "" : "s"} with ${a.customComponents.length} custom component${a.customComponents.length === 1 ? "" : "s"} and is referenced by ${a.usedBy.length} other file${a.usedBy.length === 1 ? "" : "s"} in this repository.`
  );
  if (input.gitHistory && input.gitHistory.commitCount > 0) {
    ref.add("Git history");
    lines.push(
      `Last edited by ${input.gitHistory.lastChangedBy ?? "unknown"} on ${input.gitHistory.lastChangedDate ?? "unknown date"}.`
    );
  }
  if (input.jiraTickets.length > 0) {
    ref.add("Jira");
    lines.push(
      `Linked Jira context: ${input.jiraTickets.map((t) => t.id).join(", ")}.`
    );
  }
  if (input.confluenceDocs.length > 0) {
    ref.add("Confluence");
    lines.push(
      `Related documentation: "${input.confluenceDocs[0].title}".`
    );
  }
  return lines.join(" ");
}
