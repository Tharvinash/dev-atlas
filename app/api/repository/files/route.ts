import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { REPO_ROOT, scanRepository } from "@/lib/repository";
import { analyzeFromMemory, type RepoFileInput } from "@/lib/analyzer-core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const files = await scanRepository();

    // Annotate per-file risk by running the analyzer once over the whole set.
    // Reads every file once; risk is the engine's level, not the scanner default.
    const inputs: RepoFileInput[] = [];
    for (const f of files) {
      const abs = path.resolve(REPO_ROOT, f.path);
      try {
        const source = await fs.readFile(abs, "utf8");
        inputs.push({ path: f.path, source });
      } catch {
        /* skip unreadable files; risk falls back to default */
      }
    }

    const sourceByPath = new Map(inputs.map((i) => [i.path, i.source]));
    const annotated = files.map((f) => {
      const source = sourceByPath.get(f.path);
      if (!source) return f;
      const result = analyzeFromMemory(f.path, source, inputs);
      return { ...f, risk: result.risk };
    });

    return NextResponse.json({ files: annotated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scan repository";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
