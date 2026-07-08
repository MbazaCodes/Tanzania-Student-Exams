import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, canManageContent } from "@/lib/auth";

// GET /api/papers — list papers
// Optional query: ?status=published&subject=Biology&level=form_4&q=text
export async function GET(req: Request) {
  const me = await currentUser();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const subject = searchParams.get("subject");
  const level = searchParams.get("level");
  const q = searchParams.get("q")?.trim();

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (subject) where.subject = subject;
  if (level) where.level = level;
  if (q) where.title = { contains: q };

  // Students only see published papers; managers/admin see all (scoped by role)
  if (me && me.role === "student") {
    where.status = "published";
  }

  const papers = await db.paper.findMany({
    where,
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
      school: { select: { id: true, name: true } },
      exam: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ papers });
}

// POST /api/papers — upload a new paper (teachers, school admins, super admins)
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
  const paper = await db.paper.create({
    data: {
      title,
      subject,
      level,
      year: Number(year),
      type: type || "necta",
      status: "draft",
      description: description || null,
      fileName: fileName || null,
      fileSize: fileSize ? Number(fileSize) : null,
      uploadedById: me.id,
      schoolId: me.schoolId,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
      school: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ ok: true, paper });
}
