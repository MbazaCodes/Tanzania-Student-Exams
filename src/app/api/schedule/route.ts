import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { currentUser, canManageContent } from "@/lib/auth";
import { toCamel } from "@/lib/case";
import type { ScheduleItem } from "@/lib/types";

// GET /api/schedule — list scheduled items
export async function GET(req: Request) {
  const me = await currentUser();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const scope = searchParams.get("scope") ?? "upcoming";

  let query = supabaseAdmin
    .from("schedule_items")
    .select("*, created_by:users(id,name,role), school:schools(id,name), exam:exams(id,title,exam_type,status)")
    .order("scheduled_at", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  } else if (scope === "upcoming") {
    query = query.in("status", ["scheduled", "live"]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []).map((s) => toCamel<ScheduleItem>(s as unknown as Record<string, unknown>));
  return NextResponse.json({ items });
}

// POST /api/schedule — create a scheduled item (teachers/admins)
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json(
      { ok: false, error: "Only teachers, school admins and admins can schedule items" },
      { status: 403 }
    );
  }
  const body = await req.json();
  const { title, type, subject, level, description, scheduledAt, durationMins, examId } = body;
  if (!title || !type || !subject || !scheduledAt) {
    return NextResponse.json(
      { ok: false, error: "title, type, subject and scheduledAt are required" },
      { status: 400 }
    );
  }

  const row = {
    title,
    type,
    subject,
    level: level || null,
    description: description || null,
    scheduled_at: scheduledAt,
    duration_mins: Number(durationMins) || 60,
    status: "scheduled",
    exam_id: examId || null,
    created_by_id: me.id,
    school_id: me.schoolId,
  };

  const { data, error } = await supabaseAdmin
    .from("schedule_items")
    .insert(row)
    .select("*, created_by:users(id,name,role), school:schools(id,name)")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, item: toCamel<ScheduleItem>(data as unknown as Record<string, unknown>) });
}