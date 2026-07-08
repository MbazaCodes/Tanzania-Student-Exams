import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, canReview } from "@/lib/auth";
import { gradeFor } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/submissions/[id] — full submission with answers + questions
export async function GET(_req: Request, { params }: Ctx) {
  const me = await currentUser();
  const { id } = await params;
  const sub = await db.submission.findUnique({
    where: { id },
    include: {
      exam: { include: { questions: { orderBy: { order: "asc" } } } },
      student: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true } },
      answers: true,
    },
  });
  if (!sub) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  // Students can only see their own; reviewers can see in-scope
  if (me?.role === "student" && sub.studentId !== me.id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ submission: sub });
}

// PATCH /api/submissions/[id] — teacher reviews: override marks per answer + publish
// body: { action: "review" | "publish", answers?: { [answerId]: { marksAwarded, feedback } } }
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canReview(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const sub = await db.submission.findUnique({
    where: { id },
    include: { exam: true, answers: { include: { question: true } } },
  });
  if (!sub) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (me.role !== "super_admin" && sub.exam.schoolId !== me.schoolId) {
    return NextResponse.json({ ok: false, error: "Out of scope" }, { status: 403 });
  }

  const body = await req.json();
  const action = body.action as string;

  if (action === "review") {
    // Apply per-answer overrides
    const overrides = (body.answers ?? {}) as Record<
      string,
      { marksAwarded?: number; feedback?: string }
    >;
    for (const [answerId, ov] of Object.entries(overrides)) {
      const a = sub.answers.find((x) => x.id === answerId);
      if (!a) continue;
      const marks = Number(ov.marksAwarded ?? a.marksAwarded);
      const clamped = Math.max(0, Math.min(marks, a.question.marks));
      const isCorrect =
        a.question.type === "essay" || a.question.type === "short"
          ? clamped >= a.question.marks
            ? true
            : clamped === 0
            ? false
            : null
          : clamped >= a.question.marks;
      await db.answer.update({
        where: { id: answerId },
        data: {
          marksAwarded: clamped,
          feedback: ov.feedback ?? null,
          isCorrect,
        },
      });
    }
    // Recompute totals
    const fresh = await db.answer.findMany({
      where: { submissionId: id },
      include: { question: true },
    });
    const score = fresh.reduce((s, a) => s + a.marksAwarded, 0);
    const total = fresh.reduce((s, a) => s + a.question.marks, 0);
    const pct = total > 0 ? (score / total) * 100 : 0;
    const updated = await db.submission.update({
      where: { id },
      data: {
        score,
        percentage: Math.round(pct * 100) / 100,
        grade: gradeFor(pct),
        status: "reviewed",
        reviewedById: me.id,
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, submission: updated });
  }

  if (action === "publish") {
    const updated = await db.submission.update({
      where: { id },
      data: {
        status: "published",
        reviewedById: me.id,
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, submission: updated });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
