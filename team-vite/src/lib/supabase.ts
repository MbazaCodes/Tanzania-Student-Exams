import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const SUPABASE_SERVICE = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string

// Browser client — uses anon key, respects RLS, handles Supabase Auth sessions
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Admin client — uses service role key, bypasses RLS for write operations
// Used only in client-side API calls where we need elevated access
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE || SUPABASE_ANON, {
  auth: { persistSession: false },
})

export const STORAGE_BUCKET = 'exam-papers'
