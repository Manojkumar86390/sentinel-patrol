import { NextResponse } from "next/server";
import { COOKIE_NAME, checkCredentials, makeToken } from "@/lib/auth";

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "Username and password are required" },
      { status: 400 }
    );
  }

  if (!checkCredentials(username, password)) {
    // Small artificial delay to slow brute-force attempts.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json(
      { ok: false, error: "Incorrect username or password" },
      { status: 401 }
    );
  }

  const token = makeToken(username);
  const res = NextResponse.json({ ok: true, user: { username } });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
    // secure: true,     // enable when serving over HTTPS in production
  });
  return res;
}
