<<<<<<< Updated upstream
// Shared domain types for ExamHub

export type Role = "student" | "teacher" | "school_admin" | "super_admin";
export type Level =
  | "standard_4"
  | "standard_7"
  | "form_2"
  | "form_4"
  | "form_6";
export type PaperType = "necta" | "mock" | "school" | "regional" | "pre_national";
export type PaperStatus = "draft" | "published" | "archived";
export type ExamStatus = "draft" | "published" | "closed";
export type QuestionType = "mcq" | "truefalse" | "short" | "essay";
export type Difficulty = "easy" | "medium" | "hard";
export type SubmissionStatus =
  | "submitted"
  | "auto_marked"
  | "reviewed"
  | "published";

export type ScheduleType = "quiz_of_day" | "exam" | "test" | "assignment";
export type ScheduleStatus = "scheduled" | "live" | "completed" | "cancelled";

=======
export type Role = 'student' | 'teacher' | 'school_admin' | 'super_admin'
export type TeacherType = 'school' | 'independent'
export type VerificationStatus = 'pending' | 'approved' | 'rejected'
export type Level = 'standard_4' | 'standard_7' | 'form_2' | 'form_4' | 'form_6'
export type PaperType = 'necta' | 'mock' | 'school' | 'regional' | 'pre_national'
export type PaperStatus = 'draft' | 'published' | 'archived'
export type ExamType = 'exam' | 'quiz' | 'daily_quiz' | 'assignment'
export type ExamStatus = 'draft' | 'published' | 'closed'
export type QuestionType = 'mcq' | 'truefalse' | 'short' | 'essay' | 'formula' | 'table' | 'graph'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type SubmissionStatus = 'submitted' | 'auto_marked' | 'reviewed' | 'published'
export type ScheduleType = 'quiz_of_day' | 'exam' | 'test' | 'assignment'
export type ScheduleStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'
export type ResourceType = 'book' | 'notes' | 'video' | 'article' | 'past_paper' | 'syllabus'

