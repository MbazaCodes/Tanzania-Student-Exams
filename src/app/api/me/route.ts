import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { toCamel } from "@/lib/case";
import type { User } from "@/lib/types";

// GET /api/me — current demo user + list of all demo users for the role switcher
export async function GET() {
  const me = await currentUser();
  if (!me) {
    return NextResponse.json({ user: null, switchers: [] });
  }
  const { data } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role, school_id, created_at")
    .order("role");
  const switchers = (data ?? []).map((u) =>
    toCamel<User>(u as unknown as Record<string, unknown>)
  );
  return NextResponse.json({ user: me, switchers });
}