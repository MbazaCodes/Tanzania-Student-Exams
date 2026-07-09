import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const service = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string
export const supabase = createClient(url, anon)
export const supabaseAdmin = createClient(url, service || anon)
