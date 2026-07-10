import { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface Props {
  latex: string
  displayMode?: boolean
  className?: string
}

export function MathRenderer({ latex, displayMode = false, className = '' }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current || !latex.trim()) return
    try {
      katex.render(latex, ref.current, {
        displayMode,
        throwOnError: false,
        errorColor: '#cc0000',
        trust: false,
        strict: false,
      })
    } catch {
      if (ref.current) ref.current.textContent = latex
    }
  }, [latex, displayMode])

  if (!latex.trim()) return null
  return <span ref={ref} className={className} />
}

export function MathBlock({ latex, className = '' }: { latex: string; className?: string }) {
  return (
    <div className={`overflow-x-auto py-2 ${className}`}>
      <MathRenderer latex={latex} displayMode className="block text-center" />
    </div>
  )
}

// Renders text that may contain inline \( ... \) or $...$ and display \[ ... \] or $$...$$
export function MathText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null
  // Split on LaTeX delimiters
  const parts: { content: string; isLatex: boolean; display: boolean }[] = []
  let remaining = text
  const re = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([^\)]+?\\\))/g
  let lastIdx = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push({ content: text.slice(lastIdx, match.index), isLatex: false, display: false })
    const raw = match[0]
    const isDisplay = raw.startsWith('$$') || raw.startsWith('\\[')
    const latex = raw.startsWith('$$') ? raw.slice(2, -2)
      : raw.startsWith('$') ? raw.slice(1, -1)
      : raw.startsWith('\\[') ? raw.slice(2, -2)
      : raw.slice(2, -2)
    parts.push({ content: latex, isLatex: true, display: isDisplay })
    lastIdx = match.index + raw.length
  }
  if (lastIdx < text.length) parts.push({ content: text.slice(lastIdx), isLatex: false, display: false })

  if (parts.length === 0) parts.push({ content: text, isLatex: false, display: false })

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.isLatex ? (
          <MathRenderer key={i} latex={p.content} displayMode={p.display} />
        ) : (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{p.content}</span>
        )
      )}
    </span>
  )
}
