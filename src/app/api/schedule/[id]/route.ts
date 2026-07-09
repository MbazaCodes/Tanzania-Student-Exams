import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { currentUser, canManageContent } from "@/lib/auth";
import { toCamel } from "@/lib/case";
import type { ScheduleItem } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/schedule/[id] — update status or fields
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const { data: existing } = await supabaseAdmin
    .from("schedule_items")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const row: Record<string, unknown> = {};
  if (body.status) row.status = body.status;
  if (body.title) row.title = body.title;
  if (body.description !== undefined) row.description = body.description;
  if (body.scheduledAt) row.scheduled_at = body.scheduledAt;
  if (body.durationMins) row.duration_mins = Number(body.durationMins);
  if (body.subject) row.subject = body.subject;
  if (body.level !== undefined) row.level = body.level;
  if (body.examId !== undefined) row.exam_id = body.examId;

  const { data: updated, error } = await supabaseAdmin
    .from("schedule_items")
    .update(row)
    .eq("id", id)
    .select("*, created_by:users(id,name,role), school:schools(id,name)")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, item: toCamel<ScheduleItem>(updated as unknown as Record<string, unknown>) });
}

// DELETE /api/schedule/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;

  const { data: existing } = await supabaseAdmin
    .from("schedule_items")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("schedule_items").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}