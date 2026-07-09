import { NextResponse } from 'next/server'
import { createWorker } from 'tesseract.js'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Ensure these env vars are set in your Next.js environment (server-side):
// VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY (service role key)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL as string
const SUPABASE_SERVICE = process.env.VITE_SUPABASE_SERVICE_KEY as string

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  // We don't throw on import to allow dev-time editing, but POST will return a helpful error.
}

const supabaseAdmin = createClient(SUPABASE_URL || '', SUPABASE_SERVICE || '')
const STORAGE_BUCKET = 'exam-papers'

export async function POST(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE) {
    return NextResponse.json({ ok: false, error: 'Server missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_KEY)' }, { status: 500 })
  }

  // Parse multipart/form-data using the Web API FormData available in Next.js route handlers
  let form: FormData
  try {
    form = await req.formData()
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Failed to parse form data' }, { status: 400 })
  }

  const fileField = form.get('file') as File | null
  if (!fileField) {
    return NextResponse.json({ ok: false, error: 'No file field provided' }, { status: 400 })
  }

  const filename = fileField.name || `upload-${Date.now()}`
  const contentType = fileField.type || 'application/octet-stream'
  const arrayBuffer = await fileField.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Upload to Supabase Storage
  const path = `uploads/${Date.now()}_${filename}`
  const { error: uploadError } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  })
  if (uploadError) {
    return NextResponse.json({ ok: false, error: 'Failed to upload file to storage', details: uploadError.message }, { status: 500 })
  }

  // Run OCR for images only. For PDFs/Word docs we return queued (TODO: implement conversion)
  if (contentType.startsWith('image/')) {
    try {
      const worker = createWorker({ logger: () => {} })
      await worker.load()
      await worker.loadLanguage('eng')
      await worker.initialize('eng')
      const { data: { text } } = await worker.recognize(buffer)
      await worker.terminate()

      // You would typically insert extracted Qs into the question bank here.
      return NextResponse.json({ ok: true, storagePath: path, ocrText: text })
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: 'OCR failed', details: err?.message ?? String(err) }, { status: 500 })
    }
  }

  // Not an image — accept and store but don't OCR yet
  return NextResponse.json({ ok: true, storagePath: path, message: 'File uploaded — PDF/Word parsing not implemented yet' })
}
