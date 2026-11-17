import {
  checkPassword,
  createSession,
  db,
  deleteSession,
  demoEnabled,
  session,
} from "@/lib/db";
import { sameOrigin } from "@/lib/http";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const attempts = new Map<string, { count: number; expires: number }>();
export async function GET(req: NextRequest) {
  return NextResponse.json({
    user: session(req.cookies.get("smena_session")?.value) || null,
    demo: demoEnabled(),
  });
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 },
    );
  const key = req.headers.get("x-forwarded-for") || "local";
  const now = Date.now();
  const prev = attempts.get(key);
  const entry =
    prev && prev.expires > now ? prev : { count: 0, expires: now + 60000 };
  attempts.set(key, entry);
  if (++entry.count > 20)
    return NextResponse.json(
      { error: "Слишком много попыток. Повторите через минуту." },
      { status: 429 },
    );
  try {
    const body = await req.json();
    let user: { id: string } | undefined;
    if (body.demo && demoEnabled())
      user = { id: body.demo === "manager" ? "manager" : "e1" };
    else {
      const found = db
        .prepare("SELECT id,password FROM users WHERE email=?")
        .get(String(body.email || "").slice(0, 200)) as
        { id: string; password: string } | undefined;
      if (
        found &&
        typeof body.password === "string" &&
        body.password.length <= 256 &&
        checkPassword(body.password, found.password)
      )
        user = found;
    }
    if (!user)
      return NextResponse.json(
        { error: "Проверьте почту и пароль" },
        { status: 401 },
      );
    const response = NextResponse.json({ ok: true });
    response.cookies.set("smena_session", createSession(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 604800,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Не удалось выполнить вход" },
      { status: 400 },
    );
  }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 },
    );
  const token = req.cookies.get("smena_session")?.value;
  if (token) deleteSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("smena_session");
  return res;
}
