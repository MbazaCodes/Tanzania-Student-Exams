"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Library,
  Upload,
  FilePlus2,
  ClipboardList,
  PenSquare,
  CheckCircle2,
  BarChart3,
  ShieldCheck,
  GraduationCap,
  Menu,
  X,
  RefreshCw,
  CalendarClock,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import { api } from "@/lib/api-client";
import { ROLE_LABEL, type User } from "@/lib/types";
import { useExamHub, type TabId } from "./store";
import { PapersLibrary } from "./tabs/PapersLibrary";
import { UploadPaper } from "./tabs/UploadPaper";
import { CreateExam } from "./tabs/CreateExam";
import { MyExams } from "./tabs/MyExams";
import { TakeExam } from "./tabs/TakeExam";
import { ReviewSubmissions } from "./tabs/ReviewSubmissions";
import { MyResults } from "./tabs/MyResults";
import { AdminOverview } from "./tabs/AdminOverview";
import { ScheduleTab } from "./tabs/ScheduleTab";

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const NAV: NavItem[] = [
  { id: "library", label: "Papers Library", icon: Library, roles: ["student", "teacher", "school_admin", "super_admin"] },
  { id: "schedule", label: "Schedule & Alerts", icon: CalendarClock, roles: ["student", "teacher", "school_admin", "super_admin"] },
  { id: "take-exam", label: "Take Exam / Quiz", icon: PenSquare, roles: ["student"] },
  { id: "results", label: "My Results", icon: BarChart3, roles: ["student"] },
  { id: "upload", label: "Upload Paper", icon: Upload, roles: ["teacher", "school_admin", "super_admin"] },
  { id: "create-exam", label: "Create Exam / Quiz", icon: FilePlus2, roles: ["teacher", "school_admin", "super_admin"] },
  { id: "my-exams", label: "My Exams", icon: ClipboardList, roles: ["teacher", "school_admin", "super_admin"] },
  { id: "review", label: "Review Submissions", icon: CheckCircle2, roles: ["teacher", "school_admin", "super_admin"] },
  { id: "admin", label: "Admin Overview", icon: ShieldCheck, roles: ["super_admin"] },
];

const ROLE_COLOR: Record<string, string> = {
  student: "bg-green/15 text-green border-green/30",
  teacher: "bg-gold/15 text-gold border-gold/40",
  school_admin: "bg-sky/15 text-sky border-sky/30",
  super_admin: "bg-navy/10 text-navy border-navy/30",
};

