"use client";
import { useEffect, useState } from "react";
import {
  FilePlus2,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Save,
  Send,
  ChevronUp,
  ChevronDown,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api-client";
import {
  LEVELS,
  SUBJECTS,
  QUESTION_TYPES,
  type QuestionType,
  type User,
  type Paper,
} from "@/lib/types";
import { useExamHub } from "../store";
import { toast } from "sonner";

interface QDraft {
  id: string; // local only
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  marks: number;
  difficulty: string;
  explanation: string;
}

let qid = 0;
const newQ = (): QDraft => ({
  id: `local-${++qid}`,
  type: "mcq",
  text: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  marks: 1,
  difficulty: "medium",
  explanation: "",
});

export function CreateExam({ user }: { user: User }) {
  const setTab = useExamHub((s) => s.setTab);
  const bump = useExamHub((s) => s.bump);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [duration, setDuration] = useState("60");
  const [description, setDescription] = useState("");
  const [paperId, setPaperId] = useState<string>("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [questions, setQuestions] = useState<QDraft[]>([newQ()]);
  const [saving, setSaving] = useState(false);

  // Prefill from a paper chosen in the Library ("Build Exam")
  useEffect(() => {
    const pid = sessionStorage.getItem("examhub:prefillPaperId");
    if (pid) {
      setPaperId(pid);
      sessionStorage.removeItem("examhub:prefillPaperId");
    }
    api.listPapers({}).then((r) => setPapers(r.papers)).catch(() => {});
  }, []);

  const prefillPaper = papers.find((p) => p.id === paperId);
  useEffect(() => {
    if (prefillPaper && !title) {
      setTitle(`${prefillPaper.subject} — ${prefillPaper.level.replace("_", " ")} Exam`);
      setSubject(prefillPaper.subject);
      setLevel(prefillPaper.level);
    }
  }, [prefillPaper, title]);

  const update = (id: string, patch: Partial<QDraft>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const remove = (id: string) =>
    setQuestions((qs) => (qs.length === 1 ? qs : qs.filter((q) => q.id !== id)));
  const move = (id: string, dir: -1 | 1) =>
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= qs.length) return qs;
      const copy = [...qs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);

  const build = async (publish: boolean) => {
    if (!title || !subject || !level || !duration) {
      toast.error("Fill in title, subject, level and duration first");
      return;
    }
    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        toast.error(`Question ${i + 1} is empty`);
        return;
      }
      if (q.type === "mcq") {
        const opts = q.options.map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) {
          toast.error(`Question ${i + 1}: add at least 2 options`);
          return;
        }
        if (q.correctAnswer === "" || Number(q.correctAnswer) >= opts.length) {
          toast.error(`Question ${i + 1}: select the correct option`);
          return;
        }
      } else if (q.type !== "essay" && !q.correctAnswer.trim()) {
        toast.error(`Question ${i + 1}: provide the correct answer`);
        return;
      }
    }
    setSaving(true);
    try {
      const cleanQs = questions.map((q) => ({
        type: q.type,
        text: q.text.trim(),
        options: q.type === "mcq" ? q.options.map((o) => o.trim()).filter(Boolean) : [],
        correctAnswer: q.correctAnswer.trim(),
        marks: Number(q.marks) || 1,
        difficulty: q.difficulty,
        explanation: q.explanation.trim() || undefined,
      }));
      await api.createExam({
        title,
        subject,
        level,
        durationMins: Number(duration),
        description: description || undefined,
        paperId: paperId || undefined,
        status: publish ? "published" : "draft",
        questions: cleanQs,
      });
      bump();
      toast.success(publish ? "Exam published — students can take it now" : "Exam saved as draft");
      setTab("my-exams");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FilePlus2 className="h-6 w-6 text-primary" /> Create Exam
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build a quiz or full exam with multiple question types. Objective questions are auto-marked; essays are marked by you.
        </p>
      </div>

      {/* Exam meta */}
      <Card>
        <CardHeader><CardTitle className="text-base">Exam details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="t">Exam title *</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Biology Form 4 — Cell Biology Quiz" />
          </div>
          <div>
            <Label>Subject *</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
              <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Level *</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue placeholder="Choose level" /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="d">Duration (minutes) *</Label>
            <Input id="d" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div>
            <Label>Link to paper</Label>
            <Select value={paperId || "none"} onValueChange={(v) => setPaperId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="None (standalone)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {papers.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {prefillPaper && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Link2 className="h-3 w-3" /> Linked to &ldquo;{prefillPaper.title}&rdquo;
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What this exam covers" />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Questions</h2>
          <Badge variant="secondary">{questions.length} · {totalMarks} marks</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => setQuestions((qs) => [...qs, newQ()])}>
          <Plus className="mr-1 h-4 w-4" /> Add question
        </Button>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <QuestionEditor
            key={q.id}
            index={i}
            total={questions.length}
            q={q}
            onChange={(patch) => update(q.id, patch)}
            onRemove={() => remove(q.id)}
            onMove={(dir) => move(q.id, dir)}
          />
        ))}
      </div>

      <Separator />
      <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
        <Button variant="outline" onClick={() => setTab("library")}>Cancel</Button>
        <Button variant="secondary" onClick={() => build(false)} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save as draft
        </Button>
        <Button onClick={() => build(true)} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Publish exam
        </Button>
      </div>
    </div>
  );
}

