import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sprawdzenie, czy zmienne w ogóle istnieją (zapobiega trudnym do wykrycia błędom)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("BŁĄD: Brakuje kluczy Supabase w pliku .env!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true, // Automatycznie odświeża sesję, żeby Cię nie wylogowało
    persistSession: true,   // Zapamiętuje sesję w przeglądarce (localStorage)
    detectSessionInUrl: true // Potrzebne do logowania przez Google/Facebooka
  }
})
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);