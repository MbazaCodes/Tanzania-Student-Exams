import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { currentUser, canManageContent } from "@/lib/auth";
import { toCamel } from "@/lib/case";
import type { Paper } from "@/lib/types";

// GET /api/papers — list papers with optional filters
export async function GET(req: Request) {
  const me = await currentUser();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const subject = searchParams.get("subject");
  const level = searchParams.get("level");
  const type = searchParams.get("type");
  const q = searchParams.get("q")?.trim();

  let query = supabaseAdmin
    .from("papers")
    .select("*, uploaded_by:users(id,name,role), school:schools(id,name,region)")
    .order("created_at", { ascending: false });

  // Students only see published
  if (me?.role === "student") {
    query = query.eq("status", "published");
  } else if (status) {
    query = query.eq("status", status);
  }
  if (subject) query = query.eq("subject", subject);
  if (level) query = query.eq("level", level);
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Client-side text search (Supabase free text search needs index)
  let papers = (data ?? []).map((p) => toCamel<Paper>(p as unknown as Record<string, unknown>));
  if (q) {
    const lq = q.toLowerCase();
    papers = papers.filter((p) => p.title.toLowerCase().includes(lq));
  }

  return NextResponse.json({ papers });
}

// POST /api/papers — create a new paper (teachers, school admins, super admins)
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json(
      { ok: false, error: "Only teachers, school admins and admins can upload papers" },
      { status: 403 }
    );
  }
  const body = await req.json();
  const { title, subject, level, year, type, description, fileName, fileSize } = body;
  if (!title || !subject || !level || !year) {
    return NextResponse.json(
      { ok: false, error: "title, subject, level and year are required" },
      { status: 400 }
    );
  }

  const row = {
    title,
    subject,
    level,
    year: Number(year),
    type: type || "necta",
    status: "draft" as const,
    description: description || null,
    file_name: fileName || null,
    file_size: fileSize ? Number(fileSize) : null,
    uploaded_by_id: me.id,
    school_id: me.schoolId,
  };

  const { data, error } = await supabaseAdmin
    .from("papers")
    .insert(row)
    .select("*, uploaded_by:users(id,name,role), school:schools(id,name,region)")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, paper: toCamel<Paper>(data as unknown as Record<string, unknown>) });
}