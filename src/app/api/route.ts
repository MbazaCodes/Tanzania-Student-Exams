import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "ExamHub API is running" });
}