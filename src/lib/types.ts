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

export function gradeFor(percentage: number): string {
  if (percentage >= 80) return "A";
  if (percentage >= 65) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

export function levelLabel(v: string): string {
  return LEVELS.find((l) => l.value === v)?.label ?? v;
}
