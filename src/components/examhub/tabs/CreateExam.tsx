import { useEffect, useState, useRef } from 'react'
import {
  FilePlus2, Plus, Trash2, GripVertical, Loader2, Save, Send,
  ChevronUp, ChevronDown, Link2, Timer, Wifi, TableIcon, BarChart3,
  Sigma, Eye, EyeOff, AlertCircle, ImageIcon, X,
} from 'lucide-react'
import {
  Button, Input, Label, Textarea, Card, CardContent, CardHeader, CardTitle,
  Badge, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator,
} from '@/components/ui/index'
import { listPapers, createExam, uploadQuestionImage } from '@/lib/api'
import {
  LEVELS, SUBJECTS, QUESTION_TYPES, EXAM_TYPES, FORMULA_TEMPLATES,
  type QuestionType, type User, type Paper, type QuestionTableData, type QuestionGraphData,
} from '@/lib/types'
import { useStore } from '@/lib/store'
import { MathRenderer, MathBlock } from '../MathRenderer'
import { DataTable, SimpleChart } from '../SimpleChart'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface QDraft {
  id: string; type: QuestionType; text: string
  options: string[]; correct_answer: string; marks: number
  difficulty: string; explanation: string; time_limit_secs: string
  formula: string
  image_url: string
  table_data: QuestionTableData
  graph_data: QuestionGraphData
}

let qid = 0
const newQ = (): QDraft => ({
  id: `q-${++qid}`, type: 'mcq', text: '', options: ['', '', '', ''],
  correct_answer: '', marks: 1, difficulty: 'medium', explanation: '',
  time_limit_secs: '', formula: '', image_url: '',
  table_data: { headers: ['Column 1', 'Column 2'], rows: [['', '']] },
  graph_data: { type: 'bar', title: '', labels: ['A', 'B', 'C'], datasets: [{ label: 'Series 1', data: [0, 0, 0] }] },
})

