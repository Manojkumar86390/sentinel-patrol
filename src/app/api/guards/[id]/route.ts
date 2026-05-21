import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const all = await db.guards.all();
  const next = all.filter((g) => g.id !== id);
  if (next.length === all.length) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await db.guards.save(next);
  return NextResponse.json({ ok: true });
}
