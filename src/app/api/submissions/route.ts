import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { currentUser, canReview, canManageContent } from "@/lib/auth";
import { toCamel } from "@/lib/case";
import { gradeFor } from "@/lib/types";
import type { Submission, Question, Answer } from "@/lib/types";

// GET /api/submissions — list submissions with filters
export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ submissions: [] });

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const examId = searchParams.get("examId");
  const studentId = searchParams.get("studentId");
  const status = searchParams.get("status");
  const mine = searchParams.get("mine");

  let query = supabaseAdmin
    .from("submissions")
    .select("*, student:users(id,name,email), exam:exams(id,title,subject,level,total_marks,exam_type), answers(*, question:questions(*))")
    .order("submitted_at", { ascending: false });

  if (scope === "mine" || me.role === "student") {
    query = query.eq("student_id", me.id);
  }
  if (examId) query = query.eq("exam_id", examId);
  if (studentId) query = query.eq("student_id", studentId);
  if (status) query = query.eq("status", status);
  if (mine === "1" && me.role !== "student") {
    // Teachers/admins see all by default, mine=1 would filter student scope (already handled)
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const submissions = (data ?? []).map((s) => toCamel<Submission>(s as unknown as Record<string, unknown>));
  return NextResponse.json({ submissions });
}

// POST /api/submissions — student submits an exam; auto-mark objective questions
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

  // Fetch exam with questions
  const { data: examRaw, error: examErr } = await supabaseAdmin
    .from("exams")
    .select("*, questions(*)")
    .eq("id", examId)
    .maybeSingle();
  if (examErr || !examRaw) {
    return NextResponse.json({ ok: false, error: "Exam not found" }, { status: 404 });
  }
  if (examRaw.status !== "published") {
    return NextResponse.json({ ok: false, error: "Exam is not published" }, { status: 400 });
  }

  // Prevent double submission
  const { count: existingCount } = await supabaseAdmin
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId)
    .eq("student_id", me.id);
  if (existingCount && existingCount > 0) {
    return NextResponse.json(
      { ok: false, error: "You have already submitted this exam" },
      { status: 409 }
    );
  }

  const exam = toCamel<Exam & { questions: Question[] }>(examRaw as unknown as Record<string, unknown>);
  const questions = (exam.questions ?? []).sort((a, b) => a.order - b.order);

  let score = 0;
  const answerRows: {
    question_id: string;
    answer: string;
    is_correct: boolean | null;
    marks_awarded: number;
  }[] = [];

  for (const q of questions) {
    const raw = (answers[q.id] ?? "").trim();
    let isCorrect: boolean | null = null;
    let awarded = 0;

    if (q.type === "mcq") {
      isCorrect = raw === q.correctAnswer;
      awarded = isCorrect ? q.marks : 0;
    } else if (q.type === "truefalse") {
      isCorrect = raw.toLowerCase() === q.correctAnswer.toLowerCase();
      awarded = isCorrect ? q.marks : 0;
    } else if (q.type === "short") {
      isCorrect = raw.toLowerCase() === q.correctAnswer.toLowerCase().trim();
      awarded = isCorrect ? q.marks : 0;
    } else {
      // essay — teacher marks it
      isCorrect = null;
      awarded = 0;
    }
    score += awarded;
    answerRows.push({
      question_id: q.id,
      answer: raw,
      is_correct: isCorrect,
      marks_awarded: awarded,
    });
  }

  const total = exam.totalMarks || 1;
  const pct = Math.round((score / total) * 10000) / 100;

  // Insert submission
  const { data: sub, error: subErr } = await supabaseAdmin
    .from("submissions")
    .insert({
      exam_id: examId,
      student_id: me.id,
      score,
      percentage: pct,
      grade: gradeFor(pct),
      status: "auto_marked",
    })
    .select()
    .single();
  if (subErr) return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });

  // Insert answers
  const rowsWithSubId = answerRows.map((r) => ({ ...r, submission_id: sub.id }));
  const { error: ansErr } = await supabaseAdmin.from("answers").insert(rowsWithSubId);
  if (ansErr) {
    // Cleanup
    await supabaseAdmin.from("submissions").delete().eq("id", sub.id);
    return NextResponse.json({ ok: false, error: ansErr.message }, { status: 500 });
  }

  // Fetch full submission to return
  const { data: fullSub } = await supabaseAdmin
    .from("submissions")
    .select("*, student:users(id,name,email), exam:exams(*, questions(*)), answers(*, question:questions(*))")
    .eq("id", sub.id)
    .single();

  return NextResponse.json({
    ok: true,
    submission: fullSub ? toCamel<Submission>(fullSub as unknown as Record<string, unknown>) : toCamel<Submission>(sub as unknown as Record<string, unknown>),
  });
}