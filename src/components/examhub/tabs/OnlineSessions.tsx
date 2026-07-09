import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Video, Plus, Loader2, Users, Clock, Star, CheckCircle2, Lock,
  ExternalLink, Trash2, Edit2, Send, Phone, CreditCard, X,
  Wifi, PlayCircle, Mic, MicOff, MessageSquare, Globe, ArrowLeft,
  BadgeCheck, Zap,
} from 'lucide-react'
import {
  Button, Badge, Card, CardContent, CardHeader, CardTitle, Input,
  Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger,
  SelectValue, Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/index'
import {
  listOnlineSessions, createOnlineSession, updateOnlineSession,
  deleteOnlineSession, enrollInSession, listSessionMessages,
  sendSessionMessage, initiatePayment, confirmPayment, rateTeacher,
  subscribeToSessionMessages, listSessionEnrollments,
  type OnlineSession, type SessionMessage,
} from '@/lib/api'
import { LEVELS, SUBJECTS, levelLabel, type User } from '@/lib/types'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const NETWORKS = [
  { value: 'mpesa',    label: 'M-Pesa',    color: 'bg-red-600'    },
  { value: 'tigopesa', label: 'Tigo Pesa', color: 'bg-blue-600'   },
  { value: 'airtel',   label: 'Airtel',    color: 'bg-red-500'    },
  { value: 'halopesa', label: 'HaloPesa',  color: 'bg-orange-500' },
]

function fmtTZS(n: number) { return `TZS ${n.toLocaleString()}` }
function fmtTime(ts: string) { return new Date(ts).toLocaleString('en-TZ', { dateStyle:'medium', timeStyle:'short' }) }
function timeAgo(ts: string) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000
  if (d < 60) return 'just now'; if (d < 3600) return `${Math.floor(d/60)}m ago`
  if (d < 86400) return `${Math.floor(d/3600)}h ago`; return `${Math.floor(d/86400)}d ago`
}
function Avatar({ user, size=8 }: { user?: User | null; size?: number }) {
  const bg = user?.role === 'teacher' ? 'var(--gold)' : user?.role === 'super_admin' ? 'var(--navy)' : 'var(--green)'
  return <div className={`h-${size} w-${size} shrink-0 flex items-center justify-center rounded-full text-white text-xs font-bold`} style={{ background: bg, minWidth:`${size*4}px`, minHeight:`${size*4}px` }}>{(user?.name??'?')[0].toUpperCase()}</div>
}

