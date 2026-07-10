import { useEffect, useState, useCallback } from 'react'
import { ClipboardList, Loader2, Send, Lock, Trash2, FilePlus2, Users, HelpCircle, Inbox, Eye } from 'lucide-react'
import { Button, Badge, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/index'
import { listExams, updateExam, deleteExam, listSubmissions, getExam } from '@/lib/api'
import { levelLabel, examTypeLabel, type Exam, type Submission, type User } from '@/lib/types'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<string,string> = { draft:'bg-amber-100 text-amber-700 border-amber-200', published:'bg-emerald-100 text-emerald-700 border-emerald-200', closed:'bg-zinc-200 text-zinc-600 border-zinc-300' }

export function MyExams({ user: _user }: { user: User }) {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const { setTab, nonce } = useStore()
  const [detail, setDetail] = useState<Exam | null>(null)

  const load = useCallback(async () => { setLoading(true); try { setExams(await listExams({ mine:'1' })) } catch(e) { toast.error(e instanceof Error?e.message:'Failed') } finally { setLoading(false) } }, [nonce])
  useEffect(() => { load() }, [load])

  const setStatus = async (e: Exam, status: 'draft'|'published'|'closed') => {
    try { await updateExam(e.id, { status }); toast.success(status==='published'?'Exam published':status==='closed'?'Exam closed':'Moved to draft'); load() }
    catch(err) { toast.error(err instanceof Error?err.message:'Failed') }
  }
  const del = async (e: Exam) => { try { await deleteExam(e.id); toast.success('Exam deleted'); load() } catch(err) { toast.error(err instanceof Error?err.message:'Failed') } }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><ClipboardList className="h-6 w-6 text-primary"/>My Exams</h1><p className="text-sm text-muted-foreground mt-1">Exams & quizzes you created.</p></div>
        <Button onClick={()=>setTab('create-exam')}><FilePlus2 className="mr-2 h-4 w-4"/>New exam</Button>
      </div>
      {loading ? <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading…</div>
      : exams.length===0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center"><Inbox className="h-10 w-10 text-muted-foreground"/><p className="font-medium">No exams yet</p><Button onClick={()=>setTab('create-exam')}><FilePlus2 className="mr-2 h-4 w-4"/>Create exam</Button></CardContent></Card>
      ) : (
        <div className="space-y-3">{exams.map(e=>(
          <Card key={e.id}><CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={()=>setDetail(e)}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold truncate hover:text-primary">{e.title}</h3>
                <Badge variant="outline" className={STATUS_STYLE[e.status]}>{e.status}</Badge>
                <Badge variant="secondary">{examTypeLabel(e.exam_type)}</Badge>
                <Badge variant="outline">{e.subject}</Badge>
                <Badge variant="outline">{levelLabel(e.level)}</Badge>
                {e.is_online&&<Badge className="bg-green/15 text-green border-green/30 text-xs">🔴 Online</Badge>}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><HelpCircle className="h-3 w-3"/>{e._count?.questions??0} questions</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3"/>{e._count?.submissions??0} submissions</span>
                <span>{e.total_marks} marks · {e.duration_mins} min</span>
                {e.per_question_timer&&<span>⏱ {e.per_question_timer}s/Q</span>}
                {e.show_answer_after&&<span className="text-green">✓ Answer reveal</span>}
              </div>
              <button className="mt-1 text-xs font-medium text-primary hover:underline flex items-center gap-1"><Eye className="h-3.5 w-3.5"/>View questions & details</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SubmissionsDialog exam={e}/>
              {e.status==='draft'&&<Button size="sm" onClick={()=>setStatus(e,'published')}><Send className="mr-1 h-3.5 w-3.5"/>Publish</Button>}
              {e.status==='published'&&<Button size="sm" variant="outline" onClick={()=>setStatus(e,'closed')}><Lock className="mr-1 h-3.5 w-3.5"/>Close</Button>}
              {e.status==='closed'&&<Button size="sm" variant="outline" onClick={()=>setStatus(e,'published')}><Send className="mr-1 h-3.5 w-3.5"/>Reopen</Button>}
              <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{e.title}"?</AlertDialogTitle><AlertDialogDescription>{(e._count?.submissions??0)>0?'This exam has submissions. Close it instead.':'This permanently deletes the exam and all questions.'}</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>{(e._count?.submissions??0)===0&&<AlertDialogAction onClick={()=>del(e)} className="bg-destructive text-white hover:opacity-90">Delete</AlertDialogAction>}</AlertDialogFooter></AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent></Card>
        ))}</div>
      )}

      {/* Exam detail dialog */}
      <ExamDetailDialog exam={detail} onClose={()=>setDetail(null)}/>
    </div>
  )
}

