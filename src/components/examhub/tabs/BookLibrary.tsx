import { useEffect, useState, useCallback } from 'react'
import {
  BookOpen, Search, Upload, Plus, Loader2, Inbox, Download,
  ExternalLink, Trash2, FileText, Video, Newspaper, BookMarked,
  Filter, Star, Globe, Lock,
} from 'lucide-react'
import {
  Button, Input, Badge, Card, CardContent, Select, SelectContent,
  SelectItem, SelectTrigger, SelectValue, Dialog, DialogContent,
  DialogHeader, DialogTitle, DialogTrigger, Label, Textarea,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/index'
import {
  listLibraryResources, createLibraryResource, updateLibraryResource,
  deleteLibraryResource, uploadLibraryFile,
} from '@/lib/api'
import {
  LEVELS, SUBJECTS, RESOURCE_TYPES, levelLabel,
  type LibraryResource, type User, type ResourceType,
} from '@/lib/types'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const canContribute = (r: string) => ['teacher','super_admin'].includes(r)

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  book: BookOpen, notes: FileText, video: Video,
  article: Newspaper, past_paper: BookMarked, syllabus: FileText,
}
const TYPE_COLOR: Record<string, string> = {
  book: 'bg-blue-100 text-blue-700',
  notes: 'bg-green-100 text-green-700',
  video: 'bg-red-100 text-red-700',
  article: 'bg-amber-100 text-amber-700',
  past_paper: 'bg-purple-100 text-purple-700',
  syllabus: 'bg-sky-100 text-sky-700',
}

