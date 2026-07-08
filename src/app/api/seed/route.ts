import { NextResponse } from "next/server";
import { seedExamHub } from "@/lib/seed";

// POST /api/seed — populate demo data (idempotent)
export async function POST() {
  try {
    const result = await seedExamHub();
    return NextResponse.json({
      ok: true,
      message: "Seed complete",
      created: result,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Seed failed" },
      { status: 500 }
    );
  }
}
