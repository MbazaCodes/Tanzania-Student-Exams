"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  CalendarClock,
  Plus,
  Loader2,
  Clock,
  Sparkles,
  FileText,
  ClipboardCheck,
  BookOpen,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bell,
  Inbox,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  LEVELS,
  SUBJECTS,
  SCHEDULE_TYPES,
  levelLabel,
  type ScheduleItem,
  type ScheduleType,
  type User,
} from "@/lib/types";
import { useExamHub } from "../store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TYPE_STYLE: Record<
  ScheduleType,
  { bg: string; text: string; ring: string; icon: React.ComponentType<{ className?: string }> }
> = {
  quiz_of_day: { bg: "bg-green/10", text: "text-green", ring: "ring-green/30", icon: Sparkles },
  exam: { bg: "bg-navy/10", text: "text-navy", ring: "ring-navy/30", icon: FileText },
  test: { bg: "bg-sky/10", text: "text-sky", ring: "ring-sky/30", icon: ClipboardCheck },
  assignment: { bg: "bg-gold/10", text: "text-gold", ring: "ring-gold/40", icon: BookOpen },
};

const canManage = (role: string) =>
  role === "teacher" || role === "school_admin" || role === "super_admin";

export function ScheduleTab({ user }: { user: User }) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [createOpen, setCreateOpen] = useState(false);
  const { nonce, setTab } = useExamHub();
  const manager = canManage(user.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listSchedule({ scope: "all" });
      setItems(r.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, [nonce]);

  useEffect(() => {
    load();
  }, [load]);

  // live ticking clock for countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const computeStatus = (item: ScheduleItem, ts: number) => {
    const start = new Date(item.scheduledAt).getTime();
    const end = start + item.durationMins * 60_000;
    if (item.status === "cancelled") return "cancelled";
    if (item.status === "completed" || ts > end) return "completed";
    if (ts >= start && ts < end) return "live";
    // upcoming
    const minsToStart = (start - ts) / 60_000;
    if (minsToStart <= 15) return "soon";
    return "scheduled";
  };

  const decorated = useMemo(
    () =>
      items
        .map((it) => ({ ...it, _live: computeStatus(it, now) }))
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [items, now]
  );

  const upcoming = decorated.filter((i) => i._live === "scheduled" || i._live === "soon" || i._live === "live");
  const past = decorated.filter((i) => i._live === "completed" || i._live === "cancelled");

  // Next upcoming item (soonest scheduled/soon/live)
  const next = upcoming.find((i) => i._live === "live") ?? upcoming[0] ?? null;

  // alerts: items that are live or starting soon
  const alerts = upcoming.filter((i) => i._live === "live" || i._live === "soon");

  const act = async (item: ScheduleItem, status: "live" | "completed" | "cancelled") => {
    try {
      await api.updateSchedule(item.id, { status });
      toast.success(
        status === "live" ? "Marked as live now" : status === "completed" ? "Marked complete" : "Cancelled"
      );
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };
  const del = async (item: ScheduleItem) => {
    try {
      await api.deleteSchedule(item.id);
      toast.success("Schedule item deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-navy" /> Schedule &amp; Timetable
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quizzes of the day, exams, tests &amp; assignments — with live countdown timers and start alerts.
          </p>
        </div>
        {manager && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green hover:bg-green/90"><Plus className="mr-2 h-4 w-4" /> Schedule item</Button>
            </DialogTrigger>
            <CreateScheduleDialog
              onClose={() => setCreateOpen(false)}
              onCreated={() => { load(); }}
            />
          </Dialog>
        )}
      </div>

      {/* Live countdown to next item */}
      {next ? (
        <CountdownCard item={next} now={now} onTakeExam={() => setTab("take-exam")} />
      ) : (
        <Card className="bg-navy text-white">
          <CardContent className="py-8 flex items-center justify-center gap-3 text-white/80">
            <Inbox className="h-5 w-5" /> No upcoming scheduled items.
          </CardContent>
        </Card>
      )}

      {/* Alerts strip */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <AlertRow key={a.id} item={a} now={now} />
          ))}
        </div>
      )}

      {/* Upcoming timetable */}
      <div>
        <h2 className="text-sm font-semibold text-navy mb-2 flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> Upcoming ({upcoming.length})
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : upcoming.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nothing scheduled. {manager && "Click \"Schedule item\" to add one."}</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((it) => (
              <ScheduleRow key={it.id} item={it} now={now} manager={manager} onAct={act} onDelete={del} onTakeExam={() => setTab("take-exam")} />
            ))}
          </div>
        )}
      </div>

      {/* Past items */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <History className="h-4 w-4" /> Past ({past.length})
          </h2>
          <div className="space-y-2 opacity-70">
            {past.map((it) => (
              <ScheduleRow key={it.id} item={it} now={now} manager={manager} onAct={act} onDelete={del} onTakeExam={() => setTab("take-exam")} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Live countdown card ===== */
function CountdownCard({ item, now, onTakeExam }: { item: ScheduleItem & { _live: string }; now: number; onTakeExam: () => void }) {
  const start = new Date(item.scheduledAt).getTime();
  const end = start + item.durationMins * 60_000;
  const Style = TYPE_STYLE[item.type];
  const Icon = Style.icon;
  const isLive = item._live === "live";

  let secs: number;
  let label: string;
  if (isLive) {
    secs = Math.max(0, Math.floor((end - now) / 1000));
    label = "Time remaining";
  } else {
    secs = Math.max(0, Math.floor((start - now) / 1000));
    label = "Starts in";
  }
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  return (
    <Card className={cn("overflow-hidden border-0 text-white shadow-card", isLive ? "bg-hero-gold text-navy-dark" : "bg-hero")}>
      <CardContent className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", isLive ? "bg-navy/15 text-navy" : "bg-white/15 text-gold")}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("capitalize", isLive ? "bg-navy text-white" : "bg-gold text-navy-dark")}>{item.type.replace("_", " ")}</Badge>
              {isLive && <Badge className="bg-red-500 text-white animate-pulse"><span className="h-1.5 w-1.5 rounded-full bg-white mr-1" /> LIVE NOW</Badge>}
            </div>
            <h3 className="mt-1.5 text-lg font-semibold truncate">{item.title}</h3>
            <p className="text-sm opacity-80">{item.subject} · {new Date(item.scheduledAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
            <div className="mt-1 flex items-baseline gap-1.5 timer-digit">
              {d > 0 && <><span className="text-3xl font-bold">{d}</span><span className="text-xs opacity-70">d</span></>}
              <span className="text-3xl font-bold">{String(h).padStart(2, "0")}</span><span className="text-xs opacity-70">h</span>
              <span className="text-3xl font-bold">{String(m).padStart(2, "0")}</span><span className="text-xs opacity-70">m</span>
              <span className="text-3xl font-bold">{String(s).padStart(2, "0")}</span><span className="text-xs opacity-70">s</span>
            </div>
          </div>
          {isLive && (
            <Button onClick={onTakeExam} className={cn("shrink-0", isLive ? "bg-navy text-white hover:bg-navy/90" : "")}>
              <Play className="mr-1.5 h-4 w-4" /> {item.examId ? "Take now" : "Join"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ===== Alert row (live / starting soon) ===== */
function AlertRow({ item, now }: { item: ScheduleItem & { _live: string }; now: number }) {
  const start = new Date(item.scheduledAt).getTime();
  const mins = Math.round((start - now) / 60_000);
  const isLive = item._live === "live";
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm",
      isLive ? "border-red-200 bg-red-50 text-red-800" : "border-gold/40 bg-gold/10 text-navy"
    )}>
      {isLive ? <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" /> : <AlertTriangle className="h-4 w-4 text-gold" />}
      <span className="font-medium">{item.title}</span>
      <span className="text-xs">
        {isLive ? "is live now" : `starts in ${mins} min${mins === 1 ? "" : "s"}`}
      </span>
      <Badge variant="outline" className="ml-auto capitalize">{item.type.replace("_", " ")}</Badge>
    </div>
  );
}

/* ===== Schedule row ===== */
function ScheduleRow({
  item,
  now,
  manager,
  onAct,
  onDelete,
  onTakeExam,
}: {
  item: ScheduleItem & { _live: string };
  now: number;
  manager: boolean;
  onAct: (i: ScheduleItem, s: "live" | "completed" | "cancelled") => void;
  onDelete: (i: ScheduleItem) => void;
  onTakeExam: () => void;
}) {
  const Style = TYPE_STYLE[item.type];
  const Icon = Style.icon;
  const start = new Date(item.scheduledAt).getTime();
  const end = start + item.durationMins * 60_000;
  const dateStr = new Date(item.scheduledAt).toLocaleString([], {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const statusBadge = (() => {
    switch (item._live) {
      case "live": return <Badge className="bg-red-500 text-white animate-pulse"><span className="h-1.5 w-1.5 rounded-full bg-white mr-1" />Live</Badge>;
      case "soon": return <Badge className="bg-gold text-navy-dark">Starts soon</Badge>;
      case "completed": return <Badge variant="outline" className="bg-zinc-100 text-zinc-500">Completed</Badge>;
      case "cancelled": return <Badge variant="outline" className="bg-red-50 text-red-600">Cancelled</Badge>;
      default: return <Badge variant="outline" className="bg-green/10 text-green border-green/30">Scheduled</Badge>;
    }
  })();

  return (
    <Card className="hover:shadow-card transition-shadow">
      <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", Style.bg, Style.text)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold truncate">{item.title}</h3>
            {statusBadge}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{item.subject}</span>
            {item.level && <span>· {levelLabel(item.level)}</span>}
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {dateStr}</span>
            <span>· {item.durationMins < 1440 ? `${item.durationMins} min` : `${Math.round(item.durationMins / 1440 * 10) / 10} days`}</span>
            {item.examId && <span className="text-green font-medium">· linked exam</span>}
          </div>
          {item.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item._live === "live" && item.examId && (
            <Button size="sm" onClick={onTakeExam}><Play className="mr-1 h-3.5 w-3.5" /> Take</Button>
          )}
          {manager && item._live !== "completed" && item._live !== "cancelled" && (
            <>
              {item._live !== "live" && (
                <Button size="sm" variant="outline" onClick={() => onAct(item, "live")}>
                  <Play className="mr-1 h-3.5 w-3.5" /> Start now
                </Button>
              )}
              {item._live === "live" && (
                <Button size="sm" variant="outline" onClick={() => onAct(item, "completed")}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onAct(item, "cancelled")}>
                <XCircle className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete &ldquo;{item.title}&rdquo;?</AlertDialogTitle>
                    <AlertDialogDescription>This removes the item from the timetable. This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(item)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ===== Create schedule dialog ===== */
function CreateScheduleDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ScheduleType>("quiz_of_day");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title || !subject || !date || !time) {
      toast.error("Fill in title, subject, date and time");
      return;
    }
    const scheduledAt = new Date(`${date}T${time}`);
    if (isNaN(scheduledAt.getTime())) {
      toast.error("Invalid date/time");
      return;
    }
    setSaving(true);
    try {
      await api.createSchedule({
        title, type, subject,
        level: level || undefined,
        scheduledAt: scheduledAt.toISOString(),
        durationMins: Number(duration) || 60,
        description: description || undefined,
      });
      toast.success("Scheduled! Students will see the countdown.");
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to schedule");
    } finally {
      setSaving(false);
    }
  };

  // default date = today
  useEffect(() => {
    if (!date) {
      const d = new Date();
      setDate(d.toISOString().slice(0, 10));
    }
  }, [date]);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-green" /> Schedule a new item</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Type</Label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {SCHEDULE_TYPES.map((t) => {
              const St = TYPE_STYLE[t.value as ScheduleType];
              const Ic = St.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-colors text-left",
                    type === t.value ? cn(St.bg, St.text, "ring-2", St.ring, "border-transparent") : "border-border hover:bg-accent"
                  )}
                >
                  <Ic className="h-4 w-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label htmlFor="st">Title *</Label>
          <Input id="st" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Biology Quiz of the Day" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Subject *</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Level</Label>
            <Select value={level || "none"} onValueChange={(v) => setLevel(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Any level —</SelectItem>
                {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="sd">Date *</Label>
            <Input id="sd" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="stm">Time *</Label>
            <Input id="stm" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="du">Duration (min)</Label>
            <Input id="du" type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="ds">Description</Label>
          <Textarea id="ds" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes for students…" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving} className="bg-green hover:bg-green/90">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
          Schedule &amp; alert
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
