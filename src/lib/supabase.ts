import { createClient } from '@supabase/supabase-js'

// Credentials — loaded from .env, with hardcoded fallback for this project
const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL     || 'https://pdyjpkgjiakvlqqcicjj.supabase.co'
const SUPABASE_ANON    = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeWpwa2dqaWFrdmxxcWNpY2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjIyODMsImV4cCI6MjA5OTEzODI4M30.yu1EqrKFAClBh2opHqE1ZIRFdHB5jVL1NauMkSI4CBc'
const SUPABASE_SERVICE = import.meta.env.VITE_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeWpwa2dqaWFrdmxxcWNpY2pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU2MjI4MywiZXhwIjoyMDk5MTM4MjgzfQ.xpqggJdI4uDbglVzv6HdsiIrztIWDVLfGAvuGlfdsOM'

// Browser client (respects RLS, handles auth sessions)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
})

// Admin client (service role — bypasses RLS for write ops)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
  auth: { persistSession: false },
})

export const STORAGE_BUCKET = 'exam-papers'
