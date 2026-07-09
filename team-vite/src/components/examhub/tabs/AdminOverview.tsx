import { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, Loader2, FileText, FilePlus2, Users, ClipboardCheck, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui/index'
import { getStats } from '@/lib/api'
import type { User } from '@/lib/types'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'

export function AdminOverview({ user: _user }: { user: User }) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getStats>>|null>(null)
  const [loading, setLoading] = useState(true)
  const { nonce } = useStore()
  const load = useCallback(async () => { setLoading(true); try { setStats(await getStats()) } catch(e) { toast.error(e instanceof Error?e.message:'Failed') } finally { setLoading(false) } }, [nonce])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary"/>Admin Overview</h1><p className="text-sm text-muted-foreground mt-1">Platform-wide snapshot.</p></div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>{loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<RefreshCw className="mr-2 h-4 w-4"/>}Refresh</Button>
      </div>
      {loading ? <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading…</div>
      : !stats ? <Card><CardContent className="py-10 text-center text-muted-foreground">No data.</CardContent></Card>
      : <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {label:'Papers',value:stats.papers,icon:<FileText className="h-5 w-5"/>,sub:`${stats.publishedPapers} published · ${stats.draftPapers} drafts`},
            {label:'Exams',value:stats.exams,icon:<FilePlus2 className="h-5 w-5"/>,sub:`${stats.publishedExams} published`},
            {label:'Submissions',value:stats.submissions,icon:<ClipboardCheck className="h-5 w-5"/>,sub:`${stats.reviewedSubs} results published`},
            {label:'Students',value:stats.students,icon:<Users className="h-5 w-5"/>,sub:'Registered'},
          ].map(c=>(
            <Card key={c.label}><CardContent className="p-4">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">{c.label}</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{c.icon}</span></div>
              <p className="mt-2 text-3xl font-bold">{c.value}</p><p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
            </CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-base">Workflow status</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            {[
              {label:'Papers published',value:`${stats.publishedPapers}/${stats.papers}`,pct:stats.papers?(stats.publishedPapers/stats.papers)*100:0,color:'bg-emerald-500'},
              {label:'Exams published',value:`${stats.publishedExams}/${stats.exams}`,pct:stats.exams?(stats.publishedExams/stats.exams)*100:0,color:'bg-sky-500'},
              {label:'Results published',value:`${stats.reviewedSubs}/${stats.submissions}`,pct:stats.submissions?(stats.reviewedSubs/stats.submissions)*100:0,color:'bg-violet-500'},
            ].map(r=>(
              <div key={r.label}><div className="flex items-center justify-between mb-1"><span>{r.label}</span><span className="font-medium text-foreground">{r.value}</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full ${r.color} transition-all`} style={{width:`${Math.min(100,r.pct)}%`}}/></div></div>
            ))}
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Super Admin powers</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="ml-4 list-disc space-y-1"><li>Manage all papers, exams & submissions across all schools</li><li>Publish or archive any paper</li><li>Review and publish any student submission</li></ul>
            <p className="pt-2"><Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200">Super Admin</Badge> Scope: <span className="font-medium text-foreground">All schools</span></p>
          </CardContent></Card>
        </div>
      </>}
    </div>
  )
}
