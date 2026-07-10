import { supabase, supabaseAdmin, STORAGE_BUCKET } from './supabase'
import { gradeFor, type Exam, type Paper, type ScheduleItem, type Submission, type User, type LibraryResource } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — Supabase Auth + profile row in users table
// ─────────────────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, name: string, role = 'student') {
  // Do NOT call supabase.auth.signUp — project has email auth disabled (returns 422)
  // Instead: create user row directly in users table

  // 1. Check email not already taken
  const { data: existing } = await supabaseAdmin
    .from('users').select('id').eq('email', email).maybeSingle()
  if (existing) throw new Error('An account with this email already exists. Please sign in.')

  // 2. Insert user row
  const { data: newUser, error } = await supabaseAdmin
    .from('users')
    .insert({ email, name, role, verification_status: role === 'student' ? 'approved' : 'pending', is_active: true })
    .select().single()
  if (error) throw new Error(error.message)

  // 3. Store password hash for login verification
  const hash = btoa(unescape(encodeURIComponent(password)))
  await supabaseAdmin.from('user_credentials')
    .upsert({ user_id: newUser.id, password_hash: hash }, { onConflict: 'user_id' })
    .then(() => {}).catch(() => {})

  // 4. Set local session
  setSessionUid(newUser.id)

  return { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role }
}

export async function signIn(email: string, password: string) {
  // Find user profile
  const { data: profile } = await supabaseAdmin
    .from('users').select('*').eq('email', email).maybeSingle()
  if (!profile) throw new Error('No account found. Please register first.')
  if (profile.is_active === false) throw new Error('Account inactive — contact an administrator.')

  // Verify password against user_credentials table
  const { data: creds } = await supabaseAdmin
    .from('user_credentials').select('password_hash').eq('user_id', profile.id).maybeSingle()
  if (creds?.password_hash) {
    const hash = btoa(unescape(encodeURIComponent(password)))
    if (creds.password_hash !== hash) throw new Error('Incorrect password.')
  }

  // Set local session
  setSessionUid(profile.id)

  // Also sign in via Supabase Auth in background (non-blocking)
  supabase.auth.signInWithPassword({ email, password }).catch(() => {})

  return { id: profile.id, email: profile.email }
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
  // Prefer Supabase Auth session
  try {
    const authUser = await getAuthUser()
    if (authUser) {
      const { data } = await supabaseAdmin.from('users').select('*, school:schools(*), verification_status, teaching_levels, subjects_taught').eq('id', authUser.id).maybeSingle()
      if (data) { setSessionUid(data.id); return data as User }
    }
  } catch { /* auth optional */ }

  // Fallback: localStorage uid session
  const uid = getSessionUid()
  if (uid) {
    try {
      const { data, error } = await supabaseAdmin.from('users').select('*, school:schools(*), verification_status, teaching_levels, subjects_taught').eq('id', uid).maybeSingle()
      if (error) throw error
      if (data) return data as User
    } catch (e) {
      // Distinguish DB-missing from just no-row
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('schema cache')) {
        throw new Error('DB_NOT_SETUP')
      }
    }
  }
  // No session — not logged in
  return null
}

export async function getAllUsers(): Promise<User[]> {
  const { data } = await supabaseAdmin.from('users').select('id,name,email,role,school_id,created_at').order('role')
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
    .select('*, created_by:users(id,name,role), school:schools(id,name), questions(id), submissions(id)')
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
    .select('*, created_by:users(id,name,role), school:schools(id,name), questions(*)')
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
    .select('*, student:users!submissions_student_id_fkey(id,name,email), exam:exams(id,title,subject,level,total_marks,exam_type,created_by_id), answers(*, question:questions(*))')
    .order('submitted_at', { ascending: false })
  if (params.exam_id) q = q.eq('exam_id', params.exam_id)
  if (params.student_id) q = q.eq('student_id', params.student_id)
  // 'all' (or any unrecognised sentinel) means "do not filter by status"
  if (params.status && params.status !== 'all') q = q.eq('status', params.status)
  if (params.mine === '1') { const uid = getSessionUid(); if (uid) q = q.eq('student_id', uid) }
  // taught_by='1' → only submissions for exams created by the current user (teacher review scope)
  if (params.taught_by === '1') {
    const uid = getSessionUid()
    if (uid) q = q.eq('exam.created_by_id', uid)
  }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as Submission[]
}

