import path from "node:path";
import { promises as fs } from "node:fs";
import type { FileType, RiskLevel } from "./types";

export const REPO_ROOT = path.join(process.cwd(), "sample-jutro-repo");
export const SCAN_ROOT = path.join(REPO_ROOT, "src");

export interface ScannedFile {
  id: string;
  name: string;
  /** Path relative to the repository root (POSIX-style separators). */
  path: string;
  type: FileType;
  risk: RiskLevel;
}

const ALLOWED_EXTS = new Set([".tsx"]);
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
]);

export async function scanRepository(): Promise<ScannedFile[]> {
  const found: ScannedFile[] = [];
  await walk(SCAN_ROOT, found);
  found.sort((a, b) => a.path.localeCompare(b.path));
  return found;
}

async function walk(dir: string, out: ScannedFile[]): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      await walk(abs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) continue;

    const relAbs = path.relative(REPO_ROOT, abs);
    const rel = relAbs.split(path.sep).join("/");
    out.push({
      id: rel,
      name: entry.name,
      path: rel,
      type: classify(rel),
      risk: "medium",
    });
  }
}

function classify(relPath: string): FileType {
  const lower = relPath.toLowerCase();
  if (lower.includes("/pages/")) return "page";
  if (lower.includes("/components/")) return "component";
  if (lower.includes("/hooks/")) return "hook";
  return "other";
}

/**
 * Resolve a request-supplied relative path to an absolute path inside the
 * sample repo. Returns null if the path tries to escape the repo root.
 */
export function resolveSafePath(relPath: string): string | null {
  if (typeof relPath !== "string" || relPath.length === 0) return null;
  if (relPath.includes("\0")) return null;
  if (path.isAbsolute(relPath)) return null;

  const abs = path.resolve(REPO_ROOT, relPath);
  const rootWithSep = REPO_ROOT.endsWith(path.sep) ? REPO_ROOT : REPO_ROOT + path.sep;
  if (abs !== REPO_ROOT && !abs.startsWith(rootWithSep)) return null;
  return abs;
}