export function CreateExam({ user }: { user: User }) {
  const { setTab, bump } = useStore()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [duration, setDuration] = useState('60')
  const [examType, setExamType] = useState('exam')
  const [perQTimer, setPerQTimer] = useState('')
  const [showAnswerAfter, setShowAnswerAfter] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [paperId, setPaperId] = useState('')
  const [passMark, setPassMark] = useState('40')
  const [papers, setPapers] = useState<Paper[]>([])
  const [questions, setQuestions] = useState<QDraft[]>([newQ()])
  const [saving, setSaving] = useState(false)
  // A teacher is "independent" only when they have NO school linked.
  // School-linked teachers must keep their school_id on created exams.
  const isIndependent = user.role === 'teacher' && !user.school_id

  useEffect(() => {
    const pid = sessionStorage.getItem('examhub:prefillPaperId')
    if (pid) { setPaperId(pid); sessionStorage.removeItem('examhub:prefillPaperId') }
    listPapers({}).then(r => setPapers(r)).catch(() => {})
  }, [])

  const prefillPaper = papers.find(p => p.id === paperId)
  useEffect(() => {
    if (prefillPaper && !title) {
      setTitle(`${prefillPaper.subject} — ${prefillPaper.level.replace('_', ' ')} Exam`)
      setSubject(prefillPaper.subject)
      setLevel(prefillPaper.level)
    }
  }, [prefillPaper, title])

  const upd = (id: string, patch: Partial<QDraft>) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q))
  const remove = (id: string) => setQuestions(qs => qs.length === 1 ? qs : qs.filter(q => q.id !== id))
  const move = (id: string, dir: -1 | 1) => setQuestions(qs => {
    const i = qs.findIndex(q => q.id === id), j = i + dir
    if (i < 0 || j < 0 || j >= qs.length) return qs
    const c = [...qs]; [c[i], c[j]] = [c[j], c[i]]; return c
  })

  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)

  const build = async (publish: boolean) => {
    if (!title || !subject || !level || !duration) { toast.error('Fill in title, subject, level and duration'); return }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim() && !q.formula.trim()) { toast.error(`Question ${i + 1}: add question text`); return }
      if (q.type === 'mcq') {
        const opts = q.options.filter(o => o.trim())
        if (opts.length < 2) { toast.error(`Q${i + 1}: add at least 2 options`); return }
        if (q.correct_answer === '' || Number(q.correct_answer) >= opts.length) { toast.error(`Q${i + 1}: select correct option`); return }
      } else if (!['essay', 'table', 'graph'].includes(q.type) && !q.correct_answer.trim()) {
        toast.error(`Q${i + 1}: add correct answer`); return
      }
    }
    setSaving(true)
    try {
      const cleanQs = questions.map(q => ({
        type: q.type, text: q.text.trim(),
        options: q.type === 'mcq' ? q.options.filter(o => o.trim()) : [],
        correct_answer: q.correct_answer.trim(),
        marks: Number(q.marks) || 1, difficulty: q.difficulty,
        explanation: q.explanation.trim() || undefined,
        time_limit_secs: q.time_limit_secs ? Number(q.time_limit_secs) : undefined,
        formula: q.formula.trim() || undefined,
        image_url: q.image_url.trim() || undefined,
        table_data: ['table'].includes(q.type) ? JSON.stringify(q.table_data) : undefined,
        graph_data: ['graph'].includes(q.type) ? JSON.stringify(q.graph_data) : undefined,
      }))
      await createExam({
        title, subject, level, exam_type: examType,
        duration_mins: Number(duration),
        per_question_timer: perQTimer ? Number(perQTimer) : null,
        show_answer_after: showAnswerAfter, is_online: isOnline,
        description: description || undefined,
        instructions: instructions || undefined,
        pass_mark: Number(passMark) || 40,
        paper_id: paperId || undefined,
        school_id: isIndependent ? null : user.school_id,
        status: publish ? 'published' : 'draft',
        questions: cleanQs,
      })
      bump(); toast.success(publish ? 'Exam published!' : 'Saved as draft'); setTab('my-exams')
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Save failed') }
    finally { setSaving(false) }
  }

  const formulaTemplates = subject ? (FORMULA_TEMPLATES[subject] ?? []) : []

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FilePlus2 className="h-6 w-6 text-primary"/> Create Exam / Quiz
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build exams with MCQ, True/False, Short Answer, Essay, Math Formulas (LaTeX), Data Tables and Graphs.
          {isIndependent && <span className="ml-2 text-amber-600 font-medium">· Independent teacher — not linked to a school</span>}
        </p>
      </div>

      {/* Exam meta */}
      <Card>
        <CardHeader><CardTitle className="text-base">Exam details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Biology Form 4 — Cell Biology Quiz"/></div>
          <div><Label>Type</Label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{EXAM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Subject *</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Choose subject"/></SelectTrigger>
              <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Level *</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue placeholder="Choose level"/></SelectTrigger>
              <SelectContent>{LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Duration (minutes)</Label><Input type="number" value={duration} onChange={e => setDuration(e.target.value)}/></div>
          <div><Label>Pass mark (%)</Label><Input type="number" value={passMark} onChange={e => setPassMark(e.target.value)} placeholder="40"/></div>
          <div><Label className="flex items-center gap-1"><Timer className="h-3.5 w-3.5 text-amber-500"/>Per-question timer (seconds)</Label>
            <Input type="number" value={perQTimer} onChange={e => setPerQTimer(e.target.value)} placeholder="blank = no timer"/></div>
          <div><Label>Link to paper</Label>
            <Select value={paperId || 'none'} onValueChange={v => setPaperId(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="None"/></SelectTrigger>
              <SelectContent><SelectItem value="none">— None —</SelectItem>{papers.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
            </Select>
            {prefillPaper && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Link2 className="h-3 w-3"/>Linked to "{prefillPaper.title}"</p>}
          </div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What this exam covers"/></div>
          <div className="sm:col-span-2"><Label>Instructions for students</Label><Textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2} placeholder="e.g. Attempt ALL questions. Show all working for calculation questions."/></div>
          <div className="sm:col-span-2 flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <Switch id="showAns" checked={showAnswerAfter} onCheckedChange={setShowAnswerAfter}/>
              <Label htmlFor="showAns" className="cursor-pointer">
                <span className="font-medium">Show answer after each question</span>
                <span className="text-xs text-muted-foreground block">Reveal correct answer + explanation immediately</span>
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="online" checked={isOnline} onCheckedChange={setIsOnline}/>
              <Label htmlFor="online" className="cursor-pointer">
                <span className="font-medium flex items-center gap-1"><Wifi className="h-3.5 w-3.5"/>Online exam</span>
                <span className="text-xs text-muted-foreground block">Shows 🔴 Online badge for students</span>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Questions</h2>
          <Badge variant="secondary">{questions.length} questions · {totalMarks} marks</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => setQuestions(qs => [...qs, newQ()])}>
          <Plus className="mr-1 h-4 w-4"/> Add question
        </Button>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionEditor
            key={q.id} index={i} total={questions.length} q={q}
            examPerQTimer={perQTimer} formulaTemplates={formulaTemplates}
            onChange={patch => upd(q.id, patch)}
            onRemove={() => remove(q.id)}
            onMove={dir => move(q.id, dir)}
          />
        ))}
      </div>

      <Separator/>
      <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
        <span className="mr-auto text-sm text-muted-foreground">{totalMarks} total marks · {questions.length} questions</span>
        <Button variant="outline" onClick={() => setTab('library')}>Cancel</Button>
        <Button variant="secondary" onClick={() => build(false)} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}Save draft
        </Button>
        <Button onClick={() => build(true)} disabled={saving} style={{ background: 'var(--green)' }}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}Publish
        </Button>
      </div>
    </div>
  )
}