export function ExamHubApp() {
  const [user, setUser] = useState<User | null>(null);
  const [switchers, setSwitchers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const tab = useExamHub((s) => s.tab);
  const setTab = useExamHub((s) => s.setTab);
  const nonce = useExamHub((s) => s.nonce);
  const bump = useExamHub((s) => s.bump);

  const loadMe = useCallback(async () => {
    try {
      const r = await api.me();
      setUser(r.user);
      setSwitchers(r.switchers);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe, nonce]);

  const handleSwitch = async (id: string) => {
    try {
      await api.switchUser(id);
      await loadMe();
      const target = switchers.find((s) => s.id === id);
      setTab("library");
      toast.success(`Switched to ${target?.name} (${ROLE_LABEL[target?.role ?? ""]})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Switch failed");
    }
  };

  const handleSeed = async () => {
    try {
      await api.seed();
      await loadMe();
      bump();
      toast.success("Demo data seeded successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flag-bar h-1 w-full" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-navy font-medium">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading ExamHub...
          </div>
        </div>
      </div>
    );
  }

  // DB not set up yet
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
        <div className="flag-bar h-1 w-full fixed top-0 left-0" />
        <img src="/tz-coat-of-arms.png" alt="" className="h-16 w-16 object-contain mb-4" />
        <h1 className="text-2xl font-black mb-2 text-navy">ExamHub Tanzania</h1>
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left space-y-4">
          <p className="font-semibold text-amber-800 flex items-center gap-2">
            Connecting to database...
          </p>
          <p className="text-sm text-amber-700">
            The app is connecting to Supabase. If this persists, click the button below to seed demo data.
          </p>
          <Button onClick={handleSeed} className="w-full bg-green hover:bg-green/90">
            <RefreshCw className="mr-2 h-4 w-4" /> Seed Demo Data
          </Button>
        </div>
      </div>
    );
  }

  const role = user?.role ?? "student";
  const visibleNav = NAV.filter((n) => n.roles.includes(role));
  const activeTab = visibleNav.some((n) => n.id === tab) ? tab : "library";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster richColors position="top-right" />
      {/* Tanzania flag accent ribbon */}
      <div className="flag-bar h-1 w-full" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-navy/15 bg-hero text-white shadow-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <button
            className="md:hidden rounded-md p-2 hover:bg-white/10 text-white"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-2.5 font-semibold">
            <img src="/tz-coat-of-arms.png" alt="Tanzania Coat of Arms" className="h-9 w-9 object-contain" />
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green text-white shadow-sm ring-2 ring-white/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base tracking-tight">
                ExamHub <span className="text-gold font-bold">Tanzania</span>
              </div>
              <div className="text-[11px] font-normal text-white/70 hidden sm:block">
                Exams &middot; Quizzes &middot; Assignments
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTab("schedule")}
              className="hidden sm:inline-flex text-white hover:bg-white/10 hover:text-white relative"
            >
              <Bell className="h-4 w-4" />
              <span className="ml-1.5 hidden lg:inline">Alerts</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSeed}
              className="hidden sm:inline-flex text-white hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> Seed
            </Button>
            {user && (
              <Badge variant="outline" className={`${ROLE_COLOR[role]} hidden sm:inline-flex border`}>
                {ROLE_LABEL[role]}
              </Badge>
            )}
            <Select value={user?.id ?? ""} onValueChange={handleSwitch}>
              <SelectTrigger className="w-[160px] sm:w-[200px] bg-white/10 border-white/20 text-white hover:bg-white/15 h-8 text-sm">
                <SelectValue placeholder="Switch user" />
              </SelectTrigger>
              <SelectContent>
                {switchers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      &middot; {ROLE_LABEL[s.role]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col gap-1 border-r border-border bg-card p-3">
          {visibleNav.map((n) => {
            const Icon = n.icon;
            const isActive = activeTab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-navy text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-gold" : ""}`} />
                {n.label}
              </button>
            );
          })}
          <div className="mt-auto rounded-lg border border-green/20 bg-green/5 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-navy flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green" /> Role-based access
            </p>
            <p className="mt-1">
              Switch users to see how students, teachers, school admins and super admins each experience the platform.
            </p>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-64 bg-card p-3 shadow-xl flex flex-col gap-1 overflow-y-auto">
              <div className="flex items-center justify-between px-2 py-2">
                <span className="font-semibold">Navigation</span>
                <button onClick={() => setMobileOpen(false)} className="rounded-md p-1 hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {visibleNav.map((n) => {
                const Icon = n.icon;
                const isActive = activeTab === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      setTab(n.id);
                      setMobileOpen(false);
                    }}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-navy text-white"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 py-6">
          {user && <TabContent tab={activeTab} user={user} />}
        </main>
      </div>

      {/* Sticky footer */}
      <footer className="mt-auto bg-navy-dark text-white/80">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-sm sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/tz-coat-of-arms.png" alt="" className="h-4 w-4 object-contain" />
            <span>ExamHub Tanzania &mdash; Papers, Exams &amp; Timetable</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/60">NECTA &middot; Mocks &middot; School Exams</span>
            <span className="hidden sm:inline text-white/50">Powered by Supabase</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TabContent({ tab, user }: { tab: TabId; user: User }) {
  switch (tab) {
    case "library":
      return <PapersLibrary user={user} />;
    case "schedule":
      return <ScheduleTab user={user} />;
    case "upload":
      return <UploadPaper user={user} />;
    case "create-exam":
      return <CreateExam user={user} />;
    case "my-exams":
      return <MyExams user={user} />;
    case "take-exam":
      return <TakeExam user={user} />;
    case "review":
      return <ReviewSubmissions user={user} />;
    case "results":
      return <MyResults user={user} />;
    case "admin":
      return <AdminOverview user={user} />;
    default:
      return <PapersLibrary user={user} />;
  }
}