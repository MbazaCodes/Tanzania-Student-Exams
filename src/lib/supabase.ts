import { createClient } from '@supabase/supabase-js'

// Vite exposes env vars via import.meta.env
// Make sure .env file exists at project root (not committed to git)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const SUPABASE_SERVICE = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string

if (!SUPABASE_URL) {
  console.error(
    '❌ VITE_SUPABASE_URL is not set.\n' +
    'Create a .env file at the project root with:\n' +
    'VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key\n' +
    'VITE_SUPABASE_SERVICE_KEY=your-service-role-key'
  )
}

// Use hardcoded fallback so app doesn't crash before .env is set up
const url = SUPABASE_URL || 'https://pdyjpkgjiakvlqqcicjj.supabase.co'
const anon = SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeWpwa2dqaWFrdmxxcWNpY2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjIyODMsImV4cCI6MjA5OTEzODI4M30.yu1EqrKFAClBh2opHqE1ZIRFdHB5jVL1NauMkSI4CBc'
const service = SUPABASE_SERVICE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeWpwa2dqaWFrdmxxcWNpY2pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU2MjI4MywiZXhwIjoyMDk5MTM4MjgzfQ.xpqggJdI4uDbglVzv6HdsiIrztIWDVLfGAvuGlfdsOM'

export const supabase = createClient(url, anon, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export const supabaseAdmin = createClient(url, service, {
  auth: { persistSession: false },
})

export const STORAGE_BUCKET = 'exam-papers'
