import { supabase, supabaseAdmin, STORAGE_BUCKET } from './supabase'
import { gradeFor, type Exam, type Paper, type ScheduleItem, type Submission, type User, type LibraryResource } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — Supabase Auth + profile row in users table
// ─────────────────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, name: string, role = 'student') {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role } } })
  if (error) throw new Error(error.message)
  if (data.user) {
    // Upsert profile row
    await supabaseAdmin.from('users').upsert({
      id: data.user.id, email, name, role,
    }, { onConflict: 'id' })
  }
  return data.user
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data.user
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getAuthUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw new Error(error.message)
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION — demo switcher (localStorage uid) merged with Supabase Auth
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'eh_uid'
export function getSessionUid(): string | null { return localStorage.getItem(SESSION_KEY) }
export function setSessionUid(id: string) { localStorage.setItem(SESSION_KEY, id) }
export function clearSessionUid() { localStorage.removeItem(SESSION_KEY) }

export async function getCurrentUser(): Promise<User | null> {
  try {
    // Prefer Supabase Auth session
    const authUser = await getAuthUser()
    if (authUser) {
      const { data } = await supabaseAdmin.from('users').select('*, school:schools(*)').eq('id', authUser.id).maybeSingle()
      if (data) { setSessionUid(data.id); return data as User }
    }
    // Fallback: demo switcher (localStorage uid)
    const uid = getSessionUid()
    if (uid) {
      const { data } = await supabaseAdmin.from('users').select('*, school:schools(*)').eq('id', uid).maybeSingle()
      if (data) return data as User
    }
    // Last resort: first super_admin row
    const { data } = await supabaseAdmin.from('users').select('*, school:schools(*)').eq('role', 'super_admin').limit(1).maybeSingle()
    if (data) { setSessionUid(data.id); return data as User }
    return null
  } catch {
    // Table doesn't exist yet — SQL migrations not run
    return null
  }
}

export async function getAllUsers(): Promise<User[]> {
  const { data } = await supabaseAdmin.from('users').select('id,name,email,role,teacher_type,school_id,created_at').order('role')
  return (data ?? []) as User[]
}

export async function getUserById(id: string): Promise<User | null> {
  const { data } = await supabaseAdmin.from('users').select('*, school:schools(*)').eq('id', id).maybeSingle()
  return data as User | null
}

export async function updateUserProfile(id: string, updates: Partial<User>) {
  const { data, error } = await supabaseAdmin.from('users').update(updates).eq('id', id).select('*, school:schools(*)').single()
  if (error) throw new Error(error.message)
  return data as User
}

