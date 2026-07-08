import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, canManageContent } from "@/lib/auth";

// GET /api/exams — list exams
//  ?scope=mine  → only exams created by current user (teacher/school/admin)
//  ?scope=published → published exams (students)
export async function GET(req: Request) {
  const me = await currentUser();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const subject = searchParams.get("subject");
  const level = searchParams.get("level");

  const where: Record<string, unknown> = {};
  if (subject) where.subject = subject;
  if (level) where.level = level;

  if (scope === "mine" && me) {
    where.createdById = me.id;
  } else if (me?.role === "student") {
    where.status = "published";
  } else if (scope === "published") {
    where.status = "published";
  }

  const exams = await db.exam.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      school: { select: { id: true, name: true } },
      paper: { select: { id: true, title: true, status: true } },
      _count: { select: { questions: true, submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ exams });
}

// POST /api/exams — create an exam with questions
// body: { title, subject, level, durationMins, description, status, paperId?, questions: [...] }
// question: { type, text, options?, correctAnswer, marks, difficulty, explanation }
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json(
      { ok: false, error: "Only teachers, school admins and admins can create exams" },
      { status: 403 }
    );
  }
  const body = await req.json();
  const { title, subject, level, durationMins, description, status, paperId, questions } = body;

  if (!title || !subject || !level || !durationMins) {
    return NextResponse.json(
      { ok: false, error: "title, subject, level and durationMins are required" },
      { status: 400 }
    );
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json(
      { ok: false, error: "At least one question is required" },
      { status: 400 }
    );
  }

  // Validate + normalise questions, compute total marks
  let totalMarks = 0;
  const cleanQuestions = questions.map((q: Record<string, unknown>, i: number) => {
    const type = q.type as string;
    const text = (q.text as string)?.trim();
    if (!text) throw new Error(`Question ${i + 1} is missing text`);
    let options = "[]";
    if (type === "mcq") {
      const opts = q.options;
      const arr = Array.isArray(opts) ? opts : [];
      if (arr.length < 2) throw new Error(`Question ${i + 1} needs at least 2 options`);
      options = JSON.stringify(arr.map((s: unknown) => String(s).trim()).filter(Boolean));
    }
    const correctAnswer = String(q.correctAnswer ?? "").trim();
    if (!correctAnswer && type !== "essay") {
      throw new Error(`Question ${i + 1} needs a correct answer`);
    }
    const marks = Number(q.marks ?? 1) || 1;
    totalMarks += marks;
    return {
      type,
      text,
      options,
      correctAnswer,
      explanation: (q.explanation as string) || null,
      marks,
      difficulty: (q.difficulty as string) || "medium",
      order: i,
    };
  });

  const exam = await db.exam.create({
    data: {
      title,
      subject,
      level,
      durationMins: Number(durationMins),
      totalMarks,
      status: status === "published" ? "published" : "draft",
      description: description || null,
      paperId: paperId || null,
      createdById: me.id,
      schoolId: me.schoolId,
      questions: { create: cleanQuestions },
    },
    include: {
      questions: { orderBy: { order: "asc" } },
      createdBy: { select: { id: true, name: true, role: true } },
    },
  });

  return NextResponse.json({ ok: true, exam });
}
