import { createClient } from '@supabase/supabase-js'

// .trim() strips any \r, \n or stray whitespace that CRLF line endings
// or editor tooling can embed into the substituted string literal,
// which would otherwise cause a fetch "non ISO-8859-1 characters" header error.
const supabaseUrl     = (import.meta.env.VITE_SUPABASE_URL     ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
