import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, Clock, ChevronDown } from 'lucide-react'
import { signIn, signUp, resetPassword, createUserProfile, submitVerificationRequest } from '@/lib/api'
import { ROLE_LABEL, ADMIN_EMAIL, ADMIN_UID, SUBJECTS, LEVELS, TZ_REGIONS, TZ_REGIONS_DISTRICTS } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register' | 'forgot'
type RegStep = 'role' | 'details' | 'teacher-info' | 'done'

// multi-select pill component
function PillSelect({ options, selected, onChange, max }: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  max?: number
}) {
  const toggle = (v: string) => {
    if (selected.includes(v)) { onChange(selected.filter(x => x !== v)); return }
    if (max && selected.length >= max) { toast.error(`Max ${max} selections`); return }
    onChange([...selected, v])
  }
  return (
    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium border transition-colors',
            selected.includes(o)
              ? 'border-transparent text-white'
              : 'border-white/20 text-white/60 hover:border-white/50 hover:text-white'
          )}
          style={selected.includes(o) ? { background: 'var(--green)' } : {}}>
          {o}
        </button>
      ))}
    </div>
  )
}

// native dropdown styled for dark bg
function DarkSelect({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  options: string[]; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30 pr-10">
          {placeholder && <option value="" style={{ color: '#333' }}>{placeholder}</option>}
          {options.map(o => <option key={o} value={o} style={{ color: '#333' }}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none"/>
      </div>
    </div>
  )
}

export function AuthPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) ?? 'login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [regStep, setRegStep] = useState<RegStep>('role')

  // common
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [role, setRole]         = useState('student')

  // teacher info
  const [phone, setPhone]               = useState('')
  const [schoolName, setSchoolName]     = useState('')
  const [region, setRegion]             = useState('')
  const [district, setDistrict]         = useState('')
  const [teachingLevels, setTeachingLevels] = useState<string[]>([])
  const [subjectsTaught, setSubjectsTaught] = useState<string[]>([])
  const [message, setMessage]           = useState('')

  const [registeredName, setRegisteredName] = useState('')

  const districts = region ? (TZ_REGIONS_DISTRICTS[region] ?? []) : []
  const levelOptions = LEVELS.map(l => l.label)

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
    if (role === 'teacher') {
      if (!phone) { toast.error('Mobile number is required'); return }
      if (!region) { toast.error('Please select your region'); return }
      if (teachingLevels.length === 0) { toast.error('Select at least one teaching level'); return }
      if (subjectsTaught.length === 0) { toast.error('Select at least one subject'); return }
    }
    setLoading(true)
    try {
      const authUser = await signUp(email, password, name, role)
      if (!authUser) throw new Error('Registration failed')

      const finalRole = (email === ADMIN_EMAIL || authUser.id === ADMIN_UID) ? 'super_admin' : role

      await createUserProfile({
        id: authUser.id, name, email, role: finalRole,
        phone: phone || null,
        school_name: schoolName || null,
        region: region || null,
        district: district || null,
        teaching_levels: teachingLevels.length ? JSON.stringify(teachingLevels) : null,
        subjects_taught: subjectsTaught.length ? JSON.stringify(subjectsTaught) : null,
      } as Parameters<typeof createUserProfile>[0])

      if (finalRole === 'teacher') {
        await submitVerificationRequest({
          user_id: authUser.id,
          role: finalRole,
          school_name: schoolName || undefined,
          message: [
            region && `Region: ${region}${district ? `, ${district}` : ''}`,
            phone && `Phone: ${phone}`,
            teachingLevels.length && `Levels: ${teachingLevels.join(', ')}`,
            subjectsTaught.length && `Subjects: ${subjectsTaught.join(', ')}`,
            message,
          ].filter(Boolean).join(' | ') || undefined,
        })
      }

      setRegisteredName(name)
      setRegStep('done')
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Registration failed') }
    finally { setLoading(false) }
  }

  const switchToLogin = () => { setMode('login'); setRegStep('role') }
  const switchToRegister = () => { setMode('register'); setRegStep('role') }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #001f3f 0%, #003366 100%)' }}>

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-12 text-white">
        <Link to="/" className="flex items-center gap-3">
          <img src="/tz-coat-of-arms.png" alt="" className="h-10 w-10 object-contain"/>
          <div>
            <div className="text-xl font-bold">ExamHub <span style={{ color: 'var(--gold)' }}>Tanzania</span></div>
            <div className="text-xs text-white/60">Mitihani · Maswali · Matokeo</div>
          </div>
        </Link>
        <img src="/hero.png" alt="" className="w-full max-w-sm mx-auto object-contain" style={{ maxHeight: '360px' }}/>
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

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-lg py-6">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6 text-white">
            <img src="/tz-coat-of-arms.png" alt="" className="h-8 w-8 object-contain"/>
            <span className="font-bold">ExamHub <span style={{ color: 'var(--gold)' }}>Tanzania</span></span>
          </div>

          <div className="rounded-2xl border border-white/10 p-6 sm:p-8 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.07)' }}>

            {/* ──────────── LOGIN ──────────── */}
            {mode === 'login' && (
              <>
                <Tabs active="login" onSwitch={t => t === 'login' ? switchToLogin() : switchToRegister()}/>
                <div className="space-y-4 mt-6">
                  <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com"/>
                  <PasswordField value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(v=>!v)}/>
                  <button onClick={() => setMode('forgot')} className="text-xs text-white/50 hover:text-white float-right">Forgot password?</button>
                  <div className="clear-both"/>
                  <SubmitBtn loading={loading} onClick={handleLogin} label="Sign In"/>
                </div>
              </>
            )}

            {/* ──────────── FORGOT ──────────── */}
            {mode === 'forgot' && (
              <>
                <button onClick={switchToLogin} className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6">
                  <ArrowLeft className="h-4 w-4"/>Back to sign in
                </button>
                <h2 className="text-xl font-bold text-white mb-1">Reset password</h2>
                <p className="text-white/60 text-sm mb-5">We'll send a reset link to your email.</p>
                <div className="space-y-4">
                  <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com"/>
                  <SubmitBtn loading={loading} onClick={handleForgot} label="Send Reset Link"/>
                </div>
              </>
            )}

            {/* ──────────── REGISTER ──────────── */}
            {mode === 'register' && regStep !== 'done' && (
              <>
                <Tabs active="register" onSwitch={t => t === 'login' ? switchToLogin() : switchToRegister()}/>

                {/* Step indicator for teacher */}
                {role === 'teacher' && regStep !== 'role' && (
                  <div className="flex items-center gap-2 mt-5 mb-4">
                    {(['details','teacher-info'] as RegStep[]).map((s, i) => (
                      <div key={s} className="flex items-center gap-2">
                        <div className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                          regStep === s ? 'text-white' : 'bg-white/10 text-white/40'
                        )} style={regStep === s ? { background: 'var(--green)' } : {}}>
                          {i + 1}
                        </div>
                        <span className={cn('text-xs', regStep === s ? 'text-white font-medium' : 'text-white/40')}>
                          {s === 'details' ? 'Account' : 'Teacher Info'}
                        </span>
                        {i === 0 && <div className="h-px w-6 bg-white/20"/>}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── STEP 1: Role ── */}
                {regStep === 'role' && (
                  <div className="space-y-4 mt-6">
                    <p className="text-white/80 text-sm font-medium">I am a…</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'student', label: '🎓 Student',  desc: 'Take exams, track my results' },
                        { value: 'teacher', label: '👩‍🏫 Teacher', desc: 'Create exams, mark submissions' },
                      ].map(r => (
                        <button key={r.value} type="button" onClick={() => setRole(r.value)}
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
                    {role === 'teacher' && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                        <Clock className="h-4 w-4 shrink-0 mt-0.5"/>
                        <span><strong>Verification required:</strong> Admins will review your profile before you can create exams. You can browse content while waiting.</span>
                      </div>
                    )}
                    <button type="button" onClick={() => setRegStep('details')}
                      className="w-full rounded-xl py-3 font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: 'var(--navy)' }}>
                      Continue as {ROLE_LABEL[role] ?? role} →
                    </button>
                  </div>
                )}

                {/* ── STEP 2: Account details ── */}
                {regStep === 'details' && (
                  <div className="space-y-4 mt-4">
                    <BackBtn onClick={() => setRegStep('role')}/>
                    <Field label="Full Name *" value={name} onChange={setName} type="text" placeholder="e.g. Joseph Komba"/>
                    <Field label="Email *" value={email} onChange={setEmail} type="email" placeholder="you@example.com"/>
                    <PasswordField value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(v=>!v)}/>
                    <SubmitBtn loading={false} onClick={() => {
                      if (!name || !email || !password) { toast.error('Fill in all fields'); return }
                      if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
                      role === 'teacher' ? setRegStep('teacher-info') : handleRegister()
                    }} label={role === 'teacher' ? 'Next: Teaching Details →' : 'Create Account'}/>
                  </div>
                )}

                {/* ── STEP 3: Teacher info ── */}
                {regStep === 'teacher-info' && (
                  <div className="space-y-4 mt-4">
                    <BackBtn onClick={() => setRegStep('details')}/>

                    {/* Phone */}
                    <Field label="Mobile Number *" value={phone} onChange={setPhone} type="tel" placeholder="+255 7XX XXX XXX"/>

                    {/* School name */}
                    <Field label="School Name" value={schoolName} onChange={setSchoolName} type="text" placeholder="e.g. Nyerere Secondary School"/>

                    {/* Region */}
                    <DarkSelect label="Region *" value={region} onChange={v => { setRegion(v); setDistrict('') }}
                      options={TZ_REGIONS} placeholder="— Select region —"/>

                    {/* District — only shown after region selected */}
                    {region && districts.length > 0 && (
                      <DarkSelect label="District" value={district} onChange={setDistrict}
                        options={districts} placeholder="— Select district —"/>
                    )}

                    {/* Teaching levels */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Levels of Teaching * <span className="text-white/40 text-xs">(select all that apply)</span>
                      </label>
                      <PillSelect options={levelOptions} selected={teachingLevels} onChange={setTeachingLevels}/>
                      {teachingLevels.length > 0 && (
                        <p className="text-xs text-white/50 mt-1">{teachingLevels.length} selected</p>
                      )}
                    </div>

                    {/* Subjects */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Subjects You Teach * <span className="text-white/40 text-xs">(select all that apply)</span>
                      </label>
                      <PillSelect options={SUBJECTS} selected={subjectsTaught} onChange={setSubjectsTaught}/>
                      {subjectsTaught.length > 0 && (
                        <p className="text-xs text-white/50 mt-1">{subjectsTaught.length} selected: {subjectsTaught.join(', ')}</p>
                      )}
                    </div>

                    {/* Additional message */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1.5">
                        Additional message <span className="text-white/40 text-xs">(optional)</span>
                      </label>
                      <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none resize-none"
                        placeholder="Years of experience, qualifications, etc."/>
                    </div>

                    <SubmitBtn loading={loading} onClick={handleRegister} label="Submit for Verification"/>
                  </div>
                )}
              </>
            )}

            {/* ──────────── DONE ──────────── */}
            {mode === 'register' && regStep === 'done' && (
              <div className="text-center space-y-5 py-2">
                {role === 'student' ? (
                  <>
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-500/20">
                      <CheckCircle2 className="h-8 w-8 text-green-400"/>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Welcome, {registeredName}!</h2>
                      <p className="text-white/70 text-sm mt-1">Your account is ready. Start exploring.</p>
                    </div>
                    <button onClick={() => navigate('/dashboard')}
                      className="w-full rounded-xl py-3.5 font-bold text-white"
                      style={{ background: 'var(--green)' }}>
                      Go to Dashboard
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-amber-500/20">
                      <Clock className="h-8 w-8 text-amber-400"/>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Application Submitted!</h2>
                      <p className="text-white/70 text-sm mt-1 leading-relaxed">
                        Thank you, <strong className="text-white">{registeredName}</strong>!
                        Your teacher profile has been sent for review.
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200 text-left space-y-1.5">
                      <p className="font-semibold">While waiting for approval:</p>
                      <p className="text-xs">✓ Browse published past papers and exams</p>
                      <p className="text-xs">✓ Update your profile with more details</p>
                      <p className="text-xs">⏳ Creating & publishing exams requires admin approval</p>
                    </div>
                    <button onClick={() => navigate('/dashboard')}
                      className="w-full rounded-xl py-3 font-semibold text-white/80 border border-white/20 hover:bg-white/10 transition-colors">
                      Continue to Dashboard
                    </button>
                  </>
                )}
              </div>
            )}

          </div>

          {mode !== 'register' && (
            <p className="text-center text-white/30 text-xs mt-4">
              ExamHub Tanzania · Proudly serving Tanzanian students
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Shared UI helpers ────────────────────────────────────────
function Tabs({ active, onSwitch }: { active: 'login' | 'register'; onSwitch: (t: 'login' | 'register') => void }) {
  return (
    <div className="flex rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
      {(['login','register'] as const).map(t => (
        <button key={t} type="button" onClick={() => onSwitch(t)}
          className={cn('flex-1 py-2 text-sm font-semibold rounded-lg transition-all',
            active === t ? 'bg-white shadow-sm' : 'text-white/60 hover:text-white'
          )}
          style={active === t ? { color: 'var(--navy)' } : {}}>
          {t === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      ))}
    </div>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm">
      <ArrowLeft className="h-4 w-4"/>Back
    </button>
  )
}

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
          placeholder="Min. 6 characters"
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 pr-11"/>
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
          {show ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
        </button>
      </div>
    </div>
  )
}

function SubmitBtn({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="w-full rounded-xl py-3.5 font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90"
      style={{ background: 'var(--green)' }}>
      {loading && <Loader2 className="h-4 w-4 animate-spin"/>}{label}
    </button>
  )
}
