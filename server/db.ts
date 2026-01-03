import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL");
}

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY");
}

console.log(`[DB] Initializing Supabase client with ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON'} privileges.`);

export const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

export default supabase;
