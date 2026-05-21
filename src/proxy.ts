// ---------------------------------------------------------------------------
// Next.js 16 proxy (formerly "middleware") — runs on the Edge runtime before
// any matching request reaches a page. If a protected page is requested
// without a session cookie, the user is bounced to /login.
//
// IMPORTANT: this file only imports from constants.ts so the Edge bundle
// stays free of Node-only modules like `crypto`. The actual HMAC verification
// happens later inside API routes (Node runtime), so a forged cookie can't
// reach any data even if it slips past this presence check.
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME } from "@/lib/constants";

export function proxy(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/logs/:path*",
    "/live/:path*",
    "/devices/:path*",
    "/reports/:path*",
    "/attendance/:path*",
    "/alerts/:path*",
    "/settings/:path*",
  ],
};
