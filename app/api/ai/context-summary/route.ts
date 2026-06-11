import { NextRequest, NextResponse } from "next/server";
import {
  generateContextSummary,
  MAX_CODE_CHARS,
  type SummaryAnalysisInput,
  type SummaryConfluenceInput,
  type SummaryGitInput,
  type SummaryInput,
  type SummaryJiraInput,
} from "@/lib/ai-summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 200_000;

export async function POST(req: NextRequest) {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "Unable to read request body" }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const input = normalize(body as Record<string, unknown>);
  if (!input) {
    return NextResponse.json(
      { error: "Missing required fields: fileName, filePath" },
      { status: 400 }
    );
  }

  const result = await generateContextSummary(input);
  return NextResponse.json(result);
}

function normalize(body: Record<string, unknown>): SummaryInput | null {
  const fileName = stringOr(body.fileName, "");
  const filePath = stringOr(body.filePath, "");
  if (!fileName || !filePath) return null;

  const codeRaw = stringOr(body.code, "");
  const code =
    codeRaw.length > MAX_CODE_CHARS ? codeRaw.slice(0, MAX_CODE_CHARS) : codeRaw;

  const analysis = normalizeAnalysis(body.analysis);
  const gitHistory = normalizeGit(body.gitHistory);
  const jiraTickets = normalizeJira(body.jiraTickets);
  const confluenceDocs = normalizeConfluence(body.confluenceDocs);
  const riskLevel = normalizeRisk(body.riskLevel);

  return {
    fileName,
    filePath,
    code,
    analysis,
    gitHistory,
    jiraTickets,
    confluenceDocs,
    riskLevel,
  };
}

function normalizeAnalysis(value: unknown): SummaryAnalysisInput {
  const obj = isObject(value) ? value : {};
  return {
    jutroComponents: asStringArray(obj.jutroComponents),
    customComponents: asStringArray(obj.customComponents),
    localDependencies: asStringArray(obj.localDependencies),
    externalDependencies: asStringArray(obj.externalDependencies),
    apiCalls: asStringArray(obj.apiCalls),
    hooks: asStringArray(obj.hooks),
    exportedComponents: asStringArray(obj.exportedComponents),
    usedBy: asStringArray(obj.usedBy),
    impactSummary: stringOr(obj.impactSummary, ""),
  };
}

function normalizeGit(value: unknown): SummaryGitInput | null {
  if (!isObject(value)) return null;
  const source = value.source === "real" ? "real" : "mock";
  return {
    source,
    lastChangedBy: typeof value.lastChangedBy === "string" ? value.lastChangedBy : null,
    lastChangedDate: typeof value.lastChangedDate === "string" ? value.lastChangedDate : null,
    commitCount:
      typeof value.commitCount === "number" && Number.isFinite(value.commitCount)
        ? Math.max(0, Math.floor(value.commitCount))
        : 0,
    ticketIds: asStringArray(value.ticketIds),
  };
}

function normalizeJira(value: unknown): SummaryJiraInput[] {
  if (!Array.isArray(value)) return [];
  const out: SummaryJiraInput[] = [];
  for (const item of value) {
    if (!isObject(item)) continue;
    out.push({
      id: stringOr(item.id, ""),
      title: stringOr(item.title, ""),
      status: stringOr(item.status, "Unknown"),
      type: stringOr(item.type, "Unknown"),
      source: item.source === "real" ? "real" : "fallback",
    });
  }
  return out.filter((t) => t.id);
}

function normalizeConfluence(value: unknown): SummaryConfluenceInput[] {
  if (!Array.isArray(value)) return [];
  const out: SummaryConfluenceInput[] = [];
  for (const item of value) {
    if (!isObject(item)) continue;
    out.push({
      title: stringOr(item.title, ""),
      description: stringOr(item.description, ""),
      matchedKeywords: asStringArray(item.matchedKeywords),
    });
  }
  return out.filter((d) => d.title);
}

function normalizeRisk(value: unknown): "low" | "medium" | "high" {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}
