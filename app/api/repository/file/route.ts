import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { resolveSafePath } from "@/lib/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 1_000_000;

export async function GET(req: NextRequest) {
  const relPath = req.nextUrl.searchParams.get("path");
  if (!relPath) {
    return NextResponse.json({ error: "Missing 'path' query parameter" }, { status: 400 });
  }

  const abs = resolveSafePath(relPath);
  if (!abs) {
    return NextResponse.json({ error: "Path is outside the sample repository" }, { status: 400 });
  }

  try {
    const stat = await fs.stat(abs);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }
    if (stat.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }
    const content = await fs.readFile(abs, "utf8");
    return NextResponse.json({ path: relPath, content });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Failed to read file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
