import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, canManageContent } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/schedule/[id] — update status (start/live, complete, cancel) or fields
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const item = await db.scheduleItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (me.role !== "super_admin" && item.schoolId !== me.schoolId && item.createdById !== me.id) {
    return NextResponse.json({ ok: false, error: "Out of scope" }, { status: 403 });
  }
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.title) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.scheduledAt) data.scheduledAt = new Date(body.scheduledAt);
  if (body.durationMins) data.durationMins = Number(body.durationMins);
  const updated = await db.scheduleItem.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item: updated });
}

// DELETE /api/schedule/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const item = await db.scheduleItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (me.role !== "super_admin" && item.schoolId !== me.schoolId && item.createdById !== me.id) {
    return NextResponse.json({ ok: false, error: "Out of scope" }, { status: 403 });
  }
  await db.scheduleItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
