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
  Sparkles,
  BookOpen,
  Layers,
  School,
  Clock,
  Award,
  Users,
  FileText,
  Zap,
  ChevronRight,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster, toast } from "sonner";
import { api } from "@/lib/api-client";
import { LEVELS, SUBJECTS, levelLabel, type User } from "@/lib/types";
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
  { id: "upload", label: "Upload Paper", icon: Upload, roles: ["teacher", "school_admin", "super_admin"] },
  { id: "create-exam", label: "Create Exam", icon: FilePlus2, roles: ["teacher", "school_admin", "super_admin"] },
  { id: "my-exams", label: "My Exams", icon: ClipboardList, roles: ["teacher", "school_admin", "super_admin"] },
  { id: "take-exam", label: "Take Exam", icon: PenSquare, roles: ["student"] },
  { id: "review", label: "Review Submissions", icon: CheckCircle2, roles: ["teacher", "school_admin", "super_admin"] },
  { id: "results", label: "My Results", icon: BarChart3, roles: ["student"] },
  { id: "admin", label: "Admin Overview", icon: ShieldCheck, roles: ["super_admin"] },
];

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  school_admin: "School Admin",
  super_admin: "Super Admin",
};

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
  const [navDialog, setNavDialog] = useState<null | "features" | "subjects" | "levels" | "schools">(null);
  const tab = useExamHub((s) => s.tab);
  const setTab = useExamHub((s) => s.setTab);
  const nonce = useExamHub((s) => s.nonce);
  const bump = useExamHub((s) => s.bump);
  const setLibraryFilter = useExamHub((s) => s.setLibraryFilter);

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
      toast.success("Demo data refreshed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    }
  };

  // Header nav actions — each wires to real app behaviour (not dead links)
  const goToLibraryFiltered = (filter: { subject?: string; level?: string }) => {
    setLibraryFilter(filter);
    setTab("library");
    setNavDialog(null);
  };
  const handleForSchools = () => {
    setNavDialog("schools");
  };
  const NAV_LINKS: { id: typeof navDialog; label: string }[] = [
    { id: "features", label: "Features" },
    { id: "subjects", label: "Subjects" },
    { id: "levels", label: "Levels" },
    { id: "schools", label: "For Schools" },
  ];
  const onNavClick = (id: typeof navDialog) => {
    setNavDialog(id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flag-bar h-1 w-full" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-navy font-medium">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading ExamHub…
          </div>
        </div>
      </div>
    );
  }

  const role = user?.role ?? "student";
  const visibleNav = NAV.filter((n) => n.roles.includes(role));

  // If current tab isn't allowed for role, reset to library
  const activeTab = visibleNav.some((n) => n.id === tab) ? tab : "library";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster richColors position="top-right" />
      {/* Tanzania flag accent ribbon */}
      <div className="flag-bar h-1 w-full" />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-navy/15 bg-hero text-white shadow-card">
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
              <div className="text-base tracking-tight">ExamHub <span className="text-gold font-bold">Tanzania</span></div>
              <div className="text-[11px] font-normal text-white/70">Papers · Exams · Timetable</div>
            </div>
          </div>

          {/* Header nav links — functional, not dead anchors */}
          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => onNavClick(l.id)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTab("schedule")}
              className="hidden sm:inline-flex text-white hover:bg-white/10 hover:text-white relative"
            >
              <Bell className="h-4 w-4" />
              <span className="ml-1.5 hidden lg:inline">Alerts</span>
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-gold ring-2 ring-navy" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSeed} className="hidden sm:inline-flex text-white hover:bg-white/10 hover:text-white">
              <RefreshCw className="mr-1.5 h-4 w-4" /> Reset
            </Button>
            {user && (
              <Badge variant="outline" className={`${ROLE_COLOR[role]} hidden sm:inline-flex border`}>
                {ROLE_LABEL[role]}
              </Badge>
            )}
            <Select value={user?.id ?? ""} onValueChange={handleSwitch}>
              <SelectTrigger className="w-[180px] sm:w-[240px] bg-white/10 border-white/20 text-white hover:bg-white/15">
                <SelectValue placeholder="Switch user" />
              </SelectTrigger>
              <SelectContent>
                {switchers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-1 text-xs text-muted-foreground">· {ROLE_LABEL[s.role]}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col gap-1 border-r border-border bg-card p-3">
          {visibleNav.map((n) => (
            <NavButton key={n.id} item={n} active={activeTab === n.id} onClick={() => setTab(n.id)} />
          ))}
          <div className="mt-auto rounded-lg border border-green/20 bg-green/5 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-navy flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green" /> Role-based access
            </p>
            <p className="mt-1">
              Switch users to see how students, teachers, school admins and the super admin each experience the platform.
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
              {visibleNav.map((n) => (
                <NavButton
                  key={n.id}
                  item={n}
                  active={activeTab === n.id}
                  onClick={() => {
                    setTab(n.id);
                    setMobileOpen(false);
                  }}
                />
              ))}
              <div className="my-2 border-t" />
              {NAV_LINKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { onNavClick(l.id); setMobileOpen(false); }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-green/10 hover:text-navy"
                >
                  <ChevronRight className="h-4 w-4" /> {l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 py-6">
          {user && (
            <TabContent tab={activeTab} user={user} />
          )}
        </main>
      </div>

      {/* Sticky footer */}
      <footer className="mt-auto bg-navy-dark text-white/80">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-sm sm:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-gold" />
            <span>ExamHub Tanzania — Papers, Exams &amp; Timetable</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/60">NECTA · Mocks · School Exams</span>
            <span className="hidden sm:inline text-white/50">Official demo build</span>
          </div>
        </div>
      </footer>

      {/* Header nav dialogs — Features / Subjects / Levels / Schools */}
      <FeaturesDialog open={navDialog === "features"} onClose={() => setNavDialog(null)} onGoToTab={setTab} />
      <SubjectsDialog open={navDialog === "subjects"} onClose={() => setNavDialog(null)} onPick={(subject) => goToLibraryFiltered({ subject })} />
      <LevelsDialog open={navDialog === "levels"} onClose={() => setNavDialog(null)} onPick={(level) => goToLibraryFiltered({ level })} />
      <SchoolsDialog open={navDialog === "schools"} onClose={() => setNavDialog(null)} role={role} onGoToTab={setTab} />
    </div>
  );
}

/* ===== Features dialog ===== */
const FEATURES = [
  { icon: Library, title: "Papers Library", desc: "Browse NECTA past papers, mocks & school exams. Filter by subject, level & status.", tab: "library" as TabId, color: "text-navy bg-navy/10" },
  { icon: CalendarClock, title: "Schedule & Timetable", desc: "Live countdown timers for quizzes of the day, exams, tests & assignments with start alerts.", tab: "schedule" as TabId, color: "text-green bg-green/10" },
  { icon: FilePlus2, title: "Create Exams", desc: "Build quizzes with MCQ, True/False, Short answer & Essay questions. Publish to students instantly.", tab: "create-exam" as TabId, color: "text-sky bg-sky/10" },
  { icon: CheckCircle2, title: "Auto-Marking", desc: "Objective questions marked instantly. Teachers review essays & publish results with feedback.", tab: "review" as TabId, color: "text-gold bg-gold/10" },
  { icon: BarChart3, title: "Results & Analytics", desc: "Students see grades (A–F) and feedback. Admins see platform-wide submission stats.", tab: "results" as TabId, color: "text-navy bg-navy/10" },
  { icon: ShieldCheck, title: "Role-Based Access", desc: "Students, teachers, school admins & super admins — each sees exactly what they need.", tab: "admin" as TabId, color: "text-green bg-green/10" },
];

function FeaturesDialog({ open, onClose, onGoToTab }: { open: boolean; onClose: () => void; onGoToTab: (t: TabId) => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scroll-soft">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy"><Sparkles className="h-5 w-5 text-green" /> Platform Features</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.title}
                onClick={() => { onGoToTab(f.tab); onClose(); }}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-green/40 hover:shadow-card transition-all"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${f.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 font-semibold text-navy">{f.title} <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-green group-hover:translate-x-0.5 transition-all" /></div>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{f.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="pt-2 text-center text-xs text-muted-foreground">Click any feature to jump straight to it.</p>
      </DialogContent>
    </Dialog>
  );
}

