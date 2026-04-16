import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("BŁĄD: Brakuje kluczy Supabase w pliku .env!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true, 
    persistSession: true,   
    detectSessionInUrl: true 
  }
})
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);