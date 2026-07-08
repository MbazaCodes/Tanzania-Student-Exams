import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/me/switch — switch the demo "current user" by id
export async function POST(req: Request) {
  let body: { id?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }
  const id = body.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }
  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });
  }
  const c = await cookies();
  c.set(SESSION_COOKIE, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.json({ ok: true, user });
}
