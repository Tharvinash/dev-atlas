import { NextRequest, NextResponse } from "next/server";
import { isValidTicketId, lookupTickets } from "@/lib/mock-jira";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IDS = 50;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("ids");
  if (raw === null) {
    return NextResponse.json(
      { error: "Missing 'ids' query parameter" },
      { status: 400 }
    );
  }

  const requested: string[] = [];
  const invalid: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id) continue;
    if (!isValidTicketId(id)) {
      invalid.push(id);
      continue;
    }
    requested.push(id);
  }

  if (requested.length > MAX_IDS) {
    return NextResponse.json(
      { error: `Too many ticket IDs (max ${MAX_IDS})` },
      { status: 400 }
    );
  }

  const tickets = lookupTickets(requested);
  return NextResponse.json({ tickets, invalid });
}
