import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

// GET /api/stats — dashboard overview counts
export async function GET() {
  const me = await currentUser();
  if (!me) {
    return NextResponse.json({ stats: null });
  }

  const scope =
    me.role === "super_admin"
      ? {}
      : me.schoolId
      ? { schoolId: me.schoolId }
      : { createdById: me.id };

  const examScope =
    me.role === "super_admin"
      ? {}
      : me.schoolId
      ? { schoolId: me.schoolId }
      : { createdById: me.id };

  const [papers, exams, publishedExams, draftPapers, publishedPapers, submissions, reviewedSubs, students] =
    await Promise.all([
      db.paper.count({ where: scope }),
      db.exam.count({ where: examScope }),
      db.exam.count({ where: { ...examScope, status: "published" } }),
      db.paper.count({ where: { ...scope, status: "draft" } }),
      db.paper.count({ where: { ...scope, status: "published" } }),
      db.submission.count({
        where: me.role === "super_admin" ? {} : { exam: { schoolId: me.schoolId ?? "" } },
      }),
      db.submission.count({
        where: {
          status: "published",
          ...(me.role !== "super_admin" ? { exam: { schoolId: me.schoolId ?? "" } } : {}),
        },
      }),
      db.user.count({ where: { role: "student" } }),
    ]);

  return NextResponse.json({
    stats: {
      papers,
      publishedPapers,
      draftPapers,
      exams,
      publishedExams,
      submissions,
      reviewedSubs,
      students,
      role: me.role,
    },
  });
}