export async function getSubmission(id: string): Promise<Submission> {
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('*, student:users!submissions_student_id_fkey(*), exam:exams(*, questions(*)), answers(*, question:questions(*))')
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
    .select('*, created_by:users(id,name,role), school:schools(id,name), exam:exams(id,title,exam_type,status)')
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
  // Delete any existing pending request for this user first
  await supabaseAdmin.from('verification_requests')
    .delete().eq('user_id', body.user_id).eq('status', 'pending')

  const { data, error } = await supabaseAdmin
    .from('verification_requests')
    .insert({ ...body, status: 'pending' })
    .select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function listVerificationRequests(status?: string) {
  let q = supabaseAdmin
    .from('verification_requests')
    .select('*, user:users(id,name,email,role,school_id,verification_status)')
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
  // 'all' (used by contributors to see their own drafts) skips the default published-only filter
  if (params.status && params.status !== 'all') q = q.eq('status', params.status)
  else if (!params.status) q = q.eq('status', 'published')
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

// ─────────────────────────────────────────────────────────────────────────────
// FORUM
// ─────────────────────────────────────────────────────────────────────────────

export interface ForumChannel {
  id: string; level: string; subject: string; description: string | null
  topic_count?: number; created_at: string
}
export interface ForumTopic {
  id: string; channel_id: string; author_id: string; author?: User
  title: string; body: string; is_pinned: boolean; is_locked: boolean
  views: number; reply_count: number; last_reply_at: string; created_at: string
}
export interface ForumPost {
  id: string; topic_id: string; author_id: string; author?: User
  parent_id: string | null; parent?: ForumPost | null
  body: string; image_url: string | null; file_url: string | null; file_name: string | null
  is_solution: boolean; like_count: number
  liked_by_me?: boolean
  created_at: string; updated_at: string
  replies?: ForumPost[]
}

export async function listForumChannels(level?: string): Promise<ForumChannel[]> {
  let q = supabaseAdmin.from('forum_channels').select('*').order('subject')
  if (level) q = q.eq('level', level)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as ForumChannel[]
}

export async function listForumTopics(channelId: string): Promise<ForumTopic[]> {
  const { data, error } = await supabaseAdmin
    .from('forum_topics')
    .select('*, author:users(id,name,role,avatar_url)')
    .eq('channel_id', channelId)
    .order('is_pinned', { ascending: false })
    .order('last_reply_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ForumTopic[]
}

export async function getForumTopic(id: string): Promise<ForumTopic> {
  try { await supabaseAdmin.rpc('increment_topic_views', { p_topic_id: id }) } catch { /**/ }
  const { data, error } = await supabaseAdmin
    .from('forum_topics')
    .select('*, author:users(id,name,role,avatar_url,subjects_taught,teaching_levels)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as ForumTopic
}

export async function createForumTopic(body: {
  channel_id: string; title: string; body: string
}): Promise<ForumTopic> {
  const uid = getSessionUid()
  const { data, error } = await supabaseAdmin
    .from('forum_topics')
    .insert({ ...body, author_id: uid })
    .select('*, author:users(id,name,role,avatar_url)')
    .single()
  if (error) throw new Error(error.message)
  return data as ForumTopic
}

export async function updateForumTopic(id: string, body: Partial<{ title: string; body: string; is_pinned: boolean; is_locked: boolean }>) {
  const { data, error } = await supabaseAdmin.from('forum_topics').update(body).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as ForumTopic
}

export async function deleteForumTopic(id: string) {
  const { error } = await supabaseAdmin.from('forum_topics').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listForumPosts(topicId: string): Promise<ForumPost[]> {
  const uid = getSessionUid()
  const { data, error } = await supabaseAdmin
    .from('forum_posts')
    .select('*, author:users(id,name,role,avatar_url,subjects_taught,teaching_levels)')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)

  // Check likes for current user
  let likedPostIds: string[] = []
  if (uid) {
    const { data: likes } = await supabaseAdmin
      .from('forum_likes')
      .select('post_id')
      .eq('user_id', uid)
      .in('post_id', (data ?? []).map((p: Record<string,unknown>) => p.id as string))
    likedPostIds = (likes ?? []).map((l: Record<string,unknown>) => l.post_id as string)
  }

  // Build threaded structure — top-level posts + their replies
  const posts = (data ?? []) as ForumPost[]
  const withLikes = posts.map(p => ({ ...p, liked_by_me: likedPostIds.includes(p.id) }))
  const topLevel = withLikes.filter(p => !p.parent_id)
  const replies  = withLikes.filter(p => !!p.parent_id)
  return topLevel.map(p => ({
    ...p,
    replies: replies.filter(r => r.parent_id === p.id),
  }))
}

export async function createForumPost(body: {
  topic_id: string; body: string; parent_id?: string
  image_url?: string; file_url?: string; file_name?: string
}): Promise<ForumPost> {
  const uid = getSessionUid()
  const { data, error } = await supabaseAdmin
    .from('forum_posts')
    .insert({ ...body, author_id: uid })
    .select('*, author:users(id,name,role,avatar_url)')
    .single()
  if (error) throw new Error(error.message)
  return data as ForumPost
}

export async function deleteForumPost(id: string) {
  const { error } = await supabaseAdmin.from('forum_posts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markPostAsSolution(postId: string, topicId: string) {
  // Unmark existing solution first
  await supabaseAdmin.from('forum_posts').update({ is_solution: false }).eq('topic_id', topicId)
  const { data, error } = await supabaseAdmin
    .from('forum_posts').update({ is_solution: true }).eq('id', postId).select().single()
  if (error) throw new Error(error.message)
  return data as ForumPost
}

export async function toggleForumLike(postId: string) {
  const uid = getSessionUid()
  const { data, error } = await supabaseAdmin
    .rpc('toggle_forum_like', { p_user_id: uid, p_post_id: postId })
  if (error) throw new Error(error.message)
  return (data?.[0] ?? { liked: false, like_count: 0 }) as { liked: boolean; like_count: number }
}

export async function uploadForumAttachment(file: File): Promise<{ url: string; name: string }> {
  const ext = file.name.split('.').pop()
  const path = `${getSessionUid()}/${Date.now()}.${ext}`
  const { error } = await supabaseAdmin.storage.from('forum-attachments').upload(path, file, {
    cacheControl: '3600', upsert: true, contentType: file.type,
  })
  if (error) throw new Error(error.message)
  const { data } = supabaseAdmin.storage.from('forum-attachments').getPublicUrl(path)
  return { url: data.publicUrl, name: file.name }
}

export function subscribeToForumPosts(topicId: string, callback: () => void) {
  const channel = supabase
    .channel(`forum-posts-${topicId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts', filter: `topic_id=eq.${topicId}` }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_likes' }, callback)
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export function subscribeToForumTopics(channelId: string, callback: () => void) {
  const channel = supabase
    .channel(`forum-topics-${channelId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_topics', filter: `channel_id=eq.${channelId}` }, callback)
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// ─────────────────────────────────────────────────────────────────────────────
// ONLINE SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface OnlineSession {
  id: string; teacher_id: string; teacher?: User
  title: string; description: string | null; subject: string; level: string
  session_type: 'group' | 'private'; status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  scheduled_at: string; duration_mins: number; max_students: number
  price_tzs: number; is_free: boolean; room_url: string | null
  recording_url: string | null; enrolled_count: number
  created_at: string; updated_at: string
  is_enrolled?: boolean
}

export interface SessionMessage {
  id: string; session_id: string; sender_id: string; sender?: User
  body: string; type: string; file_url: string | null; created_at: string
}

export interface Payment {
  id: string; student_id: string; teacher_id: string | null
  session_id: string | null; amount_tzs: number; phone_number: string
  network: string; reference: string | null; status: string
  description: string | null; paid_at: string | null; created_at: string
}

export async function listOnlineSessions(params: Record<string, string> = {}): Promise<OnlineSession[]> {
  const uid = getSessionUid()
  let q = supabaseAdmin
    .from('online_sessions')
    .select('*, teacher:users(id,name,role,avatar_url,rating,total_sessions,bio_public,subjects_taught)')
    .order('scheduled_at', { ascending: true })
  if (params.teacher_id) q = q.eq('teacher_id', params.teacher_id)
  if (params.subject) q = q.eq('subject', params.subject)
  if (params.level) q = q.eq('level', params.level)
  // 'all' (used by MyOnlineSessions to include 'ended' sessions) skips the default active-only filter
  if (params.status && params.status !== 'all') q = q.eq('status', params.status)
  else if (!params.status) q = q.in('status', ['scheduled', 'live'])
  const { data, error } = await q
  if (error) throw new Error(error.message)

  // Check enrollment for current user
  let enrolledIds: string[] = []
  if (uid) {
    const { data: enr } = await supabaseAdmin.from('session_enrollments')
      .select('session_id').eq('student_id', uid)
    enrolledIds = (enr ?? []).map((e: Record<string, unknown>) => e.session_id as string)
  }

  return ((data ?? []) as OnlineSession[]).map(s => ({
    ...s, is_enrolled: enrolledIds.includes(s.id)
  }))
}

export async function createOnlineSession(body: Partial<OnlineSession>): Promise<OnlineSession> {
  const uid = getSessionUid()
  const { data, error } = await supabaseAdmin
    .from('online_sessions')
    .insert({ ...body, teacher_id: uid,
      room_url: `https://meet.jit.si/examhub-${Date.now()}` })
    .select('*, teacher:users(id,name,role)').single()
  if (error) throw new Error(error.message)
  return data as OnlineSession
}

export async function updateOnlineSession(id: string, body: Partial<OnlineSession>): Promise<OnlineSession> {
  const { data, error } = await supabaseAdmin
    .from('online_sessions').update(body).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as OnlineSession
}

export async function deleteOnlineSession(id: string) {
  const { error } = await supabaseAdmin.from('online_sessions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function enrollInSession(sessionId: string): Promise<void> {
  const uid = getSessionUid()
  const { error } = await supabaseAdmin.from('session_enrollments')
    .insert({ session_id: sessionId, student_id: uid })
  if (error && !error.message.includes('duplicate')) throw new Error(error.message)
}

export async function listSessionEnrollments(sessionId: string) {
  const { data, error } = await supabaseAdmin.from('session_enrollments')
    .select('*, student:users!session_enrollments_student_id_fkey(id,name,role,avatar_url)')
    .eq('session_id', sessionId)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listSessionMessages(sessionId: string): Promise<SessionMessage[]> {
  const { data, error } = await supabaseAdmin.from('session_messages')
    .select('*, sender:users(id,name,role,avatar_url)')
    .eq('session_id', sessionId).order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as SessionMessage[]
}

export async function sendSessionMessage(sessionId: string, body: string, type = 'text', file_url?: string) {
  const uid = getSessionUid()
  const { data, error } = await supabaseAdmin.from('session_messages')
    .insert({ session_id: sessionId, sender_id: uid, body, type, file_url })
    .select('*, sender:users(id,name,role,avatar_url)').single()
  if (error) throw new Error(error.message)
  return data as SessionMessage
}

export function subscribeToSessionMessages(sessionId: string, callback: () => void) {
  const ch = supabase.channel(`session-${sessionId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_messages',
      filter: `session_id=eq.${sessionId}` }, callback)
    .subscribe()
  return () => supabase.removeChannel(ch)
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS — Lipa Namba (M-Pesa / Tigo / Airtel)
// ─────────────────────────────────────────────────────────────────────────────

export async function initiatePayment(body: {
  session_id: string; phone_number: string; network: string; amount_tzs: number
}): Promise<Payment> {
  const uid = getSessionUid()
  const session = await supabaseAdmin.from('online_sessions').select('teacher_id,title').eq('id', body.session_id).single()
  const { data, error } = await supabaseAdmin.from('payments').insert({
    student_id: uid,
    teacher_id: session.data?.teacher_id,
    session_id: body.session_id,
    amount_tzs: body.amount_tzs,
    phone_number: body.phone_number,
    network: body.network,
    lipa_namba: '123456',
    description: `ExamHub Session: ${session.data?.title}`,
    status: 'pending',
  }).select().single()
  if (error) throw new Error(error.message)
  return data as Payment
}

export async function confirmPayment(paymentId: string): Promise<void> {
  // Simulate payment confirmation (in production: webhook from payment provider)
  const ref = `REF${Date.now().toString(36).toUpperCase()}`
  try {
    await supabaseAdmin.rpc('complete_payment', { p_payment_id: paymentId, p_reference: ref })
  } catch {
    // fallback manual update
    const { data: pay } = await supabaseAdmin.from('payments').update({
      status: 'completed', reference: ref, paid_at: new Date().toISOString()
    }).eq('id', paymentId).select().single()
    if (pay?.session_id) {
      await enrollInSession(pay.session_id)
    }
  }
}

export async function getMyPayments(): Promise<Payment[]> {
  const uid = getSessionUid()
  const { data, error } = await supabaseAdmin.from('payments')
    .select('*, session:online_sessions(id,title,subject)').eq('student_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Payment[]
}

export async function rateTeacher(body: { teacher_id: string; session_id?: string; rating: number; review?: string }) {
  const uid = getSessionUid()
  const { error } = await supabaseAdmin.from('teacher_ratings')
    .upsert({ ...body, student_id: uid }, { onConflict: 'teacher_id,student_id,session_id' })
  if (error) throw new Error(error.message)
}

// Upload an image for an exam question → returns public URL
export async function uploadQuestionImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `questions/${getSessionUid()}/${Date.now()}.${ext}`
  const { error } = await supabaseAdmin.storage
    .from('forum-attachments')
    .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type })
  if (error) throw new Error(error.message)
  const { data } = supabaseAdmin.storage.from('forum-attachments').getPublicUrl(path)
  return data.publicUrl
}
