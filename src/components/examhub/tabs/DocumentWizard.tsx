import { useState } from 'react'
import {
  FileText, ListChecks, Check, ChevronRight, ChevronLeft, Loader2,
  CheckCircle2, Plus, Trash2, Timer, Save, Sparkles, X, Edit3,
} from 'lucide-react'
import {
  Button, Input, Label, Textarea, Badge, Card, CardContent,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/index'
import { createExam } from '@/lib/api'
import { LEVELS, SUBJECTS, type QuestionType } from '@/lib/types'
import type { ParsedDocument, ParsedQuestion } from '@/lib/ocr'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// A single question being reviewed/edited in the wizard
interface WizardQuestion {
  type: QuestionType
  text: string
  options: string[]
  correct_answer: string   // for MCQ: the option text; for others: model answer
  explanation: string
  marks: number
  time_limit_secs: string
  image_url?: string
}

type Step =
  | { kind: 'header' }
  | { kind: 'instructions' }
  | { kind: 'question'; index: number }
  | { kind: 'review' }

export function DocumentWizard({
  parsed, defaultSubject, defaultLevel, paperId, onComplete, onCancel,
}: {
  parsed: ParsedDocument
  defaultSubject?: string
  defaultLevel?: string
  paperId?: string
  onComplete: () => void
  onCancel: () => void
}) {
  // Exam meta from header
  const [title, setTitle]         = useState(parsed.header || 'Untitled Exam')
  const [subject, setSubject]     = useState(defaultSubject || '')
  const [level, setLevel]         = useState(defaultLevel || '')
  const [instructions, setInstr]  = useState(parsed.instructions || '')
  const [duration, setDuration]   = useState('60')
  const [passMark, setPassMark]   = useState('40')

  // Questions — initialized from parsed, edited one at a time
  const [questions, setQuestions] = useState<WizardQuestion[]>(
    parsed.questions.map((q: ParsedQuestion) => ({
      type: q.type as QuestionType,
      text: q.text,
      options: q.options.length ? q.options : (q.type === 'mcq' ? ['', '', '', ''] : []),
      correct_answer: '',
      explanation: '',
      marks: q.marks ?? 1,
      time_limit_secs: '',
    }))
  )

  const [step, setStep]     = useState<Step>({ kind: 'header' })
  const [saving, setSaving] = useState(false)

  const totalQ = questions.length
  const updateQ = (i: number, patch: Partial<WizardQuestion>) =>
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q))

  // Progress calc
  const stepNumber =
    step.kind === 'header' ? 1
    : step.kind === 'instructions' ? 2
    : step.kind === 'question' ? 3 + step.index
    : 3 + totalQ
  const totalSteps = 3 + totalQ
  const progress = Math.round((stepNumber / totalSteps) * 100)

  // Navigation
  const goNext = () => {
    if (step.kind === 'header') {
      if (!title.trim()) { toast.error('Enter exam title'); return }
      if (!subject) { toast.error('Pick a subject'); return }
      if (!level) { toast.error('Pick a level'); return }
      setStep({ kind: 'instructions' })
    } else if (step.kind === 'instructions') {
      setStep(totalQ > 0 ? { kind: 'question', index: 0 } : { kind: 'review' })
    } else if (step.kind === 'question') {
      const q = questions[step.index]
      if (!q.text.trim()) { toast.error('Question text is empty'); return }
      if (q.type === 'mcq') {
        if (q.options.filter(o => o.trim()).length < 2) { toast.error('Add at least 2 options'); return }
        if (!q.correct_answer) { toast.error('Select the correct answer'); return }
      }
      if (step.index + 1 < totalQ) setStep({ kind: 'question', index: step.index + 1 })
      else setStep({ kind: 'review' })
    }
  }
  const goBack = () => {
    if (step.kind === 'instructions') setStep({ kind: 'header' })
    else if (step.kind === 'question') {
      if (step.index === 0) setStep({ kind: 'instructions' })
      else setStep({ kind: 'question', index: step.index - 1 })
    } else if (step.kind === 'review') {
      setStep(totalQ > 0 ? { kind: 'question', index: totalQ - 1 } : { kind: 'instructions' })
    }
  }

  const addQuestion = () => {
    setQuestions(qs => [...qs, {
      type: 'mcq', text: '', options: ['', '', '', ''],
      correct_answer: '', explanation: '', marks: 1, time_limit_secs: '',
    }])
    setStep({ kind: 'question', index: questions.length })
  }
  const deleteQuestion = (i: number) => {
    if (totalQ === 1) { toast.error('Keep at least one question'); return }
    setQuestions(qs => qs.filter((_, idx) => idx !== i))
    setStep({ kind: 'question', index: Math.max(0, i - 1) })
  }

  const finish = async (publish: boolean) => {
    setSaving(true)
    try {
      await createExam({
        title, subject, level, exam_type: 'exam',
        duration_mins: Number(duration) || 60,
        pass_mark: Number(passMark) || 40,
        instructions: instructions || undefined,
        show_answer_after: true,
        is_online: true,
        paper_id: paperId || undefined,
        status: publish ? 'published' : 'draft',
        questions: questions.map((q, i) => ({
          type: q.type,
          text: q.text.trim(),
          options: q.type === 'mcq' ? q.options.filter(o => o.trim()) : [],
          correct_answer: q.type === 'mcq'
            ? String(q.options.filter(o => o.trim()).indexOf(q.correct_answer))
            : q.correct_answer.trim(),
          explanation: q.explanation.trim() || undefined,
          marks: q.marks || 1,
          difficulty: 'medium',
          time_limit_secs: q.time_limit_secs ? Number(q.time_limit_secs) : undefined,
          image_url: q.image_url || undefined,
          order: i,
        })),
      })
      toast.success(publish ? 'Exam published! Students can take it now.' : 'Exam saved as draft.')
      onComplete()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to create exam') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl bg-card shadow-2xl flex flex-col">
        {/* Header + progress */}
        <div className="border-b border-border p-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary"/>
              <span className="font-semibold">Convert Document to Digital Exam</span>
            </div>
            <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5"/></button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--green)' }}/>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {step.kind === 'header' ? 'Header'
                : step.kind === 'instructions' ? 'Instructions'
                : step.kind === 'question' ? `Q${step.index + 1} of ${totalQ}`
                : 'Review'}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── HEADER STEP ── */}
          {step.kind === 'header' && (
            <div className="space-y-4">
              <StepTitle icon={<FileText className="h-5 w-5"/>} title="Exam Header" desc="We read this from the top of your document. Edit if needed."/>
              <div>
                <Label>Exam Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Form 4 Mathematics — Mid Term"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Subject *</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger><SelectValue placeholder="Choose"/></SelectTrigger>
                    <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Level *</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger><SelectValue placeholder="Choose"/></SelectTrigger>
                    <SelectContent>{LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input type="number" value={duration} onChange={e => setDuration(e.target.value)}/>
                </div>
                <div>
                  <Label>Pass Mark (%)</Label>
                  <Input type="number" value={passMark} onChange={e => setPassMark(e.target.value)}/>
                </div>
              </div>
            </div>
          )}

          {/* ── INSTRUCTIONS STEP ── */}
          {step.kind === 'instructions' && (
            <div className="space-y-4">
              <StepTitle icon={<ListChecks className="h-5 w-5"/>} title="Instructions" desc="Instructions shown to students before they start. Edit or leave blank."/>
              <Textarea value={instructions} onChange={e => setInstr(e.target.value)} rows={8}
                placeholder="e.g. Answer ALL questions. Each question carries equal marks. Time allowed: 2 hours."/>
              <p className="text-xs text-muted-foreground">{totalQ} question{totalQ !== 1 ? 's' : ''} detected in your document.</p>
            </div>
          )}

          {/* ── QUESTION STEP ── */}
          {step.kind === 'question' && (
            <QuestionStep
              q={questions[step.index]} index={step.index} total={totalQ}
              onChange={patch => updateQ(step.index, patch)}
              onDelete={() => deleteQuestion(step.index)}
            />
          )}

          {/* ── REVIEW STEP ── */}
          {step.kind === 'review' && (
            <div className="space-y-4">
              <StepTitle icon={<CheckCircle2 className="h-5 w-5"/>} title="Review & Finish" desc="Your document is now a digital exam. Review below, then publish."/>
              <div className="rounded-xl border p-4 space-y-2">
                <p className="font-semibold">{title}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{subject}</Badge>
                  <Badge variant="outline">{LEVELS.find(l => l.value === level)?.label ?? level}</Badge>
                  <Badge variant="secondary">{duration} min</Badge>
                  <Badge variant="secondary">Pass: {passMark}%</Badge>
                  <Badge variant="secondary">{totalQ} questions</Badge>
                </div>
                {instructions && <p className="text-xs text-muted-foreground border-t pt-2 mt-2 whitespace-pre-wrap">{instructions}</p>}
              </div>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <button key={i} onClick={() => setStep({ kind: 'question', index: i })}
                    className="w-full text-left rounded-lg border p-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-primary text-sm shrink-0">Q{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-1">{q.text || <span className="text-muted-foreground italic">No text</span>}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                          <Badge variant="secondary" className="capitalize text-xs">{q.type}</Badge>
                          <span className="text-muted-foreground">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
                          {q.type === 'mcq' && (q.correct_answer
                            ? <span className="text-green-600 flex items-center gap-0.5"><Check className="h-3 w-3"/>Answer set</span>
                            : <span className="text-amber-600">⚠ No answer</span>)}
                          <Edit3 className="h-3 w-3 text-muted-foreground ml-auto"/>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <Button variant="outline" onClick={addQuestion} className="w-full">
                <Plus className="mr-2 h-4 w-4"/>Add another question
              </Button>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="border-t border-border p-4 flex items-center justify-between shrink-0">
          <Button variant="ghost" onClick={step.kind === 'header' ? onCancel : goBack} disabled={saving}>
            {step.kind === 'header' ? 'Cancel' : <><ChevronLeft className="mr-1 h-4 w-4"/>Back</>}
          </Button>

          {step.kind === 'question' && (
            <span className="text-xs text-muted-foreground">Question {step.index + 1} of {totalQ}</span>
          )}

          {step.kind !== 'review' ? (
            <Button onClick={goNext} style={{ background: 'var(--green)' }}>
              {step.kind === 'question' && step.index + 1 === totalQ ? 'Finish Questions' : 'Approve & Continue'}
              <ChevronRight className="ml-1 h-4 w-4"/>
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => finish(false)} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}Save Draft
              </Button>
              <Button onClick={() => finish(true)} disabled={saving} style={{ background: 'var(--green)' }}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>}Publish Exam
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StepTitle({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

function QuestionStep({ q, index, total, onChange, onDelete }: {
  q: WizardQuestion; index: number; total: number
  onChange: (patch: Partial<WizardQuestion>) => void; onDelete: () => void
}) {
  const setOption = (oi: number, val: string) => {
    const opts = [...q.options]; opts[oi] = val; onChange({ options: opts })
  }
  const addOption = () => onChange({ options: [...q.options, ''] })
  const removeOption = (oi: number) => {
    const removed = q.options[oi]
    onChange({
      options: q.options.filter((_, i) => i !== oi),
      correct_answer: q.correct_answer === removed ? '' : q.correct_answer,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StepTitle icon={<span className="font-bold">{index + 1}</span>}
          title={`Question ${index + 1} of ${total}`}
          desc="Edit the question, set the correct answer, add a timer."/>
        <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={onDelete}>
          <Trash2 className="h-4 w-4"/>
        </Button>
      </div>

      {/* Type + marks + timer */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={q.type} onValueChange={v => onChange({ type: v as QuestionType, correct_answer: '' })}>
            <SelectTrigger className="h-9"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="mcq">Multiple Choice</SelectItem>
              <SelectItem value="truefalse">True / False</SelectItem>
              <SelectItem value="short">Short Answer</SelectItem>
              <SelectItem value="essay">Essay</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Marks</Label>
          <Input type="number" min={1} value={q.marks} onChange={e => onChange({ marks: Number(e.target.value) || 1 })} className="h-9"/>
        </div>
        <div>
          <Label className="text-xs flex items-center gap-1"><Timer className="h-3 w-3"/>Timer (sec)</Label>
          <Input type="number" placeholder="none" value={q.time_limit_secs} onChange={e => onChange({ time_limit_secs: e.target.value })} className="h-9"/>
        </div>
      </div>

      {/* Question text */}
      <div>
        <Label>Question Text</Label>
        <Textarea value={q.text} onChange={e => onChange({ text: e.target.value })} rows={3} placeholder="Type the question…"/>
      </div>

      {/* MCQ options + correct answer */}
      {q.type === 'mcq' && (
        <div className="space-y-2">
          <Label>Options — tap the circle to mark the correct answer</Label>
          {q.options.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <button onClick={() => onChange({ correct_answer: opt })}
                className={cn('h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors',
                  q.correct_answer && q.correct_answer === opt ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground/30')}>
                {q.correct_answer && q.correct_answer === opt && <Check className="h-3.5 w-3.5"/>}
              </button>
              <Input value={opt} onChange={e => setOption(oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                className={cn(q.correct_answer === opt && opt ? 'border-green-400 bg-green-50' : '')}/>
              {q.options.length > 2 && (
                <button onClick={() => removeOption(oi)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <X className="h-4 w-4"/>
                </button>
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addOption} className="text-xs"><Plus className="mr-1 h-3 w-3"/>Add option</Button>
        </div>
      )}

      {/* True/False correct answer */}
      {q.type === 'truefalse' && (
        <div>
          <Label>Correct Answer</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {['true', 'false'].map(v => (
              <button key={v} onClick={() => onChange({ correct_answer: v })}
                className={cn('rounded-lg border-2 py-2.5 text-sm font-medium capitalize transition-colors',
                  q.correct_answer === v ? 'border-green-500 bg-green-50 text-green-700' : 'border-border text-muted-foreground')}>
                {q.correct_answer === v && <Check className="inline h-4 w-4 mr-1"/>}{v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Short answer model answer */}
      {q.type === 'short' && (
        <div>
          <Label>Correct Answer (for auto-marking)</Label>
          <Input value={q.correct_answer} onChange={e => onChange({ correct_answer: e.target.value })} placeholder="Expected answer (case-insensitive match)"/>
        </div>
      )}

      {/* Essay = manual marking notice */}
      {q.type === 'essay' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Essay questions are marked manually by you after students submit. No correct answer needed here.
        </div>
      )}

      {/* Explanation (shown after answer) */}
      {q.type !== 'essay' && (
        <div>
          <Label className="text-xs">Explanation (shown to student after they answer) — optional</Label>
          <Textarea value={q.explanation} onChange={e => onChange({ explanation: e.target.value })} rows={2} placeholder="Why this is the correct answer…"/>
        </div>
      )}
    </div>
  )
}