function ExamDetailDialog({ exam, onClose }: { exam: Exam | null; onClose: () => void }) {
  const [full, setFull] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (exam) {
      setLoading(true)
      getExam(exam.id).then(setFull).catch(()=>setFull(exam)).finally(()=>setLoading(false))
    } else { setFull(null) }
  }, [exam])

  return (
    <Dialog open={!!exam} onOpenChange={o=>{if(!o)onClose()}}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {exam && (
          <>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary"/>{exam.title}</DialogTitle></DialogHeader>
            {loading ? <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading questions…</div>
            : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={STATUS_STYLE[exam.status]}>{exam.status}</Badge>
                  <Badge variant="secondary">{examTypeLabel(exam.exam_type)}</Badge>
                  <Badge variant="outline">{exam.subject}</Badge>
                  <Badge variant="outline">{levelLabel(exam.level)}</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-muted-foreground text-xs">Total marks</dt><dd className="font-medium">{exam.total_marks}</dd></div>
                  <div><dt className="text-muted-foreground text-xs">Duration</dt><dd className="font-medium">{exam.duration_mins} min</dd></div>
                  <div><dt className="text-muted-foreground text-xs">Questions</dt><dd className="font-medium">{full?.questions?.length ?? exam._count?.questions ?? 0}</dd></div>
                  <div><dt className="text-muted-foreground text-xs">Pass mark</dt><dd className="font-medium">{exam.pass_mark ?? '—'}%</dd></div>
                </dl>
                {exam.instructions && <div><p className="text-xs text-muted-foreground mb-1">Instructions</p><p className="text-sm">{exam.instructions}</p></div>}
                {/* Questions */}
                {full?.questions && full.questions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Questions ({full.questions.length})</p>
                    <div className="space-y-2">
                      {full.questions.map((q, i) => (
                        <div key={q.id} className="rounded-lg border p-3 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-primary shrink-0">Q{i+1}.</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{q.text}</p>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-xs capitalize">{q.type.replace('_',' ')}</Badge>
                                <span>{q.marks} mark{q.marks>1?'s':''}</span>
                              </div>
                              {q.type === 'mcq' && q.options && (
                                <ul className="mt-2 space-y-1">
                                  {(()=>{try{return JSON.parse(q.options)}catch{return[]}})().map((opt: string, oi: number)=>(
                                    <li key={oi} className={cn('text-xs px-2 py-1 rounded', opt===q.correct_answer?'bg-green-100 text-green-700 font-medium':'bg-muted')}>{opt}{opt===q.correct_answer?' ✓':''}</li>
                                  ))}
                                </ul>
                              )}
                              {q.type !== 'mcq' && q.correct_answer && (
                                <p className="mt-1 text-xs text-green-700">Answer: {q.correct_answer}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SubmissionsDialog({ exam }: { exam: Exam }) {
  const [open, setOpen] = useState(false); const [subs, setSubs] = useState<Submission[]>([]); const [loading, setLoading] = useState(false)
  useEffect(() => { if(open){setLoading(true);listSubmissions({exam_id:exam.id}).then(r=>setSubs(r)).catch(()=>setSubs([])).finally(()=>setLoading(false))} }, [open, exam.id])
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="secondary"><Eye className="mr-1 h-3.5 w-3.5"/>Submissions ({exam._count?.submissions??0})</Button></DialogTrigger>
      <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Submissions — {exam.title}</DialogTitle></DialogHeader>
        {loading?<div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading…</div>
        :subs.length===0?<p className="py-8 text-center text-sm text-muted-foreground">No submissions yet.</p>
        :<div className="max-h-96 overflow-y-auto space-y-2">{subs.map(s=>(
          <div key={s.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
            <div><p className="font-medium">{s.student?.name}</p><p className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleString()}</p></div>
            <div className="flex items-center gap-3"><Badge variant="outline" className="capitalize">{s.status.replace('_',' ')}</Badge><span className="font-semibold">{s.score}/{exam.total_marks}</span>{s.grade&&<Badge variant="secondary">Grade {s.grade}</Badge>}</div>
          </div>
        ))}</div>}
      </DialogContent>
    </Dialog>
  )
}
