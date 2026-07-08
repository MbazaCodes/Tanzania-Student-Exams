"use client";
import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Send,
  Save,
  Clock,
  Award,
  MessageSquare,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import type { Submission, User } from "@/lib/types";
import { useExamHub } from "../store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-zinc-100 text-zinc-600 border-zinc-200",
  auto_marked: "bg-sky-100 text-sky-700 border-sky-200",
  reviewed: "bg-amber-100 text-amber-700 border-amber-200",
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export function ReviewSubmissions({ user }: { user: User }) {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState<Submission | null>(null);
  const nonce = useExamHub((s) => s.nonce);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listSubmissions({ scope: "review" });
      setSubs(r.submissions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [nonce]);

  useEffect(() => { load(); }, [load]);

  const filtered = subs.filter((s) => {
    if (filter === "all") return true;
    if (filter === "pending") return s.status === "auto_marked" || s.status === "submitted";
    return s.status === filter;
  });

  if (active) {
    return <ReviewPanel submission={active} onBack={() => { setActive(null); load(); }} />;
  }

  const counts = {
    all: subs.length,
    pending: subs.filter((s) => s.status === "auto_marked" || s.status === "submitted").length,
    reviewed: subs.filter((s) => s.status === "reviewed").length,
    published: subs.filter((s) => s.status === "published").length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-primary" /> Review Submissions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Objective questions are auto-marked. Review essays &amp; short answers, adjust marks, then publish results to students.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([
          ["all", "All"],
          ["pending", "Needs review"],
          ["reviewed", "Reviewed"],
          ["published", "Published"],
        ] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium border transition-colors",
              filter === v
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {label} <span className="opacity-70">({counts[v]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading submissions…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium">No submissions to review</p>
            <p className="text-sm text-muted-foreground">When students submit exams, they&apos;ll appear here for marking.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <Card key={s.id} className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setActive(s)}>
              <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {s.student?.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.student?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.exam?.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {s.score ?? "—"}/{s.exam?.totalMarks ?? "—"}
                    </p>
                    {s.percentage != null && <p className="text-xs text-muted-foreground">{Math.round(s.percentage)}%</p>}
                  </div>
                  {s.grade && <Badge variant="secondary">Grade {s.grade}</Badge>}
                  <Badge variant="outline" className={STATUS_STYLE[s.status]}>{s.status.replace("_", " ")}</Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(s.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewPanel({ submission, onBack }: { submission: Submission; onBack: () => void }) {
  const [full, setFull] = useState<Submission | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { marksAwarded: number; feedback: string }>>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    api.listSubmissions({ examId: submission.examId }).then((r) => {
      const f = r.submissions.find((x) => x.id === submission.id) ?? null;
      setFull(f);
      if (f) {
        const init: Record<string, { marksAwarded: number; feedback: string }> = {};
        for (const a of f.answers ?? []) {
          init[a.id] = { marksAwarded: a.marksAwarded, feedback: a.feedback ?? "" };
        }
        setOverrides(init);
      }
    });
  }, [submission.id, submission.examId]);

  const needsReview = (full?.answers ?? []).some((a) => a.isCorrect === null);

  const review = async () => {
    if (!full) return;
    setSaving(true);
    try {
      const r = await api.reviewSubmission(full.id, overrides);
      setFull({ ...full, ...r.submission });
      toast.success("Marks saved — status updated to reviewed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!full) return;
    setPublishing(true);
    try {
      // Save any pending overrides first, then publish
      await api.reviewSubmission(full.id, overrides);
      const r = await api.publishSubmission(full.id);
      setFull({ ...full, ...r.submission });
      toast.success("Result published to student");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  if (!full) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading submission…
      </div>
    );
  }

  const score = (full.answers ?? []).reduce((s, a) => s + (overrides[a.id]?.marksAwarded ?? a.marksAwarded), 0);
  const total = (full.answers ?? []).reduce((s, a) => s + a.question!.marks, 0);
  const pct = total > 0 ? (score / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" /> Back to list</Button>
        <Badge variant="outline" className={STATUS_STYLE[full.status]}>{full.status.replace("_", " ")}</Badge>
      </div>

      {/* Student header */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
              {full.student?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{full.student?.name}</p>
              <p className="text-sm text-muted-foreground">{full.exam?.title}</p>
              <p className="text-xs text-muted-foreground">Submitted {new Date(full.submittedAt).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{score}/{total}</div>
              <div className="text-xs text-muted-foreground">Marks (live)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.round(pct)}%</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            {full.grade && (
              <div className="text-center">
                <div className="text-2xl font-bold">{full.grade}</div>
                <div className="text-xs text-muted-foreground">Grade</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Answers */}
      <div className="space-y-3">
        {(full.answers ?? []).map((a, i) => {
          const q = a.question!;
          const ov = overrides[a.id] ?? { marksAwarded: a.marksAwarded, feedback: a.feedback ?? "" };
          const isManual = q.type === "essay" || q.type === "short";
          let opts: string[] = [];
          if (q.type === "mcq") { try { opts = JSON.parse(q.options); } catch { /* */ } }
          return (
            <Card key={a.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{q.type}</Badge>
                      <Badge variant="secondary">{q.marks} marks</Badge>
                      {a.isCorrect === true && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Correct</Badge>}
                      {a.isCorrect === false && <Badge className="bg-rose-100 text-rose-700 border-rose-200">Incorrect</Badge>}
                      {a.isCorrect === null && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Needs marking</Badge>}
                    </div>
                    <p className="font-medium mt-1.5">{q.text}</p>
                  </div>
                </div>

                {/* Student answer */}
                <div className="ml-8 rounded-md bg-muted/40 p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Student&apos;s answer</p>
                  <p className="whitespace-pre-wrap">
                    {q.type === "mcq" ? opts[Number(a.answer)] ?? "(blank)" : a.answer || "(blank)"}
                  </p>
                </div>

                {/* Correct answer / model answer */}
                {q.type !== "essay" && (
                  <div className="ml-8 rounded-md bg-emerald-50 p-3 text-sm">
                    <p className="text-xs font-medium text-emerald-700 mb-1">Correct answer</p>
                    <p className="whitespace-pre-wrap">
                      {q.type === "mcq" ? opts[Number(q.correctAnswer)] : q.type === "truefalse" ? q.correctAnswer : q.correctAnswer}
                    </p>
                  </div>
                )}
                {q.type === "essay" && q.correctAnswer && (
                  <div className="ml-8 rounded-md bg-sky-50 p-3 text-sm">
                    <p className="text-xs font-medium text-sky-700 mb-1">Marking guide</p>
                    <p className="whitespace-pre-wrap text-sky-900">{q.correctAnswer}</p>
                  </div>
                )}

                {/* Marking controls (only essay/short) */}
                {isManual && (
                  <div className="ml-8 grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
                    <div>
                      <Label className="text-xs text-muted-foreground">Marks (of {q.marks})</Label>
                      <Input
                        type="number" min={0} max={q.marks} value={ov.marksAwarded}
                        onChange={(e) => setOverrides((o) => ({ ...o, [a.id]: { ...o[a.id], marksAwarded: Number(e.target.value) } }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Feedback (optional)
                      </Label>
                      <Textarea
                        rows={2} value={ov.feedback}
                        onChange={(e) => setOverrides((o) => ({ ...o, [a.id]: { ...o[a.id], feedback: e.target.value } }))}
                        placeholder="Comment for the student…"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 text-sm">
          <Award className="h-4 w-4 text-primary" />
          <span className="font-medium">{score}/{total}</span>
          {needsReview && <span className="text-amber-600">· {needsReview ? "essay answers still need marking" : ""}</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={review} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save marks
          </Button>
          <Button onClick={publish} disabled={publishing}>
            {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Publish to student
          </Button>
        </div>
      </div>
    </div>
  );
}
