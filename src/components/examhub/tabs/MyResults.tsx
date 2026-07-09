import { useEffect, useState, useCallback } from 'react'
import { BarChart3, Loader2, Award, Inbox, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/index'
import { Badge } from '@/components/ui/index'
import { listSubmissions } from '@/lib/api'
import type { Submission, User } from '@/lib/types'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function MyResults({ user: _user }: { user: User }) {
  const [subs, setSubs] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const { nonce } = useStore()

  const load = useCallback(async () => {
    setLoading(true)
    try { const data = await listSubmissions({ mine: '1' }); setSubs(data) }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [nonce])

  useEffect(() => { load() }, [load])

  const published = subs.filter(s=>s.status==='published')
  const pending = subs.filter(s=>s.status!=='published')
  const avg = published.length ? published.reduce((s,x)=>s+(x.percentage??0),0)/published.length : 0
  const best = published.reduce((m,x)=>Math.max(m,x.percentage??0),0)

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary"/>My Results</h1><p className="text-sm text-muted-foreground mt-1">Your published exam results and pending submissions.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[{label:'Exams taken',value:String(subs.length)},{label:'Published',value:String(published.length)},{label:'Average',value:`${avg.toFixed(0)}%`},{label:'Best score',value:`${best.toFixed(0)}%`}].map(c=>(
          <Card key={c.label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{c.label}</p><p className="mt-1 text-2xl font-bold">{c.value}</p></CardContent></Card>
        ))}
      </div>
      {loading ? <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading…</div>
      : subs.length===0 ? <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center"><Inbox className="h-10 w-10 text-muted-foreground"/><p className="font-medium">No results yet</p><p className="text-sm text-muted-foreground">Take an exam to see your results here.</p></CardContent></Card>
      : <div className="space-y-4">
          {pending.length>0&&<div><h2 className="text-sm font-semibold text-muted-foreground mb-2">Pending</h2><div className="space-y-2">{pending.map(s=><Card key={s.id}><CardContent className="p-3 flex items-center justify-between"><div><p className="font-medium text-sm">{s.exam?.title}</p><p className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleDateString()}</p></div><Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 capitalize">{s.status.replace('_',' ')}</Badge></CardContent></Card>)}</div></div>}
          {published.length>0&&<div><h2 className="text-sm font-semibold text-muted-foreground mb-2">Published results</h2><div className="space-y-2">{published.map(s=>{const pct=s.percentage??0;const accent=pct>=80?'text-emerald-600':pct>=50?'text-amber-600':'text-rose-600';return(<Card key={s.id}><CardContent className="p-4 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium truncate">{s.exam?.title}</p><p className="text-xs text-muted-foreground">{s.exam?.subject} · {new Date(s.submitted_at).toLocaleDateString()}</p></div><div className="flex items-center gap-4 shrink-0"><div className="text-right"><div className="text-lg font-bold">{s.score}/{s.exam?.total_marks}</div><div className={cn('text-sm font-semibold',accent)}>{Math.round(pct)}%</div></div>{s.grade&&<Badge variant="secondary" className="text-base">Grade {s.grade}</Badge>}</div></CardContent></Card>)})}</div></div>}
        </div>}
    </div>
  )
}