// ═══ STUDENT: Browse & Join Sessions ═══════════════════════
export function OnlineSessions({ user }: { user: User }) {
  const [sessions, setSessions]   = useState<OnlineSession[]>([])
  const [loading, setLoading]     = useState(true)
  const [subject, setSubject]     = useState('all')
  const [level, setLevel]         = useState('all')
  const [active, setActive]       = useState<OnlineSession | null>(null)
  const [payDialog, setPayDialog] = useState<OnlineSession | null>(null)
  const isTeacher = user.role === 'teacher' || user.role === 'super_admin'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p: Record<string,string> = {}
      if (subject !== 'all') p.subject = subject
      if (level !== 'all') p.level = level
      setSessions(await listOnlineSessions(p))
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [subject, level])

  useEffect(() => { load() }, [load])

  if (active) return (
    <SessionRoom session={active} user={user} onLeave={() => { setActive(null); load() }}/>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Video className="h-6 w-6 text-primary"/> Live Online Sessions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Join live classes, private tutoring and group sessions with qualified teachers.
          </p>
        </div>
        {isTeacher && (
          <Button onClick={() => useStore.getState().setTab('my-sessions')} style={{ background: 'var(--navy)' }}>
            <Plus className="mr-2 h-4 w-4"/> Manage My Sessions
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger><SelectValue placeholder="All subjects"/></SelectTrigger>
          <SelectContent><SelectItem value="all">All subjects</SelectItem>{SUBJECTS.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger><SelectValue placeholder="All levels"/></SelectTrigger>
          <SelectContent><SelectItem value="all">All levels</SelectItem>{LEVELS.map(l=><SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading sessions…
        </div>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Video className="h-10 w-10 text-muted-foreground"/>
          <p className="font-medium">No sessions available right now</p>
          <p className="text-sm text-muted-foreground">Check back soon — teachers post new sessions regularly.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sessions.map(s => (
            <SessionCard key={s.id} session={s} user={user}
              onJoin={() => setActive(s)}
              onPay={() => setPayDialog(s)}
              onEnroll={async () => { await enrollInSession(s.id); load(); toast.success('Enrolled!') }}/>
          ))}
        </div>
      )}

      {/* Payment Dialog */}
      {payDialog && (
        <PaymentDialog session={payDialog} user={user}
          onClose={() => setPayDialog(null)}
          onPaid={() => { setPayDialog(null); load(); }}/>
      )}
    </div>
  )
}

function SessionCard({ session: s, user, onJoin, onPay, onEnroll }: {
  session: OnlineSession; user: User
  onJoin: () => void; onPay: () => void; onEnroll: () => void
}) {
  const isLive = s.status === 'live'
  const isFull = s.enrolled_count >= s.max_students
  const teacher = s.teacher as User | undefined

  return (
    <Card className={cn('overflow-hidden hover:shadow-md transition-shadow', isLive && 'ring-2 ring-red-400')}>
      {isLive && (
        <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse"/> LIVE NOW
        </div>
      )}
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base leading-snug">{s.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{s.subject} · {levelLabel(s.level)}</p>
          </div>
          <div className="shrink-0 text-right">
            {s.is_free ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-green-100 text-green-700">
                <Globe className="h-3 w-3"/> FREE
              </span>
            ) : (
              <div>
                <div className="text-base font-black" style={{ color: 'var(--navy)' }}>{fmtTZS(s.price_tzs)}</div>
                <div className="text-xs text-muted-foreground">/session</div>
              </div>
            )}
          </div>
        </div>

        {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}

        {/* Teacher */}
        <div className="flex items-center gap-2">
          <Avatar user={teacher} size={7}/>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              {teacher?.name}
              <BadgeCheck className="h-3.5 w-3.5 text-blue-500"/>
            </div>
            {(teacher?.rating ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-500">
                {Array.from({length:5}).map((_,i)=><Star key={i} className={cn('h-3 w-3', i < Math.round(teacher?.rating??0) ? 'fill-amber-400':'fill-gray-200')}/>)}
                <span className="text-muted-foreground ml-1">{teacher?.rating}</span>
              </div>
            )}
          </div>
          <Badge variant="outline" className="ml-auto text-xs capitalize">{s.session_type}</Badge>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{isLive ? 'Happening now' : fmtTime(s.scheduled_at)}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{s.duration_mins} min</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3"/>{s.enrolled_count}/{s.max_students}</span>
        </div>

        {/* CTA */}
        <div className="flex gap-2 pt-1">
          {s.is_enrolled ? (
            <Button className="flex-1" onClick={onJoin} style={{ background: isLive ? '#ef4444' : 'var(--navy)' }}>
              {isLive ? <><Wifi className="mr-2 h-4 w-4"/>Join Live Room</> : <><PlayCircle className="mr-2 h-4 w-4"/>Enter Room</>}
            </Button>
          ) : isFull ? (
            <Button className="flex-1" disabled variant="outline">Session Full</Button>
          ) : s.is_free ? (
            <Button className="flex-1" onClick={onEnroll} style={{ background: 'var(--green)' }}>
              <CheckCircle2 className="mr-2 h-4 w-4"/> Enroll Free
            </Button>
          ) : (
            <Button className="flex-1" onClick={onPay} style={{ background: 'var(--gold)', color: '#000' }}>
              <CreditCard className="mr-2 h-4 w-4"/> Pay & Enroll
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ═══ PAYMENT DIALOG ════════════════════════════════════════
function PaymentDialog({ session, user: _user, onClose, onPaid }: {
  session: OnlineSession; user: User; onClose: () => void; onPaid: () => void
}) {
  const [phone, setPhone]         = useState('')
  const [network, setNetwork]     = useState('mpesa')
  const [step, setStep]           = useState<'form'|'confirm'|'done'>('form')
  const [paymentId, setPaymentId] = useState('')
  const [loading, setLoading]     = useState(false)

  const initiate = async () => {
    if (!phone.trim()) { toast.error('Enter your mobile number'); return }
    setLoading(true)
    try {
      const pay = await initiatePayment({ session_id: session.id, phone_number: phone, network, amount_tzs: session.price_tzs })
      setPaymentId(pay.id); setStep('confirm')
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  const confirm = async () => {
    setLoading(true)
    try {
      await confirmPayment(paymentId)
      setStep('done')
      toast.success('Payment confirmed! You are enrolled.')
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  const net = NETWORKS.find(n => n.value === network)!

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary"/> Pay via Lipa Namba
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="font-semibold text-sm">{session.title}</p>
              <p className="text-xs text-muted-foreground">{session.subject} · {levelLabel(session.level)}</p>
              <p className="text-xl font-black mt-1" style={{ color: 'var(--navy)' }}>{fmtTZS(session.price_tzs)}</p>
            </div>

            <div>
              <Label>Mobile Network</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {NETWORKS.map(n => (
                  <button key={n.value} onClick={() => setNetwork(n.value)}
                    className={cn('rounded-xl border py-2.5 text-sm font-bold transition-all', network===n.value ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:border-border/70')}
                    style={network===n.value ? { background: n.value==='mpesa'?'#16a34a':n.value==='tigopesa'?'#2563eb':'#dc2626' } : {}}>
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Phone Number</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+255 7XX XXX XXX" className="pl-9"/>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold mb-1">Lipa Namba: <span className="text-lg font-black">123456</span></p>
              <p>You will receive a prompt on your phone to confirm payment of <strong>{fmtTZS(session.price_tzs)}</strong>.</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={initiate} disabled={loading} className="flex-1" style={{ background: 'var(--green)' }}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>} Send Request
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-amber-100">
              <Phone className="h-8 w-8 text-amber-600"/>
            </div>
            <div>
              <p className="font-bold">Check your phone!</p>
              <p className="text-sm text-muted-foreground mt-1">
                A payment prompt of <strong>{fmtTZS(session.price_tzs)}</strong> has been sent to <strong>{phone}</strong> via {net.label}.
              </p>
              <p className="text-sm text-muted-foreground mt-1">Enter your PIN on your phone, then click <strong>I've Paid</strong>.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('form')} className="flex-1">Back</Button>
              <Button onClick={confirm} disabled={loading} className="flex-1" style={{ background: 'var(--green)' }}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>} I've Paid
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600"/>
            </div>
            <div>
              <p className="font-bold text-lg">Payment Confirmed!</p>
              <p className="text-sm text-muted-foreground mt-1">You are now enrolled in <strong>{session.title}</strong>.</p>
            </div>
            <Button onClick={onPaid} className="w-full" style={{ background: 'var(--green)' }}>
              <PlayCircle className="mr-2 h-4 w-4"/> Enter Session Room
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ═══ SESSION ROOM (Live class with chat) ═══════════════════
function SessionRoom({ session, user, onLeave }: {
  session: OnlineSession; user: User; onLeave: () => void
}) {
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [body, setBody]         = useState('')
  const [sending, setSending]   = useState(false)
  const [students, setStudents] = useState<Record<string,unknown>[]>([])
  const [showStudents, setShowStudents] = useState(false)
  const [rated, setRated]       = useState(false)
  const [rating, setRating]     = useState(0)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const isTeacher = user.role === 'teacher' || user.role === 'super_admin'

  const loadMessages = useCallback(async () => {
    try { setMessages(await listSessionMessages(session.id)) }
    catch(e) { console.error(e) }
  }, [session.id])

  useEffect(() => { loadMessages() }, [loadMessages])
  useEffect(() => {
    const unsub = subscribeToSessionMessages(session.id, loadMessages)
    return () => { unsub() }
  }, [session.id, loadMessages])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const send = async () => {
    if (!body.trim()) return
    setSending(true)
    try { await sendSessionMessage(session.id, body.trim()); setBody('') }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setSending(false) }
  }

  const loadStudents = async () => {
    try { setStudents(await listSessionEnrollments(session.id) as Record<string,unknown>[]) }
    catch(e) { console.error(e) }
  }

  const handleRate = async (stars: number) => {
    try { await rateTeacher({ teacher_id: session.teacher_id, session_id: session.id, rating: stars }); setRated(true); toast.success('Rating submitted!') }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const isLive = session.status === 'live'

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      {/* Room header */}
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3 mb-3">
        <button onClick={onLeave} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm shrink-0">
          <ArrowLeft className="h-4 w-4"/>Leave
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isLive && <span className="flex items-center gap-1 text-xs font-bold text-red-500"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"/>LIVE</span>}
            <h2 className="font-bold text-sm truncate">{session.title}</h2>
          </div>
          <p className="text-xs text-muted-foreground">{session.subject} · {levelLabel(session.level)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isTeacher && (
            <button onClick={() => { setShowStudents(v=>!v); if(!showStudents) loadStudents() }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-2.5 py-1.5">
              <Users className="h-3.5 w-3.5"/> {session.enrolled_count}
            </button>
          )}
          {session.room_url && (
            <a href={session.room_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" style={{ background: '#ef4444' }}>
                <Video className="mr-1.5 h-3.5 w-3.5"/> {isLive ? 'Join Video' : 'Open Room'}
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-3 min-h-0">
        {/* Chat */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto rounded-xl border bg-card p-3 space-y-2">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                <MessageSquare className="h-8 w-8 mb-2"/>
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">{isTeacher ? 'Welcome students and start the session!' : 'Ask your teacher a question!'}</p>
              </div>
            )}
            {messages.map(m => {
              const isOwn = m.sender_id === user.id
              const isTeacherMsg = (m.sender as User | undefined)?.role === 'teacher'
              return (
                <div key={m.id} className={cn('flex items-end gap-2', isOwn && 'flex-row-reverse')}>
                  {!isOwn && <Avatar user={m.sender as User} size={7}/>}
                  <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', isOwn ? 'rounded-br-sm text-white' : isTeacherMsg ? 'rounded-bl-sm border border-amber-200 bg-amber-50' : 'rounded-bl-sm bg-muted')}
                    style={isOwn ? { background: 'var(--navy)' } : {}}>
                    {!isOwn && <p className="text-[10px] font-bold mb-0.5" style={{ color: isTeacherMsg ? 'var(--gold)' : 'var(--green)' }}>
                      {(m.sender as User | undefined)?.name}{isTeacherMsg ? ' 👩‍🏫' : ''}
                    </p>}
                    <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                    {m.file_url && <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-1 block">📎 Attachment</a>}
                    <p className={cn('text-[10px] mt-1', isOwn ? 'text-white/60' : 'text-muted-foreground')}>{timeAgo(m.created_at)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef}/>
          </div>

          {/* Message input */}
          <div className="flex gap-2 mt-2">
            <Input value={body} onChange={e => setBody(e.target.value)} placeholder="Type a message…"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              className="flex-1"/>
            <Button onClick={send} disabled={sending} style={{ background: 'var(--green)' }}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
            </Button>
          </div>

          {/* Rate teacher (students only, after session) */}
          {!isTeacher && !rated && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
              <p className="text-xs font-medium text-amber-800 mb-2">Rate this session</p>
              <div className="flex justify-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => handleRate(i)}>
                    <Star className={cn('h-5 w-5 transition-colors', i <= rating ? 'fill-amber-400 text-amber-400' : 'text-amber-200')}
                      onMouseEnter={() => setRating(i)} onMouseLeave={() => setRating(0)}/>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Students panel (teacher only) */}
        {showStudents && isTeacher && (
          <div className="w-56 shrink-0 rounded-xl border bg-card p-3 overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground mb-2">ENROLLED STUDENTS ({students.length})</p>
            <div className="space-y-2">
              {students.map((s: Record<string,unknown>, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Avatar user={(s as Record<string,unknown>).student as User} size={7}/>
                  <span className="text-xs truncate">{((s as Record<string,unknown>).student as User | undefined)?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══ TEACHER: Manage Sessions ═══════════════════════════════
export function MyOnlineSessions({ user }: { user: User }) {
  const [sessions, setSessions]   = useState<OnlineSession[]>([])
  const [loading, setLoading]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const { nonce, bump }           = useStore()

  const load = useCallback(async () => {
    setLoading(true)
    try { setSessions(await listOnlineSessions({ teacher_id: user.id, status: 'all' })) }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [user.id, nonce])

  useEffect(() => { load() }, [load])

  const goLive = async (s: OnlineSession) => {
    try { await updateOnlineSession(s.id, { status: 'live' } as Partial<OnlineSession>); load(); toast.success('Session is now LIVE!') }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }
  const end = async (s: OnlineSession) => {
    try { await updateOnlineSession(s.id, { status: 'ended' } as Partial<OnlineSession>); load(); toast.success('Session ended') }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }
  const del = async (s: OnlineSession) => {
    if (!confirm(`Delete "${s.title}"?`)) return
    try { await deleteOnlineSession(s.id); bump(); toast.success('Deleted') }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Video className="h-6 w-6 text-primary"/> My Online Sessions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage your live teaching sessions. Earn income when students pay to join.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} style={{ background: 'var(--green)' }}>
          <Plus className="mr-2 h-4 w-4"/> Create Session
        </Button>
      </div>

      {/* Premium income banner */}
      <div className="rounded-xl border border-amber-200 p-4" style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.1), rgba(0,51,102,0.05))' }}>
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-amber-500 shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold text-sm">Earn with ExamHub Premium</p>
            <p className="text-xs text-muted-foreground mt-1">Set a price (TZS) for your sessions. Students pay via M-Pesa, Tigo Pesa, Airtel or HaloPesa. You receive payment directly to your account.</p>
          </div>
        </div>
      </div>

      {/* Create dialog */}
      {showCreate && <CreateSessionForm user={user} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }}/>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading…</div>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Video className="h-10 w-10 text-muted-foreground"/>
          <p className="font-medium">No sessions yet</p>
          <Button onClick={() => setShowCreate(true)} style={{ background: 'var(--green)' }}><Plus className="mr-2 h-4 w-4"/>Create your first session</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <Card key={s.id} className={cn('border-l-4', s.status==='live'?'border-l-red-400':s.status==='scheduled'?'border-l-blue-400':'border-l-gray-300')}>
              <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{s.title}</h3>
                    {s.status === 'live' && <Badge className="bg-red-500 text-white text-xs">🔴 LIVE</Badge>}
                    <Badge variant="outline" className="text-xs capitalize">{s.status}</Badge>
                    <Badge variant="secondary" className="text-xs">{s.session_type}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span>{s.subject} · {levelLabel(s.level)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{fmtTime(s.scheduled_at)}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3"/>{s.enrolled_count}/{s.max_students}</span>
                    <span className="font-semibold" style={{ color: s.is_free ? 'var(--green)' : 'var(--navy)' }}>
                      {s.is_free ? 'Free' : fmtTZS(s.price_tzs)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {s.status === 'scheduled' && <Button size="sm" onClick={() => goLive(s)} style={{ background: '#ef4444' }}><Wifi className="mr-1 h-3.5 w-3.5"/>Go Live</Button>}
                  {s.status === 'live' && (
                    <>
                      {s.room_url && <a href={s.room_url} target="_blank" rel="noopener noreferrer"><Button size="sm" style={{ background: '#ef4444' }}><Video className="mr-1 h-3.5 w-3.5"/>Open Room</Button></a>}
                      <Button size="sm" variant="outline" onClick={() => end(s)}><X className="mr-1 h-3.5 w-3.5"/>End</Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => del(s)}><Trash2 className="h-4 w-4"/></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══ CREATE SESSION FORM ════════════════════════════════════
function CreateSessionForm({ user: _user, onClose, onCreated }: {
  user: User; onClose: () => void; onCreated: () => void
}) {
  const [title, setTitle]         = useState('')
  const [subject, setSubject]     = useState('')
  const [level, setLevel]         = useState('')
  const [description, setDesc]    = useState('')
  const [type, setType]           = useState<'group'|'private'>('group')
  const [price, setPrice]         = useState('0')
  const [duration, setDuration]   = useState('60')
  const [maxStudents, setMax]     = useState('30')
  const [date, setDate]           = useState('')
  const [time, setTime]           = useState('')
  const [saving, setSaving]       = useState(false)

  const submit = async () => {
    if (!title || !subject || !level || !date || !time) { toast.error('Fill in all required fields'); return }
    setSaving(true)
    try {
      await createOnlineSession({
        title, subject, level, description: description || null,
        session_type: type,
        price_tzs: Number(price) || 0,
        duration_mins: Number(duration) || 60,
        max_students: Number(maxStudents) || 30,
        scheduled_at: new Date(`${date}T${time}`).toISOString(),
        status: 'scheduled',
      })
      toast.success('Session created!')
      onCreated()
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4 text-primary"/>New Session</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Session Title *</Label><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Form 4 Mathematics — Quadratic Equations"/></div>
          <div><Label>Subject *</Label><Select value={subject} onValueChange={setSubject}><SelectTrigger><SelectValue placeholder="Choose"/></SelectTrigger><SelectContent>{SUBJECTS.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Level *</Label><Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue placeholder="Choose"/></SelectTrigger><SelectContent>{LEVELS.map(l=><SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Date *</Label><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
          <div><Label>Time *</Label><Input type="time" value={time} onChange={e=>setTime(e.target.value)}/></div>
          <div><Label>Duration (minutes)</Label><Input type="number" value={duration} onChange={e=>setDuration(e.target.value)}/></div>
          <div><Label>Max Students</Label><Input type="number" value={maxStudents} onChange={e=>setMax(e.target.value)}/></div>
          <div>
            <Label>Session Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {[['group','👥 Group'],['private','🔒 Private']].map(([v,l])=>(
                <button key={v} type="button" onClick={()=>setType(v as 'group'|'private')}
                  className={cn('rounded-xl border py-2 text-sm font-medium transition-colors', type===v?'border-transparent text-white':'border-border text-muted-foreground')}
                  style={type===v?{background:'var(--navy)'}:{}}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>Price (TZS)</Label>
            <Input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0 = free"/>
            <p className="text-xs text-muted-foreground mt-1">0 = free session. Students pay via mobile money.</p>
          </div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea value={description} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="What will you cover in this session?"/></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={submit} disabled={saving} className="flex-1" style={{ background: 'var(--green)' }}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>} Create Session
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
