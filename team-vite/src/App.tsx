import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Library, Upload, FilePlus2, ClipboardList, PenSquare,
  CheckCircle2, BarChart3, ShieldCheck, GraduationCap,
  Menu, X, CalendarClock, Bell, Wifi, User as UserIcon, LogOut,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { getCurrentUser, getAllUsers, setSessionUid, signOut, subscribeToScheduleUpdates } from '@/lib/api'
import type { User as UserType } from '@/lib/types'
import { ROLE_LABEL } from '@/lib/types'
import { useStore, type TabId } from '@/lib/store'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/index'
import { PapersLibrary } from '@/components/examhub/tabs/PapersLibrary'
import { UploadPaper } from '@/components/examhub/tabs/UploadPaper'
import { CreateExam } from '@/components/examhub/tabs/CreateExam'
import { MyExams } from '@/components/examhub/tabs/MyExams'
import { TakeExam } from '@/components/examhub/tabs/TakeExam'
import { ReviewSubmissions } from '@/components/examhub/tabs/ReviewSubmissions'
import { MyResults } from '@/components/examhub/tabs/MyResults'
import { AdminOverview } from '@/components/examhub/tabs/AdminOverview'
import { BookLibrary } from '@/components/examhub/tabs/BookLibrary'
import { Verifications } from '@/components/examhub/tabs/Verifications'
import { ScheduleTab } from '@/components/examhub/tabs/ScheduleTab'
import { cn } from '@/lib/utils'

interface NavItem { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; roles: string[] }

const NAV: NavItem[] = [
  { id: 'library',     label: 'Papers Library',     icon: Library,       roles: ['student','teacher','school_admin','super_admin'] },
  { id: 'schedule',    label: 'Schedule & Alerts',  icon: CalendarClock, roles: ['student','teacher','school_admin','super_admin'] },
  { id: 'take-exam',   label: 'Take Exam / Quiz',   icon: PenSquare,     roles: ['student'] },
  { id: 'results',     label: 'My Results',         icon: BarChart3,     roles: ['student'] },
  { id: 'upload',      label: 'Upload Paper',       icon: Upload,        roles: ['teacher','school_admin','super_admin'] },
  { id: 'create-exam', label: 'Create Exam / Quiz', icon: FilePlus2,     roles: ['teacher','school_admin','super_admin'] },
  { id: 'my-exams',    label: 'My Exams',           icon: ClipboardList, roles: ['teacher','school_admin','super_admin'] },
  { id: 'review',      label: 'Review Submissions', icon: CheckCircle2,  roles: ['teacher','school_admin','super_admin'] },
  { id: 'admin',       label: 'Admin Overview',     icon: ShieldCheck,   roles: ['super_admin'] },
  { id: 'verifications',label: 'Verifications',       icon: ShieldCheck,   roles: ['super_admin'] },
  { id: 'book-library', label: 'Book Library',        icon: Library,       roles: ['student','teacher','school_admin','super_admin'] },
]

const ROLE_COLOR: Record<string, string> = {
  student:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  teacher:      'bg-amber-50 text-amber-700 border-amber-200',
  school_admin: 'bg-sky-50 text-sky-700 border-sky-200',
  super_admin:  'bg-purple-50 text-purple-700 border-purple-200',
}

