import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // These are validated at build time, safe to use ! here
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
