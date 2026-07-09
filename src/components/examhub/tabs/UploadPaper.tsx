import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Upload, FileText, X, Loader2, CheckCircle2, ExternalLink,
  Scan, Wand2, ChevronDown, ChevronUp, AlertCircle, Eye, FilePlus2,
} from 'lucide-react'
import {
  Button, Input, Label, Textarea, Card, CardContent, CardHeader,
  CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge,
} from '@/components/ui/index'
import { createPaper, uploadPaperFile, updatePaper, listSchools, createExam } from '@/lib/api'
import { LEVELS, SUBJECTS, PAPER_TYPES, QUESTION_TYPES, type User, type QuestionType } from '@/lib/types'
import { useStore } from '@/lib/store'
import { ocrImage, extractPdfText, parseQuestionsFromText, type OcrProgress, type ParsedQuestion } from '@/lib/ocr'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── types ────────────────────────────────────────────────────
interface QDraft extends ParsedQuestion {
  id: string
  correct_answer: string
  explanation: string
  difficulty: string
  marks_val: number
  time_limit: string
  qtype: QuestionType
  enabled: boolean
}

export function UploadPaper({ user }: { user: User }) {
  const { setTab, bump } = useStore()
  const fileInput = useRef<HTMLInputElement>(null)

  // paper meta
  const [title, setTitle]       = useState('')
  const [subject, setSubject]   = useState('')
  const [level, setLevel]       = useState('')
  const [year, setYear]         = useState(String(new Date().getFullYear()))
  const [type, setType]         = useState('necta')
  const [description, setDescription] = useState('')
  const [schoolId, setSchoolId] = useState(user.school_id ?? '')
  const [schools, setSchools]   = useState<{ id: string; name: string; region: string }[]>([])

  // file
  const [file, setFile] = useState<File | null>(null)
  const isPdf  = file?.type === 'application/pdf'
  const isImage = file?.type.startsWith('image/')

  // upload state
  const [saving, setSaving]         = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMsg, setUploadMsg]   = useState('')
  const [done, setDone]             = useState(false)
  const [createdPaperId, setCreatedPaperId] = useState('')
  const [fileUrl, setFileUrl]       = useState('')

  // OCR state
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null)
  const [rawText, setRawText]       = useState('')
  const [showRaw, setShowRaw]       = useState(false)
  const [parsedQs, setParsedQs]     = useState<QDraft[]>([])
  const [showQs, setShowQs]         = useState(false)
  const [buildingExam, setBuildingExam] = useState(false)

  useEffect(() => {
    listSchools()
      .then(s => setSchools((s ?? []) as { id: string; name: string; region: string }[]))
      .catch(() => {})
  }, [])

  const onPick = (f: File | null) => {
    setFile(f)
    setRawText(''); setParsedQs([]); setShowQs(false); setOcrProgress(null)
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
  }

  // ── OCR / extraction ──────────────────────────────────────
  const runOcr = useCallback(async () => {
    if (!file) return
    setOcrRunning(true)
    setRawText(''); setParsedQs([]); setShowQs(false)
    try {
      let text = ''
      const onP = (p: OcrProgress) => setOcrProgress(p)

      if (isPdf) {
        const result = await extractPdfText(file, onP)
        text = result.text
        if (result.isScanned) toast.info('Scanned PDF — OCR applied to each page')
      } else if (isImage) {
        text = await ocrImage(file, onP)
      }

      setRawText(text)
      const qs = parseQuestionsFromText(text)
      if (qs.length > 0) {
        setParsedQs(qs.map((q, i) => ({
          ...q,
          id: `ocr-${i}`,
          correct_answer: '',
          explanation: '',
          difficulty: 'medium',
          marks_val: q.marks ?? 1,
          time_limit: '',
          qtype: q.type as QuestionType,
          enabled: true,
        })))
        setShowQs(true)
        toast.success(`Found ${qs.length} question${qs.length > 1 ? 's' : ''} — review and add answers below`)
      } else {
        toast.info('No questions auto-detected — check the raw text and add questions manually')
        setShowRaw(true)
      }
    } catch(e) {
      toast.error(e instanceof Error ? e.message : 'OCR failed')
    } finally {
      setOcrRunning(false)
      setOcrProgress(null)
    }
  }, [file, isPdf, isImage])

  const updQ = (id: string, patch: Partial<QDraft>) =>
    setParsedQs(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q))

  // ── Upload paper + optionally build exam ─────────────────
  const submit = async (buildExam = false) => {
    if (!title || !subject || !level || !year) { toast.error('Fill in title, subject, level and year'); return }
    setSaving(true); setUploadProgress(5); setUploadMsg('Saving paper record…')
    try {
      const paper = await createPaper({
        title, subject, level, year: Number(year), type,
        description: description || undefined,
        school_id: schoolId || null,
        file_name: file?.name, file_size: file?.size,
      })
      setCreatedPaperId(paper.id)
      setUploadProgress(30); setUploadMsg('Uploading file…')

      let url = ''
      if (file) {
        url = await uploadPaperFile(file, paper.id)
        setFileUrl(url)
        await updatePaper(paper.id, { file_url: url, file_path: `${paper.id}/${file.name}` } as Parameters<typeof updatePaper>[1])
      }
      setUploadProgress(70); setUploadMsg('Finalising…')

      if (buildExam && parsedQs.filter(q => q.enabled).length > 0) {
        setBuildingExam(true); setUploadMsg('Creating exam with parsed questions…')
        const enabled = parsedQs.filter(q => q.enabled)
        await createExam({
          title: `${title} — Exam`,
          subject, level, exam_type: 'exam',
          duration_mins: Math.max(30, enabled.length * 2),
          total_marks: 0,
          status: 'draft',
          show_answer_after: true,
          is_online: true,
          paper_id: paper.id,
          school_id: schoolId || null,
          questions: enabled.map((q, i) => ({
            type: q.qtype,
            text: q.text,
            options: q.options,
            correct_answer: q.correct_answer || '',
            explanation: q.explanation || undefined,
            marks: q.marks_val,
            difficulty: q.difficulty,
            time_limit_secs: q.time_limit ? Number(q.time_limit) : undefined,
            order: i,
          })),
        })
        setBuildingExam(false)
      }

      setUploadProgress(100); setUploadMsg('Done!')
      setDone(true); bump()
      toast.success(buildExam && parsedQs.filter(q=>q.enabled).length > 0 ? 'Paper uploaded + exam draft created!' : 'Paper uploaded!')
    } catch(e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
      setUploadProgress(0)
    } finally {
      setSaving(false); setBuildingExam(false)
    }
  }

  const reset = () => {
    setTitle(''); setSubject(''); setLevel(''); setFile(null)
    setDone(false); setUploadProgress(0); setCreatedPaperId(''); setFileUrl('')
    setDescription(''); setRawText(''); setParsedQs([]); setShowQs(false)
  }

  // ── Done screen ───────────────────────────────────────────
  if (done) return (
    <Card><CardContent className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="h-7 w-7"/>
      </div>
      <div>
        <p className="font-semibold text-lg">Paper uploaded successfully!</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          "{title}" saved as draft. Publish from the Library when ready.
          {fileUrl && <span className="block mt-1 text-emerald-600">✓ File in Supabase Storage</span>}
        </p>
      </div>
      {fileUrl && (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors">
          <ExternalLink className="h-4 w-4"/> View uploaded file
        </a>
      )}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="outline" onClick={reset}>Upload another</Button>
        <Button onClick={() => { sessionStorage.setItem('examhub:prefillPaperId', createdPaperId); setTab('create-exam') }}>
          <FilePlus2 className="mr-2 h-4 w-4"/> Build Exam manually
        </Button>
        <Button variant="secondary" onClick={() => setTab('library')}>Go to Library</Button>
      </div>
    </CardContent></Card>
  )

  const enabledCount = parsedQs.filter(q => q.enabled).length

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Upload className="h-6 w-6 text-primary"/> Upload a Paper
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload PDF or image — OCR extracts questions automatically. Add answers, then create an exam in one click.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        {/* ── Left: meta form ── */}
        <Card>
          <CardHeader><CardTitle className="text-base">Paper details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Dropzone */}
            <div>
              <Label htmlFor="paper-file">File (PDF / Image / DOCX)</Label>
              <label htmlFor="paper-file"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); onPick(e.dataTransfer.files?.[0] ?? null) }}
                className="mt-1.5 cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors">
                {file ? (
                  <div className="flex w-full items-center justify-between rounded-lg bg-card px-4 py-3 border shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary"/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size/1024/1024).toFixed(2)} MB · {file.type}</p>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); onPick(null) }} className="rounded-md p-1.5 hover:bg-accent shrink-0">
                      <X className="h-4 w-4"/>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Upload className="h-6 w-6"/>
                    </div>
                    <div><span className="font-semibold text-primary">Click to upload</span> <span className="text-muted-foreground text-sm">or drag & drop</span></div>
                    <p className="text-xs text-muted-foreground">PDF, PNG, JPG, DOCX — up to 25MB</p>
                  </>
                )}
                <input id="paper-file" ref={fileInput} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden"
                  aria-label="Choose paper file to upload"
                  onChange={e => onPick(e.target.files?.[0] ?? null)}/>
              </label>
            </div>

            {/* Progress */}
            {(saving || ocrRunning) && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{ocrRunning ? (ocrProgress?.message ?? 'Processing…') : uploadMsg}</span>
                  <span>{ocrRunning ? `${ocrProgress?.progress ?? 0}%` : `${uploadProgress}%`}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <progress className="h-full w-full rounded-full bg-muted accent-green" value={ocrRunning ? (ocrProgress?.progress ?? 0) : uploadProgress} max={100} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Biology CSEE 2023 Paper 1"/>
              </div>
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject"><SelectValue placeholder="Choose subject"/></SelectTrigger>
                  <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="level">Level *</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger id="level"><SelectValue placeholder="Choose level"/></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="year">Year *</Label>
                <Input id="year" type="number" min="1990" max="2030" value={year} onChange={e => setYear(e.target.value)}/>
              </div>
              <div>
                <Label htmlFor="paper-type">Paper Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="paper-type"><SelectValue/></SelectTrigger>
                  <SelectContent>{PAPER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {user.role === 'super_admin' && (
                <div className="sm:col-span-2">
                  <Label htmlFor="school">School</Label>
                  <Select value={schoolId||'none'} onValueChange={v => setSchoolId(v==='none'?'':v)}>
                    <SelectTrigger id="school"><SelectValue placeholder="No school — public"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No school (public) —</SelectItem>
                      {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.region}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional notes…"/>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setTab('library')}>Cancel</Button>
              <div className="flex-1"/>
              {parsedQs.length > 0 && enabledCount > 0 && (
                <Button variant="secondary" onClick={() => submit(true)} disabled={saving || ocrRunning}>
                  {saving && buildingExam ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                  Upload + Create Exam ({enabledCount} Qs)
                </Button>
              )}
              <Button onClick={() => submit(false)} disabled={saving || ocrRunning} className="min-w-32">
                {saving && !buildingExam ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                {file ? 'Upload & Save' : 'Save Draft'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Right: OCR panel ── */}
        <div className="space-y-4">
          {/* OCR action card */}
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-primary"/>
                <span className="font-semibold text-sm">Smart OCR & Question Parser</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Drop a PDF or image of an exam paper. ExamHub will extract the text, detect questions, and let you add answers — then create a full exam in one click.
              </p>
              <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-xs">
                <p className="font-medium">Supported:</p>
                <p>📄 Text PDFs — instant extraction</p>
                <p>🖼️ Scanned PDFs / Images — Tesseract OCR (runs in browser)</p>
                <p>📋 NECTA, mock, school exam layouts</p>
              </div>
              <Button className="w-full bg-navy" onClick={runOcr}
                disabled={!file || (!isPdf && !isImage) || ocrRunning || saving}>
                {ocrRunning
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{ocrProgress?.message ?? 'Processing…'}</>
                  : <><Scan className="mr-2 h-4 w-4"/>Extract & Parse Questions</>}
              </Button>
              {file && !isPdf && !isImage && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5"/> OCR supports PDF and images only. DOCX stored as-is.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Raw text preview */}
          {rawText && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <button onClick={() => setShowRaw(v => !v)}
                  className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground">
                  <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5"/>Raw extracted text</span>
                  {showRaw ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                </button>
                {showRaw && (
                  <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {rawText}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Parsed questions ── */}
      {parsedQs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary"/> Detected Questions
                  <Badge variant="secondary">{enabledCount} / {parsedQs.length} selected</Badge>
                </CardTitle>
              </div>
              <button onClick={() => setShowQs(v => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                {showQs ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                {showQs ? 'Collapse' : 'Expand'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add correct answers and explanations. Toggle off questions you don't want. Then click "Upload + Create Exam".
            </p>
          </CardHeader>

          {showQs && (
            <CardContent className="space-y-3 pt-0">
              {parsedQs.map(q => (
                <div key={q.id} className={cn(
                  'rounded-xl border p-3 space-y-3 transition-opacity',
                  !q.enabled && 'opacity-40'
                )}>
                  {/* Q header */}
                  <div className="flex items-start gap-2">
                    <input type="checkbox" aria-label={`Include question ${q.number}`} checked={q.enabled} onChange={e => updQ(q.id, { enabled: e.target.checked })}
                      className="h-4 w-4 mt-0.5 accent-green-600 shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <Badge variant="outline" className="text-xs">Q{q.number}</Badge>
                        <Select value={q.qtype} onValueChange={v => updQ(q.id, { qtype: v as QuestionType })}>
                          <SelectTrigger className="h-6 w-32 text-xs"><SelectValue/></SelectTrigger>
                          <SelectContent>{QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={q.difficulty} onValueChange={v => updQ(q.id, { difficulty: v })}>
                          <SelectTrigger className="h-6 w-24 text-xs"><SelectValue/></SelectTrigger>
                          <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Marks</Label>
                          <Input type="number" min={1} value={q.marks_val}
                            onChange={e => updQ(q.id, { marks_val: Number(e.target.value)||1 })}
                            className="h-6 w-14 text-xs"/>
                        </div>
                      </div>
                      <p className="text-sm">{q.text}</p>
                    </div>
                  </div>

                  {/* MCQ options (detected) */}
                  {q.options.length > 0 && (
                    <div className="ml-6 grid grid-cols-2 gap-1">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={cn(
                          'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-colors',
                          q.correct_answer === String(oi) ? 'border-green-400 bg-green-50 text-green-800' : 'border-border'
                        )}>
                          <input type="radio" aria-label={`Correct answer ${String.fromCharCode(65+oi)} for question ${q.number}`} name={`cr-${q.id}`} checked={q.correct_answer===String(oi)}
                            onChange={() => updQ(q.id, { correct_answer: String(oi) })} className="h-3 w-3 accent-green-600"/>
                          <span>{String.fromCharCode(65+oi)}. {opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answer + explanation */}
                  <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.length === 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Correct answer</Label>
                        <Input value={q.correct_answer} onChange={e => updQ(q.id, { correct_answer: e.target.value })}
                          placeholder={q.qtype==='essay' ? 'Marking guide…' : 'Expected answer…'} className="h-7 text-xs"/>
                      </div>
                    )}
                    <div className={q.options.length === 0 ? '' : 'sm:col-span-2'}>
                      <Label className="text-xs text-muted-foreground">Explanation (shown after answer)</Label>
                      <Input value={q.explanation} onChange={e => updQ(q.id, { explanation: e.target.value })}
                        placeholder="Optional explanation…" className="h-7 text-xs"/>
                    </div>
                  </div>
                </div>
              ))}

              {enabledCount > 0 && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button className="flex-1 bg-green" onClick={() => submit(true)} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                    Upload Paper + Create Exam Draft ({enabledCount} questions)
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
