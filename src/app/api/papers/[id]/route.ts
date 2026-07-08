import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, canManageContent } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/papers/[id] — update status (publish / archive / back to draft) or fields
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const paper = await db.paper.findUnique({ where: { id } });
  if (!paper) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  // school_admin/teacher can only touch their school's papers; super_admin can do all
  if (me.role !== "super_admin" && paper.schoolId !== me.schoolId) {
    return NextResponse.json({ ok: false, error: "Out of scope" }, { status: 403 });
  }
  const allowed: Record<string, boolean> = {
    status: true,
    title: true,
    subject: true,
    level: true,
    year: true,
    type: true,
    description: true,
  };
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (allowed[k]) data[k] = v;
  }
  const updated = await db.paper.update({
    where: { id },
    data,
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
      school: { select: { id: true, name: true } },
      exam: { select: { id: true, title: true, status: true } },
    },
  });
  return NextResponse.json({ ok: true, paper: updated });
}

// DELETE /api/papers/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const paper = await db.paper.findUnique({ where: { id } });
  if (!paper) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (me.role !== "super_admin" && paper.schoolId !== me.schoolId) {
    return NextResponse.json({ ok: false, error: "Out of scope" }, { status: 403 });
  }
  await db.paper.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
