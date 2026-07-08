import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, canManageContent } from "@/lib/auth";

// GET /api/schedule — list scheduled items (upcoming + recent)
// ?scope=upcoming (default) | all
export async function GET(req: Request) {
  const me = await currentUser();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "upcoming";

  const where: Record<string, unknown> = {};
  // scope by school for non-admins
  if (me && me.role !== "super_admin" && me.schoolId) {
    where.OR = [{ schoolId: me.schoolId }, { schoolId: null }];
  }
  if (scope === "upcoming") {
    where.status = { in: ["scheduled", "live"] };
  }

  const items = await db.scheduleItem.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      school: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

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
  const item = await db.scheduleItem.create({
    data: {
      title,
      type,
      subject,
      level: level || null,
      description: description || null,
      scheduledAt: new Date(scheduledAt),
      durationMins: Number(durationMins) || 60,
      status: "scheduled",
      examId: examId || null,
      createdById: me.id,
      schoolId: me.schoolId,
    },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      school: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ ok: true, item });
}
