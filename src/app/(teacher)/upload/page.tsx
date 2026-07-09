"use client"

import React, { useState } from 'react'

export default function TeacherUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    if (!file) return setError('Please choose a file to upload')

    const fd = new FormData()
    fd.append('file', file)

    try {
      setLoading(true)
      const res = await fetch('/api/teacher/upload', {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Upload failed')
      } else {
        setResult(json)
      }
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Teacher — Upload Exam / Paper</h1>
        <p className="text-sm text-gray-600 mb-6">Upload PDF, Word or image files. Images are OCR'd and returned as text. PDFs/Word are stored for later processing.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select file</label>
            <input
              type="file"
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-700"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 text-white px-4 py-2 hover:bg-green-700 disabled:opacity-60"
            >
              {loading ? 'Uploading...' : 'Upload & Parse'}
            </button>
            <button
              type="button"
              onClick={() => { setFile(null); setResult(null); setError(null) }}
              className="text-sm text-gray-600"
            >
              Reset
            </button>
          </div>
        </form>

        <div className="mt-6">
          {error && <div className="text-red-600">{error}</div>}
          {result && (
            <div className="bg-gray-50 border rounded p-4">
              <div className="text-sm text-gray-500 mb-2">Upload result</div>
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
              {result?.ocrText && (
                <div className="mt-4">
                  <div className="text-sm font-semibold mb-2">OCR Text (preview)</div>
                  <div className="prose max-w-none text-sm">{result.ocrText}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