export default function App() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserType | null>(null)
  const [switchers, setSwitchers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scheduleAlert, setScheduleAlert] = useState(false)
  const { tab, setTab, nonce, bump } = useStore()

  const loadMe = useCallback(async () => {
    try {
      const [u, all] = await Promise.all([getCurrentUser(), getAllUsers()])
      if (!u) { navigate('/auth'); return }
      setUser(u)
      setSwitchers(all as UserType[])
    } catch { setUser(null) }
    finally { setLoading(false) }
  }, [navigate])

  useEffect(() => { loadMe() }, [loadMe, nonce])

  // Realtime schedule subscription
  useEffect(() => {
    const unsub = subscribeToScheduleUpdates(() => {
      setScheduleAlert(true)
      bump()
    })
    return () => { unsub() }
  }, [bump])

  const handleSwitch = async (id: string) => {
    setSessionUid(id)
    await loadMe()
    const target = switchers.find(s => s.id === id)
    setTab('library')
    toast.success(`Switched to ${target?.name} (${ROLE_LABEL[target?.role ?? '']})`)
  }

  const handleLogout = async () => {
    await signOut()
    localStorage.removeItem('eh_uid')
    navigate('/')
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flag-bar h-1 w-full"/>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 font-medium" style={{ color: 'var(--navy)' }}>
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading ExamHub…
        </div>
      </div>
    </div>
  )

  const role = user?.role ?? 'student'
  const visibleNav = NAV.filter(n => n.roles.includes(role))
  const activeTab = visibleNav.some(n => n.id === tab) ? tab : 'library'
  const isIndependent = role === 'teacher' && user?.teacher_type === 'independent'

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster richColors position="top-right"/>
      <div className="flag-bar h-1 w-full"/>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-hero text-white shadow-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <button className="md:hidden rounded-md p-2 hover:bg-white/10" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}
          </button>

          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 font-semibold hover:opacity-90 transition-opacity">
            <img src="/tz-coat-of-arms.png" alt="Tanzania Coat of Arms" className="h-9 w-9 object-contain"/>
            <div className="leading-tight">
              <div className="text-base tracking-tight">ExamHub <span className="font-bold" style={{ color: 'var(--gold)' }}>Tanzania</span></div>
              <div className="text-[11px] font-normal text-white/60 hidden sm:block">Exams · Quizzes · Assignments</div>
            </div>
          </button>

          <div className="ml-auto flex items-center gap-2">
            {isIndependent && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-amber-400/40 bg-amber-500/20 text-amber-200">
                <Wifi className="h-3 w-3"/> Independent
              </span>
            )}
            <button onClick={() => { setScheduleAlert(false); setTab('schedule') }}
              className="hidden sm:inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm hover:bg-white/10 text-white relative">
              <Bell className="h-4 w-4"/>
              <span className="hidden lg:inline ml-1">Alerts</span>
              {scheduleAlert && <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full ring-2 ring-blue-900" style={{ background: 'var(--gold)' }}/>}
            </button>
            {user && (
              <span className={cn('hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border', ROLE_COLOR[role])}>
                {ROLE_LABEL[role]}
              </span>
            )}
            {/* User switcher */}
            <Select value={user?.id ?? ''} onValueChange={handleSwitch}>
              <SelectTrigger className="w-[140px] sm:w-[180px] bg-white/10 border-white/20 text-white hover:bg-white/15 text-sm h-8">
                <SelectValue placeholder="Switch user"/>
              </SelectTrigger>
              <SelectContent>
                {switchers.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-1 text-xs text-muted-foreground">· {ROLE_LABEL[s.role]}{s.teacher_type === 'independent' ? ' (free)' : ''}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Profile + logout */}
            <button onClick={() => navigate('/profile')} className="h-8 w-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors" title="Profile">
              <UserIcon className="h-4 w-4"/>
            </button>
            <button onClick={handleLogout} className="h-8 w-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-red-500/30 transition-colors" title="Sign out">
              <LogOut className="h-4 w-4"/>
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col gap-1 border-r border-border bg-card p-3">
          {visibleNav.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors', activeTab === n.id ? 'text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}
              style={activeTab === n.id ? { background: 'var(--navy)' } : {}}>
              <n.icon className="h-4 w-4"/>
              {n.label}
            </button>
          ))}
          <div className="mt-auto rounded-lg border p-3 text-xs text-muted-foreground" style={{ borderColor: 'rgba(0,166,81,0.2)', background: 'rgba(0,166,81,0.04)' }}>
            <p className="font-medium flex items-center gap-1.5" style={{ color: 'var(--navy)' }}>
              <GraduationCap className="h-3.5 w-3.5"/> Role-based access
            </p>
            <p className="mt-1">Switch users to explore student, teacher, and admin views.</p>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)}/>
            <div className="absolute left-0 top-0 h-full w-64 bg-card p-3 shadow-xl flex flex-col gap-1 overflow-y-auto">
              <div className="flex items-center justify-between px-2 py-2">
                <span className="font-semibold">Navigation</span>
                <button onClick={() => setMobileOpen(false)} className="rounded-md p-1 hover:bg-accent"><X className="h-4 w-4"/></button>
              </div>
              {visibleNav.map(n => (
                <button key={n.id} onClick={() => { setTab(n.id); setMobileOpen(false) }}
                  className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors', activeTab === n.id ? 'text-white' : 'text-muted-foreground hover:bg-accent')}
                  style={activeTab === n.id ? { background: 'var(--navy)' } : {}}>
                  <n.icon className="h-4 w-4"/>{n.label}
                </button>
              ))}
              <div className="mt-4 border-t pt-4 space-y-1">
                <button onClick={() => navigate('/profile')} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent w-full">
                  <UserIcon className="h-4 w-4"/> My Profile
                </button>
                <button onClick={handleLogout} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                  <LogOut className="h-4 w-4"/> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 py-6">
          {user && <TabContent tab={activeTab} user={user}/>}
        </main>
      </div>

      <footer className="mt-auto text-white/70" style={{ background: 'var(--navy-dark)' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-sm sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/tz-coat-of-arms.png" alt="Tanzania Coat of Arms" className="h-4 w-4 object-contain"/>
            <span>ExamHub Tanzania — Exams, Quizzes, Daily Assignments</span>
          </div>
          <span className="text-white/40 text-xs">Powered by Supabase · NECTA · All Levels</span>
        </div>
      </footer>
    </div>
  )
}

function TabContent({ tab, user }: { tab: TabId; user: UserType }) {
  switch(tab) {
    case 'library':     return <PapersLibrary user={user}/>
    case 'schedule':    return <ScheduleTab user={user}/>
    case 'upload':      return <UploadPaper user={user}/>
    case 'create-exam': return <CreateExam user={user}/>
    case 'my-exams':    return <MyExams user={user}/>
    case 'take-exam':   return <TakeExam user={user}/>
    case 'review':      return <ReviewSubmissions user={user}/>
    case 'results':     return <MyResults user={user}/>
    case 'admin':        return <AdminOverview user={user}/>
    case 'verifications':return <Verifications user={user}/>
    case 'book-library': return <BookLibrary user={user}/>
    default:            return <PapersLibrary user={user}/>
  }
}
