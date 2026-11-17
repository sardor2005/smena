import { getState, session } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const user = session(req.cookies.get("smena_session")?.value);
  if (!user)
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  return NextResponse.json(getState(user), {
    headers: { "Cache-Control": "no-store" },
  });
}
