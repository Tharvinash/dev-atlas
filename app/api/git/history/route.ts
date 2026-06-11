import { NextRequest, NextResponse } from "next/server";
import { getGitHistory, GitHistoryError } from "@/lib/git";

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
    const history = await getGitHistory(relPath);
    return NextResponse.json(history);
  } catch (err) {
    if (err instanceof GitHistoryError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unable to load git history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
