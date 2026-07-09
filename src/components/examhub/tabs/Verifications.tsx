import { useEffect, useState, useCallback } from 'react'
import {
  ShieldCheck, Loader2, CheckCircle2, XCircle, Clock, Mail,
  User, RefreshCw, AlertTriangle, MessageSquare, ChevronDown, ChevronUp,
  MapPin, Phone, BookOpen, GraduationCap, School, Star,
} from 'lucide-react'
import {
  Button, Badge, Card, CardContent, Textarea, Dialog,
  DialogContent, DialogHeader, DialogTitle, Label,
} from '@/components/ui/index'
import { listVerificationRequests, approveVerification, rejectVerification, getAllUsers } from '@/lib/api'
import { supabaseAdmin } from '@/lib/supabase'
import type { User as UserType } from '@/lib/types'
import { ROLE_LABEL } from '@/lib/types'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VerifRequest {
  id: string; user_id: string; role: string; school_name?: string
  message?: string; status: string; created_at: string; review_note?: string
  user?: {
    id: string; name: string; email: string; role: string
    phone?: string; region?: string; district?: string
    school_name?: string; teaching_levels?: string; subjects_taught?: string
    verification_status?: string
  }
}

const STATUS_STYLE: Record<string,string> = {
  pending:   'bg-amber-100 text-amber-700 border-amber-200',
  approved:  'bg-green-100 text-green-700 border-green-200',
  rejected:  'bg-red-100 text-red-700 border-red-200',
  more_info: 'bg-blue-100 text-blue-700 border-blue-200',
}
const STATUS_BORDER: Record<string,string> = {
  pending:   'border-l-amber-400',
  approved:  'border-l-green-500',
  rejected:  'border-l-red-400',
  more_info: 'border-l-blue-400',
}

