"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ClipboardList,
  Loader2,
  Send,
  Lock,
  Trash2,
  FilePlus2,
  Users,
  HelpCircle,
  Inbox,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api-client";
import { levelLabel, type Exam, type Submission, type User } from "@/lib/types";
import { useExamHub } from "../store";
import { toast } from "sonner";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 border-amber-200",
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
  closed: "bg-zinc-200 text-zinc-600 border-zinc-300",
};

export function MyExams({ user }: { user: User }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const setTab = useExamHub((s) => s.setTab);
  const nonce = useExamHub((s) => s.nonce);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listExams({ scope: "mine" });
      setExams(r.exams);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [nonce]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (e: Exam, status: "draft" | "published" | "closed") => {
    try {
      await api.updateExam(e.id, { status });
      toast.success(status === "published" ? "Exam published" : status === "closed" ? "Exam closed" : "Exam moved to draft");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const del = async (e: Exam) => {
    try {
      await api.deleteExam(e.id);
      toast.success("Exam deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> My Exams
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Exams &amp; quizzes you created. Publish to open them to students, close to stop new submissions.
          </p>
        </div>
        <Button onClick={() => setTab("create-exam")}>
          <FilePlus2 className="mr-2 h-4 w-4" /> New exam
        </Button>
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
            <div>
              <p className="font-medium">You haven&apos;t created any exams yet</p>
              <p className="text-sm text-muted-foreground">Build your first exam from a paper or from scratch.</p>
            </div>
            <Button onClick={() => setTab("create-exam")}><FilePlus2 className="mr-2 h-4 w-4" /> Create exam</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold truncate">{e.title}</h3>
                    <Badge variant="outline" className={STATUS_STYLE[e.status]}>{e.status}</Badge>
                    <Badge variant="secondary">{e.subject}</Badge>
                    <Badge variant="outline">{levelLabel(e.level)}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {e._count?.questions ?? 0} questions</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {e._count?.submissions ?? 0} submissions</span>
                    <span>{e.totalMarks} marks · {e.durationMins} min</span>
                    {e.paper && <span className="inline-flex items-center gap-1"><FilePlus2 className="h-3 w-3" /> from paper</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SubmissionsDialog exam={e} />
                  {e.status === "draft" && (
                    <Button size="sm" onClick={() => setStatus(e, "published")}>
                      <Send className="mr-1 h-3.5 w-3.5" /> Publish
                    </Button>
                  )}
                  {e.status === "published" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(e, "closed")}>
                      <Lock className="mr-1 h-3.5 w-3.5" /> Close
                    </Button>
                  )}
                  {e.status === "closed" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(e, "published")}>
                      <Send className="mr-1 h-3.5 w-3.5" /> Reopen
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete &ldquo;{e.title}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {(e._count?.submissions ?? 0) > 0
                            ? "This exam has submissions and cannot be deleted. Close it instead."
                            : "This permanently deletes the exam and all its questions. This cannot be undone."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        {(e._count?.submissions ?? 0) === 0 && (
                          <AlertDialogAction onClick={() => del(e)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        )}
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionsDialog({ exam }: { exam: Exam }) {
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      api.listSubmissions({ examId: exam.id })
        .then((r) => setSubs(r.submissions))
        .catch(() => setSubs([]))
        .finally(() => setLoading(false));
    }
  }, [open, exam.id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Eye className="mr-1 h-3.5 w-3.5" /> Submissions ({exam._count?.submissions ?? 0})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submissions — {exam.title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : subs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{s.student?.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.submittedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="capitalize">{s.status.replace("_", " ")}</Badge>
                  <span className="font-semibold">{s.score}/{exam.totalMarks}</span>
                  {s.grade && <Badge variant="secondary">Grade {s.grade}</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
