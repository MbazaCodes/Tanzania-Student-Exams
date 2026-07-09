"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  PenSquare,
  Loader2,
  Clock,
  CheckCircle2,
  Award,
  ChevronRight,
  ArrowLeft,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { levelLabel, type Exam, type Submission, type User } from "@/lib/types";
import { useExamHub } from "../store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TakeExam({ user }: { user: User }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Exam | null>(null);
  const nonce = useExamHub((s) => s.nonce);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listExams({ scope: "published" });
      setExams(r.exams);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [nonce]);

  useEffect(() => { load(); }, [load]);

  if (active) {
    return <ExamRunner exam={active} onExit={() => { setActive(null); load(); }} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <PenSquare className="h-6 w-6 text-primary" /> Take an Exam
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a published exam below. Objective answers are marked instantly; essays are marked by your teacher.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading exams…
        </div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium">No exams available right now</p>
            <p className="text-sm text-muted-foreground">Your teachers haven&apos;t published any exams yet. Check back soon.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {exams.map((e) => (
            <Card key={e.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{e.subject}</Badge>
                  <Badge variant="outline">{levelLabel(e.level)}</Badge>
                </div>
                <h3 className="font-semibold">{e.title}</h3>
                {e.description && <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {e._count?.questions ?? 0} questions</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {e.durationMins} min</span>
                  <span>{e.totalMarks} marks</span>
                </div>
                <Button className="w-full" onClick={() => setActive(e)}>
                  Start exam <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ExamRunner({ exam, onExit }: { exam: Exam; onExit: () => void }) {
  const [full, setFull] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Submission | null>(null);
  const [remaining, setRemaining] = useState(exam.durationMins * 60);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.getExam(exam.id).then((r) => setFull(r.exam)).catch(() => toast.error("Failed to load exam"));
  }, [exam.id]);

  useEffect(() => {
    timer.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          submit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const submit = async (auto = false) => {
    if (timer.current) clearInterval(timer.current);
    setSubmitting(true);
    try {
      const r = await api.submitExam(exam.id, answers);
      setResult(r.submission);
      toast.success(auto ? "Time up — submitted automatically" : "Exam submitted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const answered = full ? Object.keys(answers).length : 0;
  const total = full?.questions?.length ?? 0;

  if (result) {
    return <ResultView exam={exam} submission={result} onExit={onExit} />;
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onExit}><ArrowLeft className="mr-1 h-4 w-4" /> Exit</Button>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono">
            <Clock className="mr-1 h-3.5 w-3.5" /> {mm}:{ss}
          </Badge>
          <Badge variant="secondary">{answered}/{total} answered</Badge>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{exam.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{exam.subject} · {levelLabel(exam.level)} · {exam.totalMarks} marks</p>
      </div>

      {!full ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading questions…
        </div>
      ) : (
        <div className="space-y-3">
          {full.questions?.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium">{q.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{q.marks} mark{q.marks !== 1 ? "s" : ""} · {q.difficulty}</p>
                  </div>
                </div>
                <QuestionInput q={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur">
        <span className="text-sm text-muted-foreground">{answered}/{total} answered</span>
        <Button onClick={() => submit(false)} disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Submit exam
        </Button>
      </div>
    </div>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: { id: string; type: string; options: string };
  value: string;
  onChange: (v: string) => void;
}) {
  if (q.type === "mcq") {
    let opts: string[] = [];
    try { opts = JSON.parse(q.options); } catch { /* */ }
    return (
      <RadioGroup value={value} onValueChange={onChange} className="gap-2 pl-8">
        {opts.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <RadioGroupItem value={String(i)} id={`${q.id}-${i}`} />
            <Label htmlFor={`${q.id}-${i}`} className="font-normal cursor-pointer">{o}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  }
  if (q.type === "truefalse") {
    return (
      <RadioGroup value={value} onValueChange={onChange} className="flex gap-6 pl-8">
        {["true", "false"].map((v) => (
          <div key={v} className="flex items-center gap-2">
            <RadioGroupItem value={v} id={`${q.id}-${v}`} />
            <Label htmlFor={`${q.id}-${v}`} className="font-normal cursor-pointer capitalize">{v}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  }
  if (q.type === "short") {
    return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your answer…" className="ml-8" />;
  }
  return <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} placeholder="Write your essay…" className="ml-8" />;
}

function ResultView({
  exam,
  submission,
  onExit,
}: {
  exam: Exam;
  submission: Submission;
  onExit: () => void;
}) {
  const needsReview = (submission.answers ?? []).some((a) => a.isCorrect === null);
  const pct = submission.percentage ?? 0;
  const accent = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="space-y-5 max-w-2xl">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className={cn("flex h-16 w-16 items-center justify-center rounded-full bg-primary/10", accent)}>
            <Award className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold">Exam submitted!</h1>
          <p className="text-sm text-muted-foreground">{exam.title}</p>
          <div className="flex items-center gap-6 mt-2">
            <div className="text-center">
              <div className={cn("text-3xl font-bold", accent)}>{Math.round(pct)}%</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{submission.score}/{exam.totalMarks}</div>
              <div className="text-xs text-muted-foreground">Marks</div>
            </div>
            {submission.grade && (
              <div className="text-center">
                <div className="text-3xl font-bold">{submission.grade}</div>
                <div className="text-xs text-muted-foreground">Grade</div>
              </div>
            )}
          </div>
          {needsReview && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              This exam includes essay questions. Your teacher will review and finalise your marks. The score shown may change.
            </p>
          )}
          <Button onClick={onExit}>Back to exams</Button>
        </CardContent>
      </Card>
    </div>
  );
}