export function Verifications({ user: _user }: { user: UserType }) {
  const [requests, setRequests]   = useState<VerifRequest[]>([])
  const [pendingUsers, setPending] = useState<UserType[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('pending')
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [actionDialog, setAction] = useState<{ type: 'reject'|'info'; req: VerifRequest } | null>(null)
  const [note, setNote]           = useState('')
  const [acting, setActing]       = useState(false)
  const { nonce, bump } = useStore()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reqs, users] = await Promise.all([
        listVerificationRequests(filter === 'all' ? undefined : filter) as Promise<VerifRequest[]>,
        getAllUsers() as Promise<UserType[]>,
      ])
      setRequests(reqs)
      setPending(users.filter(u => u.verification_status === 'pending' && u.role === 'teacher'))
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [filter, nonce])

  useEffect(() => { load() }, [load])

  const counts = {
    pending:   requests.filter(r => r.status === 'pending').length + pendingUsers.filter(u => !requests.some(r => r.user_id === u.id)).length,
    approved:  requests.filter(r => r.status === 'approved').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
    more_info: requests.filter(r => r.status === 'more_info').length,
  }

  const handleApprove = async (userId: string, name: string) => {
    try {
      await approveVerification(userId, 'Approved by admin')
      toast.success(`✓ ${name} approved — can now create exams`)
      bump()
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const handleAction = async () => {
    if (!actionDialog) return
    if (!note.trim()) { toast.error('Please provide a message'); return }
    setActing(true)
    try {
      if (actionDialog.type === 'reject') {
        await rejectVerification(actionDialog.req.user_id, note)
        toast.success('Application rejected')
      } else {
        // Request more info
        await supabaseAdmin.rpc('request_verification_info', {
          p_user_id: actionDialog.req.user_id,
          p_reviewer_id: _user.id,
          p_note: note,
        }).throwOnError()
        toast.success('More info requested — teacher will be notified')
      }
      setAction(null); setNote(''); bump()
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setActing(false) }
  }

  // Users with pending verification but no request submitted yet
  const orphanPending = filter === 'pending' || filter === 'all'
    ? pendingUsers.filter(u => !requests.some(r => r.user_id === u.id))
    : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary"/> Teacher Applications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, approve or reject teacher registration requests.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}/> Refresh
        </Button>
      </div>

      {/* Alert */}
      {counts.pending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0"/>
          <p className="text-sm text-amber-800">
            <strong>{counts.pending} pending</strong> application{counts.pending !== 1 ? 's' : ''} awaiting your review.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { v: 'pending',   l: 'Pending',    c: counts.pending },
          { v: 'more_info', l: 'More Info',  c: counts.more_info },
          { v: 'approved',  l: 'Approved',   c: counts.approved },
          { v: 'rejected',  l: 'Rejected',   c: counts.rejected },
          { v: 'all',       l: 'All',        c: requests.length },
        ].map(({ v, l, c }) => (
          <button key={v} onClick={() => setFilter(v)}
            className={cn('rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
              filter === v ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground hover:bg-accent')}>
            {l} <span className="opacity-60">({c})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading applications…
        </div>
      ) : orphanPending.length === 0 && requests.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500"/>
          <p className="font-medium">All clear — no {filter === 'all' ? '' : filter} applications</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {/* Orphan pending users (registered but no request row) */}
          {orphanPending.map(u => (
            <ApplicationCard key={u.id}
              req={{ id: u.id, user_id: u.id, role: u.role, status: 'pending', created_at: u.created_at,
                user: { id: u.id, name: u.name, email: u.email, role: u.role,
                  phone: u.phone ?? undefined, region: u.region ?? undefined,
                  district: u.district ?? undefined, school_name: u.school_name ?? undefined,
                  teaching_levels: u.teaching_levels ?? undefined, subjects_taught: u.subjects_taught ?? undefined,
                  verification_status: 'pending' } }}
              expanded={expanded === u.id}
              onExpand={() => setExpanded(e => e === u.id ? null : u.id)}
              onApprove={() => handleApprove(u.id, u.name)}
              onReject={() => setAction({ type: 'reject', req: { id: u.id, user_id: u.id, role: u.role, status: 'pending', created_at: u.created_at, user: { id: u.id, name: u.name, email: u.email, role: u.role } } })}
              onMoreInfo={() => setAction({ type: 'info', req: { id: u.id, user_id: u.id, role: u.role, status: 'pending', created_at: u.created_at, user: { id: u.id, name: u.name, email: u.email, role: u.role } } })}
            />
          ))}

          {/* Requests with full data */}
          {requests.map(req => (
            <ApplicationCard key={req.id} req={req}
              expanded={expanded === req.id}
              onExpand={() => setExpanded(e => e === req.id ? null : req.id)}
              onApprove={() => handleApprove(req.user_id, req.user?.name ?? '')}
              onReject={() => setAction({ type: 'reject', req })}
              onMoreInfo={() => setAction({ type: 'info', req })}
            />
          ))}
        </div>
      )}

      {/* Action dialog */}
      <Dialog open={!!actionDialog} onOpenChange={o => { if (!o) { setAction(null); setNote('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={cn('flex items-center gap-2', actionDialog?.type === 'reject' ? 'text-destructive' : 'text-blue-600')}>
              {actionDialog?.type === 'reject' ? <XCircle className="h-5 w-5"/> : <MessageSquare className="h-5 w-5"/>}
              {actionDialog?.type === 'reject' ? 'Reject Application' : 'Request More Information'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {actionDialog?.type === 'reject'
                ? `Rejecting ${actionDialog?.req.user?.name ?? 'this applicant'}. Please give a reason.`
                : `Ask ${actionDialog?.req.user?.name ?? 'the applicant'} to provide more information.`}
            </p>
            <div>
              <Label>{actionDialog?.type === 'reject' ? 'Reason for rejection *' : 'What information do you need? *'}</Label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder={actionDialog?.type === 'reject'
                  ? 'e.g. Please provide valid teaching certificate and school ID.'
                  : 'e.g. Please upload your teaching certificate or provide your TSC number.'}/>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setAction(null); setNote('') }}>Cancel</Button>
              <Button onClick={handleAction} disabled={acting} className={cn('flex-1', actionDialog?.type === 'reject' ? 'bg-destructive text-white hover:opacity-90' : '')}>
                {acting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {actionDialog?.type === 'reject' ? 'Confirm Rejection' : 'Send Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ApplicationCard({ req, expanded, onExpand, onApprove, onReject, onMoreInfo }: {
  req: VerifRequest; expanded: boolean
  onExpand: () => void; onApprove: () => void; onReject: () => void; onMoreInfo: () => void
}) {
  const u = req.user
  let levels: string[] = []
  let subjects: string[] = []
  try { if (u?.teaching_levels) levels = JSON.parse(u.teaching_levels) } catch {}
  try { if (u?.subjects_taught) subjects = JSON.parse(u.subjects_taught) } catch {}

  return (
    <Card className={cn('border-l-4 overflow-hidden', STATUS_BORDER[req.status] ?? 'border-l-gray-300')}>
      {/* Collapsed row */}
      <button className="w-full text-left" onClick={onExpand}>
        <CardContent className="p-4 flex items-center gap-3">
          {/* Avatar */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold text-white text-base" style={{ background: 'var(--amber, #f5a623)' }}>
            {(u?.name ?? '?')[0].toUpperCase()}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{u?.name ?? '—'}</span>
              <Badge variant="outline" className={cn('text-xs', STATUS_STYLE[req.status])}>{req.status.replace('_',' ')}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3"/>{u?.email}</span>
              {u?.region && <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{u.region}{u.district ? `, ${u.district}` : ''}</span>}
              {u?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3"/>{u.phone}</span>}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{new Date(req.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            {req.status === 'pending' || req.status === 'more_info' ? (
              <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5"/> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={onMoreInfo} className="text-blue-600 border-blue-300">
                  <MessageSquare className="mr-1 h-3.5 w-3.5"/> Info
                </Button>
                <Button size="sm" variant="outline" onClick={onReject} className="text-destructive border-destructive/30">
                  <XCircle className="mr-1 h-3.5 w-3.5"/> Reject
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className={cn(STATUS_STYLE[req.status], 'capitalize')}>
                {req.status === 'approved' ? <CheckCircle2 className="mr-1 h-3 w-3"/> : <XCircle className="mr-1 h-3 w-3"/>}
                {req.status}
              </Badge>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground"/> : <ChevronDown className="h-4 w-4 text-muted-foreground"/>}
          </div>
        </CardContent>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {u?.school_name && (
              <div className="flex items-start gap-2 text-sm">
                <School className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"/>
                <div><p className="text-xs text-muted-foreground">School</p><p className="font-medium">{u.school_name}</p></div>
              </div>
            )}
            {levels.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <GraduationCap className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"/>
                <div>
                  <p className="text-xs text-muted-foreground">Teaching Levels</p>
                  <div className="flex flex-wrap gap-1 mt-1">{levels.map(l => <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>)}</div>
                </div>
              </div>
            )}
            {subjects.length > 0 && (
              <div className="flex items-start gap-2 text-sm sm:col-span-2">
                <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"/>
                <div>
                  <p className="text-xs text-muted-foreground">Subjects</p>
                  <div className="flex flex-wrap gap-1 mt-1">{subjects.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div>
                </div>
              </div>
            )}
            {req.message && (
              <div className="sm:col-span-2 rounded-lg bg-card border p-3 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Applicant's message</p>
                <p className="text-sm whitespace-pre-wrap">{req.message}</p>
              </div>
            )}
            {req.review_note && (
              <div className="sm:col-span-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                <p className="text-xs text-blue-600 mb-1 font-medium">Admin note</p>
                <p className="text-sm text-blue-800">{req.review_note}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
