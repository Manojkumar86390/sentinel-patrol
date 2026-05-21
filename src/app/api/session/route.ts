import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export async function GET() {
  const username = await currentUser();
  return NextResponse.json({ ok: !!username, user: username ? { username } : null });
}
