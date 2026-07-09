// Shared domain types for ExamHub — camelCase for frontend, Supabase stores snake_case.
// Conversion between the two happens in the API layer (see case.ts helpers).

export type Role = "student" | "teacher" | "school_admin" | "super_admin";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type Level = "standard_4" | "standard_7" | "form_2" | "form_4" | "form_6";
export type PaperType = "necta" | "mock" | "school" | "regional" | "pre_national";
export type PaperStatus = "draft" | "published" | "archived";
export type ExamType = "exam" | "quiz" | "daily_quiz" | "assignment";
export type ExamStatus = "draft" | "published" | "closed";
export type QuestionType = "mcq" | "truefalse" | "short" | "essay" | "formula" | "table" | "graph";
export type Difficulty = "easy" | "medium" | "hard";
export type SubmissionStatus = "submitted" | "auto_marked" | "reviewed" | "published";
export type ScheduleType = "quiz_of_day" | "exam" | "test" | "assignment";
export type ScheduleStatus = "scheduled" | "live" | "completed" | "cancelled";
export type ResourceType = "book" | "notes" | "video" | "article" | "past_paper" | "syllabus";

export interface School {
  id: string;
  name: string;
  region: string;
  plan: string;
  logoUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  verificationStatus?: VerificationStatus | null;
  verifiedAt?: string | null;
  schoolId: string | null;
  school?: School | null;
  avatarUrl?: string | null;
  bio?: string | null;
  phone?: string | null;
  rating?: number | null;
  totalSessions?: number | null;
  isActive?: boolean;
  createdAt: string;
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
  fileUrl?: string | null;
  description: string | null;
  uploadedById: string;
  uploadedBy?: User;
  schoolId: string | null;
  school?: School | null;
  exam?: Exam | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionTableData {
  headers: string[];
  rows: string[][];
}

export interface QuestionGraphData {
  type: "bar" | "line" | "pie";
  title?: string;
  labels: string[];
  datasets: { label: string; data: number[]; color?: string }[];
}

export interface Question {
  id: string;
  examId: string;
  type: QuestionType;
  text: string;
  options: string; // JSON string
  correctAnswer: string;
  explanation: string | null;
  formula?: string | null;
  tableData?: string | null;
  graphData?: string | null;
  imageUrl?: string | null;
  marks: number;
  difficulty: Difficulty;
  timeLimitSecs?: number | null;
  order: number;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  level: Level;
  examType: ExamType;
  durationMins: number;
  perQuestionTimer?: number | null;
  totalMarks: number;
  passMark?: number;
  status: ExamStatus;
  description: string | null;
  instructions?: string | null;
  paperId: string | null;
  createdById: string;
  createdBy?: User;
  schoolId: string | null;
  school?: School | null;
  isOnline?: boolean;
  showAnswerAfter?: boolean;
  randomizeQuestions?: boolean;
  questions?: Question[];
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
  timeTakenSecs?: number | null;
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

export interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  subject: string;
  level: Level | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  coverUrl: string | null;
  externalUrl: string | null;
  author: string | null;
  publisher: string | null;
  year: number | null;
  isFree: boolean;
  status: "draft" | "published";
  contributedById: string;
  contributedBy?: User;
  schoolId: string | null;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Constants ────────────────────────────────────────────────

export const LEVELS: { value: Level; label: string; short: string }[] = [
  { value: "standard_4", label: "Standard 4", short: "Std 4" },
  { value: "standard_7", label: "Standard 7 (PSLE)", short: "Std 7" },
  { value: "form_2", label: "Form 2 (FTNA)", short: "F2" },
  { value: "form_4", label: "Form 4 (CSEE)", short: "F4" },
  { value: "form_6", label: "Form 6 (ACSEE)", short: "F6" },
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
  "Computer Studies",
  "Agriculture",
];

export const PAPER_TYPES: { value: PaperType; label: string }[] = [
  { value: "necta", label: "NECTA Past Paper" },
  { value: "mock", label: "Mock Exam" },
  { value: "pre_national", label: "Pre-National" },
  { value: "regional", label: "Regional" },
  { value: "school", label: "School Exam" },
];

export const EXAM_TYPES: { value: ExamType; label: string; icon: string }[] = [
  { value: "exam", label: "Full Exam", icon: "📋" },
  { value: "quiz", label: "Quiz", icon: "⚡" },
  { value: "daily_quiz", label: "Daily Quiz", icon: "🌅" },
  { value: "assignment", label: "Assignment", icon: "📝" },
];

export const QUESTION_TYPES: {
  value: QuestionType;
  label: string;
  hint: string;
  icon: string;
}[] = [
  { value: "mcq", label: "Multiple Choice", hint: "Auto-marked", icon: "◉" },
  { value: "truefalse", label: "True / False", hint: "Auto-marked", icon: "✓✗" },
  { value: "short", label: "Short Answer", hint: "Auto-marked (match)", icon: "✏️" },
  { value: "essay", label: "Essay", hint: "Teacher-marked", icon: "📄" },
  { value: "formula", label: "Math Formula", hint: "LaTeX formula", icon: "∑" },
  { value: "table", label: "Data Table", hint: "With table", icon: "⊞" },
  { value: "graph", label: "Graph / Chart", hint: "With chart", icon: "📊" },
];

export const SCHEDULE_TYPES: { value: ScheduleType; label: string }[] = [
  { value: "quiz_of_day", label: "Quiz of the Day" },
  { value: "exam", label: "Exam" },
  { value: "test", label: "Test" },
  { value: "assignment", label: "Assignment" },
];

export const RESOURCE_TYPES: { value: ResourceType; label: string; icon: string }[] = [
  { value: "book", label: "Textbook", icon: "📚" },
  { value: "notes", label: "Study Notes", icon: "📝" },
  { value: "video", label: "Video", icon: "🎥" },
  { value: "article", label: "Article", icon: "📰" },
  { value: "past_paper", label: "Past Paper", icon: "📋" },
  { value: "syllabus", label: "Syllabus", icon: "📌" },
];

// LaTeX formula templates by subject
export const FORMULA_TEMPLATES: Record<string, { label: string; latex: string }[]> = {
  Mathematics: [
    { label: "Quadratic Formula", latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
    { label: "Pythagoras", latex: "a^2 + b^2 = c^2" },
    { label: "Area of Circle", latex: "A = \\pi r^2" },
    { label: "Volume of Sphere", latex: "V = \\frac{4}{3}\\pi r^3" },
    { label: "Logarithm", latex: "\\log_b(xy) = \\log_b x + \\log_b y" },
    { label: "Arithmetic Mean", latex: "\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i" },
    { label: "Standard Deviation", latex: "\\sigma = \\sqrt{\\frac{\\sum(x-\\bar{x})^2}{n}}" },
    { label: "Derivative", latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}" },
    { label: "Integral", latex: "\\int_a^b f(x)\\,dx = F(b) - F(a)" },
    { label: "Binomial Theorem", latex: "(a+b)^n = \\sum_{k=0}^{n}\\binom{n}{k}a^{n-k}b^k" },
  ],
  Physics: [
    { label: "Newton's 2nd Law", latex: "F = ma" },
    { label: "Kinetic Energy", latex: "KE = \\frac{1}{2}mv^2" },
    { label: "Ohm's Law", latex: "V = IR" },
    { label: "Wave Speed", latex: "v = f\\lambda" },
    { label: "E = mc²", latex: "E = mc^2" },
    { label: "Gravity", latex: "F = \\frac{Gm_1m_2}{r^2}" },
    { label: "Snell's Law", latex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2" },
    { label: "Pressure", latex: "P = \\frac{F}{A}" },
  ],
  Chemistry: [
    { label: "Ideal Gas Law", latex: "PV = nRT" },
    { label: "pH Formula", latex: "pH = -\\log[H^+]" },
    { label: "Molarity", latex: "M = \\frac{n}{V}" },
  ],
};

// ── Tanzania Regions & Districts ─────────────────────────────
export const TZ_REGIONS_DISTRICTS: Record<string, string[]> = {
  "Dar es Salaam": ["Ilala", "Kinondoni", "Temeke", "Ubungo", "Kigamboni"],
  Mwanza: ["Ilemela", "Nyamagana", "Buchosa", "Magu", "Misungwi", "Kwimba", "Sengerema"],
  Arusha: ["Arusha City", "Meru", "Arusha", "Karatu", "Longido", "Monduli", "Ngorongoro"],
  Dodoma: ["Bahi", "Chamwino", "Chemba", "Dodoma Urban", "Kondoa", "Kongwa", "Mpwapwa"],
  Mbeya: ["Busokelo", "Chunya", "Kyela", "Mbarali", "Mbeya City", "Mbeya Rural", "Momba", "Rungwe"],
  Morogoro: ["Gairo", "Kilosa", "Kilombero", "Malinyi", "Morogoro Urban", "Morogoro Rural", "Mvomero", "Ulanga"],
  Tanga: ["Handeni", "Kilindi", "Korogwe", "Lushoto", "Mkinga", "Muheza", "Pangani", "Tanga City"],
  "Zanzibar North": ["Kaskazini A", "Kaskazini B"],
  "Zanzibar South": ["Kusini", "Magharibi"],
  "Zanzibar West": ["Mjini", "Magharibi"],
  Pwani: ["Bagamoyo", "Kibaha", "Kibiti", "Kisarawe", "Mafia", "Mkuranga", "Rufiji"],
  Lindi: ["Kilwa", "Lindi Urban", "Lindi Rural", "Liwale", "Nachingwea", "Ruangwa"],
  Mara: ["Bunda", "Butiama", "Musoma Urban", "Musoma Rural", "Rorya", "Serengeti", "Tarime"],
  Mtwara: ["Masasi", "Mtwara Urban", "Mtwara Rural", "Nanyumbu", "Newala", "Tandahimba"],
  Rukwa: ["Kalambo", "Nkasi", "Sumbawanga Urban", "Sumbawanga Rural"],
  Ruvuma: ["Mbinga", "Namtumbo", "Nyasa", "Songea Urban", "Songea Rural", "Tunduru"],
  Shinyanga: ["Kahama", "Kishapu", "Shinyanga Urban", "Shinyanga Rural"],
  Singida: ["Ikungi", "Iramba", "Manyoni", "Mkalama", "Singida Urban", "Singida Rural"],
  Tabora: ["Igunga", "Kaliua", "Nzega", "Sikonge", "Tabora Urban", "Urambo", "Uyui"],
  Kagera: ["Biharamulo", "Bukoba Urban", "Bukoba Rural", "Karagwe", "Kyerwa", "Missenyi", "Muleba", "Ngara"],
  Kigoma: ["Buhigwe", "Kakonko", "Kasulu", "Kibondo", "Kigoma Urban", "Kigoma Rural", "Uvinza"],
  Kilimanjaro: ["Hai", "Moshi Urban", "Moshi Rural", "Mwanga", "Rombo", "Same", "Siha"],
  Iringa: ["Iringa Urban", "Iringa Rural", "Kilolo", "Mufindi"],
  Geita: ["Bukombe", "Chato", "Geita", "Mbogwe", "Nyang'hwale"],
  Katavi: ["Mlele", "Mpanda Urban", "Mpanda Rural"],
  Njombe: ["Ludewa", "Makambako", "Makete", "Njombe Urban", "Njombe Rural", "Wanging'ombe"],
  Simiyu: ["Bariadi", "Busega", "Itilima", "Maswa", "Meatu"],
  Songwe: ["Ileje", "Mbozi", "Momba", "Songwe"],
};
export const TZ_REGIONS = Object.keys(TZ_REGIONS_DISTRICTS).sort();

// ── Helpers ──────────────────────────────────────────────────
export function gradeFor(p: number): string {
  if (p >= 80) return "A";
  if (p >= 65) return "B";
  if (p >= 50) return "C";
  if (p >= 40) return "D";
  return "F";
}
export function levelLabel(v: string): string {
  return LEVELS.find((l) => l.value === v)?.label ?? v;
}
export function examTypeLabel(v: string): string {
  return EXAM_TYPES.find((t) => t.value === v)?.label ?? v;
}
export const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  school_admin: "School Admin",
  super_admin: "Super Admin",
};