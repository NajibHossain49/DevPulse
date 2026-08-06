import { NextRequest, NextResponse } from "next/server";
import { sessionTokenFromCookieHeader } from "@/lib/session-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Same-origin helper so the browser can auth Socket.IO (httpOnly cookies). */
export async function GET(req: NextRequest) {
  const token = sessionTokenFromCookieHeader(req.headers.get("cookie"));
  if (!token) {
    return NextResponse.json({ token: null }, { status: 401 });
  }
  return NextResponse.json({ token });
}
