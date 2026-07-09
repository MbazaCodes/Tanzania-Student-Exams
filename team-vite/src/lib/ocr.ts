/**
 * Browser-side OCR + PDF text extraction
 * - Images → Tesseract.js (runs in a Web Worker)
 * - PDFs  → PDF.js text layer (no OCR needed for text PDFs)
 * - Scanned PDFs → PDF.js renders each page to canvas, then Tesseract OCR
 */
import { createWorker } from 'tesseract.js'

export type OcrProgress = {
  stage: 'loading' | 'recognizing' | 'parsing' | 'done'
  progress: number   // 0-100
  message: string
}

// ── IMAGE OCR ────────────────────────────────────────────────
export async function ocrImage(
  file: File,
  onProgress?: (p: OcrProgress) => void
): Promise<string> {
  onProgress?.({ stage: 'loading', progress: 5, message: 'Loading OCR engine…' })

  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.({
          stage: 'recognizing',
          progress: Math.round(5 + m.progress * 90),
          message: `Recognizing text… ${Math.round(m.progress * 100)}%`,
        })
      }
    },
  })

  onProgress?.({ stage: 'recognizing', progress: 10, message: 'Running OCR…' })
  const { data: { text } } = await worker.recognize(file)
  await worker.terminate()
  onProgress?.({ stage: 'done', progress: 100, message: 'OCR complete' })
  return text
}

// ── PDF TEXT EXTRACTION ──────────────────────────────────────
export async function extractPdfText(
  file: File,
  onProgress?: (p: OcrProgress) => void
): Promise<{ text: string; pageCount: number; isScanned: boolean }> {
  onProgress?.({ stage: 'loading', progress: 5, message: 'Loading PDF…' })

  // Dynamically import pdfjs to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pageCount = pdf.numPages

  onProgress?.({ stage: 'parsing', progress: 20, message: `Extracting text from ${pageCount} page(s)…` })

  let fullText = ''
  let totalChars = 0

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: Record<string, unknown>) => (item as { str?: string }).str ?? '')
      .join(' ')
    fullText += `\n--- Page ${i} ---\n${pageText}`
    totalChars += pageText.length
    onProgress?.({
      stage: 'parsing',
      progress: Math.round(20 + (i / pageCount) * 60),
      message: `Page ${i} of ${pageCount}…`,
    })
  }

  // If very little text extracted, it's a scanned PDF
  const isScanned = totalChars < pageCount * 50

  if (isScanned) {
    onProgress?.({ stage: 'recognizing', progress: 80, message: 'Scanned PDF detected — running OCR on pages…' })
    fullText = await ocrScannedPdf(pdf, pageCount, onProgress)
  }

  onProgress?.({ stage: 'done', progress: 100, message: 'Extraction complete' })
  return { text: fullText, pageCount, isScanned }
}

async function ocrScannedPdf(
  pdf: import('pdfjs-dist').PDFDocumentProxy,
  pageCount: number,
  onProgress?: (p: OcrProgress) => void
): Promise<string> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.({
          stage: 'recognizing',
          progress: Math.round(80 + m.progress * 15),
          message: `OCR page… ${Math.round(m.progress * 100)}%`,
        })
      }
    },
  })

  let allText = ''
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 }) // higher scale = better OCR
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    const renderContext = { canvasContext: ctx, viewport } as Parameters<typeof page.render>[0]
    await page.render(renderContext).promise
    const { data: { text } } = await worker.recognize(canvas)
    allText += `\n--- Page ${i} ---\n${text}`
  }
  await worker.terminate()
  return allText
}

// ── QUESTION PARSER ──────────────────────────────────────────
export interface ParsedQuestion {
  number: string
  text: string
  options: string[]
  type: 'mcq' | 'short' | 'essay'
  marks?: number
}

/**
 * Heuristic parser: extracts numbered questions and MCQ options from raw OCR text.
 * Works on standard NECTA, mock, and school exam layouts.
 */
export function parseQuestionsFromText(raw: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

  // Patterns:
  // "1." or "1)" or "Question 1" or "Q1."
  const qPattern = /^(?:question\s+)?(\d+)[.)]\s*(.+)/i
  // MCQ options: "A." "A)" "(A)" "a."
  const optPattern = /^[(\s]*([A-Ea-e])[.)]\s*(.+)/

  let current: ParsedQuestion | null = null

  for (const line of lines) {
    const qMatch = line.match(qPattern)
    if (qMatch) {
      if (current) questions.push(current)
      const marksMatch = line.match(/\((\d+)\s*marks?\)/i)
      current = {
        number: qMatch[1],
        text: qMatch[2].replace(/\(\d+\s*marks?\)/i, '').trim(),
        options: [],
        type: 'short',
        marks: marksMatch ? parseInt(marksMatch[1]) : undefined,
      }
      continue
    }

    if (current) {
      const optMatch = line.match(optPattern)
      if (optMatch) {
        current.options.push(optMatch[2].trim())
        current.type = 'mcq'
        continue
      }
      // Continuation of question text
      if (line.length > 3 && !line.match(/^[-=]{3,}/)) {
        current.text += ' ' + line
      }
    }
  }

  if (current) questions.push(current)

  // Essay detection: questions with no options and keywords
  const essayKeywords = /explain|describe|discuss|evaluate|analyse|analyze|compare|contrast|outline|state.*reason/i
  return questions.map(q => ({
    ...q,
    type: q.options.length >= 2 ? 'mcq' : essayKeywords.test(q.text) ? 'essay' : q.type,
  }))
}
