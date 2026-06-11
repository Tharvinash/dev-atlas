import { NextResponse } from "next/server";
import { scanRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const files = await scanRepository();
    return NextResponse.json({ files });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scan repository";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
