import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { signIn, signUp, resetPassword, createUserProfile, listSchools, submitVerificationRequest, createSchool } from '@/lib/api'
import { ROLE_LABEL, ADMIN_EMAIL, ADMIN_UID } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register' | 'forgot'
type RegStep = 'role' | 'details' | 'school' | 'done'

export function AuthPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) ?? 'login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [regStep, setRegStep] = useState<RegStep>('role')

  // Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('student')
  const [teacherType, setTeacherType] = useState('school')
  const [schoolId, setSchoolId] = useState('')
  const [newSchoolName, setNewSchoolName] = useState('')
  const [newSchoolRegion, setNewSchoolRegion] = useState('')
  const [message, setMessage] = useState('')
  const [schools, setSchools] = useState<{ id: string; name: string; region: string }[]>([])
  const [registeredName, setRegisteredName] = useState('')

  useEffect(() => {
    listSchools().then(s => setSchools((s ?? []) as { id: string; name: string; region: string }[])).catch(() => {})
  }, [])

  const needsVerification = role === 'teacher' || role === 'school_admin'
  const isStudent = role === 'student'

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
    try { await resetPassword(email); toast.success('Reset email sent — check your inbox'); setMode('login') }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  const handleRegister = async () => {
    if (!name || !email || !password) { toast.error('Name, email and password are required'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      // If registering a new school, create it first
      let finalSchoolId = schoolId
      if (role === 'school_admin' && !schoolId && newSchoolName) {
        const school = await createSchool({ name: newSchoolName, region: newSchoolRegion || 'Tanzania', plan: 'free' })
        finalSchoolId = school.id
      }

      // Create Supabase Auth user
      const authUser = await signUp(email, password, name, role)
      if (!authUser) throw new Error('Registration failed')

      // Special case: admin@tems.go.tz always gets super_admin
      const finalRole = (email === ADMIN_EMAIL || authUser.id === ADMIN_UID) ? 'super_admin' : role
      const verificationStatus = ['student','super_admin'].includes(finalRole) ? 'approved' : 'pending'

      // Create profile row
      await createUserProfile({
        id: authUser.id, name, email, role: finalRole,
        teacher_type: finalRole === 'teacher' ? teacherType : undefined,
        school_id: finalSchoolId || null,
      })

      // Submit verification request for teachers/school_admins
      if (needsVerification && finalRole !== 'super_admin') {
        await submitVerificationRequest({
          user_id: authUser.id, role: finalRole,
          school_name: newSchoolName || schools.find(s => s.id === finalSchoolId)?.name,
          school_id: finalSchoolId || undefined,
          message: message || undefined,
        })
      }

      setRegisteredName(name)
      setRegStep('done')
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Registration failed') }
    finally { setLoading(false) }
  }

  const REGIONS = ['Dar es Salaam','Mwanza','Arusha','Dodoma','Mbeya','Morogoro','Tanga','Zanzibar','Pwani','Lindi','Mara','Mtwara','Rukwa','Ruvuma','Shinyanga','Singida','Tabora','Kagera','Kigoma','Kilimanjaro','Iringa','Geita','Katavi','Njombe','Simiyu']

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #001f3f 0%, #003366 100%)' }}>
      {/* Left branding panel */}
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
          <p className="text-white/70 italic leading-relaxed mb-3">"ExamHub helped me improve from D to B in Mathematics. The per-question timers really work!"</p>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'var(--green)' }}>A</div>
            <div><p className="font-medium text-sm">Amina Hassan</p><p className="text-xs text-white/50">Form 4 · Dar es Salaam</p></div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="lg:hidden flex items-center gap-3 mb-8 text-white">
            <img src="/tz-coat-of-arms.png" alt="" className="h-8 w-8 object-contain"/>
            <span className="font-bold">ExamHub <span style={{ color: 'var(--gold)' }}>Tanzania</span></span>
          </div>

          <div className="rounded-2xl border border-white/10 p-8 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.07)' }}>

            {/* ── LOGIN ── */}
            {mode === 'login' && (
              <>
                <h2 className="text-xl font-bold text-white mb-6">Sign in to ExamHub</h2>
                <div className="space-y-4">
                  <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com"/>
                  <PasswordField value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(v=>!v)}/>
                  <button onClick={() => setMode('forgot')} className="text-xs text-white/50 hover:text-white float-right">Forgot password?</button>
                  <div className="clear-both"/>
                  <SubmitBtn loading={loading} onClick={handleLogin} label="Sign In"/>
                </div>
                <p className="text-center text-sm text-white/50 mt-6">No account? <button onClick={() => { setMode('register'); setRegStep('role') }} className="text-white hover:underline font-medium">Create one free</button></p>
              </>
            )}

            {/* ── FORGOT ── */}
            {mode === 'forgot' && (
              <>
                <button onClick={() => setMode('login')} className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6"><ArrowLeft className="h-4 w-4"/>Back</button>
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
                <div className="flex items-center gap-2 mb-6">
                  {regStep !== 'role' && (
                    <button onClick={() => setRegStep('role')} className="text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4"/></button>
                  )}
                  <h2 className="text-xl font-bold text-white">Create Account</h2>
                </div>

                {/* Step 1: Role selection */}
                {regStep === 'role' && (
                  <div className="space-y-4">
                    <p className="text-white/70 text-sm">I am a…</p>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { value: 'student',      label: '🎓 Student',      desc: 'Take exams, track my progress' },
                        { value: 'teacher',      label: '👩‍🏫 Teacher',     desc: 'Create exams, mark and review' },
                        { value: 'school_admin', label: '🏫 School',       desc: 'Register school, manage teachers' },
                      ].map(r => (
                        <button key={r.value} onClick={() => setRole(r.value)}
                          className={cn('flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                            role === r.value ? 'border-transparent text-white' : 'border-white/20 text-white/70 hover:border-white/40')}
                          style={role === r.value ? { background: 'var(--green)' } : {}}>
                          <div><div className="font-semibold text-sm">{r.label}</div><div className="text-xs opacity-80 mt-0.5">{r.desc}</div></div>
                        </button>
                      ))}
                    </div>
                    {needsVerification && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                        <Clock className="h-4 w-4 shrink-0 mt-0.5"/>
                        <span><strong>Verification required:</strong> {role === 'teacher' ? 'Teachers' : 'Schools'} must be verified by an admin before creating exams. You can browse content while waiting.</span>
                      </div>
                    )}
                    <button onClick={() => setRegStep('details')} className="w-full rounded-xl py-3 font-bold text-white transition-opacity hover:opacity-90" style={{ background: 'var(--navy)' }}>
                      Continue as {ROLE_LABEL[role] ?? role} →
                    </button>
                  </div>
                )}

                {/* Step 2: Account details */}
                {regStep === 'details' && (
                  <div className="space-y-4">
                    <Field label="Full Name *" value={name} onChange={setName} type="text" placeholder="e.g. Amina Hassan"/>
                    <Field label="Email *" value={email} onChange={setEmail} type="email" placeholder="you@example.com"/>
                    <PasswordField value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(v=>!v)}/>
                    {role === 'teacher' && (
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1.5">Teacher type</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[['school','🏫 School teacher'],['independent','🌐 Independent']].map(([v,l]) => (
                            <button key={v} onClick={() => setTeacherType(v)}
                              className={cn('rounded-xl border py-2.5 text-sm font-medium transition-all', teacherType===v?'border-transparent text-navy font-bold':'border-white/20 text-white/60 hover:text-white')}
                              style={teacherType===v?{background:'var(--gold)'}:{}}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {needsVerification && (
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1.5">Tell the admin about yourself</label>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none resize-none"
                          placeholder="Your school, experience, subjects you teach…"/>
                      </div>
                    )}
                    <button onClick={() => (role === 'school_admin' || (role === 'teacher' && teacherType === 'school')) ? setRegStep('school') : handleRegister()}
                      className="w-full rounded-xl py-3.5 font-bold text-white flex items-center justify-center gap-2" style={{ background: 'var(--green)' }}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : null}
                      {(role === 'school_admin' || (role === 'teacher' && teacherType === 'school')) ? 'Next: Select School →' : needsVerification ? 'Submit for Verification' : 'Create Account'}
                    </button>
                  </div>
                )}

                {/* Step 3: School selection */}
                {regStep === 'school' && (
                  <div className="space-y-4">
                    <p className="text-white/70 text-sm">{role === 'school_admin' ? 'Register your school or select an existing one:' : 'Which school do you teach at?'}</p>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1.5">Existing school</label>
                      <select value={schoolId} onChange={e => setSchoolId(e.target.value)}
                        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white text-sm focus:outline-none">
                        <option value="">— Select school —</option>
                        {schools.map(s => <option key={s.id} value={s.id} style={{ color: '#000' }}>{s.name} — {s.region}</option>)}
                      </select>
                    </div>
                    {role === 'school_admin' && !schoolId && (
                      <>
                        <div className="text-center text-white/40 text-xs">— OR register a new school —</div>
                        <Field label="School Name" value={newSchoolName} onChange={setNewSchoolName} type="text" placeholder="e.g. Nyerere Secondary School"/>
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-1.5">Region</label>
                          <select value={newSchoolRegion} onChange={e => setNewSchoolRegion(e.target.value)}
                            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white text-sm focus:outline-none">
                            <option value="">— Select region —</option>
                            {REGIONS.map(r => <option key={r} value={r} style={{ color: '#000' }}>{r}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                    <SubmitBtn loading={loading} onClick={handleRegister} label="Submit for Verification"/>
                  </div>
                )}
              </>
            )}

            {/* ── DONE (verification pending) ── */}
            {mode === 'register' && regStep === 'done' && (
              <div className="text-center space-y-4">
                {isStudent ? (
                  <>
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-500/20"><CheckCircle2 className="h-8 w-8 text-green-400"/></div>
                    <h2 className="text-xl font-bold text-white">Welcome, {registeredName}!</h2>
                    <p className="text-white/70 text-sm">Your account is ready. Start exploring past papers and exams.</p>
                    <button onClick={() => navigate('/dashboard')} className="w-full rounded-xl py-3 font-bold text-white" style={{ background: 'var(--green)' }}>Go to Dashboard</button>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-amber-500/20"><Clock className="h-8 w-8 text-amber-400"/></div>
                    <h2 className="text-xl font-bold text-white">Verification Pending</h2>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Thank you, <strong className="text-white">{registeredName}</strong>! Your {ROLE_LABEL[role]} account has been submitted for review.
                      An admin will verify your details. You'll receive an email when approved.
                    </p>
                    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200 text-left">
                      <p className="font-semibold mb-1">While you wait:</p>
                      <ul className="space-y-1 text-xs">
                        <li>✓ You can browse published papers and exams</li>
                        <li>✓ You can take exams as a student</li>
                        <li>⏳ Creating exams requires admin approval</li>
                      </ul>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="w-full rounded-xl py-3 font-bold text-white/80 border border-white/20 hover:bg-white/10">Continue to Dashboard</button>
                  </>
                )}
              </div>
            )}
          </div>
          {mode !== 'register' && (
            <p className="text-center text-white/30 text-xs mt-6">
              By continuing you agree to ExamHub Tanzania's Terms of Service.
            </p>
          )}
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
        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"/>
    </div>
  )
}
function PasswordField({ value, onChange, show, onToggle }: { value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-1.5">Password</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder="••••••••"
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
    <button onClick={onClick} disabled={loading} className="w-full rounded-xl py-3.5 font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90 mt-2" style={{ background: 'var(--green)' }}>
      {loading && <Loader2 className="h-4 w-4 animate-spin"/>}{label}
    </button>
  )
}
