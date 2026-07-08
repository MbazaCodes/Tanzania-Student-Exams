import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/me — current demo user (with list of all demo users for the role switcher)
export async function GET() {
  const me = await currentUser();
  if (!me) {
    return NextResponse.json({ user: null, switchers: [] });
  }
  const switchers = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { role: "asc" },
  });
  return NextResponse.json({ user: me, switchers });
}
