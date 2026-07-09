import { supabaseAdmin } from './supabase'
import { gradeFor, type Exam, type Paper, type ScheduleItem, type Submission } from './types'

// ── AUTH / SESSION ──────────────────────────────────────────
const SESSION_KEY = 'eh_uid'
export function getSessionUid(): string | null { return localStorage.getItem(SESSION_KEY) }
export function setSessionUid(id: string) { localStorage.setItem(SESSION_KEY, id) }

export async function getCurrentUser() {
  const uid = getSessionUid()
  if (uid) {
    const { data } = await supabaseAdmin.from('users').select('*, school:schools(*)').eq('id', uid).single()
    if (data) return data
  }
  const { data } = await supabaseAdmin.from('users').select('*, school:schools(*)').eq('role', 'super_admin').limit(1).single()
  return data
}

export async function getAllUsers() {
  const { data } = await supabaseAdmin.from('users').select('id,name,email,role,teacher_type,school_id').order('role')
  return data ?? []
}

// ── PAPERS ──────────────────────────────────────────────────
export async function listPapers(params: Record<string, string> = {}) {
  let q = supabaseAdmin.from('papers').select('*, uploaded_by:users(id,name,role), school:schools(id,name,region)').order('created_at', { ascending: false })
  if (params.status) q = q.eq('status', params.status)
  if (params.subject) q = q.eq('subject', params.subject)
  if (params.level) q = q.eq('level', params.level)
  if (params.type) q = q.eq('type', params.type)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data as Paper[]
}

export async function createPaper(body: Partial<Paper> & Record<string, unknown>) {
  const uid = getSessionUid()
  const { data, error } = await supabaseAdmin.from('papers').insert({ ...body, uploaded_by_id: uid }).select().single()
  if (error) throw new Error(error.message)
  return data as Paper
}

export async function updatePaper(id: string, body: Partial<Paper>) {
  const { data, error } = await supabaseAdmin.from('papers').update(body).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Paper
}