function QuestionEditor({
  index,
  total,
  q,
  onChange,
  onRemove,
  onMove,
}: {
  index: number;
  total: number;
  q: QDraft;
  onChange: (patch: Partial<QDraft>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const qt = QUESTION_TYPES.find((t) => t.value === q.type)!;
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <div className="flex flex-col">
            <button
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={() => onMove(-1)}
              disabled={index === 0}
              aria-label="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <GripVertical className="h-4 w-4 text-muted-foreground/40" />
            <button
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              aria-label="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <Select value={q.type} onValueChange={(v) => onChange({ type: v as QuestionType, correctAnswer: "" })}>
              <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-xs">{qt.hint}</Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onRemove} disabled={total === 1}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <Textarea
          value={q.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={2}
          placeholder="Question text…"
        />

        {q.type === "mcq" && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Options (select the correct one)</Label>
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctAnswer === String(oi)}
                  onChange={() => onChange({ correctAnswer: String(oi) })}
                  className="h-4 w-4 accent-primary"
                />
                <Input
                  value={opt}
                  onChange={(e) => {
                    const opts = [...q.options];
                    opts[oi] = e.target.value;
                    onChange({ options: opts });
                  }}
                  placeholder={`Option ${oi + 1}`}
                  className="h-8"
                />
                {q.options.length > 2 && (
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => {
                      const opts = q.options.filter((_, k) => k !== oi);
                      const ca = Number(q.correctAnswer);
                      onChange({
                        options: opts,
                        correctAnswer: oi === ca ? "" : oi < ca ? String(ca - 1) : q.correctAnswer,
                      });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => onChange({ options: [...q.options, ""] })}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add option
            </Button>
          </div>
        )}

        {q.type === "truefalse" && (
          <div className="flex items-center gap-4">
            <Label className="text-xs text-muted-foreground">Correct answer</Label>
            {["true", "false"].map((v) => (
              <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`tf-${q.id}`}
                  checked={q.correctAnswer === v}
                  onChange={() => onChange({ correctAnswer: v })}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm capitalize">{v}</span>
              </label>
            ))}
          </div>
        )}

        {(q.type === "short" || q.type === "essay") && (
          <div>
            <Label className="text-xs text-muted-foreground">
              {q.type === "short" ? "Accepted answer (auto-marked by exact match)" : "Model answer / marking guide (teacher marks)"}
            </Label>
            <Textarea
              value={q.correctAnswer}
              onChange={(e) => onChange({ correctAnswer: e.target.value })}
              rows={q.type === "essay" ? 3 : 1}
              placeholder={q.type === "short" ? "e.g. photosynthesis" : "Key points the answer should cover…"}
            />
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Marks</Label>
            <Input
              type="number" min={1} value={q.marks}
              onChange={(e) => onChange({ marks: Number(e.target.value) || 1 })}
              className="h-8 w-20"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Difficulty</Label>
            <Select value={q.difficulty} onValueChange={(v) => onChange({ difficulty: v })}>
              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Explanation (shown after marking)</Label>
            <Input value={q.explanation} onChange={(e) => onChange({ explanation: e.target.value })} className="h-8" placeholder="Optional" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
