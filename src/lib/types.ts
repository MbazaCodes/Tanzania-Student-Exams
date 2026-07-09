export type Role = 'student' | 'teacher' | 'school_admin' | 'super_admin'
export type TeacherType = 'school' | 'independent'
export type Level = 'standard_4' | 'standard_7' | 'form_2' | 'form_4' | 'form_6'
export type PaperType = 'necta' | 'mock' | 'school' | 'regional' | 'pre_national'
export type PaperStatus = 'draft' | 'published' | 'archived'
export type ExamType = 'exam' | 'quiz' | 'daily_quiz' | 'assignment'
export type ExamStatus = 'draft' | 'published' | 'closed'
export type QuestionType = 'mcq' | 'truefalse' | 'short' | 'essay'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type SubmissionStatus = 'submitted' | 'auto_marked' | 'reviewed' | 'published'
export type ScheduleType = 'quiz_of_day' | 'exam' | 'test' | 'assignment'
export type ScheduleStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

export interface School { id: string; name: string; region: string; plan: string }
export interface User {
  id: string; name: string; email: string; role: Role
  teacher_type?: TeacherType | null; school_id: string | null; school?: School | null
  avatar_url?: string | null; bio?: string | null; phone?: string | null; created_at: string
}
export interface Paper {
  id: string; title: string; subject: string; level: Level; year: number
  type: PaperType; status: PaperStatus; file_name: string | null; file_size: number | null
  description: string | null; uploaded_by_id: string; uploaded_by?: User
  school_id: string | null; school?: School | null; exam?: Exam | null
  created_at: string; updated_at: string
}
export interface Question {
  id: string; exam_id: string; type: QuestionType; text: string; options: string
  correct_answer: string; explanation: string | null; marks: number
  difficulty: Difficulty; time_limit_secs: number | null; order: number
}
export interface Exam {
  id: string; title: string; subject: string; level: Level; exam_type: ExamType
  duration_mins: number; per_question_timer: number | null; total_marks: number
  status: ExamStatus; description: string | null; paper_id: string | null
  created_by_id: string; created_by?: User; school_id: string | null; school?: School | null
  is_online: boolean; show_answer_after: boolean
  questions?: Question[]; _count?: { questions: number; submissions: number }
  created_at: string; updated_at: string
}
export interface Answer {
  id: string; submission_id: string; question_id: string; question?: Question
  answer: string; is_correct: boolean | null; marks_awarded: number
  feedback: string | null; time_taken_secs: number | null
}
export interface Submission {
  id: string; exam_id: string; exam?: Exam; student_id: string; student?: User
  score: number | null; percentage: number | null; grade: string | null
  status: SubmissionStatus; reviewed_by_id: string | null; reviewed_by?: User | null
  reviewed_at: string | null; submitted_at: string; answers?: Answer[]; created_at: string
}
export interface ScheduleItem {
  id: string; title: string; type: ScheduleType; subject: string; level: string | null
  description: string | null; scheduled_at: string; duration_mins: number
  status: ScheduleStatus; exam_id: string | null; created_by_id: string
  created_by?: User; school_id: string | null; school?: School | null
  created_at: string; updated_at: string
}

export const LEVELS: { value: Level; label: string }[] = [
  { value: 'standard_4', label: 'Standard 4' },
  { value: 'standard_7', label: 'Standard 7 (PSLE)' },
  { value: 'form_2', label: 'Form 2 (FTNA)' },
  { value: 'form_4', label: 'Form 4 (CSEE)' },
  { value: 'form_6', label: 'Form 6 (ACSEE)' },
]
export const SUBJECTS = [
  'Biology','Chemistry','Physics','Mathematics','English','Kiswahili',
  'Geography','History','Civics','Book-Keeping','Commerce','General Studies',
  'Computer Studies','Agriculture',
]
export const PAPER_TYPES: { value: PaperType; label: string }[] = [
  { value: 'necta', label: 'NECTA Past Paper' },
  { value: 'mock', label: 'Mock Exam' },
  { value: 'pre_national', label: 'Pre-National' },
  { value: 'regional', label: 'Regional' },
  { value: 'school', label: 'School Exam' },
]
export const EXAM_TYPES: { value: ExamType; label: string; icon: string }[] = [
  { value: 'exam', label: 'Full Exam', icon: '📋' },
  { value: 'quiz', label: 'Quiz', icon: '⚡' },
  { value: 'daily_quiz', label: 'Daily Quiz', icon: '🌅' },
  { value: 'assignment', label: 'Assignment', icon: '📝' },
]
export const QUESTION_TYPES: { value: QuestionType; label: string; hint: string }[] = [
  { value: 'mcq', label: 'Multiple Choice', hint: 'Auto-marked' },
  { value: 'truefalse', label: 'True / False', hint: 'Auto-marked' },
  { value: 'short', label: 'Short Answer', hint: 'Auto-marked (match)' },
  { value: 'essay', label: 'Essay', hint: 'Teacher-marked' },
]
export const SCHEDULE_TYPES: { value: ScheduleType; label: string }[] = [
  { value: 'quiz_of_day', label: 'Quiz of the Day' },
  { value: 'exam', label: 'Exam' },
  { value: 'test', label: 'Test' },
  { value: 'assignment', label: 'Assignment' },
]
export function gradeFor(p: number) {
  if (p >= 80) return 'A'; if (p >= 65) return 'B'
  if (p >= 50) return 'C'; if (p >= 40) return 'D'; return 'F'
}
export function levelLabel(v: string) { return LEVELS.find(l => l.value === v)?.label ?? v }
export function examTypeLabel(v: string) { return EXAM_TYPES.find(t => t.value === v)?.label ?? v }
export const ROLE_LABEL: Record<string, string> = {
  student: 'Student', teacher: 'Teacher', school_admin: 'School Admin', super_admin: 'Super Admin',
}