export async function deletePaper(id: string) {
  const { error } = await supabaseAdmin.from('papers').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── EXAMS ───────────────────────────────────────────────────
export async function listExams(params: Record<string, string> = {}) {
  let q = supabaseAdmin.from('exams').select('*, created_by:users(id,name,role,teacher_type), school:schools(id,name), questions(id), submissions(id)').order('created_at', { ascending: false })
  if (params.scope === 'published') q = q.eq('status', 'published')
  if (params.subject) q = q.eq('subject', params.subject)
  if (params.level) q = q.eq('level', params.level)
  if (params.exam_type) q = q.eq('exam_type', params.exam_type)
  if (params.mine === '1') { const uid = getSessionUid(); if (uid) q = q.eq('created_by_id', uid) }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map((e: Record<string,unknown>) => ({
    ...e,
    _count: { questions: Array.isArray(e.questions) ? (e.questions as unknown[]).length : 0, submissions: Array.isArray(e.submissions) ? (e.submissions as unknown[]).length : 0 },
  })) as Exam[]
}

export async function getExam(id: string) {
  const { data, error } = await supabaseAdmin.from('exams').select('*, created_by:users(id,name,role,teacher_type), school:schools(id,name), questions(*)').eq('id', id).single()
  if (error) throw new Error(error.message)
  return { ...data, questions: (data.questions ?? []).sort((a: { order: number }, b: { order: number }) => a.order - b.order) } as Exam
}

export async function createExam(body: Record<string, unknown>) {
  const uid = getSessionUid()
  const { questions, ...examData } = body as { questions?: Record<string,unknown>[]; [k: string]: unknown }
  const { data: exam, error } = await supabaseAdmin.from('exams').insert({ ...examData, created_by_id: uid }).select().single()
  if (error) throw new Error(error.message)
  if (questions?.length) {
    const rows = questions.map((q, i) => ({ ...q, exam_id: exam.id, options: Array.isArray(q.options) ? JSON.stringify(q.options) : (q.options ?? '[]'), order: i }))
    const { error: qe } = await supabaseAdmin.from('questions').insert(rows)
    if (qe) throw new Error(qe.message)
  }
  const { data: qs } = await supabaseAdmin.from('questions').select('marks').eq('exam_id', exam.id)
  const total = (qs ?? []).reduce((s: number, q: { marks: number }) => s + (q.marks ?? 0), 0)
  await supabaseAdmin.from('exams').update({ total_marks: total }).eq('id', exam.id)
  return { ...exam, total_marks: total } as Exam
}

export async function updateExam(id: string, body: Partial<Exam>) {
  const { data, error } = await supabaseAdmin.from('exams').update(body).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Exam
}

export async function deleteExam(id: string) {
  const { error } = await supabaseAdmin.from('exams').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── SUBMISSIONS ─────────────────────────────────────────────
export async function listSubmissions(params: Record<string, string> = {}) {
  let q = supabaseAdmin.from('submissions').select('*, student:users(id,name,email), exam:exams(id,title,subject,level,total_marks), answers(*, question:questions(*))').order('submitted_at', { ascending: false })
  if (params.exam_id) q = q.eq('exam_id', params.exam_id)
  if (params.student_id) q = q.eq('student_id', params.student_id)
  if (params.mine === '1') { const uid = getSessionUid(); if (uid) q = q.eq('student_id', uid) }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data as Submission[]
}

export async function submitExam(examId: string, answers: Record<string, string>, timings?: Record<string, number>) {
  const uid = getSessionUid()
  const exam = await getExam(examId)
  const questions = exam.questions ?? []
  let score = 0
  const rows: Record<string, unknown>[] = []
  for (const q of questions) {
    const ans = (answers[q.id] ?? '').trim()
    let isCorrect: boolean | null = null; let awarded = 0
    if (q.type === 'mcq') { isCorrect = ans === q.correct_answer; awarded = isCorrect ? q.marks : 0 }
    else if (q.type === 'truefalse') { isCorrect = ans.toLowerCase() === q.correct_answer.toLowerCase(); awarded = isCorrect ? q.marks : 0 }
    else if (q.type === 'short') { isCorrect = ans.toLowerCase() === q.correct_answer.toLowerCase(); awarded = isCorrect ? q.marks : 0 }
    score += awarded
    rows.push({ question_id: q.id, answer: ans, is_correct: isCorrect, marks_awarded: awarded, time_taken_secs: timings?.[q.id] ?? null })
  }
  const total = exam.total_marks || 1
  const pct = Math.round((score / total) * 10000) / 100
  const hasEssay = rows.some(r => r.is_correct === null)
  const { data: sub, error } = await supabaseAdmin.from('submissions').insert({ exam_id: examId, student_id: uid, score, percentage: pct, grade: gradeFor(pct), status: hasEssay ? 'auto_marked' : 'auto_marked' }).select().single()
  if (error) throw new Error(error.message)
  await supabaseAdmin.from('answers').insert(rows.map(r => ({ ...r, submission_id: sub.id })))
  const { data: full } = await supabaseAdmin.from('submissions').select('*, answers(*, question:questions(*))').eq('id', sub.id).single()
  return full as Submission
}

export async function reviewSubmission(id: string, updates: Record<string, { marks_awarded?: number; feedback?: string }>) {
  for (const [aid, patch] of Object.entries(updates)) {
    await supabaseAdmin.from('answers').update(patch).eq('id', aid)
  }
  const { data: sub } = await supabaseAdmin.from('submissions').select('*, exam:exams(total_marks), answers(marks_awarded)').eq('id', id).single()
  const score = (sub?.answers ?? []).reduce((s: number, a: { marks_awarded: number }) => s + (a.marks_awarded ?? 0), 0)
  const total = sub?.exam?.total_marks || 1
  const pct = Math.round((score / total) * 10000) / 100
  const uid = getSessionUid()
  await supabaseAdmin.from('submissions').update({ score, percentage: pct, grade: gradeFor(pct), status: 'reviewed', reviewed_by_id: uid, reviewed_at: new Date().toISOString() }).eq('id', id)
  const { data } = await supabaseAdmin.from('submissions').select('*, answers(*, question:questions(*))').eq('id', id).single()
  return data as Submission
}

export async function publishSubmission(id: string) {
  const { data } = await supabaseAdmin.from('submissions').update({ status: 'published' }).eq('id', id).select().single()
  return data as Submission
}

// ── STATS ───────────────────────────────────────────────────
export async function getStats() {
  const [p, e, s, st] = await Promise.all([
    supabaseAdmin.from('papers').select('id,status'),
    supabaseAdmin.from('exams').select('id,status'),
    supabaseAdmin.from('submissions').select('id,status'),
    supabaseAdmin.from('users').select('id').eq('role', 'student'),
  ])
  const papers = p.data ?? []; const exams = e.data ?? []; const subs = s.data ?? []
  return {
    papers: papers.length,
    publishedPapers: papers.filter((x: { status: string }) => x.status === 'published').length,
    draftPapers: papers.filter((x: { status: string }) => x.status === 'draft').length,
    exams: exams.length,
    publishedExams: exams.filter((x: { status: string }) => x.status === 'published').length,
    submissions: subs.length,
    reviewedSubs: subs.filter((x: { status: string }) => ['reviewed', 'published'].includes(x.status)).length,
    students: st.data?.length ?? 0,
  }
}

// ── SCHEDULE ────────────────────────────────────────────────
export async function listSchedule() {
  const { data, error } = await supabaseAdmin.from('schedule_items').select('*, created_by:users(id,name,role,teacher_type), school:schools(id,name), exam:exams(id,title)').order('scheduled_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data as ScheduleItem[]
}

export async function createSchedule(body: Record<string, unknown>) {
  const uid = getSessionUid()
  const { data, error } = await supabaseAdmin.from('schedule_items').insert({ ...body, created_by_id: uid }).select().single()
  if (error) throw new Error(error.message)
  return data as ScheduleItem
}

export async function updateSchedule(id: string, body: Partial<ScheduleItem>) {
  const { data, error } = await supabaseAdmin.from('schedule_items').update(body).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as ScheduleItem
}

export async function deleteSchedule(id: string) {
  const { error } = await supabaseAdmin.from('schedule_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
