import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, Clock } from 'lucide-react'
import { signIn, signUp, resetPassword, createUserProfile, submitVerificationRequest } from '@/lib/api'
import { ROLE_LABEL, ADMIN_EMAIL, ADMIN_UID } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register' | 'forgot'
type RegStep = 'role' | 'details' | 'done'

export function AuthPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) ?? 'login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [regStep, setRegStep] = useState<RegStep>('role')

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [role, setRole]         = useState('student')
  const [message, setMessage]   = useState('')
  const [registeredName, setRegisteredName] = useState('')

  const isTeacher = role === 'teacher'

  const handleLogin = async () => {
    if (!email || !password) { toast.error('Enter email and password'); return }
    setLoading(true)
    try {
      await signIn(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Login failed') }
    finally { setLoading(false) }
  }

  const handleForgot = async () => {
    if (!email) { toast.error('Enter your email address'); return }
    setLoading(true)
    try {
      await resetPassword(email)
      toast.success('Reset email sent — check your inbox')
      setMode('login')
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  const handleRegister = async () => {
    if (!name || !email || !password) { toast.error('Name, email and password are required'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const authUser = await signUp(email, password, name, role)
      if (!authUser) throw new Error('Registration failed')

      // admin@tems.go.tz always gets super_admin
      const finalRole = (email === ADMIN_EMAIL || authUser.id === ADMIN_UID)
        ? 'super_admin' : role

      await createUserProfile({
        id: authUser.id, name, email, role: finalRole,
      })

      // Teachers need admin approval
      if (finalRole === 'teacher') {
        await submitVerificationRequest({
          user_id: authUser.id, role: finalRole,
          message: message || undefined,
        })
      }

      setRegisteredName(name)
      setRegStep('done')
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Registration failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #001f3f 0%, #003366 100%)' }}>
      {/* Left branding */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-12 text-white">
        <Link to="/" className="flex items-center gap-3">
          <img src="/tz-coat-of-arms.png" alt="" className="h-10 w-10 object-contain"/>
          <div>
            <div className="text-xl font-bold">ExamHub <span style={{ color: 'var(--gold)' }}>Tanzania</span></div>
            <div className="text-xs text-white/60">Mitihani · Maswali · Matokeo</div>
          </div>
        </Link>
        <img src="/hero.png" alt="" className="w-full max-w-sm mx-auto object-contain" style={{ maxHeight: '380px' }}/>
        <div>
          <p className="text-white/70 italic leading-relaxed mb-3">
            "ExamHub helped me improve from D to B in Mathematics. The per-question timers really work!"
          </p>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'var(--green)' }}>A</div>
            <div><p className="font-medium text-sm">Amina Hassan</p><p className="text-xs text-white/50">Form 4 · Dar es Salaam</p></div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 text-white">
            <img src="/tz-coat-of-arms.png" alt="" className="h-8 w-8 object-contain"/>
            <span className="font-bold">ExamHub <span style={{ color: 'var(--gold)' }}>Tanzania</span></span>
          </div>

          <div className="rounded-2xl border border-white/10 p-8 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.07)' }}>

            {/* ── LOGIN ── */}
            {mode === 'login' && (
              <>
                <div className="flex rounded-xl p-1 mb-8" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setMode('login')} className="flex-1 py-2 text-sm font-semibold rounded-lg bg-white text-navy shadow-sm">Sign In</button>
                  <button onClick={() => { setMode('register'); setRegStep('role') }} className="flex-1 py-2 text-sm font-semibold rounded-lg text-white/60 hover:text-white">Create Account</button>
                </div>
                <div className="space-y-4">
                  <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com"/>
                  <PasswordField value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(v=>!v)}/>
                  <button onClick={() => setMode('forgot')} className="text-xs text-white/50 hover:text-white float-right">Forgot password?</button>
                  <div className="clear-both"/>
                  <SubmitBtn loading={loading} onClick={handleLogin} label="Sign In"/>
                </div>
              </>
            )}

            {/* ── FORGOT ── */}
            {mode === 'forgot' && (
              <>
                <button onClick={() => setMode('login')} className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6">
                  <ArrowLeft className="h-4 w-4"/>Back
                </button>
                <h2 className="text-xl font-bold text-white mb-2">Reset password</h2>
                <p className="text-white/60 text-sm mb-6">We'll send a reset link to your email.</p>
                <div className="space-y-4">
                  <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com"/>
                  <SubmitBtn loading={loading} onClick={handleForgot} label="Send Reset Link"/>
                </div>
              </>
            )}

            {/* ── REGISTER ── */}
            {mode === 'register' && regStep !== 'done' && (
              <>
                <div className="flex rounded-xl p-1 mb-8" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setMode('login')} className="flex-1 py-2 text-sm font-semibold rounded-lg text-white/60 hover:text-white">Sign In</button>
                  <button className="flex-1 py-2 text-sm font-semibold rounded-lg bg-white text-navy shadow-sm">Create Account</button>
                </div>

                {/* Step 1 — Role */}
                {regStep === 'role' && (
                  <div className="space-y-4">
                    <p className="text-white/80 text-sm font-medium">I am a…</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'student', label: '🎓 Student', desc: 'Take exams, track my results' },
                        { value: 'teacher', label: '👩‍🏫 Teacher', desc: 'Create exams, mark submissions' },
                      ].map(r => (
                        <button key={r.value} onClick={() => setRole(r.value)}
                          className={cn(
                            'flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all',
                            role === r.value ? 'border-transparent text-white' : 'border-white/20 text-white/70 hover:border-white/40'
                          )}
                          style={role === r.value ? { background: 'var(--green)' } : {}}>
                          <span className="font-semibold text-sm">{r.label}</span>
                          <span className="text-xs opacity-80">{r.desc}</span>
                        </button>
                      ))}
                    </div>

                    {isTeacher && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                        <Clock className="h-4 w-4 shrink-0 mt-0.5"/>
                        <span>
                          <strong>Verification required:</strong> Teachers need admin approval before creating exams.
                          You can browse content and update your profile while waiting.
                        </span>
                      </div>
                    )}

                    <button onClick={() => setRegStep('details')}
                      className="w-full rounded-xl py-3 font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: 'var(--navy)' }}>
                      Continue as {ROLE_LABEL[role] ?? role} →
                    </button>
                  </div>
                )}

                {/* Step 2 — Details */}
                {regStep === 'details' && (
                  <div className="space-y-4">
                    <button onClick={() => setRegStep('role')} className="flex items-center gap-2 text-white/60 hover:text-white text-sm">
                      <ArrowLeft className="h-4 w-4"/>Back
                    </button>
                    <Field label="Full Name *" value={name} onChange={setName} type="text" placeholder="e.g. Amina Hassan"/>
                    <Field label="Email *" value={email} onChange={setEmail} type="email" placeholder="you@example.com"/>
                    <PasswordField value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(v=>!v)}/>

                    {isTeacher && (
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1.5">
                          Tell the admin about yourself <span className="text-white/40">(optional)</span>
                        </label>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none resize-none"
                          placeholder="Your subjects, experience, school you teach at…"/>
                      </div>
                    )}

                    <SubmitBtn loading={loading} onClick={handleRegister}
                      label={isTeacher ? 'Submit for Verification' : 'Create Account'}/>
                  </div>
                )}
              </>
            )}

            {/* ── DONE ── */}
            {mode === 'register' && regStep === 'done' && (
              <div className="text-center space-y-4">
                {role === 'student' ? (
                  <>
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-500/20">
                      <CheckCircle2 className="h-8 w-8 text-green-400"/>
                    </div>
                    <h2 className="text-xl font-bold text-white">Welcome, {registeredName}!</h2>
                    <p className="text-white/70 text-sm">Your account is ready. Start exploring past papers and exams.</p>
                    <button onClick={() => navigate('/dashboard')}
                      className="w-full rounded-xl py-3 font-bold text-white"
                      style={{ background: 'var(--green)' }}>
                      Go to Dashboard
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-amber-500/20">
                      <Clock className="h-8 w-8 text-amber-400"/>
                    </div>
                    <h2 className="text-xl font-bold text-white">Verification Pending</h2>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Thank you, <strong className="text-white">{registeredName}</strong>! Your teacher account has been submitted for review. An admin will approve it shortly.
                    </p>
                    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200 text-left">
                      <p className="font-semibold mb-2">While you wait:</p>
                      <ul className="space-y-1 text-xs">
                        <li>✓ Browse published papers and exams</li>
                        <li>✓ Update your profile and add your school</li>
                        <li>⏳ Creating exams requires admin approval</li>
                      </ul>
                    </div>
                    <button onClick={() => navigate('/dashboard')}
                      className="w-full rounded-xl py-3 font-bold text-white/80 border border-white/20 hover:bg-white/10">
                      Continue to Dashboard
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Reusable field components ───────────────────────────────
function Field({ label, value, onChange, placeholder, type }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"/>
    </div>
  )
}

function PasswordField({ value, onChange, show, onToggle }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-1.5">Password</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 pr-11"/>
        <button onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
          {show ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
        </button>
      </div>
    </div>
  )
}

function SubmitBtn({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full rounded-xl py-3.5 font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90 mt-2"
      style={{ background: 'var(--green)' }}>
      {loading && <Loader2 className="h-4 w-4 animate-spin"/>}{label}
    </button>
  )
}
