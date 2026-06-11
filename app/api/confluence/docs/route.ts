import { NextRequest, NextResponse } from "next/server";
import { searchDocs } from "@/lib/mock-confluence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_KEYWORDS = 100;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("keywords");
  if (raw === null) {
    return NextResponse.json(
      { error: "Missing 'keywords' query parameter" },
      { status: 400 }
    );
  }

  const keywords = raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (keywords.length > MAX_KEYWORDS) {
    return NextResponse.json(
      { error: `Too many keywords (max ${MAX_KEYWORDS})` },
      { status: 400 }
    );
  }

  const docs = searchDocs(keywords);
  return NextResponse.json({ docs });
}