export interface School {
  id: string; name: string; region: string; plan: string
  logo_url?: string | null; contact_email?: string | null; contact_phone?: string | null
}
export interface User {
  id: string; name: string; email: string; role: Role
  teacher_type?: TeacherType | null
  verification_status?: VerificationStatus | null
  verified_at?: string | null
  school_id: string | null; school?: School | null
  avatar_url?: string | null; bio?: string | null; phone?: string | null
  is_active?: boolean; created_at: string
}
export interface Paper {
  id: string; title: string; subject: string; level: Level; year: number
  type: PaperType; status: PaperStatus; file_name: string | null; file_size: number | null
  file_url?: string | null; description: string | null
  uploaded_by_id: string; uploaded_by?: User
  school_id: string | null; school?: School | null; exam?: Exam | null
  created_at: string; updated_at: string
}
export interface QuestionTableData {
  headers: string[]
  rows: string[][]
}
export interface QuestionGraphData {
  type: 'bar' | 'line' | 'pie' | 'scatter'
  title?: string
  labels: string[]
  datasets: { label: string; data: number[]; color?: string }[]
}
export interface Question {
  id: string; exam_id: string; type: QuestionType; text: string
  options: string        // JSON array for mcq
  correct_answer: string
  explanation: string | null
  formula?: string | null          // LaTeX formula string
  table_data?: string | null       // JSON QuestionTableData
  graph_data?: string | null       // JSON QuestionGraphData
  image_url?: string | null
  marks: number; difficulty: Difficulty
  time_limit_secs: number | null; order: number
}
export interface Exam {
  id: string; title: string; subject: string; level: Level; exam_type: ExamType
  duration_mins: number; per_question_timer: number | null; total_marks: number
  pass_mark?: number
  status: ExamStatus; description: string | null
  instructions?: string | null
  paper_id: string | null
  created_by_id: string; created_by?: User
  school_id: string | null; school?: School | null
  is_online: boolean; show_answer_after: boolean
  randomize_questions?: boolean
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
>>>>>>> Stashed changes
export interface ScheduleItem {
  id: string;
  title: string;
  type: ScheduleType;
  subject: string;
  level: string | null;
  description: string | null;
  scheduledAt: string;
  durationMins: number;
  status: ScheduleStatus;
  examId: string | null;
  createdById: string;
  createdBy?: User;
  schoolId: string | null;
  school?: School | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  schoolId: string | null;
  school?: School | null;
  createdAt: string;
}

export interface School {
  id: string;
  name: string;
  region: string;
  plan: string;
}

export interface Paper {
  id: string;
  title: string;
  subject: string;
  level: Level;
  year: number;
  type: PaperType;
  status: PaperStatus;
  fileName: string | null;
  fileSize: number | null;
  description: string | null;
  uploadedById: string;
  uploadedBy?: User;
  schoolId: string | null;
  school?: School | null;
  exam?: Exam | null;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  examId: string;
  type: QuestionType;
  text: string;
  options: string; // JSON string
  correctAnswer: string;
  explanation: string | null;
  marks: number;
  difficulty: Difficulty;
  order: number;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  level: Level;
  durationMins: number;
  totalMarks: number;
  status: ExamStatus;
  description: string | null;
  paperId: string | null;
  createdById: string;
  createdBy?: User;
  schoolId: string | null;
  school?: School | null;
  questions?: Question[];
  submissions?: Submission[];
  _count?: { questions: number; submissions: number };
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  id: string;
  submissionId: string;
  questionId: string;
  question?: Question;
  answer: string;
  isCorrect: boolean | null;
  marksAwarded: number;
  feedback: string | null;
}

export interface Submission {
  id: string;
  examId: string;
  exam?: Exam;
  studentId: string;
  student?: User;
  score: number | null;
  percentage: number | null;
  grade: string | null;
  status: SubmissionStatus;
  reviewedById: string | null;
  reviewedBy?: User | null;
  reviewedAt: string | null;
  submittedAt: string;
  answers?: Answer[];
  createdAt: string;
}
export interface LibraryResource {
  id: string
  title: string
  description: string | null
  type: ResourceType
  subject: string
  level: Level | null
  file_url: string | null
  file_name: string | null
  file_size: number | null
  cover_url: string | null
  author: string | null
  publisher: string | null
  year: number | null
  is_free: boolean
  status: 'draft' | 'published'
  contributed_by_id: string
  contributed_by?: User
  school_id: string | null
  download_count: number
  created_at: string
  updated_at: string
}

<<<<<<< Updated upstream
export const LEVELS: { value: Level; label: string }[] = [
  { value: "standard_4", label: "Standard 4" },
  { value: "standard_7", label: "Standard 7 (PSLE)" },
  { value: "form_2", label: "Form 2 (FTNA)" },
  { value: "form_4", label: "Form 4 (CSEE)" },
  { value: "form_6", label: "Form 6 (ACSEE)" },
];

export const SUBJECTS = [
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "English",
  "Kiswahili",
  "Geography",
  "History",
  "Civics",
  "Book-Keeping",
  "Commerce",
  "General Studies",
];

export const PAPER_TYPES: { value: PaperType; label: string }[] = [
  { value: "necta", label: "NECTA Past Paper" },
  { value: "mock", label: "Mock Exam" },
  { value: "pre_national", label: "Pre-National" },
  { value: "regional", label: "Regional" },
  { value: "school", label: "School Exam" },
];

export const QUESTION_TYPES: {
  value: QuestionType;
  label: string;
  hint: string;
}[] = [
  { value: "mcq", label: "Multiple Choice", hint: "Auto-marked" },
  { value: "truefalse", label: "True / False", hint: "Auto-marked" },
  { value: "short", label: "Short Answer", hint: "Auto-marked (match), teacher can override" },
  { value: "essay", label: "Essay", hint: "Teacher-marked only" },
];

export const SCHEDULE_TYPES: {
  value: ScheduleType;
  label: string;
  color: string;
  icon: string;
}[] = [
  { value: "quiz_of_day", label: "Quiz of the Day", color: "green", icon: "sparkles" },
  { value: "exam", label: "Exam", color: "navy", icon: "file" },
  { value: "test", label: "Test", color: "sky", icon: "clipboard" },
  { value: "assignment", label: "Assignment", color: "gold", icon: "book" },
];

export function gradeFor(percentage: number): string {
  if (percentage >= 80) return "A";
  if (percentage >= 65) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
=======
// ── Constants ────────────────────────────────────────────────
export const LEVELS: { value: Level; label: string; short: string }[] = [
  { value: 'standard_4', label: 'Standard 4', short: 'Std 4' },
  { value: 'standard_7', label: 'Standard 7 (PSLE)', short: 'Std 7' },
  { value: 'form_2', label: 'Form 2 (FTNA)', short: 'F2' },
  { value: 'form_4', label: 'Form 4 (CSEE)', short: 'F4' },
  { value: 'form_6', label: 'Form 6 (ACSEE)', short: 'F6' },
]
export const SUBJECTS = [
  'Biology','Chemistry','Physics','Mathematics','English','Kiswahili',
  'Geography','History','Civics','Book-Keeping','Commerce','General Studies',
  'Computer Studies','Agriculture',
]
export const MATH_SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','Computer Studies']
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
export const QUESTION_TYPES: { value: QuestionType; label: string; hint: string; icon: string }[] = [
  { value: 'mcq',      label: 'Multiple Choice', hint: 'Auto-marked',           icon: '◉' },
  { value: 'truefalse',label: 'True / False',    hint: 'Auto-marked',           icon: '✓✗' },
  { value: 'short',    label: 'Short Answer',    hint: 'Auto-marked (match)',   icon: '✏️' },
  { value: 'essay',    label: 'Essay',           hint: 'Teacher-marked',        icon: '📄' },
  { value: 'formula',  label: 'Math Formula',    hint: 'With LaTeX formula',    icon: '∑' },
  { value: 'table',    label: 'Data Table',      hint: 'With table/data',       icon: '⊞' },
  { value: 'graph',    label: 'Graph/Chart',     hint: 'With graph/chart',      icon: '📊' },
]
export const SCHEDULE_TYPES: { value: ScheduleType; label: string }[] = [
  { value: 'quiz_of_day', label: 'Quiz of the Day' },
  { value: 'exam', label: 'Exam' },
  { value: 'test', label: 'Test' },
  { value: 'assignment', label: 'Assignment' },
]
export const RESOURCE_TYPES: { value: ResourceType; label: string; icon: string }[] = [
  { value: 'book',       label: 'Textbook',     icon: '📚' },
  { value: 'notes',      label: 'Study Notes',  icon: '📝' },
  { value: 'video',      label: 'Video',        icon: '🎥' },
  { value: 'article',    label: 'Article',      icon: '📰' },
  { value: 'past_paper', label: 'Past Paper',   icon: '📋' },
  { value: 'syllabus',   label: 'Syllabus',     icon: '📌' },
]

// Common LaTeX formula templates by subject
export const FORMULA_TEMPLATES: Record<string, { label: string; latex: string }[]> = {
  Mathematics: [
    { label: 'Quadratic Formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
    { label: 'Pythagorean Theorem', latex: 'a^2 + b^2 = c^2' },
    { label: 'Area of Circle', latex: 'A = \\pi r^2' },
    { label: 'Volume of Sphere', latex: 'V = \\frac{4}{3}\\pi r^3' },
    { label: 'Logarithm', latex: '\\log_b(xy) = \\log_b x + \\log_b y' },
    { label: 'Binomial Theorem', latex: '(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k' },
    { label: 'Derivative', latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}" },
    { label: 'Integral', latex: '\\int_a^b f(x)\\,dx = F(b) - F(a)' },
    { label: 'Arithmetic Mean', latex: '\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i' },
    { label: 'Standard Deviation', latex: '\\sigma = \\sqrt{\\frac{\\sum(x-\\bar{x})^2}{n}}' },
  ],
  Physics: [
    { label: "Newton's 2nd Law", latex: 'F = ma' },
    { label: 'Kinetic Energy', latex: 'KE = \\frac{1}{2}mv^2' },
    { label: 'Ohm\'s Law', latex: 'V = IR' },
    { label: 'Wave Speed', latex: 'v = f\\lambda' },
    { label: 'E = mc²', latex: 'E = mc^2' },
    { label: 'Gravitational Force', latex: 'F = \\frac{Gm_1m_2}{r^2}' },
    { label: 'Snell\'s Law', latex: 'n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2' },
    { label: 'Pressure', latex: 'P = \\frac{F}{A}' },
  ],
  Chemistry: [
    { label: 'Ideal Gas Law', latex: 'PV = nRT' },
    { label: 'Mole Fraction', latex: '\\chi_A = \\frac{n_A}{n_{total}}' },
    { label: 'pH Formula', latex: 'pH = -\\log[H^+]' },
    { label: 'Molarity', latex: 'M = \\frac{n}{V}' },
    { label: 'Arrhenius Equation', latex: 'k = Ae^{-E_a/RT}' },
  ],
}

export function gradeFor(p: number) {
  if (p >= 80) return 'A'; if (p >= 65) return 'B'
  if (p >= 50) return 'C'; if (p >= 40) return 'D'; return 'F'
>>>>>>> Stashed changes
}

export function levelLabel(v: string): string {
  return LEVELS.find((l) => l.value === v)?.label ?? v;
}

// Admin email — always gets super_admin
export const ADMIN_EMAIL = 'admin@tems.go.tz'
export const ADMIN_UID = 'cdfc8267-1da3-4788-b526-40b593cb5ca8'
