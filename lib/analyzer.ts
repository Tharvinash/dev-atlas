import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveSafePath, scanRepository, REPO_ROOT } from "./repository";
import {
  analyzeFromMemory,
  type FileAnalysisResult,
  type ImportSpec,
  type RepoFileInput,
} from "./analyzer-core";

export type { FileAnalysisResult, ImportSpec };

export class AnalyzerError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * Analyze a file under sample-jutro-repo. Path is validated; throws an
 * AnalyzerError with HTTP-style status on rejection.
 */
export async function analyzeFile(relPath: string): Promise<FileAnalysisResult> {
  const abs = resolveSafePath(relPath);
  if (!abs) throw new AnalyzerError("Path is outside the sample repository", 400);
  const stat = await fs.stat(abs).catch(() => null);
  if (!stat || !stat.isFile()) throw new AnalyzerError("File not found", 404);

  // Load every other file in the repo so usedBy resolution works against the
  // full set, not just the target. This is the same scan the analyzer used to
  // do internally — just hoisted so the core stays Node-free.
  const all = await scanRepository();
  const inputs: RepoFileInput[] = [];
  for (const f of all) {
    const candidateAbs = path.resolve(REPO_ROOT, f.path);
    let content: string;
    try {
      content = await fs.readFile(candidateAbs, "utf8");
    } catch {
      continue;
    }
    inputs.push({ path: f.path, source: content });
  }

  // Make sure the target file is in the input set even if scan ordering
  // didn't include it (defensive).
  const targetSource = await fs.readFile(abs, "utf8");
  if (!inputs.some((i) => i.path === relPath)) {
    inputs.push({ path: relPath, source: targetSource });
  }

  return analyzeFromMemory(relPath, targetSource, inputs);
}