export async function createUserProfile(profile: {
  id: string; name: string; email: string; role: string
  phone?: string | null
  school_id?: string | null
  school_name?: string | null
  region?: string | null
  district?: string | null
  teaching_levels?: string | null
  subjects_taught?: string | null
}) {
  const { data, error } = await supabaseAdmin.from('users').upsert(profile, { onConflict: 'id' }).select().single()
  if (error) throw new Error(error.message)
  return data as User
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOLS
// ─────────────────────────────────────────────────────────────────────────────

export async function listSchools() {
  const { data, error } = await supabaseAdmin.from('schools').select('*').order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function createSchool(body: { name: string; region: string; plan?: string }) {
  const { data, error } = await supabaseAdmin.from('schools').insert({ ...body, plan: body.plan ?? 'free' }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateSchool(id: string, body: Partial<{ name: string; region: string; plan: string }>) {
  const { data, error } = await supabaseAdmin.from('schools').update(body).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE STORAGE — Supabase Storage bucket: exam-papers
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadPaperFile(file: File, paperId: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${paperId}/${Date.now()}.${ext}`
  const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type,
  })
  if (error) throw new Error(error.message)
  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deletePaperFile(path: string) {
  const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([path])
  if (error) throw new Error(error.message)
}

export function getPaperFileUrl(path: string): string {
  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ─────────────────────────────────────────────────────────────────────────────
// PAPERS
// ─────────────────────────────────────────────────────────────────────────────

export async function listPapers(params: Record<string, string> = {}): Promise<Paper[]> {
  let q = supabaseAdmin
    .from('papers')
    .select('*, uploaded_by:users(id,name,role), school:schools(id,name,region)')
    .order('created_at', { ascending: false })
  if (params.status) q = q.eq('status', params.status)
  if (params.subject) q = q.eq('subject', params.subject)
  if (params.level) q = q.eq('level', params.level)
  if (params.type) q = q.eq('type', params.type)
  if (params.school_id) q = q.eq('school_id', params.school_id)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as Paper[]
}

export async function getPaper(id: string): Promise<Paper> {
  const { data, error } = await supabaseAdmin
    .from('papers')
    .select('*, uploaded_by:users(id,name,role), school:schools(id,name), exam:exams(id,title,status)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as Paper
}

export async function createPaper(body: Record<string, unknown>): Promise<Paper> {
  const uid = getSessionUid()
  const { data, error } = await supabaseAdmin
    .from('papers')
    .insert({ ...body, uploaded_by_id: uid })
    .select('*, uploaded_by:users(id,name,role)')
    .single()
  if (error) throw new Error(error.message)
  return data as Paper
}

export async function updatePaper(id: string, body: Partial<Paper>): Promise<Paper> {
  const { data, error } = await supabaseAdmin.from('papers').update(body).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Paper
}

export async function deletePaper(id: string) {
  const { error } = await supabaseAdmin.from('papers').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMS
// ─────────────────────────────────────────────────────────────────────────────

export async function listExams(params: Record<string, string> = {}): Promise<Exam[]> {
  let q = supabaseAdmin
    .from('exams')
    .select('*, created_by:users(id,name,role,teacher_type), school:schools(id,name), questions(id), submissions(id)')
    .order('created_at', { ascending: false })
  if (params.scope === 'published') q = q.eq('status', 'published')
  if (params.status) q = q.eq('status', params.status)
  if (params.subject) q = q.eq('subject', params.subject)
  if (params.level) q = q.eq('level', params.level)
  if (params.exam_type) q = q.eq('exam_type', params.exam_type)
  if (params.school_id) q = q.eq('school_id', params.school_id)
  if (params.mine === '1') { const uid = getSessionUid(); if (uid) q = q.eq('created_by_id', uid) }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return ((data ?? []) as Record<string, unknown>[]).map(e => ({
    ...e,
    _count: {
      questions: Array.isArray(e.questions) ? (e.questions as unknown[]).length : 0,
      submissions: Array.isArray(e.submissions) ? (e.submissions as unknown[]).length : 0,
    },
  })) as Exam[]
}

export async function getExam(id: string): Promise<Exam> {
  const { data, error } = await supabaseAdmin
    .from('exams')
    .select('*, created_by:users(id,name,role,teacher_type), school:schools(id,name), questions(*)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return {
    ...data,
    questions: ((data.questions ?? []) as { order: number }[]).sort((a, b) => a.order - b.order),
  } as Exam
}

export async function createExam(body: Record<string, unknown>): Promise<Exam> {
  const uid = getSessionUid()
  const { questions, ...examData } = body as { questions?: Record<string, unknown>[]; [k: string]: unknown }
  const { data: exam, error } = await supabaseAdmin
    .from('exams')
    .insert({ ...examData, created_by_id: uid })
    .select()
    .single()
  if (error) throw new Error(error.message)
  if (questions?.length) {
    const rows = questions.map((q, i) => ({
      ...q,
      exam_id: exam.id,
      options: Array.isArray(q.options) ? JSON.stringify(q.options) : (q.options ?? '[]'),
      order: i,
    }))
    const { error: qe } = await supabaseAdmin.from('questions').insert(rows)
    if (qe) throw new Error(qe.message)
  }
  const { data: qs } = await supabaseAdmin.from('questions').select('marks').eq('exam_id', exam.id)
  const total = ((qs ?? []) as { marks: number }[]).reduce((s, q) => s + (q.marks ?? 0), 0)
  await supabaseAdmin.from('exams').update({ total_marks: total }).eq('id', exam.id)
  return { ...exam, total_marks: total } as Exam
}

export async function updateExam(id: string, body: Partial<Exam>): Promise<Exam> {
  const { data, error } = await supabaseAdmin.from('exams').update(body).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Exam
}

export async function deleteExam(id: string) {
  const { error } = await supabaseAdmin.from('exams').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function duplicateExam(id: string): Promise<Exam> {
  const original = await getExam(id)
  const questions = original.questions ?? []
  const { questions: _q, id: _id, created_at: _ca, updated_at: _ua, ...rest } = original as unknown as Record<string, unknown>
  const newExam = await createExam({
    ...rest,
    title: `${original.title} (copy)`,
    status: 'draft',
    questions: questions.map(q => {
      const { id: _id, exam_id: _eid, created_at: _ca, ...qrest } = q as unknown as Record<string, unknown>
      return qrest
    }),
  })
  return newExam
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTIONS (standalone CRUD for editing exam questions)
// ─────────────────────────────────────────────────────────────────────────────

export async function addQuestion(examId: string, q: Record<string, unknown>) {
  const { data: existing } = await supabaseAdmin.from('questions').select('order').eq('exam_id', examId).order('order', { ascending: false }).limit(1).single()
  const nextOrder = existing ? (existing.order + 1) : 0
  const { data, error } = await supabaseAdmin.from('questions').insert({
    ...q, exam_id: examId, order: nextOrder,
    options: Array.isArray(q.options) ? JSON.stringify(q.options) : (q.options ?? '[]'),
  }).select().single()
  if (error) throw new Error(error.message)
  // Recalculate total_marks
  const { data: qs } = await supabaseAdmin.from('questions').select('marks').eq('exam_id', examId)
  const total = ((qs ?? []) as { marks: number }[]).reduce((s, q) => s + q.marks, 0)
  await supabaseAdmin.from('exams').update({ total_marks: total }).eq('id', examId)
  return data
}

export async function updateQuestion(id: string, body: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from('questions').update(body).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteQuestion(id: string, examId: string) {
  const { error } = await supabaseAdmin.from('questions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  const { data: qs } = await supabaseAdmin.from('questions').select('marks').eq('exam_id', examId)
  const total = ((qs ?? []) as { marks: number }[]).reduce((s, q) => s + q.marks, 0)
  await supabaseAdmin.from('exams').update({ total_marks: total }).eq('id', examId)
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function listSubmissions(params: Record<string, string> = {}): Promise<Submission[]> {
  let q = supabaseAdmin
    .from('submissions')
    .select('*, student:users(id,name,email), exam:exams(id,title,subject,level,total_marks,exam_type), answers(*, question:questions(*))')
    .order('submitted_at', { ascending: false })
  if (params.exam_id) q = q.eq('exam_id', params.exam_id)
  if (params.student_id) q = q.eq('student_id', params.student_id)
  if (params.status) q = q.eq('status', params.status)
  if (params.mine === '1') { const uid = getSessionUid(); if (uid) q = q.eq('student_id', uid) }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as Submission[]
}

export async function getSubmission(id: string): Promise<Submission> {
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('*, student:users(*), exam:exams(*, questions(*)), answers(*, question:questions(*))')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as Submission
}

export async function submitExam(
  examId: string,
  answers: Record<string, string>,
  timings?: Record<string, number>
): Promise<Submission> {
  const uid = getSessionUid()
  if (!uid) throw new Error('Not logged in')
  const exam = await getExam(examId)
  const questions = exam.questions ?? []
  let score = 0
  const rows: Record<string, unknown>[] = []
  for (const q of questions) {
    const ans = (answers[q.id] ?? '').trim()
    let isCorrect: boolean | null = null
    let awarded = 0
    if (q.type === 'mcq') {
      isCorrect = ans === q.correct_answer; awarded = isCorrect ? q.marks : 0
    } else if (q.type === 'truefalse') {
      isCorrect = ans.toLowerCase() === q.correct_answer.toLowerCase(); awarded = isCorrect ? q.marks : 0
    } else if (q.type === 'short') {
      isCorrect = ans.toLowerCase().trim() === q.correct_answer.toLowerCase().trim(); awarded = isCorrect ? q.marks : 0
    }
    // essay: isCorrect stays null, awarded stays 0
    score += awarded
    rows.push({ question_id: q.id, answer: ans, is_correct: isCorrect, marks_awarded: awarded, time_taken_secs: timings?.[q.id] ?? null })
  }
  const total = exam.total_marks || 1
  const pct = Math.round((score / total) * 10000) / 100
  const hasEssay = rows.some(r => r.is_correct === null)
  const { data: sub, error } = await supabaseAdmin
    .from('submissions')
    .insert({ exam_id: examId, student_id: uid, score, percentage: pct, grade: gradeFor(pct), status: hasEssay ? 'auto_marked' : 'auto_marked' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  const { error: ae } = await supabaseAdmin.from('answers').insert(rows.map(r => ({ ...r, submission_id: sub.id })))
  if (ae) throw new Error(ae.message)
  return getSubmission(sub.id)
}

export async function reviewSubmission(
  id: string,
  updates: Record<string, { marks_awarded?: number; feedback?: string }>
): Promise<Submission> {
  for (const [aid, patch] of Object.entries(updates)) {
    const { error } = await supabaseAdmin.from('answers').update(patch).eq('id', aid)
    if (error) throw new Error(error.message)
  }
  // Recalculate score
  const { data: sub } = await supabaseAdmin
    .from('submissions')
    .select('*, exam:exams(total_marks), answers(marks_awarded)')
    .eq('id', id)
    .single()
  const score = ((sub?.answers ?? []) as { marks_awarded: number }[]).reduce((s, a) => s + (a.marks_awarded ?? 0), 0)
  const total = (sub?.exam as { total_marks: number } | null)?.total_marks || 1
  const pct = Math.round((score / total) * 10000) / 100
  const uid = getSessionUid()
  await supabaseAdmin.from('submissions').update({
    score, percentage: pct, grade: gradeFor(pct),
    status: 'reviewed', reviewed_by_id: uid, reviewed_at: new Date().toISOString(),
  }).eq('id', id)
  return getSubmission(id)
}

export async function publishSubmission(id: string): Promise<Submission> {
  await supabaseAdmin.from('submissions').update({ status: 'published' }).eq('id', id)
  return getSubmission(id)
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────

export async function getStats(schoolId?: string) {
  const base = schoolId
  const [p, e, s, st, teachers] = await Promise.all([
    base ? supabaseAdmin.from('papers').select('id,status').eq('school_id', base) : supabaseAdmin.from('papers').select('id,status'),
    base ? supabaseAdmin.from('exams').select('id,status').eq('school_id', base) : supabaseAdmin.from('exams').select('id,status'),
    supabaseAdmin.from('submissions').select('id,status'),
    supabaseAdmin.from('users').select('id').eq('role', 'student'),
    supabaseAdmin.from('users').select('id').eq('role', 'teacher'),
  ])
  const papers = (p.data ?? []) as { status: string }[]
  const exams = (e.data ?? []) as { status: string }[]
  const subs = (s.data ?? []) as { status: string }[]
  return {
    papers: papers.length,
    publishedPapers: papers.filter(x => x.status === 'published').length,
    draftPapers: papers.filter(x => x.status === 'draft').length,
    archivedPapers: papers.filter(x => x.status === 'archived').length,
    exams: exams.length,
    publishedExams: exams.filter(x => x.status === 'published').length,
    draftExams: exams.filter(x => x.status === 'draft').length,
    submissions: subs.length,
    reviewedSubs: subs.filter(x => ['reviewed', 'published'].includes(x.status)).length,
    pendingSubs: subs.filter(x => ['submitted', 'auto_marked'].includes(x.status)).length,
    students: st.data?.length ?? 0,
    teachers: teachers.data?.length ?? 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────

export async function listSchedule(params: Record<string, string> = {}): Promise<ScheduleItem[]> {
  let q = supabaseAdmin
    .from('schedule_items')
    .select('*, created_by:users(id,name,role,teacher_type), school:schools(id,name), exam:exams(id,title,exam_type,status)')
    .order('scheduled_at', { ascending: true })
  if (params.school_id) q = q.eq('school_id', params.school_id)
  if (params.status) q = q.eq('status', params.status)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as ScheduleItem[]
}

export async function createSchedule(body: Record<string, unknown>): Promise<ScheduleItem> {
  const uid = getSessionUid()
  const { data, error } = await supabaseAdmin
    .from('schedule_items')
    .insert({ ...body, created_by_id: uid })
    .select('*, created_by:users(id,name,role), school:schools(id,name)')
    .single()
  if (error) throw new Error(error.message)
  return data as ScheduleItem
}

export async function updateSchedule(id: string, body: Partial<ScheduleItem>): Promise<ScheduleItem> {
  const { data, error } = await supabaseAdmin
    .from('schedule_items').update(body).eq('id', id)
    .select('*, created_by:users(id,name,role), school:schools(id,name)')
    .single()
  if (error) throw new Error(error.message)
  return data as ScheduleItem
}

export async function deleteSchedule(id: string) {
  const { error } = await supabaseAdmin.from('schedule_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME — subscribe to exam submissions (for online exam leaderboard)
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToExamSubmissions(
  examId: string,
  callback: (payload: Record<string, unknown>) => void
) {
  const channel = supabase
    .channel(`exam-submissions-${examId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'submissions',
      filter: `exam_id=eq.${examId}`,
    }, payload => callback(payload.new as Record<string, unknown>))
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export function subscribeToScheduleUpdates(callback: () => void) {
  const channel = supabase
    .channel('schedule-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_items' }, callback)
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION — teacher/school approval workflow
// ─────────────────────────────────────────────────────────────────────────────


export async function submitVerificationRequest(body: {
  user_id: string; role: string; school_name?: string
  school_id?: string; message?: string
}) {
  const { data, error } = await supabaseAdmin
    .from('verification_requests')
    .upsert({ ...body, status: 'pending' }, { onConflict: 'user_id' })
    .select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function listVerificationRequests(status?: string) {
  let q = supabaseAdmin
    .from('verification_requests')
    .select('*, user:users(id,name,email,role,teacher_type,school_id,verification_status)')
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function approveVerification(userId: string, note?: string) {
  const reviewer = getSessionUid()
  const { error } = await supabaseAdmin.rpc('approve_user_verification', {
    p_user_id: userId, p_reviewer_id: reviewer, p_note: note ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function rejectVerification(userId: string, reason: string) {
  const reviewer = getSessionUid()
  const { error } = await supabaseAdmin.rpc('reject_user_verification', {
    p_user_id: userId, p_reviewer_id: reviewer, p_reason: reason,
  })
  if (error) throw new Error(error.message)
}

export async function grantAdminRole(userId: string) {
  const { error } = await supabaseAdmin.from('users').update({
    role: 'super_admin', verification_status: 'approved', is_active: true,
  }).eq('id', userId)
  if (error) throw new Error(error.message)
}

// ─────────────────────────────────────────────────────────────────────────────
// LIBRARY RESOURCES
// ─────────────────────────────────────────────────────────────────────────────

export async function listLibraryResources(params: Record<string, string> = {}): Promise<LibraryResource[]> {
  let q = supabaseAdmin
    .from('library_resources')
    .select('*, contributed_by:users(id,name,role), school:schools(id,name)')
    .order('created_at', { ascending: false })
  if (params.type) q = q.eq('type', params.type)
  if (params.subject) q = q.eq('subject', params.subject)
  if (params.level) q = q.eq('level', params.level)
  if (params.status) q = q.eq('status', params.status)
  else q = q.eq('status', 'published')
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as LibraryResource[]
}

export async function createLibraryResource(body: Record<string, unknown>): Promise<LibraryResource> {
  const uid = getSessionUid()
  const { data, error } = await supabaseAdmin
    .from('library_resources')
    .insert({ ...body, contributed_by_id: uid })
    .select().single()
  if (error) throw new Error(error.message)
  return data as LibraryResource
}

export async function updateLibraryResource(id: string, body: Partial<LibraryResource>): Promise<LibraryResource> {
  const { data, error } = await supabaseAdmin
    .from('library_resources').update(body).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as LibraryResource
}

export async function deleteLibraryResource(id: string) {
  const { error } = await supabaseAdmin.from('library_resources').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function uploadLibraryFile(file: File, resourceId: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${resourceId}/${Date.now()}.${ext}`
  const { error } = await supabaseAdmin.storage.from('library').upload(path, file, {
    cacheControl: '3600', upsert: true, contentType: file.type,
  })
  if (error) throw new Error(error.message)
  const { data } = supabaseAdmin.storage.from('library').getPublicUrl(path)
  return data.publicUrl
}

export async function incrementResourceDownload(id: string) {
  try {
    await supabaseAdmin.rpc('increment_download', { p_paper_id: id })
  } catch {
    // fallback - silently ignore if function not deployed yet
  }
}
