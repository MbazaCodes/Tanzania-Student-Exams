import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { currentUser, canReview } from "@/lib/auth";
import { toCamel } from "@/lib/case";
import { gradeFor } from "@/lib/types";
import type { Submission } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/submissions/[id] — full submission with answers + questions
export async function GET(_req: Request, { params }: Ctx) {
  const me = await currentUser();
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("submissions")
    .select("*, student:users(*), exam:exams(*, questions(*)), answers(*, question:questions(*))")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const sub = toCamel<Submission>(data as unknown as Record<string, unknown>);

  // Students can only see their own
  if (me?.role === "student" && sub.studentId !== me.id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ submission: sub });
}

// PATCH /api/submissions/[id] — teacher reviews: override marks per answer + publish
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canReview(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const action = body.action as string;

  // Verify submission exists
  const { data: subRaw } = await supabaseAdmin
    .from("submissions")
    .select("*, exam:exams(id, total_marks), answers(*)")
    .eq("id", id)
    .maybeSingle();
  if (!subRaw) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  if (action === "review") {
    // Apply per-answer overrides
    const overrides = (body.answers ?? {}) as Record<
      string,
      { marksAwarded?: number; feedback?: string }
    >;

    // Fetch questions for clamping marks
    const answers = subRaw.answers as unknown as { id: string; question_id: string }[];
    const questionIds = answers.map((a) => a.question_id);
    const { data: questionData } = await supabaseAdmin
      .from("questions")
      .select("id, marks, type")
      .in("id", questionIds);
    const qMap = new Map((questionData ?? []).map((q) => [q.id, q]));

    for (const [answerId, ov] of Object.entries(overrides)) {
      const a = answers.find((x) => x.id === answerId);
      if (!a) continue;
      const q = qMap.get(a.question_id);
      const maxMarks = q?.marks ?? 1;
      const marks = Math.max(0, Math.min(Number(ov.marksAwarded ?? 0), maxMarks));

      const patch: Record<string, unknown> = {
        marks_awarded: marks,
        feedback: ov.feedback ?? null,
      };

      const { error } = await supabaseAdmin
        .from("answers")
        .update(patch)
        .eq("id", answerId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Recompute totals
    const { data: freshAnswers } = await supabaseAdmin
      .from("answers")
      .select("marks_awarded")
      .eq("submission_id", id);
    const score = (freshAnswers ?? []).reduce((s: number, a: { marks_awarded: number }) => s + (a.marks_awarded ?? 0), 0);

    const examTotal = (subRaw.exam as { total_marks: number } | null)?.total_marks || 1;
    const pct = Math.round((score / examTotal) * 10000) / 100;

    const { data: updated, error: updErr } = await supabaseAdmin
      .from("submissions")
      .update({
        score,
        percentage: pct,
        grade: gradeFor(pct),
        status: "reviewed",
        reviewed_by_id: me.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, submission: toCamel<Submission>(updated as unknown as Record<string, unknown>) });
  }

  if (action === "publish") {
    const { data: updated, error } = await supabaseAdmin
      .from("submissions")
      .update({
        status: "published",
        reviewed_by_id: me.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, submission: toCamel<Submission>(updated as unknown as Record<string, unknown>) });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}