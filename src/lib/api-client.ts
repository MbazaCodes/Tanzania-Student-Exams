"use client";
import type {
  Exam,
  Paper,
  ScheduleItem,
  Submission,
  User,
} from "./types";

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Request failed (${res.status})`
    );
  }
  return data as T;
}

function qs(params: Record<string, string> = {}) {
  const s = new URLSearchParams(params).toString();
  return s ? `?${s}` : "";
}

export const api = {
  // ── Auth / Session ───────────────────────────────────────
  me: () => jfetch<{ user: User; switchers: User[] }>("/api/me"),

  switchUser: (id: string) =>
    jfetch<{ ok: boolean; user: User }>("/api/me/switch", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),

  // ── Seed ─────────────────────────────────────────────────
  seed: () =>
    jfetch<{ ok: boolean; message: string; created: Record<string, unknown> }>("/api/seed", {
      method: "POST",
    }),

  // ── Papers ───────────────────────────────────────────────
  listPapers: (params: Record<string, string> = {}) =>
    jfetch<{ papers: Paper[] }>(`/api/papers${qs(params)}`),

  createPaper: (body: Partial<Paper> & Record<string, unknown>) =>
    jfetch<{ ok: boolean; paper: Paper }>("/api/papers", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updatePaper: (id: string, body: Partial<Paper>) =>
    jfetch<{ ok: boolean; paper: Paper }>(`/api/papers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deletePaper: (id: string) =>
    jfetch<{ ok: boolean }>(`/api/papers/${id}`, { method: "DELETE" }),

  // ── Exams ────────────────────────────────────────────────
  listExams: (params: Record<string, string> = {}) =>
    jfetch<{ exams: Exam[] }>(`/api/exams${qs(params)}`),

  getExam: (id: string) =>
    jfetch<{ exam: Exam }>(`/api/exams/${id}`),

  createExam: (body: Record<string, unknown>) =>
    jfetch<{ ok: boolean; exam: Exam }>("/api/exams", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateExam: (id: string, body: Partial<Exam>) =>
    jfetch<{ ok: boolean; exam: Exam }>(`/api/exams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteExam: (id: string) =>
    jfetch<{ ok: boolean }>(`/api/exams/${id}`, { method: "DELETE" }),

  // ── Submissions ──────────────────────────────────────────
  listSubmissions: (params: Record<string, string> = {}) =>
    jfetch<{ submissions: Submission[] }>(`/api/submissions${qs(params)}`),

  submitExam: (examId: string, answers: Record<string, string>) =>
    jfetch<{ ok: boolean; submission: Submission }>("/api/submissions", {
      method: "POST",
      body: JSON.stringify({ examId, answers }),
    }),

  reviewSubmission: (
    id: string,
    answers: Record<string, { marksAwarded?: number; feedback?: string }>
  ) =>
    jfetch<{ ok: boolean; submission: Submission }>(`/api/submissions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "review", answers }),
    }),

  publishSubmission: (id: string) =>
    jfetch<{ ok: boolean; submission: Submission }>(`/api/submissions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "publish" }),
    }),

  // ── Schedule ─────────────────────────────────────────────
  listSchedule: (params: Record<string, string> = {}) =>
    jfetch<{ items: ScheduleItem[] }>(`/api/schedule${qs(params)}`),

  createSchedule: (body: Record<string, unknown>) =>
    jfetch<{ ok: boolean; item: ScheduleItem }>("/api/schedule", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateSchedule: (id: string, body: Partial<ScheduleItem>) =>
    jfetch<{ ok: boolean; item: ScheduleItem }>(`/api/schedule/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteSchedule: (id: string) =>
    jfetch<{ ok: boolean }>(`/api/schedule/${id}`, { method: "DELETE" }),

  // ── Stats ────────────────────────────────────────────────
  stats: () =>
    jfetch<{
      stats: {
        papers: number;
        publishedPapers: number;
        draftPapers: number;
        archivedPapers: number;
        exams: number;
        publishedExams: number;
        draftExams: number;
        submissions: number;
        reviewedSubs: number;
        pendingSubs: number;
        students: number;
        teachers: number;
        role: string;
      } | null;
    }>("/api/stats"),
};