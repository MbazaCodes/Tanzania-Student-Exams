"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  Loader2,
  FileText,
  FilePlus2,
  Users,
  ClipboardCheck,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { User } from "@/lib/types";
import { useExamHub } from "../store";
import { toast } from "sonner";

export function AdminOverview({ user }: { user: User }) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.stats>>["stats"]>(null);
  const [loading, setLoading] = useState(true);
  const nonce = useExamHub((s) => s.nonce);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.stats();
      setStats(r.stats);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [nonce]);

  useEffect(() => { load(); }, [load]);

  const cards = stats
    ? [
        { label: "Total papers", value: stats.papers, icon: <FileText className="h-5 w-5" />, sub: `${stats.publishedPapers} published · ${stats.draftPapers} drafts` },
        { label: "Exams created", value: stats.exams, icon: <FilePlus2 className="h-5 w-5" />, sub: `${stats.publishedExams} published` },
        { label: "Submissions", value: stats.submissions, icon: <ClipboardCheck className="h-5 w-5" />, sub: `${stats.reviewedSubs} results published` },
        { label: "Students", value: stats.students, icon: <Users className="h-5 w-5" />, sub: "Registered learners" },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Admin Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-wide snapshot of papers, exams, submissions and students.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading overview…
        </div>
      ) : !stats ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No data available.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <Card key={c.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{c.icon}</span>
                  </div>
                  <p className="mt-2 text-3xl font-bold">{c.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Workflow status</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Papers published" value={`${stats.publishedPapers} / ${stats.papers}`} pct={stats.papers ? (stats.publishedPapers / stats.papers) * 100 : 0} color="bg-emerald-500" />
                <Row label="Exams published" value={`${stats.publishedExams} / ${stats.exams}`} pct={stats.exams ? (stats.publishedExams / stats.exams) * 100 : 0} color="bg-sky-500" />
                <Row label="Results published" value={`${stats.reviewedSubs} / ${stats.submissions}`} pct={stats.submissions ? (stats.reviewedSubs / stats.submissions) * 100 : 0} color="bg-violet-500" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Your super-admin powers</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>As the super admin you can:</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>See and manage <span className="font-medium text-foreground">all</span> papers, exams &amp; submissions across every school</li>
                  <li>Publish or archive any paper from the Papers Library</li>
                  <li>Review and publish any student&apos;s submission</li>
                  <li>Create exams and upload papers on behalf of any school</li>
                </ul>
                <p className="pt-2">
                  <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200">Super Admin</Badge>{" "}
                  Scope: <span className="font-medium text-foreground">All schools</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span>{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
