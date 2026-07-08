import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, canReview } from "@/lib/auth";
import { gradeFor } from "@/lib/types";

// GET /api/submissions — list submissions
//  ?scope=review  → submissions needing review (for teachers/admins), scoped to their school
//  ?scope=mine    → current student's submissions
//  ?examId=...    → filter by exam
export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ submissions: [] });

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const examId = searchParams.get("examId");

  const where: Record<string, unknown> = {};
  if (examId) where.examId = examId;

  if (scope === "mine") {
    where.studentId = me.id;
  } else if (scope === "review" && canReview(me.role)) {
    // submissions for exams in the reviewer's scope (their school, or all if admin)
    if (me.role !== "super_admin" && me.schoolId) {
      where.exam = { schoolId: me.schoolId };
    }
  } else if (me.role === "student") {
    where.studentId = me.id;
  } else if (!canReview(me.role)) {
    where.studentId = me.id;
  }

  const submissions = await db.submission.findMany({
    where,
    include: {
      exam: {
        select: { id: true, title: true, subject: true, level: true, totalMarks: true },
      },
      student: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true } },
      answers: {
        include: {
          question: {
            select: { id: true, type: true, text: true, marks: true, order: true, options: true, correctAnswer: true, explanation: true },
          },
        },
        orderBy: { question: { order: "asc" } },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json({ submissions });
}

// POST /api/submissions — student submits an exam; auto-mark objective questions
// body: { examId, answers: { questionId: "answer" } }
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const body = await req.json();
  const { examId, answers } = body as { examId: string; answers: Record<string, string> };
  if (!examId || !answers) {
    return NextResponse.json({ ok: false, error: "examId and answers required" }, { status: 400 });
  }

  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!exam) {
    return NextResponse.json({ ok: false, error: "Exam not found" }, { status: 404 });
  }
  if (exam.status !== "published") {
    return NextResponse.json({ ok: false, error: "Exam is not published" }, { status: 400 });
  }

  // Prevent a student from submitting the same exam twice
  const existing = await db.submission.findFirst({
    where: { examId, studentId: me.id },
  });
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "You have already submitted this exam" },
      { status: 409 }
    );
  }

  let score = 0;
  let total = 0;
  let needsReview = false;
  const answerRows: {
    questionId: string;
    answer: string;
    isCorrect: boolean | null;
    marksAwarded: number;
  }[] = [];

  for (const q of exam.questions) {
    total += q.marks;
    const raw = answers[q.id] ?? "";
    let isCorrect: boolean | null = null;
    let awarded = 0;

    if (q.type === "mcq") {
      isCorrect = raw === q.correctAnswer;
      awarded = isCorrect ? q.marks : 0;
    } else if (q.type === "truefalse") {
      isCorrect = raw.toLowerCase() === q.correctAnswer.toLowerCase();
      awarded = isCorrect ? q.marks : 0;
    } else if (q.type === "short") {
      isCorrect =
        raw.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      awarded = isCorrect ? q.marks : 0;
    } else {
      // essay — teacher marks it
      needsReview = true;
      isCorrect = null;
      awarded = 0;
    }
    score += awarded;
    answerRows.push({ questionId: q.id, answer: raw, isCorrect, marksAwarded: awarded });
  }

  const pct = total > 0 ? (score / total) * 100 : 0;
  // status: auto_marked (all objective), or "submitted" if essay needs review
  const status = needsReview ? "auto_marked" : "auto_marked";

  const submission = await db.submission.create({
    data: {
      examId,
      studentId: me.id,
      score,
      percentage: Math.round(pct * 100) / 100,
      grade: needsReview ? gradeFor(pct) : gradeFor(pct),
      status,
      answers: { create: answerRows },
    },
    include: {
      answers: { include: { question: true } },
      exam: true,
    },
  });

  return NextResponse.json({ ok: true, submission });
}
