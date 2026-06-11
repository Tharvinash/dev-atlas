import { NextRequest, NextResponse } from "next/server";
import { analyzeFile, AnalyzerError } from "@/lib/analyzer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const relPath = req.nextUrl.searchParams.get("path");
  if (!relPath) {
    return NextResponse.json(
      { error: "Missing 'path' query parameter" },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeFile(relPath);
    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof AnalyzerError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unable to analyze file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
