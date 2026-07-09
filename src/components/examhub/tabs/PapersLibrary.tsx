import { useEffect, useState, useCallback, useMemo } from 'react'
import { Library, Upload, Search, FileText, Trash2, Archive, Send, RotateCcw, FilePlus2, Loader2, Inbox } from 'lucide-react'
import { Button, Input, Badge, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/index'
import { listPapers, updatePaper, deletePaper } from '@/lib/api'
import { LEVELS, SUBJECTS, PAPER_TYPES, levelLabel, type Paper, type User } from '@/lib/types'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<string,string> = { draft:'bg-amber-100 text-amber-700 border-amber-200', published:'bg-emerald-100 text-emerald-700 border-emerald-200', archived:'bg-zinc-200 text-zinc-600 border-zinc-300' }
const canManage = (r: string) => ['teacher','school_admin','super_admin'].includes(r)
function fmtSize(b: number|null) { if(!b) return '—'; if(b<1024) return `${b}B`; if(b<1048576) return `${(b/1024).toFixed(0)}KB`; return `${(b/1048576).toFixed(1)}MB` }

export function PapersLibrary({ user }: { user: User }) {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState(''); const [status, setStatus] = useState('all')
  const [subject, setSubject] = useState('all'); const [level, setLevel] = useState('all')
  const { setTab, nonce } = useStore()
  const manager = canManage(user.role)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string,string> = {}
      if (status !== 'all') params.status = status
      if (subject !== 'all') params.subject = subject
      if (level !== 'all') params.level = level
      const data = await listPapers(params)
      const filtered = q.trim() ? data.filter(p => p.title.toLowerCase().includes(q.toLowerCase())) : data
      setPapers(filtered)
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [status, subject, level, q, nonce])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => ({ all: papers.length, draft: papers.filter(p=>p.status==='draft').length, published: papers.filter(p=>p.status==='published').length, archived: papers.filter(p=>p.status==='archived').length }), [papers])

  const act = async (paper: Paper, action: 'publish'|'draft'|'archive'|'delete') => {
    try {
      if (action === 'delete') { await deletePaper(paper.id); toast.success('Paper deleted') }
      else { const next = action==='publish'?'published':action; await updatePaper(paper.id, { status: next } as Partial<Paper>); toast.success(action==='publish'?'Paper published':action==='archive'?'Paper archived':'Moved to draft') }
      load()
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Action failed') }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Library className="h-6 w-6 text-primary" /> Papers Library</h1>
          <p className="text-sm text-muted-foreground mt-1">{manager ? 'Upload, publish and archive exam papers.' : 'Browse published past papers.'}</p>
        </div>
        {manager && <Button onClick={() => setTab('upload')}><Upload className="mr-2 h-4 w-4" /> Upload Paper</Button>}
      </div>
      <div className="flex flex-wrap gap-2">
        {(['all','published','draft','archived'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)} className={cn('rounded-full px-3 py-1.5 text-sm font-medium border transition-colors', status===s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:bg-accent')}>
            {s==='all'?'All':s[0].toUpperCase()+s.slice(1)} <span className="opacity-70">({counts[s]})</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search title…" value={q} onChange={e=>setQ(e.target.value)} className="pl-8" /></div>
        <Select value={subject} onValueChange={setSubject}><SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent><SelectItem value="all">All subjects</SelectItem>{SUBJECTS.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger><SelectContent><SelectItem value="all">All levels</SelectItem>{LEVELS.map(l=><SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" onClick={load} disabled={loading}>{loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Search className="mr-2 h-4 w-4"/>}Refresh</Button>
      </div>
      {loading ? <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading…</div>
      : papers.length===0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center"><Inbox className="h-10 w-10 text-muted-foreground"/><p className="font-medium">No papers found</p>{manager&&<Button onClick={()=>setTab('upload')}><Upload className="mr-2 h-4 w-4"/>Upload a paper</Button>}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {papers.map(p=>(
            <Card key={p.id} className="overflow-hidden flex flex-col">
              <CardContent className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5"/></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><Badge variant="outline" className={STATUS_STYLE[p.status]}>{p.status}</Badge><Badge variant="secondary" className="capitalize">{p.type}</Badge></div>
                    <h3 className="mt-1.5 font-semibold leading-snug line-clamp-2">{p.title}</h3>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <div><dt className="inline">Subject:</dt> <dd className="inline font-medium text-foreground">{p.subject}</dd></div>
                  <div><dt className="inline">Level:</dt> <dd className="inline font-medium text-foreground">{levelLabel(p.level)}</dd></div>
                  <div><dt className="inline">Year:</dt> <dd className="inline font-medium text-foreground">{p.year}</dd></div>
                  <div><dt className="inline">Size:</dt> <dd className="inline font-medium text-foreground">{fmtSize(p.file_size)}</dd></div>
                </dl>
                {p.description&&<p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  {manager ? (<>
                    {p.status!=='published'&&<Button size="sm" onClick={()=>act(p,'publish')}><Send className="mr-1 h-3.5 w-3.5"/>Publish</Button>}
                    {p.status==='published'&&<Button size="sm" variant="outline" onClick={()=>act(p,'draft')}><RotateCcw className="mr-1 h-3.5 w-3.5"/>Unpublish</Button>}
                    {p.status!=='archived'&&<Button size="sm" variant="outline" onClick={()=>act(p,'archive')}><Archive className="mr-1 h-3.5 w-3.5"/>Archive</Button>}
                    {!p.exam&&<Button size="sm" variant="secondary" onClick={()=>{sessionStorage.setItem('examhub:prefillPaperId',p.id);setTab('create-exam')}}><FilePlus2 className="mr-1 h-3.5 w-3.5"/>Build Exam</Button>}
                    <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5"/></Button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete paper?</AlertDialogTitle><AlertDialogDescription>Permanently removes "{p.title}". This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={()=>act(p,'delete')} className="bg-destructive text-white hover:opacity-90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </>) : <Button size="sm" variant="outline" onClick={()=>setTab('take-exam')}><FilePlus2 className="mr-1 h-3.5 w-3.5"/>Find exam</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
