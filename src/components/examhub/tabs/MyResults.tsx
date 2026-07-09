"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart3, Loader2, Award, Inbox, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import type { Submission, User } from "@/lib/types";
import { useExamHub } from "../store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function MyResults({ user }: { user: User }) {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const nonce = useExamHub((s) => s.nonce);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listSubmissions({ scope: "mine" });
      setSubs(r.submissions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [nonce]);

  useEffect(() => { load(); }, [load]);

  const published = subs.filter((s) => s.status === "published");
  const pending = subs.filter((s) => s.status !== "published");
  const avg = published.length
    ? published.reduce((s, x) => s + (x.percentage ?? 0), 0) / published.length
    : 0;
  const best = published.reduce((m, x) => Math.max(m, x.percentage ?? 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> My Results
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your published exam results and pending submissions awaiting teacher marking.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Exams taken" value={String(subs.length)} icon={<Award className="h-4 w-4" />} />
        <StatCard label="Published" value={String(published.length)} icon={<Award className="h-4 w-4" />} />
        <StatCard label="Average" value={`${avg.toFixed(0)}%`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Best score" value={`${best.toFixed(0)}%`} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading results…
        </div>
      ) : subs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium">No results yet</p>
            <p className="text-sm text-muted-foreground">Take an exam from the &ldquo;Take Exam&rdquo; tab to see your results here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">Pending publication</h2>
              <div className="space-y-2">
                {pending.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{s.exam?.title}</p>
                        <p className="text-xs text-muted-foreground">Submitted {new Date(s.submittedAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 capitalize">
                        {s.status.replace("_", " ")}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {published.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">Published results</h2>
              <div className="space-y-2">
                {published.map((s) => {
                  const pct = s.percentage ?? 0;
                  const accent = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600";
                  return (
                    <Card key={s.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.exam?.title}</p>
                          <p className="text-xs text-muted-foreground">{s.exam?.subject} · {new Date(s.submittedAt).toLocaleDateString()}</p>
                          {(s.answers ?? []).some((a) => a.feedback) && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              &ldquo;{(s.answers ?? []).find((a) => a.feedback)?.feedback}&rdquo;
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <div className="text-lg font-bold">{s.score}/{s.exam?.totalMarks}</div>
                            <div className={cn("text-sm font-semibold", accent)}>{Math.round(pct)}%</div>
                          </div>
                          {s.grade && <Badge variant="secondary" className="text-base">Grade {s.grade}</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
