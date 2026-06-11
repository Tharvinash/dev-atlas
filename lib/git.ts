import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import { REPO_ROOT, resolveSafePath } from "./repository";
import { getMockAnalysis } from "./mock-data";

const execFileP = promisify(execFile);

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  ticketId: string | null;
}

export interface GitHistory {
  fileName: string;
  path: string;
  lastChangedBy: string | null;
  lastChangedDate: string | null;
  commits: GitCommit[];
  ticketIds: string[];
  source: "real" | "mock";
  /** Present when source==="mock" — short reason why git fell back. */
  fallbackReason?: string;
}

const MAX_COMMITS = 25;
const TICKET_REGEX = /[A-Z][A-Z0-9]+-\d+/g;
const PRETTY_FORMAT = "%h|%an|%ad|%s";

export class GitHistoryError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * Resolve git history for a file inside the sample repo. Falls back to mock
 * data when the repo isn't a git checkout, when git is missing, or when the
 * git invocation fails for any reason.
 */
export async function getGitHistory(relPath: string): Promise<GitHistory> {
  const abs = resolveSafePath(relPath);
  if (!abs) throw new GitHistoryError("Path is outside the sample repository", 400);
  const stat = await fs.stat(abs).catch(() => null);
  if (!stat || !stat.isFile()) throw new GitHistoryError("File not found", 404);

  const fileName = path.basename(relPath);

  const real = await tryRealGitHistory(relPath);
  if (real) return real;

  return mockHistory(fileName, relPath);
}

async function tryRealGitHistory(relPath: string): Promise<GitHistory | null> {
  // Confirm the sample repo is a git checkout before invoking other commands.
  const isRepo = await runGit(["rev-parse", "--is-inside-work-tree"]);
  if (!isRepo.ok || isRepo.stdout.trim() !== "true") return null;

  // Path is relative to REPO_ROOT (e.g. "src/pages/ClaimSummaryPage.tsx") and
  // git is run with cwd=REPO_ROOT, so we pass it through verbatim.
  const log = await runGit([
    "log",
    "--follow",
    `--pretty=format:${PRETTY_FORMAT}`,
    "--date=short",
    `-n`,
    String(MAX_COMMITS),
    "--",
    relPath,
  ]);
  if (!log.ok) return null;
  const commits = parseLog(log.stdout);
  if (commits.length === 0) return null;

  const ticketIds = collectTicketIds(commits);
  const last = commits[0];

  return {
    fileName: path.basename(relPath),
    path: relPath,
    lastChangedBy: last.author,
    lastChangedDate: last.date,
    commits,
    ticketIds,
    source: "real",
  };
}

interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

async function runGit(args: string[]): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileP("git", args, {
      cwd: REPO_ROOT,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
      timeout: 10_000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    return { ok: true, stdout, stderr };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    return {
      ok: false,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      error: e.message,
    };
  }
}

function parseLog(stdout: string): GitCommit[] {
  const out: GitCommit[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.replace(/\r$/, "");
    if (!trimmed) continue;
    const idx1 = trimmed.indexOf("|");
    if (idx1 < 0) continue;
    const idx2 = trimmed.indexOf("|", idx1 + 1);
    if (idx2 < 0) continue;
    const idx3 = trimmed.indexOf("|", idx2 + 1);
    if (idx3 < 0) continue;
    const hash = trimmed.slice(0, idx1);
    const author = trimmed.slice(idx1 + 1, idx2);
    const date = trimmed.slice(idx2 + 1, idx3);
    const message = trimmed.slice(idx3 + 1);
    out.push({
      hash,
      author,
      date,
      message,
      ticketId: extractFirstTicketId(message),
    });
  }
  return out;
}

function extractFirstTicketId(message: string): string | null {
  const m = message.match(TICKET_REGEX);
  return m && m.length > 0 ? m[0] : null;
}

function collectTicketIds(commits: GitCommit[]): string[] {
  const seen = new Set<string>();
  for (const c of commits) {
    const matches = c.message.match(TICKET_REGEX);
    if (!matches) continue;
    for (const id of matches) seen.add(id);
  }
  return [...seen].sort();
}

/* ------------------------------------------------------------------ */
/* Mock fallback                                                      */
/* ------------------------------------------------------------------ */

function mockHistory(fileName: string, relPath: string): GitHistory {
  const fromMock = getMockAnalysis(fileName);
  const commits: GitCommit[] = fromMock?.commits.length
    ? fromMock.commits.map((c) => ({
        hash: c.id,
        author: c.author,
        date: c.date,
        message: c.message + (c.ticketId ? ` (${c.ticketId})` : ""),
        ticketId: c.ticketId ?? extractFirstTicketId(c.message),
      }))
    : [
        {
          hash: deterministicHash(fileName, 0),
          author: "p.demo",
          date: "2026-05-22",
          message: `Initial scaffolding for ${fileName} (GW-${1000 + nameSeed(fileName) % 900})`,
          ticketId: `GW-${1000 + nameSeed(fileName) % 900}`,
        },
        {
          hash: deterministicHash(fileName, 1),
          author: "j.demo",
          date: "2026-05-14",
          message: `Refine ${fileName.replace(/\.tsx?$/, "")} props and styling`,
          ticketId: null,
        },
      ];

  const ticketIds = collectTicketIds(commits);
  const last = commits[0];

  return {
    fileName,
    path: relPath,
    lastChangedBy: last?.author ?? null,
    lastChangedDate: last?.date ?? null,
    commits,
    ticketIds,
    source: "mock",
    fallbackReason: "sample-jutro-repo is not a git checkout",
  };
}

function nameSeed(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function deterministicHash(name: string, salt: number): string {
  // Pseudo-hash, not a real SHA — just stable across reloads for the demo.
  const seed = nameSeed(name) + salt * 7919;
  return seed.toString(16).padStart(7, "0").slice(0, 7);
}
