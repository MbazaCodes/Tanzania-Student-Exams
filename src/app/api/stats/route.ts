import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { currentUser } from "@/lib/auth";

// GET /api/stats — dashboard overview counts
export async function GET() {
  const me = await currentUser();
  if (!me) {
    return NextResponse.json({ stats: null });
  }

  const [papersRes, examsRes, submissionsRes, studentsRes, teachersRes] = await Promise.all([
    supabaseAdmin.from("papers").select("id, status"),
    supabaseAdmin.from("exams").select("id, status"),
    supabaseAdmin.from("submissions").select("id, status"),
    supabaseAdmin.from("users").select("id").eq("role", "student"),
    supabaseAdmin.from("users").select("id").eq("role", "teacher"),
  ]);

  const papers = papersRes.data ?? [];
  const exams = examsRes.data ?? [];
  const subs = submissionsRes.data ?? [];

  return NextResponse.json({
    stats: {
      papers: papers.length,
      publishedPapers: papers.filter((p) => p.status === "published").length,
      draftPapers: papers.filter((p) => p.status === "draft").length,
      archivedPapers: papers.filter((p) => p.status === "archived").length,
      exams: exams.length,
      publishedExams: exams.filter((e) => e.status === "published").length,
      draftExams: exams.filter((e) => e.status === "draft").length,
      submissions: subs.length,
      reviewedSubs: subs.filter((s) => s.status === "reviewed" || s.status === "published").length,
      pendingSubs: subs.filter((s) => s.status === "submitted" || s.status === "auto_marked").length,
      students: studentsRes.data?.length ?? 0,
      teachers: teachersRes.data?.length ?? 0,
      role: me.role,
    },
  });
}