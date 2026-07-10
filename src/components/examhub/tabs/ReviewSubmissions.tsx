import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Loader2, ArrowLeft, Send, Save, Clock, Award, MessageSquare, Inbox } from 'lucide-react'
import { Button, Badge, Card, CardContent, Input, Textarea, Label } from '@/components/ui/index'
import { listSubmissions, reviewSubmission, publishSubmission } from '@/lib/api'
import type { Submission, User } from '@/lib/types'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<string,string> = { submitted:'bg-zinc-100 text-zinc-600', auto_marked:'bg-sky-100 text-sky-700', reviewed:'bg-amber-100 text-amber-700', published:'bg-emerald-100 text-emerald-700' }

export function ReviewSubmissions({ user }: { user: User }) {
  const [subs, setSubs] = useState<Submission[]>([]); const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all'); const [active, setActive] = useState<Submission|null>(null)
  const { nonce } = useStore()

  // Teachers only see submissions for exams they created.
  // Super_admins see all submissions (oversight).
  const reviewScope: Record<string, string> =
    user.role === 'super_admin' ? {} : { taught_by: '1' }

  const load = useCallback(async () => {
    setLoading(true)
    try { setSubs(await listSubmissions(reviewScope)) }
    catch(e) { toast.error(e instanceof Error?e.message:'Failed') }
    finally { setLoading(false) }
  }, [nonce, user.role])
  useEffect(() => { load() }, [load])

  const filtered = subs.filter(s => filter==='all'?true:filter==='pending'?(s.status==='auto_marked'||s.status==='submitted'):s.status===filter)
  const counts = { all:subs.length, pending:subs.filter(s=>s.status==='auto_marked'||s.status==='submitted').length, reviewed:subs.filter(s=>s.status==='reviewed').length, published:subs.filter(s=>s.status==='published').length }

  if (active) return <ReviewPanel submission={active} onBack={()=>{setActive(null);load()}}/>

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-primary"/>Review Submissions</h1><p className="text-sm text-muted-foreground mt-1">Review essays, adjust marks, publish results to students.</p></div>
      <div className="flex flex-wrap gap-2">
        {[['all','All'],['pending','Needs review'],['reviewed','Reviewed'],['published','Published']].map(([v,label])=>(
          <button key={v} onClick={()=>setFilter(v)} className={cn('rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',filter===v?'bg-primary text-primary-foreground border-primary':'bg-card text-muted-foreground hover:bg-accent')}>
            {label} <span className="opacity-70">({counts[v as keyof typeof counts]})</span>
          </button>
        ))}
      </div>
      {loading?<div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading…</div>
      :filtered.length===0?<Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center"><Inbox className="h-10 w-10 text-muted-foreground"/><p className="font-medium">No submissions to review</p></CardContent></Card>
      :<div className="space-y-2">{filtered.map(s=>(
        <Card key={s.id} className="hover:border-primary/40 transition-colors cursor-pointer" onClick={()=>setActive(s)}>
          <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">{s.student?.name?.[0]?.toUpperCase()??'?'}</div>
              <div className="min-w-0"><p className="font-medium truncate">{s.student?.name}</p><p className="text-xs text-muted-foreground truncate">{s.exam?.title}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right"><p className="text-sm font-semibold">{s.score??'—'}/{s.exam?.total_marks??'—'}</p>{s.percentage!=null&&<p className="text-xs text-muted-foreground">{Math.round(s.percentage)}%</p>}</div>
              {s.grade&&<Badge variant="secondary">Grade {s.grade}</Badge>}
              <Badge variant="outline" className={STATUS_STYLE[s.status]}>{s.status.replace('_',' ')}</Badge>
              <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1"><Clock className="h-3 w-3"/>{new Date(s.submitted_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      ))}</div>}
    </div>
  )
}

function ReviewPanel({ submission, onBack }: { submission: Submission; onBack: () => void }) {
  const [full, setFull] = useState<Submission|null>(null)
  const [overrides, setOverrides] = useState<Record<string,{marks_awarded:number;feedback:string}>>({})
  const [saving, setSaving] = useState(false); const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    listSubmissions({ exam_id: submission.exam_id }).then(r => {
      const f = r.find(x=>x.id===submission.id)??null; setFull(f)
      if(f) { const init: Record<string,{marks_awarded:number;feedback:string}> = {}; for(const a of f.answers??[]) init[a.id]={marks_awarded:a.marks_awarded,feedback:a.feedback??''}; setOverrides(init) }
    })
  }, [submission.id, submission.exam_id])

  const review = async () => { if(!full) return; setSaving(true); try { const r = await reviewSubmission(full.id,overrides); setFull({...full,...r}); toast.success('Marks saved') } catch(e) { toast.error(e instanceof Error?e.message:'Failed') } finally { setSaving(false) } }
  const publish = async () => { if(!full) return; setPublishing(true); try { await reviewSubmission(full.id,overrides); const r = await publishSubmission(full.id); setFull({...full,...r}); toast.success('Result published to student') } catch(e) { toast.error(e instanceof Error?e.message:'Failed') } finally { setPublishing(false) } }

  if(!full) return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading…</div>

  const score = (full.answers??[]).reduce((s,a)=>s+(overrides[a.id]?.marks_awarded??a.marks_awarded),0)
  const total = (full.answers??[]).reduce((s,a)=>s+(a.question?.marks??0),0)
  const pct = total>0?(score/total)*100:0
  const needsReview = (full.answers??[]).some(a=>a.is_correct===null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4"/>Back to list</Button>
        <Badge variant="outline" className={STATUS_STYLE[full.status]}>{full.status.replace('_',' ')}</Badge>
      </div>
      <Card><CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">{full.student?.name?.[0]?.toUpperCase()}</div>
          <div><p className="font-semibold">{full.student?.name}</p><p className="text-sm text-muted-foreground">{full.exam?.title}</p><p className="text-xs text-muted-foreground">{new Date(full.submitted_at).toLocaleString()}</p></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center"><div className="text-2xl font-bold">{score}/{total}</div><div className="text-xs text-muted-foreground">Marks (live)</div></div>
          <div className="text-center"><div className="text-2xl font-bold">{Math.round(pct)}%</div><div className="text-xs text-muted-foreground">Score</div></div>
          {full.grade&&<div className="text-center"><div className="text-2xl font-bold">{full.grade}</div><div className="text-xs text-muted-foreground">Grade</div></div>}
        </div>
      </CardContent></Card>

      <div className="space-y-3">{(full.answers??[]).map((a,i)=>{
        const q=a.question!; const ov=overrides[a.id]??{marks_awarded:a.marks_awarded,feedback:a.feedback??''}
        const isManual=q.type==='essay'||q.type==='short'
        let opts: string[]=[];if(q.type==='mcq'){try{opts=JSON.parse(q.options)}catch{}}
        return(<Card key={a.id}><CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">{i+1}</span>
            <div className="flex-1"><div className="flex items-center gap-2"><Badge variant="outline" className="capitalize">{q.type}</Badge><Badge variant="secondary">{q.marks} marks</Badge>{a.is_correct===true&&<Badge className="bg-emerald-100 text-emerald-700">Correct</Badge>}{a.is_correct===false&&<Badge className="bg-rose-100 text-rose-700">Incorrect</Badge>}{a.is_correct===null&&<Badge className="bg-amber-100 text-amber-700">Needs marking</Badge>}</div><p className="font-medium mt-1.5">{q.text}</p></div>
          </div>
          <div className="ml-8 rounded-md bg-muted/40 p-3 text-sm"><p className="text-xs font-medium text-muted-foreground mb-1">Student's answer</p><p className="whitespace-pre-wrap">{q.type==='mcq'?opts[Number(a.answer)]??(a.answer||'(blank)'):a.answer||'(blank)'}</p></div>
          {q.type!=='essay'&&<div className="ml-8 rounded-md bg-emerald-50 p-3 text-sm"><p className="text-xs font-medium text-emerald-700 mb-1">Correct answer</p><p>{q.type==='mcq'?opts[Number(q.correct_answer)]??q.correct_answer:q.correct_answer}</p></div>}
          {q.type==='essay'&&q.correct_answer&&<div className="ml-8 rounded-md bg-sky-50 p-3 text-sm"><p className="text-xs font-medium text-sky-700 mb-1">Marking guide</p><p className="whitespace-pre-wrap text-sky-900">{q.correct_answer}</p></div>}
          {isManual&&<div className="ml-8 grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
            <div><Label className="text-xs text-muted-foreground">Marks (of {q.marks})</Label><Input type="number" min={0} max={q.marks} value={ov.marks_awarded} onChange={e=>setOverrides(o=>({...o,[a.id]:{...o[a.id],marks_awarded:Number(e.target.value)}}))} /></div>
            <div><Label className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3"/>Feedback</Label><Textarea rows={2} value={ov.feedback} onChange={e=>setOverrides(o=>({...o,[a.id]:{...o[a.id],feedback:e.target.value}}))} placeholder="Comment for the student…"/></div>
          </div>}
        </CardContent></Card>)
      })}</div>

      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 text-sm"><Award className="h-4 w-4 text-primary"/><span className="font-medium">{score}/{total}</span>{needsReview&&<span className="text-amber-600">· essays need marking</span>}</div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={review} disabled={saving}>{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-2 h-4 w-4"/>}Save marks</Button>
          <Button onClick={publish} disabled={publishing}>{publishing?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Send className="mr-2 h-4 w-4"/>}Publish to student</Button>
        </div>
      </div>
    </div>
  )
}
