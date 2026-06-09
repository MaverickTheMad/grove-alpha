import { createClient } from '@supabase/supabase-js'

// One schema for the whole merged app, so the global db.schema works again
// (the multi-schema problem from the planning phase is gone once everything
// lives in `grove`). GROVE-ALPHA-BUILD-GUIDE §4.2.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { db: { schema: 'grove' } },
)