export function BookLibrary({ user }: { user: User }) {
  const [resources, setResources] = useState<LibraryResource[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const { nonce, bump } = useStore()
  const contributor = canContribute(user.role)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string,string> = {}
      if (typeFilter !== 'all') params.type = typeFilter
      if (subjectFilter !== 'all') params.subject = subjectFilter
      if (levelFilter !== 'all') params.level = levelFilter
      // admins see all including drafts
      if (contributor) params.status = 'all'
      const data = await listLibraryResources(params)
      const filtered = q.trim() ? data.filter(r =>
        r.title.toLowerCase().includes(q.toLowerCase()) ||
        (r.description ?? '').toLowerCase().includes(q.toLowerCase()) ||
        (r.author ?? '').toLowerCase().includes(q.toLowerCase())
      ) : data
      setResources(filtered)
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [typeFilter, subjectFilter, levelFilter, q, nonce, contributor])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    try { await deleteLibraryResource(id); toast.success('Resource deleted'); bump() }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const handlePublish = async (r: LibraryResource) => {
    try {
      await updateLibraryResource(r.id, { status: r.status === 'published' ? 'draft' : 'published' } as Partial<LibraryResource>)
      toast.success(r.status === 'published' ? 'Moved to draft' : 'Published!')
      bump()
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  const byType = RESOURCE_TYPES.reduce((acc, t) => {
    acc[t.value] = resources.filter(r => r.type === t.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary"/> Book Library & Study Resources
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Textbooks, study notes, past papers, syllabi and more — contributed by schools and teachers.
          </p>
        </div>
        {contributor && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button style={{ background: 'var(--green)' }} className="text-white hover:opacity-90">
                <Plus className="mr-2 h-4 w-4"/> Add Resource
              </Button>
            </DialogTrigger>
            <AddResourceDialog onClose={() => setAddOpen(false)} onSaved={() => { bump(); setAddOpen(false) }} user={user}/>
          </Dialog>
        )}
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTypeFilter('all')}
          className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
            typeFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:bg-accent')}>
          All <span className="opacity-60">({resources.length})</span>
        </button>
        {RESOURCE_TYPES.map(t => {
          const Icon = TYPE_ICON[t.value] ?? BookOpen
          return (
            <button key={t.value} onClick={() => setTypeFilter(t.value)}
              className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
                typeFilter === t.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:bg-accent')}>
              <Icon className="h-3.5 w-3.5"/> {t.label}
              {byType[t.value] > 0 && <span className="opacity-60">({byType[t.value]})</span>}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="relative col-span-1 sm:col-span-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
          <Input placeholder="Search title, author…" value={q} onChange={e => setQ(e.target.value)} className="pl-8"/>
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger><SelectValue placeholder="All subjects"/></SelectTrigger>
          <SelectContent><SelectItem value="all">All subjects</SelectItem>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger><SelectValue placeholder="All levels"/></SelectTrigger>
          <SelectContent><SelectItem value="all">All levels</SelectItem>{LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin"/> Loading resources…
        </div>
      ) : resources.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground"/>
          <p className="font-medium">No resources found</p>
          <p className="text-sm text-muted-foreground">
            {contributor ? 'Add the first resource using the button above.' : 'Check back soon — teachers and schools are adding materials.'}
          </p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map(r => {
            const Icon = TYPE_ICON[r.type] ?? BookOpen
            return (
              <Card key={r.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                {/* Cover / type banner */}
                <div className={cn('flex items-center justify-center h-24 relative', r.cover_url ? '' : TYPE_COLOR[r.type] ?? 'bg-muted')}>
                  {r.cover_url ? (
                    <img src={r.cover_url} alt="" className="w-full h-full object-cover"/>
                  ) : (
                    <Icon className="h-12 w-12 opacity-30"/>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant="secondary" className={cn('text-xs', TYPE_COLOR[r.type])}>{RESOURCE_TYPES.find(t=>t.value===r.type)?.label}</Badge>
                    {r.is_free ? (
                      <Badge className="text-xs bg-green-100 text-green-700"><Globe className="h-2.5 w-2.5 mr-0.5"/>Free</Badge>
                    ) : (
                      <Badge className="text-xs bg-amber-100 text-amber-700"><Lock className="h-2.5 w-2.5 mr-0.5"/>Premium</Badge>
                    )}
                    {r.status === 'draft' && <Badge className="text-xs bg-gray-100 text-gray-600">Draft</Badge>}
                  </div>
                </div>
                <CardContent className="flex-1 p-4 flex flex-col gap-2">
                  <h3 className="font-semibold leading-snug line-clamp-2">{r.title}</h3>
                  {r.author && <p className="text-xs text-muted-foreground">by {r.author}{r.publisher ? ` · ${r.publisher}` : ''}{r.year ? ` (${r.year})` : ''}</p>}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">{r.subject}</Badge>
                    {r.level && <Badge variant="outline" className="text-xs">{levelLabel(r.level)}</Badge>}
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
                    <Download className="h-3 w-3"/> {r.download_count} downloads
                    <span className="ml-auto">by {r.contributed_by?.name ?? '—'}</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    {r.file_url ? (
                      <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button size="sm" className="w-full" style={{ background: 'var(--navy)' }}>
                          <Download className="mr-1 h-3.5 w-3.5 text-white"/> Download
                        </Button>
                      </a>
                    ) : r.external_url ? (
                      <a href={r.external_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">
                          <ExternalLink className="mr-1 h-3.5 w-3.5"/> Open Link
                        </Button>
                      </a>
                    ) : null}
                    {contributor && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handlePublish(r)}>
                          {r.status === 'published' ? 'Unpublish' : 'Publish'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive px-2">
                              <Trash2 className="h-3.5 w-3.5"/>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete "{r.title}"?</AlertDialogTitle>
                              <AlertDialogDescription>This permanently removes this resource.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-white">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AddResourceDialog({ onClose, onSaved, user: _user }: { onClose: () => void; onSaved: () => void; user: User }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ResourceType>('book')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [description, setDescription] = useState('')
  const [author, setAuthor] = useState('')
  const [publisher, setPublisher] = useState('')
  const [year, setYear] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [isFree, setIsFree] = useState(true)
  const [file, setFile] = useState<File|null>(null)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)

  const submit = async (publish: boolean) => {
    if (!title || !subject) { toast.error('Title and subject are required'); return }
    setSaving(true)
    setProgress(20)
    try {
      const resource = await createLibraryResource({
        title, type, subject, level: level || null,
        description: description || null,
        author: author || null, publisher: publisher || null,
        year: year ? Number(year) : null,
        external_url: externalUrl || null,
        is_free: isFree,
        status: publish ? 'published' : 'draft',
        file_name: file?.name, file_size: file?.size,
      })
      setProgress(50)
      if (file) {
        const url = await uploadLibraryFile(file, resource.id)
        await updateLibraryResource(resource.id, { file_url: url } as Partial<LibraryResource>)
      }
      setProgress(100)
      toast.success(publish ? 'Resource published!' : 'Saved as draft')
      onSaved()
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/>Add Study Resource</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {RESOURCE_TYPES.map(t => {
            const Icon = TYPE_ICON[t.value] ?? BookOpen
            return (
              <button key={t.value} type="button" onClick={() => setType(t.value as ResourceType)}
                className={cn('flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors text-left',
                  type === t.value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-accent')}>
                <span className="text-lg">{RESOURCE_TYPES.find(x=>x.value===t.value)?.icon}</span> {t.label}
              </button>
            )
          })}
        </div>
        <div><Label>Title *</Label><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Advanced Mathematics Form 4"/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Subject *</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Choose"/></SelectTrigger>
              <SelectContent>{SUBJECTS.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Level</Label>
            <Select value={level||'all'} onValueChange={v=>setLevel(v==='all'?'':v)}>
              <SelectTrigger><SelectValue placeholder="All levels"/></SelectTrigger>
              <SelectContent><SelectItem value="all">All levels</SelectItem>{LEVELS.map(l=><SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Author</Label><Input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Author name"/></div>
          <div><Label>Year</Label><Input type="number" value={year} onChange={e=>setYear(e.target.value)} placeholder="2024"/></div>
        </div>
        <div><Label>Description</Label><Textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2} placeholder="Brief description…"/></div>
        <div><Label>External URL (YouTube, website, etc.)</Label><Input value={externalUrl} onChange={e=>setExternalUrl(e.target.value)} placeholder="https://…"/></div>
        <div>
          <Label>Upload File (PDF, EPUB, etc.)</Label>
          <div onClick={() => document.getElementById('lib-file')?.click()}
            className="mt-1 cursor-pointer flex items-center gap-3 rounded-xl border-2 border-dashed border-border p-4 hover:border-primary/50 transition-colors">
            <Upload className="h-6 w-6 text-muted-foreground shrink-0"/>
            <div className="text-sm">{file ? <span className="font-medium text-primary">{file.name} ({(file.size/1024/1024).toFixed(1)}MB)</span> : <span>Click to select file <span className="text-muted-foreground">· up to 100MB</span></span>}</div>
            <input id="lib-file" type="file" className="hidden" accept=".pdf,.epub,.doc,.docx,.mp4" onChange={e=>setFile(e.target.files?.[0]??null)}/>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="isFree" checked={isFree} onChange={e=>setIsFree(e.target.checked)} className="h-4 w-4"/>
          <label htmlFor="isFree" className="text-sm font-medium cursor-pointer">Free to access (no payment required)</label>
        </div>
        {saving && (
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--green)' }}/>
          </div>
        )}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="secondary" onClick={() => submit(false)} disabled={saving} className="flex-1">Save Draft</Button>
          <Button onClick={() => submit(true)} disabled={saving} className="flex-1" style={{ background: 'var(--green)' }}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}Publish
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}
