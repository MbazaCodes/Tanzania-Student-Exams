import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { currentUser, canManageContent } from "@/lib/auth";
import { toCamel, toSnake } from "@/lib/case";
import type { Exam } from "@/lib/types";

// GET /api/exams — list exams with filters and _count
export async function GET(req: Request) {
  const me = await currentUser();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const subject = searchParams.get("subject");
  const level = searchParams.get("level");
  const examType = searchParams.get("examType");
  const status = searchParams.get("status");
  const mine = searchParams.get("mine");

  let query = supabaseAdmin
    .from("exams")
    .select("*, created_by:users(id,name,role), school:schools(id,name), questions(id), submissions(id)")
    .order("created_at", { ascending: false });

  if (scope === "published" || (me?.role === "student" && scope !== "mine")) {
    query = query.eq("status", "published");
  }
  if (status) query = query.eq("status", status);
  if (subject) query = query.eq("subject", subject);
  if (level) query = query.eq("level", level);
  if (examType) query = query.eq("exam_type", examType);
  if (mine === "1" && me) {
    query = query.eq("created_by_id", me.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map to Exam with _count
  const exams: Exam[] = (data ?? []).map((e) => {
    const raw = e as unknown as Record<string, unknown>;
    const questions = (raw.questions as unknown[] | null) ?? [];
    const submissions = (raw.submissions as unknown[] | null) ?? [];
    const { questions: _q, submissions: _s, ...rest } = raw;
    return {
      ...toCamel<Exam>(rest),
      _count: {
        questions: questions.length,
        submissions: submissions.length,
      },
    };
  });

  return NextResponse.json({ exams });
}

// POST /api/exams — create an exam with questions
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

  // Prepare questions rows (snake_case for Supabase)
  const questionRows = questions.map((q: Record<string, unknown>, i: number) => {
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

    return {
      type,
      text,
      options,
      correct_answer: correctAnswer,
      explanation: (q.explanation as string) || null,
      formula: (q.formula as string) || null,
      table_data: q.tableData ? (typeof q.tableData === "string" ? q.tableData : JSON.stringify(q.tableData)) : null,
      graph_data: q.graphData ? (typeof q.graphData === "string" ? q.graphData : JSON.stringify(q.graphData)) : null,
      image_url: (q.imageUrl as string) || null,
      marks: Number(q.marks ?? 1) || 1,
      difficulty: (q.difficulty as string) || "medium",
      time_limit_secs: q.timeLimitSecs ? Number(q.timeLimitSecs) : null,
      order: i,
    };
  });

  // Calculate total marks
  const totalMarks = questionRows.reduce((s: number, q: { marks: number }) => s + q.marks, 0);

  // Insert exam
  const examRow = {
    title,
    subject,
    level,
    exam_type: (body.examType as string) || "exam",
    duration_mins: Number(durationMins),
    per_question_timer: body.perQuestionTimer ? Number(body.perQuestionTimer) : null,
    total_marks: totalMarks,
    pass_mark: body.passMark ? Number(body.passMark) : null,
    status: status === "published" ? "published" : "draft",
    description: description || null,
    instructions: (body.instructions as string) || null,
    paper_id: paperId || null,
    created_by_id: me.id,
    school_id: me.schoolId,
    is_online: body.isOnline ?? false,
    show_answer_after: body.showAnswerAfter ?? true,
    randomize_questions: body.randomizeQuestions ?? false,
  };

  const { data: exam, error: examErr } = await supabaseAdmin
    .from("exams")
    .insert(examRow)
    .select()
    .single();
  if (examErr) return NextResponse.json({ ok: false, error: examErr.message }, { status: 500 });

  // Insert questions with exam_id
  const qRows = questionRows.map((q: Record<string, unknown>) => ({ ...q, exam_id: exam.id }));
  const { error: qErr } = await supabaseAdmin.from("questions").insert(qRows);
  if (qErr) {
    // Rollback exam
    await supabaseAdmin.from("exams").delete().eq("id", exam.id);
    return NextResponse.json({ ok: false, error: qErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    exam: { ...toCamel<Exam>(exam as unknown as Record<string, unknown>), totalMarks },
  });
}