// ── Question Editor ──────────────────────────────────────────
function QuestionEditor({ index, total, q, examPerQTimer, formulaTemplates, onChange, onRemove, onMove }:{
  index: number; total: number; q: QDraft; examPerQTimer: string
  formulaTemplates: { label: string; latex: string }[]
  onChange: (p: Partial<QDraft>) => void; onRemove: () => void; onMove: (d: -1|1) => void
}) {
  const [previewFormula, setPreviewFormula] = useState(false)
  const [previewChart, setPreviewChart] = useState(false)
  const qt = QUESTION_TYPES.find(t => t.value === q.type)!
  const isMath = q.type === 'formula'
  const isTable = q.type === 'table'
  const isGraph = q.type === 'graph'
  const isAuto = ['mcq','truefalse','short','formula'].includes(q.type)

  return (
    <Card className="border-l-4" style={{ borderLeftColor: isMath ? 'var(--gold)' : isTable ? 'var(--sky)' : isGraph ? 'var(--green)' : 'var(--border)' }}>
      <CardContent className="p-4 space-y-3">
        {/* Question header row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <button onClick={() => onMove(-1)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5"/></button>
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40"/>
            <button onClick={() => onMove(1)} disabled={index === total-1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5"/></button>
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{index+1}</div>
          <Select value={q.type} onValueChange={v => onChange({ type: v as QuestionType, correct_answer: '', formula: '', options: ['','','',''] })}>
            <SelectTrigger className="h-8 w-[180px]"><SelectValue/></SelectTrigger>
            <SelectContent>{QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}><span className="mr-1.5">{t.icon}</span>{t.label}</SelectItem>)}</SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">{qt.hint}</Badge>
          {isMath && <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">LaTeX Math</Badge>}
          {isTable && <Badge className="text-xs bg-sky-100 text-sky-700 border-sky-200">Data Table</Badge>}
          {isGraph && <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Chart</Badge>}
          <div className="ml-auto flex items-center gap-2">
            <Select value={q.difficulty} onValueChange={v => onChange({ difficulty: v })}>
              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
            </Select>
            <div className="flex items-center gap-1"><Label className="text-xs text-muted-foreground whitespace-nowrap">Marks</Label><Input type="number" min={1} value={q.marks} onChange={e => onChange({ marks: Number(e.target.value)||1 })} className="h-7 w-16 text-xs"/></div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onRemove} disabled={total===1}><Trash2 className="h-3.5 w-3.5"/></Button>
          </div>
        </div>

        {/* Question text */}
        <Textarea value={q.text} onChange={e => onChange({ text: e.target.value })} rows={2}
          placeholder={isMath ? "Question text (e.g. 'Solve for x:')" : isTable ? "Describe the table (e.g. 'Use the table to answer:')" : isGraph ? "Describe the graph (e.g. 'Study the chart and answer:')" : "Question text…"}/>

        {/* ─── IMAGE upload ─── */}
        <QuestionImageUpload imageUrl={q.image_url} onChange={url => onChange({ image_url: url })}/>

        {/* ─── FORMULA section ─── */}
        {isMath && (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-amber-700 flex items-center gap-1"><Sigma className="h-3.5 w-3.5"/>LaTeX Formula</Label>
              <button onClick={() => setPreviewFormula(v => !v)} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800">
                {previewFormula ? <EyeOff className="h-3.5 w-3.5"/> : <Eye className="h-3.5 w-3.5"/>}
                {previewFormula ? 'Hide' : 'Preview'}
              </button>
            </div>
            {formulaTemplates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {formulaTemplates.map(t => (
                  <button key={t.label} onClick={() => onChange({ formula: t.latex })}
                    className="rounded-md border border-amber-200 bg-white px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-100 transition-colors">
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            <Input value={q.formula} onChange={e => onChange({ formula: e.target.value })}
              placeholder="e.g. x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}" className="font-mono text-xs bg-white"/>
            {previewFormula && q.formula && (
              <div className="rounded-lg bg-white border border-amber-200 p-3">
                <MathBlock latex={q.formula}/>
              </div>
            )}
            {/* Answer for formula questions */}
            <div><Label className="text-xs text-amber-700">Correct Answer (students type this)</Label>
              <Input value={q.correct_answer} onChange={e => onChange({ correct_answer: e.target.value })} placeholder="e.g. x = 2 or x = -3" className="text-xs bg-white"/>
            </div>
          </div>
        )}

        {/* ─── TABLE section ─── */}
        {isTable && (
          <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-sky-700 flex items-center gap-1"><TableIcon className="h-3.5 w-3.5"/>Data Table</Label>
              <button onClick={() => setPreviewChart(v => !v)} className="text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1">
                {previewChart ? <EyeOff className="h-3.5 w-3.5"/> : <Eye className="h-3.5 w-3.5"/>}Preview
              </button>
            </div>
            <TableEditor data={q.table_data} onChange={td => onChange({ table_data: td })}/>
            {previewChart && <DataTable data={q.table_data}/>}
            <div><Label className="text-xs text-sky-700">Correct Answer (what students should identify)</Label>
              <Input value={q.correct_answer} onChange={e => onChange({ correct_answer: e.target.value })} placeholder="e.g. The highest value is in row 2" className="text-xs bg-white"/>
            </div>
          </div>
        )}

        {/* ─── GRAPH section ─── */}
        {isGraph && (
          <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-green-700 flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5"/>Chart / Graph</Label>
              <button onClick={() => setPreviewChart(v => !v)} className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1">
                {previewChart ? <EyeOff className="h-3.5 w-3.5"/> : <Eye className="h-3.5 w-3.5"/>}Preview
              </button>
            </div>
            <GraphEditor data={q.graph_data} onChange={gd => onChange({ graph_data: gd })}/>
            {previewChart && <SimpleChart data={q.graph_data}/>}
            <div><Label className="text-xs text-green-700">Correct Answer</Label>
              <Input value={q.correct_answer} onChange={e => onChange({ correct_answer: e.target.value })} placeholder="e.g. Bar A has the highest frequency" className="text-xs bg-white"/>
            </div>
          </div>
        )}

        {/* ─── MCQ options ─── */}
        {q.type === 'mcq' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Options — click the radio to mark correct</Label>
            {q.options.map((opt, oi) => (
              <div key={oi} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors', q.correct_answer === String(oi) ? 'border-green-400 bg-green-50' : 'border-border')}>
                <input type="radio" name={`cr-${q.id}`} checked={q.correct_answer === String(oi)} onChange={() => onChange({ correct_answer: String(oi) })} className="h-4 w-4 accent-green-600"/>
                <Input value={opt} onChange={e => { const o=[...q.options]; o[oi]=e.target.value; onChange({ options: o }) }} placeholder={`Option ${oi+1}`} className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"/>
                {q.options.length > 2 && <button onClick={() => { const o=q.options.filter((_,k)=>k!==oi); const ca=Number(q.correct_answer); onChange({ options: o, correct_answer: oi===ca?'':oi<ca?String(ca-1):q.correct_answer }) }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5"/></button>}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => onChange({ options: [...q.options, ''] })}><Plus className="mr-1 h-3.5 w-3.5"/>Add option</Button>
          </div>
        )}

        {/* True/False */}
        {q.type === 'truefalse' && (
          <div className="flex gap-3">
            <Label className="text-xs text-muted-foreground my-auto">Correct answer:</Label>
            {['true','false'].map(v => (
              <label key={v} className={cn('flex items-center gap-2 rounded-lg border px-4 py-2 cursor-pointer capitalize text-sm transition-colors', q.correct_answer===v?'border-green-400 bg-green-50':'border-border hover:bg-muted/40')}>
                <input type="radio" name={`tf-${q.id}`} checked={q.correct_answer===v} onChange={() => onChange({ correct_answer: v })} className="h-4 w-4 accent-green-600"/>
                {v}
              </label>
            ))}
          </div>
        )}

        {/* Short / Essay correct answer */}
        {(q.type === 'short' || q.type === 'essay') && (
          <div><Label className="text-xs text-muted-foreground">{q.type==='short'?'Correct answer (auto-marked, case-insensitive)':'Model answer / marking guide'}</Label>
            <Textarea value={q.correct_answer} onChange={e => onChange({ correct_answer: e.target.value })} rows={q.type==='essay'?3:1} placeholder={q.type==='short'?'e.g. photosynthesis':'Key points the student must address…'}/>
          </div>
        )}

        {/* Explanation + timer */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3 pt-1 border-t border-border/50">
          <div><Label className="text-xs text-muted-foreground">Explanation (shown after answer)</Label>
            <Input value={q.explanation} onChange={e => onChange({ explanation: e.target.value })} placeholder="Optional explanation for students…"/>
          </div>
          <div><Label className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3 text-amber-500"/>Timer override (s){examPerQTimer ? ` · default ${examPerQTimer}s` : ''}</Label>
            <Input type="number" value={q.time_limit_secs} onChange={e => onChange({ time_limit_secs: e.target.value })} placeholder="blank = exam default"/>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Table Editor ─────────────────────────────────────────────
function TableEditor({ data, onChange }: { data: QuestionTableData; onChange: (d: QuestionTableData) => void }) {
  const addCol = () => onChange({ headers: [...data.headers, `Col ${data.headers.length+1}`], rows: data.rows.map(r => [...r,'']) })
  const addRow = () => onChange({ ...data, rows: [...data.rows, data.headers.map(()=>'')] })
  const delCol = (ci: number) => onChange({ headers: data.headers.filter((_,i)=>i!==ci), rows: data.rows.map(r=>r.filter((_,i)=>i!==ci)) })
  const delRow = (ri: number) => onChange({ ...data, rows: data.rows.filter((_,i)=>i!==ri) })
  const setH = (ci: number, v: string) => onChange({ ...data, headers: data.headers.map((h,i)=>i===ci?v:h) })
  const setC = (ri: number, ci: number, v: string) => onChange({ ...data, rows: data.rows.map((r,i)=>i===ri?r.map((c,j)=>j===ci?v:c):r) })
  return (
    <div className="overflow-x-auto rounded-lg border border-sky-200 bg-white">
      <table className="w-full text-xs">
        <thead><tr className="bg-sky-100">
          {data.headers.map((h,ci) => (
            <th key={ci} className="border-b border-sky-200 p-1">
              <div className="flex items-center gap-1">
                <input value={h} onChange={e=>setH(ci,e.target.value)} className="bg-transparent border-0 w-full font-semibold focus:outline-none text-sky-800" placeholder={`Col ${ci+1}`}/>
                {data.headers.length>2 && <button onClick={()=>delCol(ci)} className="text-sky-400 hover:text-red-500">×</button>}
              </div>
            </th>
          ))}
          <th className="border-b border-sky-200 p-1 w-6"></th>
        </tr></thead>
        <tbody>{data.rows.map((row,ri) => (
          <tr key={ri} className={ri%2===0?'':'bg-sky-50/50'}>
            {row.map((cell,ci) => <td key={ci} className="border-b border-sky-100 p-1"><input value={cell} onChange={e=>setC(ri,ci,e.target.value)} className="w-full bg-transparent border-0 focus:outline-none px-1" placeholder="…"/></td>)}
            <td className="border-b border-sky-100 p-1"><button onClick={()=>delRow(ri)} className="text-sky-400 hover:text-red-500 text-xs">×</button></td>
          </tr>
        ))}</tbody>
      </table>
      <div className="flex gap-2 p-2">
        <button onClick={addCol} className="text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1"><Plus className="h-3 w-3"/>Column</button>
        <button onClick={addRow} className="text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1"><Plus className="h-3 w-3"/>Row</button>
      </div>
    </div>
  )
}

// ── Graph Editor ─────────────────────────────────────────────
function GraphEditor({ data, onChange }: { data: QuestionGraphData; onChange: (d: QuestionGraphData) => void }) {
  const setLabel = (i: number, v: string) => onChange({ ...data, labels: data.labels.map((l,j)=>j===i?v:l) })
  const setVal = (di: number, i: number, v: string) => onChange({ ...data, datasets: data.datasets.map((d,j)=>j===di?{...d,data:d.data.map((x,k)=>k===i?Number(v)||0:x)}:d) })
  const setDsLabel = (di: number, v: string) => onChange({ ...data, datasets: data.datasets.map((d,j)=>j===di?{...d,label:v}:d) })
  const addLabel = () => onChange({ ...data, labels: [...data.labels,`Item ${data.labels.length+1}`], datasets: data.datasets.map(d=>({...d,data:[...d.data,0]})) })
  const COLORS = ['#003366','#00a651','#f5a623','#0066cc','#e53e3e']
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-green-700 whitespace-nowrap">Chart type:</Label>
        {(['bar','line','pie'] as const).map(t => (
          <button key={t} onClick={() => onChange({...data,type:t})}
            className={cn('rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors', data.type===t?'bg-green-600 text-white':'bg-white border border-green-200 text-green-700 hover:bg-green-50')}>
            {t}
          </button>
        ))}
        <Input value={data.title??''} onChange={e=>onChange({...data,title:e.target.value})} placeholder="Chart title…" className="h-7 text-xs flex-1 bg-white"/>
      </div>
      <div className="overflow-x-auto rounded-lg border border-green-200 bg-white">
        <table className="text-xs w-full">
          <thead><tr className="bg-green-50">
            <th className="p-1 text-left font-medium text-green-700 border-b border-green-200">Label</th>
            {data.datasets.map((ds,di) => (
              <th key={di} className="p-1 border-b border-green-200">
                <input value={ds.label} onChange={e=>setDsLabel(di,e.target.value)} className="bg-transparent border-0 focus:outline-none font-medium text-center w-full text-green-700"/>
              </th>
            ))}
          </tr></thead>
          <tbody>{data.labels.map((l,i) => (
            <tr key={i} className={i%2===0?'':'bg-green-50/30'}>
              <td className="p-1 border-b border-green-100"><input value={l} onChange={e=>setLabel(i,e.target.value)} className="w-full bg-transparent border-0 focus:outline-none px-1"/></td>
              {data.datasets.map((ds,di) => (
                <td key={di} className="p-1 border-b border-green-100 text-center">
                  <input type="number" value={ds.data[i]??0} onChange={e=>setVal(di,i,e.target.value)} className="w-16 bg-transparent border-0 focus:outline-none text-center"/>
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
        <div className="p-2 flex gap-2">
          <button onClick={addLabel} className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"><Plus className="h-3 w-3"/>Row</button>
          <button onClick={() => onChange({...data,datasets:[...data.datasets,{label:`Series ${data.datasets.length+1}`,data:data.labels.map(()=>0),color:COLORS[data.datasets.length%COLORS.length]}]})} className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"><Plus className="h-3 w-3"/>Dataset</button>
        </div>
      </div>
    </div>
  )
}


// ── Question Image Upload ────────────────────────────────────
function QuestionImageUpload({ imageUrl, onChange }: {
  imageUrl: string; onChange: (url: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setUploading(true)
    try {
      const url = await uploadQuestionImage(file)
      onChange(url)
      toast.success('Image uploaded')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Upload failed') }
    finally { setUploading(false) }
  }

  if (imageUrl) {
    return (
      <div className="relative w-fit">
        <img src={imageUrl} alt="Question" className="max-h-48 rounded-lg border border-border object-contain"/>
        <button onClick={() => onChange('')}
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-sm">
          <X className="h-3.5 w-3.5"/>
        </button>
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <ImageIcon className="h-4 w-4"/>}
        {uploading ? 'Uploading…' : 'Add image to question (optional)'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}/>
    </div>
  )
}
