import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { GraduationCap, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { signIn, signUp, resetPassword, createUserProfile, listSchools } from '@/lib/api'
import { ROLE_LABEL } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

type Mode = 'login' | 'register' | 'forgot'

export function AuthPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) ?? 'login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('student')
  const [teacherType, setTeacherType] = useState('school')
  const [schoolId, setSchoolId] = useState('')
  const [schools, setSchools] = useState<{ id: string; name: string; region: string }[]>([])

  useEffect(() => {
    listSchools().then(s => setSchools((s ?? []) as { id: string; name: string; region: string }[])).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (mode === 'forgot') {
        await resetPassword(email)
        toast.success('Password reset email sent — check your inbox')
        setMode('login')
        return
      }
      if (mode === 'register') {
        const user = await signUp(email, password, name, role)
        if (user) {
          await createUserProfile({
            id: user.id, name, email, role,
            teacher_type: role === 'teacher' ? teacherType : undefined,
            school_id: teacherType === 'school' && role !== 'super_admin' ? (schoolId || null) : null,
          })
          toast.success('Account created! Welcome to ExamHub Tanzania')
          navigate('/dashboard')
        }
      } else {
        await signIn(email, password)
        toast.success('Welcome back!')
        navigate('/dashboard')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #001f3f 0%, #003366 100%)' }}>
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white">
        <Link to="/" className="flex items-center gap-3">
          <img src="/tz-coat-of-arms.png" alt="Tanzania Coat of Arms" className="h-10 w-10 object-contain"/>
          <div>
            <div className="text-xl font-bold">ExamHub <span style={{ color: 'var(--gold)' }}>Tanzania</span></div>
            <div className="text-xs text-white/60">Mitihani · Maswali · Matokeo</div>
          </div>
        </Link>
        <div>
          <img src="/hero.png" alt="Students learning" className="w-full max-w-md mx-auto object-contain drop-shadow-2xl" style={{ maxHeight: '420px' }} />
        </div>
        <div>
          <blockquote className="text-white/70 text-lg italic leading-relaxed mb-4">
            "ExamHub helped me improve from a D to a B in Mathematics before my CSEE. The per-question timers really work!"
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold" style={{ background: 'var(--green)' }}>A</div>
            <div><p className="font-semibold text-sm">Amina Hassan</p><p className="text-xs text-white/50">Form 4 Student, Dar es Salaam</p></div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 text-white">
            <img src="/tz-coat-of-arms.png" alt="Tanzania Coat of Arms" className="h-8 w-8 object-contain"/>
            <span className="font-bold">ExamHub <span style={{ color: 'var(--gold)' }}>Tanzania</span></span>
          </div>

          <div className="rounded-2xl border border-white/10 p-8" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
            {/* Mode tabs */}
            {mode !== 'forgot' && (
              <div className="flex rounded-xl p-1 mb-8" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {(['login', 'register'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={cn('flex-1 py-2 text-sm font-semibold rounded-lg transition-all', mode === m ? 'bg-white text-navy shadow-sm' : 'text-white/60 hover:text-white')}>
                    {m === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>
            )}

            {mode === 'forgot' && (
              <div className="mb-6">
                <button onClick={() => setMode('login')} className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4">
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </button>
                <h2 className="text-xl font-bold text-white mb-1">Reset your password</h2>
                <p className="text-white/60 text-sm">We'll send a reset link to your email.</p>
              </div>
            )}

            <div className="space-y-4">
              {mode === 'register' && (
                <Field label="Full Name" value={name} onChange={setName} placeholder="e.g. Amina Hassan" type="text" />
              )}

              <Field label="Email address" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 pr-11"
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                    <button onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === 'login' && (
                    <button onClick={() => setMode('forgot')} className="text-xs text-white/50 hover:text-white mt-1 float-right">Forgot password?</button>
                  )}
                </div>
              )}

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1.5">I am a</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['student', 'teacher', 'school_admin', 'super_admin'].map(r => (
                        <button key={r} onClick={() => setRole(r)}
                          className={cn('rounded-xl border py-2.5 text-sm font-medium transition-all', role === r ? 'border-transparent text-white' : 'border-white/20 text-white/60 hover:text-white hover:border-white/40')}
                          style={role === r ? { background: 'var(--green)' } : {}}>
                          {ROLE_LABEL[r]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {role === 'teacher' && (
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1.5">Teacher type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[['school', '🏫 School teacher'], ['independent', '🌐 Independent']].map(([v, l]) => (
                          <button key={v} onClick={() => setTeacherType(v)}
                            className={cn('rounded-xl border py-2.5 text-sm font-medium transition-all', teacherType === v ? 'border-transparent text-navy' : 'border-white/20 text-white/60 hover:text-white')}
                            style={teacherType === v ? { background: 'var(--gold)' } : {}}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(role === 'teacher' && teacherType === 'school') || role === 'school_admin' ? (
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1.5">School</label>
                      <select value={schoolId} onChange={e => setSchoolId(e.target.value)}
                        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30">
                        <option value="">— Select school (optional) —</option>
                        {schools.map(s => <option key={s.id} value={s.id} style={{ color: '#000' }}>{s.name} — {s.region}</option>)}
                      </select>
                    </div>
                  ) : null}
                </>
              )}

              <button onClick={handleSubmit} disabled={loading}
                className="w-full rounded-xl py-3.5 text-base font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                style={{ background: 'var(--green)' }}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
              </button>
            </div>

            {mode === 'login' && (
              <p className="text-center text-sm text-white/50 mt-6">
                Don't have an account?{' '}
                <button onClick={() => setMode('register')} className="text-white hover:underline font-medium">Create one free</button>
              </p>
            )}
          </div>

          <p className="text-center text-white/30 text-xs mt-6">
            By continuing you agree to ExamHub Tanzania's Terms of Service.
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
    </div>
  )
}
