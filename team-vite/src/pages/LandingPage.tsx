import { useNavigate } from 'react-router-dom'
import {
  GraduationCap, BookOpen, ClipboardList, Timer, CheckCircle2,
  BarChart3, ChevronRight, Star, Users, FileText, Trophy,
  Wifi, Shield, Zap, Globe, ArrowRight, Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-md" style={{ background: 'rgba(0,31,63,0.97)' }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/tz-coat-of-arms.png" alt="Tanzania Coat of Arms" className="h-9 w-9 object-contain"/>
            <div className="leading-tight">
              <div className="text-base font-bold text-white tracking-tight">
                ExamHub <span style={{ color: 'var(--gold)' }}>Tanzania</span>
              </div>
              <div className="text-[10px] font-normal text-white/60 hidden sm:block">Mitihani · Maswali · Matokeo</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-6 text-sm text-white/70 mr-4">
              {['Features', 'Subjects', 'Levels', 'For Schools'].map(l => (
                <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>
            <button onClick={() => navigate('/auth')} className="rounded-lg px-4 py-2 text-sm font-semibold text-white border border-white/20 hover:bg-white/10 transition-colors hidden sm:inline-flex">
              Sign In
            </button>
            <button onClick={() => navigate('/auth')} className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-all hover:opacity-90 shadow-lg" style={{ background: 'var(--green)' }}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #001f3f 0%, #003366 55%, #004d99 100%)' }}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-0 lg:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
            {/* Left — copy */}
            <div className="text-white pb-16 lg:pb-24">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold mb-6 border border-yellow-400/30" style={{ background: 'rgba(245,166,35,0.15)', color: 'var(--gold)' }}>
                <img src="/tz-coat-of-arms.png" alt="Tanzania Coat of Arms" className="h-4 w-4 object-contain"/>
                Tanzania's #1 Digital Exam Platform
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight mb-6">
                Ace Your{' '}
                <span className="relative inline-block">
                  <span style={{ color: 'var(--gold)' }}>NECTA</span>
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" preserveAspectRatio="none" style={{ height: '6px' }}>
                    <path d="M0,6 Q50,0 100,5 Q150,10 200,4" stroke="#f5a623" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                  </svg>
                </span>
                {' '}Exams<br />with Confidence
              </h1>

              <p className="text-lg text-white/75 leading-relaxed mb-8 max-w-lg">
                Past papers, online quizzes, per-question timers, and instant marking — built for Standard 4 through Form 6 students across Tanzania.
              </p>

              {/* CTA row */}
              <div className="flex flex-wrap gap-3 mb-10">
                <button onClick={() => navigate('/auth')} className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl" style={{ background: 'var(--green)' }}>
                  Start Learning Free <ArrowRight className="h-5 w-5" />
                </button>
                <button onClick={() => navigate('/auth')} className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white border border-white/25 hover:bg-white/10 transition-colors">
                  <Play className="h-4 w-4" style={{ color: 'var(--gold)' }} /> Watch Demo
                </button>
              </div>

              {/* Trust stats */}
              <div className="flex flex-wrap gap-6">
                {[
                  { value: 'Std 4 – F6', label: 'All levels covered' },
                  { value: '14+', label: 'Subjects' },
                  { value: 'Instant', label: 'Auto-marking' },
                  { value: '30 Regions', label: 'Tanzania-wide' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="text-xl font-black" style={{ color: 'var(--gold)' }}>{s.value}</div>
                    <div className="text-xs text-white/55">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — hero image */}
            <div className="relative flex items-end justify-center lg:justify-end">
              {/* Glow */}
              <div className="absolute inset-0 rounded-3xl blur-3xl opacity-20" style={{ background: 'var(--green)' }} />
              <img
                src="/hero.png"
                alt="Student taking online exam on tablet"
                className="relative w-full max-w-xl lg:max-w-none object-contain object-bottom drop-shadow-2xl"
                style={{ maxHeight: '520px' }}
              />
              {/* Floating badge */}
              <div className="absolute top-8 right-4 lg:right-0 flex items-center gap-2.5 rounded-2xl border border-white/20 px-4 py-3 shadow-2xl backdrop-blur-sm" style={{ background: 'rgba(0,31,63,0.85)' }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--green)' }}>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Answer Revealed!</div>
                  <div className="text-[10px] text-white/60">Dodoma is the capital ✓</div>
                </div>
              </div>
              {/* Timer badge */}
              <div className="absolute bottom-12 left-4 flex items-center gap-2.5 rounded-2xl border border-amber-400/30 px-4 py-3 shadow-xl backdrop-blur-sm" style={{ background: 'rgba(0,31,63,0.9)' }}>
                <Timer className="h-5 w-5" style={{ color: 'var(--gold)' }} />
                <div>
                  <div className="text-xs font-bold" style={{ color: 'var(--gold)' }}>Per-Question Timer</div>
                  <div className="text-[10px] text-white/60">30s countdown per question</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="relative -mb-1">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full block" style={{ height: '80px' }}>
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── FEATURES STRIP ──────────────────────────────── */}
      <section className="py-6 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {[
              { icon: Timer, label: 'Per-Question Timers', desc: 'Auto-advance on expiry' },
              { icon: CheckCircle2, label: 'Instant Answer Reveal', desc: 'Learn as you go' },
              { icon: Wifi, label: 'Online Exams', desc: 'Live sessions anywhere' },
              { icon: Shield, label: 'NECTA Aligned', desc: 'Official past papers' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 bg-white shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(0,166,81,0.1)' }}>
                  <f.icon className="h-5 w-5" style={{ color: 'var(--green)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUBJECTS / LEVELS ───────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border" style={{ background: 'rgba(0,51,102,0.05)', borderColor: 'rgba(0,51,102,0.15)', color: 'var(--navy)' }}>
              <Globe className="h-3.5 w-3.5" /> All NECTA Levels
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Every Subject. Every Level.</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From primary school to advanced secondary — full coverage of the Tanzanian curriculum.</p>
          </div>

          {/* Level cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-12">
            {[
              { level: 'Standard 4', exam: 'SFNA', color: '#00a651', bg: 'rgba(0,166,81,0.08)', icon: '📚' },
              { level: 'Standard 7', exam: 'PSLE', color: '#0066cc', bg: 'rgba(0,102,204,0.08)', icon: '🎓' },
              { level: 'Form 2', exam: 'FTNA', color: '#f5a623', bg: 'rgba(245,166,35,0.1)', icon: '📝' },
              { level: 'Form 4', exam: 'CSEE', color: '#003366', bg: 'rgba(0,51,102,0.08)', icon: '🏆' },
              { level: 'Form 6', exam: 'ACSEE', color: '#8b1a1a', bg: 'rgba(139,26,26,0.08)', icon: '🌟' },
            ].map(l => (
              <div key={l.level} onClick={() => navigate('/auth')} className="cursor-pointer group rounded-2xl border-2 p-5 text-center transition-all hover:scale-105 hover:shadow-xl" style={{ borderColor: 'transparent', background: l.bg }}>
                <div className="text-3xl mb-2">{l.icon}</div>
                <div className="font-bold text-gray-900 text-sm">{l.level}</div>
                <div className="text-xs font-semibold mt-1 rounded-full px-2 py-0.5 inline-block" style={{ color: l.color, background: `${l.color}15` }}>{l.exam}</div>
              </div>
            ))}
          </div>

          {/* Subjects grid */}
          <div className="flex flex-wrap gap-2 justify-center">
            {['Biology','Chemistry','Physics','Mathematics','English','Kiswahili','Geography','History','Civics','Book-Keeping','Commerce','General Studies','Computer Studies','Agriculture'].map(s => (
              <span key={s} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-green-300 hover:text-green-700 cursor-pointer transition-colors">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">How ExamHub Works</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Three simple steps from paper to perfect score</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { step: '01', icon: BookOpen, title: 'Browse Past Papers', desc: 'Access NECTA past papers from Standard 4 to Form 6 across all subjects — PSLE, CSEE, ACSEE and more.', color: 'var(--navy)' },
              { step: '02', icon: ClipboardList, title: 'Take Timed Exams', desc: 'Answer question by question with a countdown timer. MCQ, True/False, Short Answer and Essay — all question types supported.', color: 'var(--green)' },
              { step: '03', icon: BarChart3, title: 'Get Instant Results', desc: 'Objective questions marked instantly. See correct answers with explanations immediately after each question.', color: 'var(--gold)' },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                {i < 2 && <div className="hidden md:block absolute top-10 left-full w-full h-px border-t-2 border-dashed border-gray-200 -translate-x-8 z-0" />}
                <div className="relative z-10 text-center">
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl mb-6 shadow-lg" style={{ background: `${s.color}12` }}>
                    <s.icon className="h-9 w-9" style={{ color: s.color }} />
                  </div>
                  <div className="text-5xl font-black mb-3" style={{ color: `${s.color}20` }}>{s.step}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR TEACHERS / SCHOOLS ──────────────────────── */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #001f3f 0%, #003366 100%)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 border border-yellow-400/30" style={{ background: 'rgba(245,166,35,0.15)', color: 'var(--gold)' }}>
                <Users className="h-3.5 w-3.5" /> For Teachers & Schools
              </div>
              <h2 className="text-3xl sm:text-4xl font-black mb-6">Built for Tanzania's Educators</h2>
              <p className="text-white/70 text-lg mb-8 leading-relaxed">School teachers, independent tutors and school admins each get their own dashboard — create exams, schedule quizzes, review essays, and publish results.</p>
              <div className="space-y-4 mb-8">
                {[
                  { icon: Zap, text: 'Independent teachers can publish exams without a school account' },
                  { icon: Timer, text: 'Set per-question timers (10s, 30s, 60s) to add exam pressure' },
                  { icon: CheckCircle2, text: 'Auto-mark MCQ & True/False instantly — review essays manually' },
                  { icon: BarChart3, text: 'Track performance by student, class, subject and level' },
                  { icon: Shield, text: 'Role-based access — students only see published results' },
                ].map(f => (
                  <div key={f.text} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5" style={{ background: 'var(--green)' }}>
                      <f.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <p className="text-white/80 text-sm">{f.text}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/auth')} className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-bold text-white transition-all hover:opacity-90" style={{ background: 'var(--green)' }}>
                Create Your First Exam <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Role cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { role: 'Student', icon: '🎓', desc: 'Take exams, track progress, review results', color: 'var(--green)' },
                { role: 'Teacher', icon: '👩‍🏫', desc: 'Create exams, mark essays, publish results', color: 'var(--gold)' },
                { role: 'School Admin', icon: '🏫', desc: 'Manage teachers, papers and school exams', color: 'var(--sky)' },
                { role: 'Independent', icon: '🌐', desc: 'Teach without a school — reach all students', color: '#a78bfa' },
              ].map(r => (
                <div key={r.role} className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-3xl mb-3">{r.icon}</div>
                  <div className="font-bold text-white text-sm mb-1">{r.role}</div>
                  <p className="text-white/55 text-xs leading-relaxed">{r.desc}</p>
                  <div className="mt-3 h-0.5 w-8 rounded-full" style={{ background: r.color }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Trusted by Students Across Tanzania</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { name: 'Amina Hassan', role: 'Form 4 Student, Dar es Salaam', text: 'The per-question timer really helped me practice under pressure. I improved my Biology score from C to A in one term!', stars: 5 },
              { name: 'Mr. Joseph Kimaro', role: 'Chemistry Teacher, Mwanza', text: 'As an independent teacher I can now reach students nationwide. Creating exams with instant marking saves me hours every week.', stars: 5 },
              { name: 'Grace Mushi', role: 'School Admin, Dodoma', text: 'Our school switched to ExamHub for all mock exams. Teachers love the essay review tools and students get results the same day.', stars: 5 },
            ].map(t => (
              <div key={t.name} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-white text-sm" style={{ background: 'var(--navy)' }}>{t.name[0]}</div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BANNER ────────────────────────────────── */}
      <section className="py-16 border-y border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { icon: FileText, value: '500+', label: 'Past Papers', color: 'var(--navy)' },
              { icon: Users, value: '10,000+', label: 'Active Students', color: 'var(--green)' },
              { icon: Trophy, value: '98%', label: 'Pass Rate Improvement', color: 'var(--gold)' },
              { icon: Globe, value: '30', label: 'Tanzania Regions', color: 'var(--sky)' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl mb-3" style={{ background: `${s.color}12` }}>
                  <s.icon className="h-6 w-6" style={{ color: s.color }} />
                </div>
                <div className="text-3xl font-black text-gray-900">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #001f3f 0%, #003366 60%, #00a651 100%)' }}>
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 text-center text-white">
          <img src="/tz-coat-of-arms.png" alt="Tanzania Coat of Arms" className="h-16 w-16 object-contain mx-auto mb-6"/>
          <h2 className="text-3xl sm:text-5xl font-black mb-6 leading-tight">
            Start Your Journey to<br /><span style={{ color: 'var(--gold)' }}>Exam Excellence</span>
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of Tanzanian students who use ExamHub to prepare for NECTA, PSLE, CSEE and ACSEE.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => navigate('/auth')} className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-white shadow-2xl transition-all hover:scale-105" style={{ background: 'var(--green)' }}>
              Start for Free <ArrowRight className="h-5 w-5" />
            </button>
            <button onClick={() => navigate('/auth')} className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-semibold text-white border border-white/25 hover:bg-white/10 transition-colors">
              Explore Papers <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <p className="text-white/40 text-sm mt-6">Free to use · No credit card required · All Tanzanian levels</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer style={{ background: '#001020' }} className="text-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/tz-coat-of-arms.png" alt="Tanzania Coat of Arms" className="h-8 w-8 object-contain"/>
                <span className="font-bold text-white">ExamHub <span style={{ color: 'var(--gold)' }}>TZ</span></span>
              </div>
              <p className="text-sm leading-relaxed">Tanzania's national digital exam preparation platform. UHURU NA UMOJA.</p>
            </div>
            {[
              { title: 'Platform', links: ['Papers Library', 'Take Exam', 'Daily Quiz', 'My Results', 'Schedule'] },
              { title: 'For Educators', links: ['Teacher Portal', 'Create Exams', 'Review Submissions', 'School Admin', 'Independent Teachers'] },
              { title: 'Levels', links: ['Standard 4 (SFNA)', 'Standard 7 (PSLE)', 'Form 2 (FTNA)', 'Form 4 (CSEE)', 'Form 6 (ACSEE)'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-white text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(l => <li key={l}><a href="#" className="text-sm hover:text-white transition-colors">{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>© 2026 ExamHub Tanzania. Built with ❤️ for Tanzanian students.</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-6 rounded-sm" style={{ background: '#1eb53a' }} />
              <div className="h-2 w-6 rounded-sm" style={{ background: '#fcd116' }} />
              <div className="h-2 w-6 rounded-sm" style={{ background: '#000' }} />
              <span className="ml-2">Tanzania 🇹🇿</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
