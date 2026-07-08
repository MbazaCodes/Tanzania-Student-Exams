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
import type { User } from "@/lib/types";
import { useExamHub, type TabId } from "./store";
import { PapersLibrary } from "./tabs/PapersLibrary";
import { UploadPaper } from "./tabs/UploadPaper";
import { CreateExam } from "./tabs/CreateExam";
import { MyExams } from "./tabs/MyExams";
import { TakeExam } from "./tabs/TakeExam";
import { ReviewSubmissions } from "./tabs/ReviewSubmissions";
import { MyResults } from "./tabs/MyResults";
import { AdminOverview } from "./tabs/AdminOverview";

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const NAV: NavItem[] = [
  { id: "library", label: "Papers Library", icon: Library, roles: ["student", "teacher", "school_admin", "super_admin"] },
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
  student: "bg-emerald-100 text-emerald-700 border-emerald-200",
  teacher: "bg-amber-100 text-amber-700 border-amber-200",
  school_admin: "bg-violet-100 text-violet-700 border-violet-200",
  super_admin: "bg-rose-100 text-rose-700 border-rose-200",
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
      toast.success("Demo data refreshed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
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
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Toaster richColors position="top-right" />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <button
            className="md:hidden rounded-md p-2 hover:bg-accent"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base">ExamHub</div>
              <div className="text-[11px] font-normal text-muted-foreground">Papers &amp; Exams Platform</div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleSeed} className="hidden sm:inline-flex">
              <RefreshCw className="mr-1.5 h-4 w-4" /> Reset demo
            </Button>
            {user && (
              <Badge variant="outline" className={`${ROLE_COLOR[role]} hidden sm:inline-flex`}>
                {ROLE_LABEL[role]}
              </Badge>
            )}
            <Select value={user?.id ?? ""} onValueChange={handleSwitch}>
              <SelectTrigger className="w-[200px] sm:w-[240px]">
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
        <aside className="hidden md:flex w-60 shrink-0 flex-col gap-1 border-r bg-card/50 p-3">
          {visibleNav.map((n) => (
            <NavButton key={n.id} item={n} active={activeTab === n.id} onClick={() => setTab(n.id)} />
          ))}
          <div className="mt-auto rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Role-based access</p>
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
      <footer className="mt-auto border-t bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span>ExamHub — Papers Library &amp; Exam Management</span>
          </div>
          <div className="flex items-center gap-4">
            <span>NECTA · Mocks · School Exams</span>
            <span className="hidden sm:inline">Demo build</span>
          </div>
        </div>
      </footer>
    </div>
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
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </button>
  );
}

function TabContent({ tab, user }: { tab: TabId; user: User }) {
  switch (tab) {
    case "library":
      return <PapersLibrary user={user} />;
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
