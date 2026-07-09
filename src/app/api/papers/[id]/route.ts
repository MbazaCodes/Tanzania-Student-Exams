import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { currentUser, canManageContent } from "@/lib/auth";
import { toCamel, toSnake } from "@/lib/case";
import type { Paper } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/papers/[id] — update status or fields
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  // Check paper exists
  const { data: existing } = await supabaseAdmin
    .from("papers")
    .select("school_id, created_by_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // Only allow updating allowed fields
  const allowed = ["status", "title", "subject", "level", "year", "type", "description"];
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (allowed.includes(k)) data[k] = v;
  }

  const snakeData = toSnake(data);
  const { data: updated, error } = await supabaseAdmin
    .from("papers")
    .update(snakeData)
    .eq("id", id)
    .select("*, uploaded_by:users(id,name,role), school:schools(id,name,region)")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, paper: toCamel<Paper>(updated as unknown as Record<string, unknown>) });
}

// DELETE /api/papers/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await currentUser();
  if (!me || !canManageContent(me.role)) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }
  const { id } = await params;

  const { data: existing } = await supabaseAdmin
    .from("papers")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("papers").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}