/* ===== Subjects dialog ===== */
const SUBJECT_ICONS: Record<string, string> = {
  Biology: "🧬", Chemistry: "⚗️", Physics: "🔭", Mathematics: "📐",
  English: "📖", Kiswahili: "🗣️", Geography: "🌍", History: "📜",
  Civics: "⚖️", "Book-Keeping": "簿", Commerce: "💼", "General Studies": "🎓",
};

function SubjectsDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (s: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scroll-soft">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy"><BookOpen className="h-5 w-5 text-green" /> Browse by Subject</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground pb-2">Pick a subject to filter the Papers Library.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="group flex items-center gap-2.5 rounded-lg border border-border bg-card p-3 text-left hover:border-green/40 hover:bg-green/5 transition-all"
            >
              <span className="text-xl">{SUBJECT_ICONS[s] ?? "📘"}</span>
              <span className="text-sm font-medium text-navy group-hover:text-green">{s}</span>
              <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground group-hover:text-green group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===== Levels dialog ===== */
function LevelsDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (l: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy"><Layers className="h-5 w-5 text-green" /> Browse by Education Level</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground pb-2">Pick a level to filter the Papers Library.</p>
        <div className="space-y-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => onPick(l.value)}
              className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3.5 text-left hover:border-green/40 hover:bg-green/5 transition-all"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/10 text-navy font-bold text-sm">
                {l.value.includes("standard") ? "S" : "F"}{l.value.split("_")[1]}
              </div>
              <span className="text-sm font-medium text-navy group-hover:text-green flex-1">{l.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-green group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===== For Schools dialog ===== */
const SCHOOL_FEATURES = [
  { icon: Library, title: "School Papers Library", desc: "Upload & publish your school's past papers, mocks and regional exams. Control visibility per class." },
  { icon: FilePlus2, title: "Build School Exams", desc: "Create custom exams and quizzes from any paper. MCQ, True/False, Short answer & Essay." },
  { icon: CalendarClock, title: "Timetable & Alerts", desc: "Schedule quizzes of the day, tests and assignments with live countdown timers for students." },
  { icon: CheckCircle2, title: "Review & Marking", desc: "Auto-mark objective questions. Review essays, give feedback and publish results in one click." },
  { icon: BarChart3, title: "Submission Analytics", desc: "See how many students attempted each exam, average scores and completion rates." },
  { icon: Users, title: "Role Hierarchy", desc: "School admins manage teachers & students. Teachers manage their subjects. Students take exams." },
];

function SchoolsDialog({ open, onClose, role, onGoToTab }: { open: boolean; onClose: () => void; role: string; onGoToTab: (t: TabId) => void }) {
  const canAdmin = role === "super_admin" || role === "school_admin";
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scroll-soft">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy"><School className="h-5 w-5 text-green" /> For Schools</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground pb-2">
          Everything a school needs to run digital exams — from uploading papers to publishing results.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SCHOOL_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green/10 text-green">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-navy text-sm">{f.title}</div>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t mt-2">
          <p className="text-xs text-muted-foreground">
            {canAdmin
              ? "You're signed in as an admin — jump to the Admin Overview to manage your school."
              : "Switch to a School Admin or Super Admin account (top-right) to access school management tools."}
          </p>
          <Button
            onClick={() => { onGoToTab("admin"); onClose(); }}
            disabled={!canAdmin}
            className="bg-green hover:bg-green/90 shrink-0"
          >
            <ShieldCheck className="mr-1.5 h-4 w-4" /> Admin Overview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-navy text-white shadow-card"
          : "text-muted-foreground hover:bg-green/10 hover:text-navy"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-gold" : ""}`} />
      {item.label}
    </button>
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
