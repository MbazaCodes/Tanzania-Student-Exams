import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { currentUser, canManageContent } from "@/lib/auth";
import { toCamel } from "@/lib/case";
import type { Exam, Question } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/exams/[id] — full exam with ordered questions
export async function GET(_req: Request, { params }: Ctx) {
  const me = await currentUser();
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("exams")
    .select("*, created_by:users(id,name,role), school:schools(id,name), questions(*), submissions(id)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const raw = data as unknown as Record<string, unknown>;
  const questions = ((raw.questions ?? []) as Record<string, unknown>[]).map((q) =>
    toCamel<Question>(q)
  ).sort((a, b) => a.order - b.order);
  const submissions = (raw.submissions as unknown[] | null) ?? [];
  const { questions: _q, submissions: _s, ...rest } = raw;

  let exam: Exam = {
    ...toCamel<Exam>(rest),
    questions,
    _count: { questions: questions.length, submissions: submissions.length },
  };

  // Hide correct answers from students
  if (me?.role === "student") {
    exam = {
      ...exam,
      questions: exam.questions!.map((q) => ({
        ...q,
        correctAnswer: "",
        explanation: null,
      })),
    };
  }

  return NextResponse.json({ exam });
}

// PATCH /api/exams/[id] — update status or fields
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const { data: existing } = await supabaseAdmin
    .from("exams")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // Convert camelCase body to snake_case for Supabase
  const row: Record<string, unknown> = {};
  if (body.status) row.status = body.status;
  if (body.title) row.title = body.title;
  if (body.description !== undefined) row.description = body.description;
  if (body.subject) row.subject = body.subject;
  if (body.level) row.level = body.level;
  if (body.durationMins) row.duration_mins = Number(body.durationMins);
  if (body.examType) row.exam_type = body.examType;

  const { data: updated, error } = await supabaseAdmin
    .from("exams")
    .update(row)
    .eq("id", id)
    .select("*, created_by:users(id,name,role), school:schools(id,name)")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Get counts
  const { data: qs } = await supabaseAdmin.from("questions").select("id").eq("exam_id", id);
  const { data: ss } = await supabaseAdmin.from("submissions").select("id").eq("exam_id", id);

  const exam = toCamel<Exam>(updated as unknown as Record<string, unknown>);
  return NextResponse.json({
    ok: true,
    exam: {
      ...exam,
      _count: {
        questions: qs?.length ?? 0,
        submissions: ss?.length ?? 0,
      },
    },
  });
}

// DELETE /api/exams/[id] — delete exam (cascades via DB or manual)
export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;

  const { data: existing } = await supabaseAdmin
    .from("exams")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // Check for submissions
  const { count } = await supabaseAdmin
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", id);
  if (count && count > 0) {
    return NextResponse.json(
      { ok: false, error: "Cannot delete an exam that has student submissions" },
      { status: 400 }
    );
  }

  // Delete questions first, then exam
  await supabaseAdmin.from("questions").delete().eq("exam_id", id);
  const { error } = await supabaseAdmin.from("exams").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}