
import { useEffect, useState, useCallback, useRef } from "react";
import { listExams, getExam, submitExam } from '@/lib/api'
import { useStore } from '@/lib/store'
import {
  PenSquare, Loader2, Clock, CheckCircle2, Award,
  ChevronRight, ArrowLeft, Inbox, XCircle, Timer,
  AlertCircle, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/index";
import { Badge } from "@/components/ui/index";
import { Card, CardContent } from "@/components/ui/index";
import { Textarea } from "@/components/ui/index";
import { Input } from "@/components/ui/index";
import { RadioGroup, RadioGroupItem } from "@/components/ui/index";
import { Label } from "@/components/ui/index";
import { Progress } from "@/components/ui/index";
import {
  levelLabel, examTypeLabel, type Exam, type Submission,
  type User, type Question, EXAM_TYPES,
} from "@/lib/types";
import { toast } from "sonner";
import { cn } from '@/lib/utils'
import { MathText, MathBlock } from '../MathRenderer'
import { DataTable, SimpleChart } from '../SimpleChart'
import type { QuestionTableData, QuestionGraphData } from '@/lib/types';

// ─── Exam list ──────────────────────────────────────────────────────────────
export function TakeExam({ user }: { user: User }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Exam | null>(null);
  const nonce = useStore((s) => s.nonce);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listExams({ scope: "published" });
      setExams(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [nonce]);

  useEffect(() => { load(); }, [load]);

  if (active) return <ExamRunner exam={active} onExit={() => { setActive(null); load(); }} />;

  const examTypeIcon = (t: string) => EXAM_TYPES.find((x) => x.value === t)?.icon ?? "📋";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <PenSquare className="h-6 w-6 text-primary" /> Take an Exam
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a published exam or quiz. Objective answers are marked instantly. Each question has its own timer.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading exams…
        </div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No exams available right now</p>
            <p className="text-sm text-muted-foreground">Your teachers haven&apos;t published any exams yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {exams.map((e) => (
            <Card key={e.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">{examTypeIcon(e.exam_type)}</span>
                  <Badge variant="secondary">{examTypeLabel(e.exam_type)}</Badge>
                  <Badge variant="outline">{e.subject}</Badge>
                  <Badge variant="outline">{levelLabel(e.level)}</Badge>
                  {e.is_online && <Badge className="bg-green/15 text-green border-green/30 text-xs">🔴 Online</Badge>}
                </div>
                <h3 className="font-semibold">{e.title}</h3>
                {e.description && <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {e._count?.questions ?? 0} questions</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {e.duration_mins} min total</span>
                  {e.per_question_timer && (
                    <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3 text-amber-500" /> {e.per_question_timer}s / question</span>
                  )}
                  <span>{e.total_marks} marks</span>
                  {e.show_answer_after && <span className="text-green">✓ Answer shown after each Q</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  By: <span className="font-medium">{e.created_by?.name ?? "—"}</span>
                  {e.school ? ` · ${e.school.name}` : " · Independent teacher"}
                </div>
                <Button className="w-full mt-1" onClick={() => setActive(e)}>
                  Start {examTypeLabel(e.exam_type)} <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Question-by-question runner ────────────────────────────────────────────
type Phase = "intro" | "question" | "reveal" | "done";

interface QState {
  answer: string;
  timeTaken: number;
  submitted: boolean;
}

function ExamRunner({ exam, onExit }: { exam: Exam; onExit: () => void }) {
  const [full, setFull] = useState<Exam | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [qStates, setQStates] = useState<Record<number, QState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Submission | null>(null);

  // Per-question timer
  const [qSecs, setQSecs] = useState(0);
  const qTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Exam-level countdown
  const [remaining, setRemaining] = useState(exam.duration_mins * 60);
  const examTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getExam(exam.id).then((r) => setFull(r)).catch(() => toast.error("Failed to load exam"));
  }, [exam.id]);

  // Exam-level timer (always running once intro is dismissed)
  useEffect(() => {
    if (phase === "intro" || phase === "done") return;
    examTimerRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(examTimerRef.current!);
          handleFinalSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (examTimerRef.current) clearInterval(examTimerRef.current); };
  }, [phase]);

  // Per-question timer
  const startQTimer = useCallback((limitSecs: number) => {
    setQSecs(limitSecs);
    if (qTimerRef.current) clearInterval(qTimerRef.current);
    qTimerRef.current = setInterval(() => {
      setQSecs((s) => {
        if (s <= 1) {
          clearInterval(qTimerRef.current!);
          // auto-advance when per-Q timer expires
          autoReveal();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const stopQTimer = () => { if (qTimerRef.current) clearInterval(qTimerRef.current); };

  useEffect(() => () => stopQTimer(), []);

  const questions: Question[] = full?.questions ?? [];
  const currentQ = questions[qIndex];
  const qLimit = currentQ?.time_limit_secs ?? exam.per_question_timer ?? null;

  // When moving to a new question, start its timer
  useEffect(() => {
    if (phase === "question" && qLimit && currentQ) {
      startQTimer(qLimit);
    } else {
      stopQTimer();
    }
  }, [phase, qIndex, currentQ?.id]);

  const setAnswer = (v: string) =>
    setQStates((s) => ({ ...s, [qIndex]: { ...s[qIndex], answer: v, submitted: false, timeTaken: s[qIndex]?.timeTaken ?? 0 } }));

  const currentAnswer = qStates[qIndex]?.answer ?? "";

  // Auto-reveal called when per-question timer expires
  const autoReveal = useCallback(() => {
    stopQTimer();
    const elapsed = qLimit ? qLimit - qSecs : 0;
    setQStates((s) => ({
      ...s,
      [qIndex]: { answer: s[qIndex]?.answer ?? "", submitted: true, timeTaken: elapsed },
    }));
    if (exam.show_answer_after && currentQ?.type !== "essay") {
      setPhase("reveal");
    } else {
      advanceOrFinish();
    }
  }, [qIndex, qSecs, qLimit, currentQ, exam.show_answer_after]);

  const handleAnswerSubmit = () => {
    stopQTimer();
    const elapsed = qLimit ? qLimit - qSecs : 0;
    setQStates((s) => ({
      ...s,
      [qIndex]: { answer: currentAnswer, submitted: true, timeTaken: elapsed },
    }));
    if (exam.show_answer_after && currentQ?.type !== "essay") {
      setPhase("reveal");
    } else {
      advanceOrFinish();
    }
  };

  const advanceOrFinish = () => {
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1);
      setPhase("question");
    } else {
      setPhase("done");
      handleFinalSubmit(false);
    }
  };

  const handleFinalSubmit = async (auto = false) => {
    if (examTimerRef.current) clearInterval(examTimerRef.current);
    setSubmitting(true);
    try {
      const answers: Record<string, string> = {};
      const timings: Record<string, number> = {};
      questions.forEach((q, i) => {
        answers[q.id] = qStates[i]?.answer ?? "";
        if (qStates[i]?.timeTaken) timings[q.id] = qStates[i].timeTaken;
      });
      const r = await submitExam(exam.id, answers, timings);
      setResult(r);
      toast.success(auto ? "Time up — submitted automatically" : "Exam submitted!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) return <ResultView exam={exam} submission={result} onExit={onExit} />;

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const examTimeCritical = remaining < 60;
  const qProgress = qLimit ? Math.round(((qLimit - qSecs) / qLimit) * 100) : 0;

  // ── INTRO SCREEN ──
  if (phase === "intro" || !full) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={onExit}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                {EXAM_TYPES.find((x) => x.value === exam.exam_type)?.icon ?? "📋"}
              </div>
              <div>
                <h1 className="text-xl font-bold">{exam.title}</h1>
                <p className="text-sm text-muted-foreground">{exam.subject} · {levelLabel(exam.level)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Questions" value={questions.length > 0 ? String(questions.length) : "Loading…"} />
              <Stat label="Total Marks" value={String(exam.total_marks)} />
              <Stat label="Total Time" value={`${exam.duration_mins} min`} />
              {exam.per_question_timer && <Stat label="Per-Question Timer" value={`${exam.per_question_timer}s`} />}
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 space-y-1">
              {exam.per_question_timer && (
                <p className="flex items-center gap-1.5"><Timer className="h-4 w-4" /> Each question has a <strong>{exam.per_question_timer}-second timer</strong>. It auto-advances when time is up.</p>
              )}
              {exam.show_answer_after && (
                <p className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> The correct answer is shown after you answer each question.</p>
              )}
              <p className="flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> Answer each question one at a time. You cannot go back.</p>
            </div>
            {exam.description && <p className="text-sm text-muted-foreground">{exam.description}</p>}
            <Button className="w-full" size="lg" disabled={!full} onClick={() => setPhase("question")}>
              {!full ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {full ? "Start now" : "Loading questions…"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── QUESTION SCREEN ──
  if (phase === "question" && currentQ) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Q {qIndex + 1} / {questions.length}</span>
            <Progress value={((qIndex) / questions.length) * 100} className="w-24 h-2" />
          </div>
          <div className="flex items-center gap-2">
            {/* Per-question timer */}
            {qLimit && (
              <div className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-mono font-bold border",
                qSecs <= 5 ? "bg-red-100 text-red-700 border-red-300 animate-pulse" :
                qSecs <= 10 ? "bg-amber-100 text-amber-700 border-amber-200" :
                "bg-primary/5 text-primary border-primary/20"
              )}>
                <Timer className="h-3.5 w-3.5" />
                {qSecs}s
              </div>
            )}
            {/* Exam total timer */}
            <div className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-mono border",
              examTimeCritical ? "bg-red-50 text-red-600 border-red-200" : "bg-muted text-muted-foreground border-border"
            )}>
              <Clock className="h-3 w-3" /> {mm}:{ss}
            </div>
          </div>
        </div>

        {/* Per-question progress bar */}
        {qLimit && (
          <Progress
            value={qProgress}
            className={cn("h-1.5", qSecs <= 5 ? "[&>div]:bg-red-500" : qSecs <= 10 ? "[&>div]:bg-amber-500" : "")}
          />
        )}

        {/* Question card */}
        <Card className="border-primary/20">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                {qIndex + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{currentQ.marks} mark{currentQ.marks !== 1 ? "s" : ""}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{currentQ.difficulty}</Badge>
                  <Badge variant="secondary" className="text-xs">{currentQ.type === "mcq" ? "Multiple Choice" : currentQ.type === "truefalse" ? "True / False" : currentQ.type === "short" ? "Short Answer" : "Essay"}</Badge>
                </div>
                <p className="text-base font-medium leading-relaxed">{currentQ.text}</p>
              </div>
            </div>

            <div className="pl-11">
              <QuestionInput q={currentQ} value={currentAnswer} onChange={setAnswer} />
            </div>

            <div className="pl-11 pt-2">
              <Button
                onClick={handleAnswerSubmit}
                className="w-full sm:w-auto"
                disabled={currentAnswer.trim() === "" && currentQ.type !== "essay"}
              >
                {qIndex + 1 < questions.length ? (
                  <>Submit & Next question <ChevronRight className="ml-1 h-4 w-4" /></>
                ) : (
                  <>Submit & Finish <CheckCircle2 className="ml-1 h-4 w-4" /></>
                )}
              </Button>
              {currentAnswer.trim() === "" && currentQ.type !== "essay" && (
                <p className="text-xs text-muted-foreground mt-1.5">Select or type an answer to continue</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── ANSWER REVEAL SCREEN ──
  if (phase === "reveal" && currentQ) {
    const myAnswer = qStates[qIndex]?.answer ?? "";
    const isCorrect = checkCorrect(currentQ, myAnswer);
    let opts: string[] = [];
    try { opts = JSON.parse(currentQ.options); } catch { /**/ }

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Q {qIndex + 1} / {questions.length}</span>
          <div className={cn(
            "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold border",
            isCorrect ? "bg-green/10 text-green border-green/30" : "bg-red-50 text-red-600 border-red-200"
          )}>
            {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {isCorrect ? "Correct!" : "Incorrect"}
          </div>
        </div>

        <Card className={cn("border-2", isCorrect ? "border-green/30" : "border-red-200")}>
          <CardContent className="p-5 space-y-4">
            <p className="font-medium text-base">{currentQ.text}</p>

            {/* Show options for MCQ */}
            {currentQ.type === "mcq" && (
              <div className="space-y-2">
                {opts.map((o, i) => {
                  const isRight = String(i) === currentQ.correct_answer;
                  const isMine = myAnswer === String(i);
                  return (
                    <div key={i} className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm border",
                      isRight ? "bg-green/10 border-green/40 font-semibold text-green" :
                      isMine && !isRight ? "bg-red-50 border-red-200 text-red-700 line-through" :
                      "bg-muted/50 border-border text-muted-foreground"
                    )}>
                      {isRight ? <CheckCircle2 className="h-4 w-4 shrink-0" /> :
                       isMine ? <XCircle className="h-4 w-4 shrink-0" /> :
                       <span className="h-4 w-4 shrink-0" />}
                      {o}
                    </div>
                  );
                })}
              </div>
            )}

            {/* True/False */}
            {currentQ.type === "truefalse" && (
              <div className="space-y-2">
                {["true", "false"].map((v) => {
                  const isRight = v === currentQ.correct_answer;
                  const isMine = myAnswer.toLowerCase() === v;
                  return (
                    <div key={v} className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm border capitalize",
                      isRight ? "bg-green/10 border-green/40 font-semibold text-green" :
                      isMine && !isRight ? "bg-red-50 border-red-200 text-red-700" :
                      "bg-muted/50 border-border text-muted-foreground"
                    )}>
                      {isRight ? <CheckCircle2 className="h-4 w-4" /> : isMine ? <XCircle className="h-4 w-4" /> : <span className="h-4 w-4" />}
                      {v}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Short answer */}
            {currentQ.type === "short" && (
              <div className="space-y-2 text-sm">
                <div className={cn("rounded-lg px-3 py-2 border", isCorrect ? "bg-green/10 border-green/30 text-green" : "bg-red-50 border-red-200 text-red-700")}>
                  Your answer: <strong>{myAnswer || "(blank)"}</strong>
                </div>
                {!isCorrect && (
                  <div className="rounded-lg px-3 py-2 border bg-green/10 border-green/30 text-green">
                    Correct answer: <strong>{currentQ.correct_answer}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            {currentQ.explanation && (
              <div className="rounded-lg bg-sky/5 border border-sky/20 px-3 py-2.5 text-sm">
                <p className="text-xs font-semibold text-sky mb-1 uppercase tracking-wide">Explanation</p>
                <p className="text-foreground/80">{currentQ.explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Button className="w-full" onClick={advanceOrFinish}>
          {qIndex + 1 < questions.length ? (
            <>Next question <ChevronRight className="ml-1 h-4 w-4" /></>
          ) : (
            <>Finish exam <CheckCircle2 className="ml-1 h-4 w-4" /></>
          )}
        </Button>
      </div>
    );
  }

  // Loading / submitting
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {submitting ? "Submitting…" : "Loading…"}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function checkCorrect(q: Question, ans: string): boolean {
  if (q.type === "mcq") return ans === q.correct_answer;
  if (q.type === "truefalse") return ans.toLowerCase() === q.correct_answer.toLowerCase();
  if (q.type === "short") return ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
  return false;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

function QuestionInput({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  // Render formula if present
  const formulaEl = q.formula ? (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3">
      <p className="text-xs font-medium text-amber-700 mb-1">Formula:</p>
      <MathBlock latex={q.formula} />
    </div>
  ) : null

  // Render table if present
  let tableData: QuestionTableData | null = null
  try { if (q.table_data) tableData = JSON.parse(q.table_data) } catch { /**/ }
  const tableEl = tableData ? <DataTable data={tableData} className="mb-3" /> : null

  // Render graph if present
  let graphData: QuestionGraphData | null = null
  try { if (q.graph_data) graphData = JSON.parse(q.graph_data) } catch { /**/ }
  const graphEl = graphData ? <SimpleChart data={graphData} className="mb-3" /> : null

  if (q.type === "mcq" || q.type === "truefalse") {
    let opts: string[] = []
    if (q.type === "mcq") { try { opts = JSON.parse(q.options) } catch { /**/ } }
    else opts = ["true", "false"]
    return (
      <div>
        {formulaEl}{tableEl}{graphEl}
        <RadioGroup value={value} onValueChange={onChange} className={q.type === "truefalse" ? "flex gap-4" : "gap-2"}>
          {opts.map((o, i) => {
            const val = q.type === "mcq" ? String(i) : o
            return (
              <label key={i} className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                q.type === "truefalse" && "capitalize",
                value === val ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
              )}>
                <RadioGroupItem value={val} id={`${q.id}-${i}`} />
                <span className="text-sm font-medium">{o}</span>
              </label>
            )
          })}
        </RadioGroup>
      </div>
    )
  }
  if (q.type === "formula" || q.type === "table" || q.type === "graph" || q.type === "short") {
    return (
      <div>
        {formulaEl}{tableEl}{graphEl}
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder="Type your answer…"
          className="max-w-sm" onKeyDown={e => { if (e.key === "Enter") e.preventDefault() }}/>
      </div>
    )
  }
  // essay
  return (
    <div>
      {formulaEl}{tableEl}{graphEl}
      <Textarea value={value} onChange={e => onChange(e.target.value)} rows={5} placeholder="Write your essay answer here…"/>
    </div>
  )
}

// ─── Result screen ───────────────────────────────────────────────────────────
function ResultView({ exam, submission, onExit }: { exam: Exam; submission: Submission; onExit: () => void }) {
  const needsReview = (submission.answers ?? []).some((a) => a.is_correct === null);
  const pct = submission.percentage ?? 0;
  const correct = (submission.answers ?? []).filter((a) => a.is_correct === true).length;
  const total = (submission.answers ?? []).length;

  const color = pct >= 80 ? "text-green" : pct >= 50 ? "text-amber-500" : "text-red-500";
  const bgColor = pct >= 80 ? "bg-green/10" : pct >= 50 ? "bg-amber-50" : "bg-red-50";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardContent className={cn("flex flex-col items-center gap-4 py-10 text-center", bgColor)}>
          <div className={cn("flex h-20 w-20 items-center justify-center rounded-full", color, "bg-white shadow")}>
            <Award className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Exam Complete!</h1>
            <p className="text-sm text-muted-foreground">{exam.title}</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className={cn("text-4xl font-black", color)}>{Math.round(pct)}%</div>
              <div className="text-xs text-muted-foreground mt-1">Score</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black">{submission.score}/{exam.total_marks}</div>
              <div className="text-xs text-muted-foreground mt-1">Marks</div>
            </div>
            {submission.grade && (
              <div className="text-center">
                <div className="text-4xl font-black">{submission.grade}</div>
                <div className="text-xs text-muted-foreground mt-1">Grade</div>
              </div>
            )}
            {total > 0 && (
              <div className="text-center">
                <div className="text-4xl font-black">{correct}/{total}</div>
                <div className="text-xs text-muted-foreground mt-1">Correct</div>
              </div>
            )}
          </div>
          {needsReview && (
            <div className="rounded-lg bg-amber-100 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 max-w-sm">
              Essay questions are pending teacher review. Your final score may change.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-question breakdown */}
      {(submission.answers ?? []).length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Question Breakdown</h2>
          {(submission.answers ?? []).map((a, i) => (
            <div key={a.id} className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm",
              a.is_correct === true ? "border-green/30 bg-green/5" :
              a.is_correct === false ? "border-red-200 bg-red-50" :
              "border-amber-200 bg-amber-50"
            )}>
              <span className="font-semibold text-xs w-6 shrink-0">{i + 1}</span>
              {a.is_correct === true ? <CheckCircle2 className="h-4 w-4 text-green shrink-0" /> :
               a.is_correct === false ? <XCircle className="h-4 w-4 text-red-500 shrink-0" /> :
               <Clock className="h-4 w-4 text-amber-500 shrink-0" />}
              <span className="flex-1 text-muted-foreground line-clamp-1">
                {a.question?.text ?? `Question ${i + 1}`}
              </span>
              <span className="shrink-0 font-medium">{a.marks_awarded}/{a.question?.marks ?? "?"}</span>
              {a.time_taken_secs && (
                <span className="shrink-0 text-xs text-muted-foreground">{a.time_taken_secs}s</span>
              )}
            </div>
          ))}
        </div>
      )}

      <Button onClick={onExit} className="w-full">Back to exams</Button>
    </div>
  );
}
