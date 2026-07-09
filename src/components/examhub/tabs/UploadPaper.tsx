import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, X, Loader2, CheckCircle2, ExternalLink } from 'lucide-react'
import { Button, Input, Label, Textarea, Card, CardContent, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/index'
import { createPaper, uploadPaperFile, updatePaper, listSchools } from '@/lib/api'
import { LEVELS, SUBJECTS, PAPER_TYPES, type User } from '@/lib/types'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'

export function UploadPaper({ user }: { user: User }) {
  const { setTab, bump } = useStore()
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [type, setType] = useState('necta')
  const [description, setDescription] = useState('')
  const [schoolId, setSchoolId] = useState(user.school_id ?? '')
  const [schools, setSchools] = useState<{ id: string; name: string; region: string }[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [createdPaperId, setCreatedPaperId] = useState('')
  const [fileUrl, setFileUrl] = useState('')

  useEffect(() => {
    listSchools().then(s => setSchools((s ?? []) as { id: string; name: string; region: string }[]))
  }, [])

  const onPick = (f: File | null) => {
    setFile(f)
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
  }

  const submit = async () => {
    if (!title || !subject || !level || !year) { toast.error('Fill in title, subject, level and year'); return }
    setSaving(true)
    setUploadProgress(10)
    try {
      // 1. Create paper metadata row
      const paper = await createPaper({
        title, subject, level, year: Number(year),
        type, description: description || undefined,
        school_id: schoolId || null,
        file_name: file?.name,
        file_size: file?.size,
      })
      setCreatedPaperId(paper.id)
      setUploadProgress(40)

      // 2. Upload file to Supabase Storage (if file selected)
      if (file) {
        const url = await uploadPaperFile(file, paper.id)
        setFileUrl(url)
        // 3. Update paper row with file URL
        await updatePaper(paper.id, { file_url: url, file_path: `${paper.id}/${file.name}` } as Parameters<typeof updatePaper>[1])
        setUploadProgress(90)
      }

      setUploadProgress(100)
      setDone(true)
      bump()
      toast.success(file ? 'Paper uploaded with file — publish from Library' : 'Paper metadata saved as draft')
    } catch(e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
      setUploadProgress(0)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setTitle(''); setSubject(''); setLevel(''); setFile(null)
    setDone(false); setUploadProgress(0); setCreatedPaperId(''); setFileUrl('')
    setDescription('')
  }

  if (done) return (
    <Card><CardContent className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-7 w-7"/></div>
      <div>
        <p className="font-semibold text-lg">Paper uploaded successfully!</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          "{title}" is saved as <span className="font-medium">draft</span>. Publish it from the Library to make it visible to students.
          {fileUrl && <span className="block mt-1 text-green-600">✓ PDF uploaded to cloud storage</span>}
        </p>
      </div>
      {fileUrl && (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition-colors">
          <ExternalLink className="h-4 w-4" /> View uploaded file
        </a>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={reset}>Upload another</Button>
        <Button onClick={() => { sessionStorage.setItem('examhub:prefillPaperId', createdPaperId); setTab('create-exam') }}>Build Exam from this Paper</Button>
        <Button variant="secondary" onClick={() => setTab('library')}>Go to Library</Button>
      </div>
    </CardContent></Card>
  )

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Upload className="h-6 w-6 text-primary"/>Upload a Paper</h1>
        <p className="text-sm text-muted-foreground mt-1">Papers are saved as drafts. Files are uploaded to Supabase Storage. Publish from the Library when ready.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Paper details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* File dropzone */}
          <div>
            <Label>PDF / Document (optional)</Label>
            <div onClick={() => fileInput.current?.click()} onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); onPick(e.dataTransfer.files?.[0] ?? null) }}
              className="mt-1.5 cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors">
              {file ? (
                <div className="flex w-full items-center justify-between rounded-lg bg-card px-4 py-3 border shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary"/></div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); onPick(null) }} className="rounded-md p-1.5 hover:bg-accent shrink-0"><X className="h-4 w-4"/></button>
                </div>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Upload className="h-6 w-6"/></div>
                  <div><span className="font-semibold text-primary">Click to upload</span> <span className="text-muted-foreground text-sm">or drag & drop</span></div>
                  <p className="text-xs text-muted-foreground">PDF, DOCX — up to 25MB · Uploaded to Supabase Storage</p>
                </>
              )}
              <input ref={fileInput} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => onPick(e.target.files?.[0] ?? null)}/>
            </div>
          </div>

          {/* Progress bar */}
          {saving && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{uploadProgress < 40 ? 'Creating record…' : uploadProgress < 90 ? 'Uploading file…' : 'Finishing…'}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%`, background: 'var(--green)' }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Biology CSEE 2023 Paper 1"/>
            </div>
            <div>
              <Label>Subject *</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Choose subject"/></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Level *</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue placeholder="Choose level"/></SelectTrigger>
                <SelectContent>{LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="year">Year *</Label>
              <Input id="year" type="number" min="1990" max="2030" value={year} onChange={e => setYear(e.target.value)}/>
            </div>
            <div>
              <Label>Paper Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{PAPER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {user.role === 'super_admin' && (
              <div className="sm:col-span-2">
                <Label>School (optional)</Label>
                <Select value={schoolId || 'none'} onValueChange={v => setSchoolId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="No school — open to all"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No school (public) —</SelectItem>
                    {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.region}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional notes for students or reviewers"/>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setTab('library')}>Cancel</Button>
            <Button onClick={submit} disabled={saving} className="min-w-32">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
              {file ? 'Upload & Save' : 'Save Draft'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
