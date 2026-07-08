import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, canManageContent } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/exams/[id] — full exam with questions
export async function GET(_req: Request, { params }: Ctx) {
  const me = await currentUser();
  const { id } = await params;
  const exam = await db.exam.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      createdBy: { select: { id: true, name: true, role: true } },
      school: { select: { id: true, name: true } },
      paper: { select: { id: true, title: true } },
      _count: { select: { submissions: true } },
    },
  });
  if (!exam) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  // Hide correct answers from students
  if (me?.role === "student") {
    const safe = {
      ...exam,
      questions: exam.questions.map((q) => ({ ...q, correctAnswer: "", explanation: null })),
    };
    return NextResponse.json({ exam: safe });
  }
  return NextResponse.json({ exam });
}

// PATCH /api/exams/[id] — update status (publish / close / draft)
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const exam = await db.exam.findUnique({ where: { id } });
  if (!exam) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (me.role !== "super_admin" && exam.schoolId !== me.schoolId && exam.createdById !== me.id) {
    return NextResponse.json({ ok: false, error: "Out of scope" }, { status: 403 });
  }
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.title) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  const updated = await db.exam.update({
    where: { id },
    data,
    include: { _count: { select: { questions: true, submissions: true } } },
  });
  return NextResponse.json({ ok: true, exam: updated });
}

// DELETE /api/exams/[id] — only if no submissions
export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const exam = await db.exam.findUnique({
    where: { id },
    include: { _count: { select: { submissions: true } } },
  });
  if (!exam) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (me.role !== "super_admin" && exam.schoolId !== me.schoolId && exam.createdById !== me.id) {
    return NextResponse.json({ ok: false, error: "Out of scope" }, { status: 403 });
  }
  if (exam._count.submissions > 0) {
    return NextResponse.json(
      { ok: false, error: "Cannot delete an exam that has student submissions" },
      { status: 400 }
    );
  }
  await db.exam.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
