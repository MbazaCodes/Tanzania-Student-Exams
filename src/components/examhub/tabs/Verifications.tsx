import { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, Loader2, CheckCircle2, XCircle, Clock, Mail, User, School, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button, Badge, Card, CardContent, Input, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Label } from '@/components/ui/index'
import { listVerificationRequests, approveVerification, rejectVerification, getAllUsers } from '@/lib/api'
import type { User as UserType } from '@/lib/types'
import { ROLE_LABEL } from '@/lib/types'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VerifRequest {
  id: string; user_id: string; role: string; school_name?: string
  message?: string; status: string; created_at: string
  user?: { id: string; name: string; email: string; role: string; teacher_type?: string; school_id?: string; verification_status?: string }
}

export function Verifications({ user: _user }: { user: UserType }) {
  const [requests, setRequests] = useState<VerifRequest[]>([])
  const [pendingUsers, setPendingUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; userId: string; name: string }>({ open: false, userId: '', name: '' })
  const [rejectReason, setRejectReason] = useState('')
  const { nonce, bump } = useStore()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reqs, users] = await Promise.all([
        listVerificationRequests(filter === 'all' ? undefined : filter),
        getAllUsers(),
      ])
      setRequests(reqs as VerifRequest[])
      // Also show users with pending verification not in requests yet
      const pending = (users as UserType[]).filter(u =>
        u.verification_status === 'pending' &&
        u.role === 'teacher'
      )
      setPendingUsers(pending)
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [filter, nonce])

  useEffect(() => { load() }, [load])

  const handleApprove = async (userId: string, name: string) => {
    try {
      await approveVerification(userId, 'Verified by admin')
      toast.success(`✓ ${name} approved and activated`)
      bump()
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please provide a reason'); return }
    try {
      await rejectVerification(rejectDialog.userId, rejectReason)
      toast.success(`${rejectDialog.name} registration rejected`)
      setRejectDialog({ open: false, userId: '', name: '' })
      setRejectReason('')
      bump()
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const allPending = [
    ...pendingUsers.filter(u => !requests.some(r => r.user_id === u.id)),
    ...requests.filter(r => r.status === 'pending').map(r => r.user).filter(Boolean),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary"/> Teacher & School Verifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Approve or reject teacher and school registration requests. Students are auto-approved.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}/> Refresh
        </Button>
      </div>

      {/* Alert for pending */}
      {allPending.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0"/>
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{allPending.length} pending</span> verification{allPending.length > 1 ? 's' : ''} awaiting your review.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['pending','approved','rejected','all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('rounded-full px-3 py-1.5 text-sm font-medium border capitalize transition-colors',
              filter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:bg-accent')}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin"/> Loading…
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pending users without requests */}
          {filter === 'pending' && pendingUsers.filter(u => !requests.some(r => r.user_id === u.id)).map(u => (
            <UserVerifCard key={u.id} user={u}
              onApprove={() => handleApprove(u.id, u.name)}
              onReject={() => setRejectDialog({ open: true, userId: u.id, name: u.name })}
            />
          ))}
          {/* Requests */}
          {requests.length === 0 && pendingUsers.length === 0 && (
            <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500"/>
              <p className="font-medium">All clear — no {filter} verifications</p>
            </CardContent></Card>
          )}
          {requests.map(req => (
            <Card key={req.id} className={cn('border-l-4', req.status === 'pending' ? 'border-l-amber-400' : req.status === 'approved' ? 'border-l-green-500' : 'border-l-red-400')}>
              <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-bold',
                    'bg-amber-600')}>
                    {<User className="h-5 w-5"/>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{req.user?.name ?? '—'}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3"/>{req.user?.email}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">{ROLE_LABEL[req.role] ?? req.role}</Badge>
                      {req.school_name && <Badge variant="outline" className="text-xs">{req.school_name}</Badge>}
                    </div>
                    {req.message && <p className="text-xs text-muted-foreground mt-1 italic">"{req.message}"</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(req.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {req.status === 'pending' ? (
                    <>
                      <Button size="sm" onClick={() => handleApprove(req.user_id, req.user?.name ?? '')}
                        className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5"/> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10"
                        onClick={() => setRejectDialog({ open: true, userId: req.user_id, name: req.user?.name ?? '' })}>
                        <XCircle className="mr-1 h-3.5 w-3.5"/> Reject
                      </Button>
                    </>
                  ) : (
                    <Badge className={cn('capitalize', req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                      {req.status === 'approved' ? <CheckCircle2 className="mr-1 h-3 w-3"/> : <XCircle className="mr-1 h-3 w-3"/>}
                      {req.status}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={o => setRejectDialog(d => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5"/>Reject Verification</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Rejecting <span className="font-semibold text-foreground">{rejectDialog.name}</span>. Please provide a reason that will be sent to the user.</p>
            <div><Label>Reason for rejection *</Label>
              <Textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} rows={3}
                placeholder="e.g. Documents not sufficient. Please reapply with valid school ID and teaching certificate."/>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectDialog({ open: false, userId: '', name: '' })}>Cancel</Button>
              <Button className="flex-1 bg-destructive text-white hover:opacity-90" onClick={handleReject}>Confirm Rejection</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UserVerifCard({ user, onApprove, onReject }: { user: UserType; onApprove: () => void; onReject: () => void }) {
  return (
    <Card className="border-l-4 border-l-amber-400">
      <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold">{user.name[0]}</div>
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-xs">{ROLE_LABEL[user.role]}</Badge>
              <Badge className="text-xs bg-amber-100 text-amber-700"><Clock className="h-2.5 w-2.5 mr-0.5"/>Pending</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5"/> Approve
          </Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive" onClick={onReject}>
            <XCircle className="mr-1 h-3.5 w-3.5"/> Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
