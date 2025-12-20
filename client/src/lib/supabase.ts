import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

async function initSupabase(): Promise<SupabaseClient> {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const response = await fetch('/api/config');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status}`);
  }
  
  const config = await response.json();
  
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Missing Supabase configuration from server');
  }
  
  supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey);
  return supabaseInstance;
}

export function getSupabaseClient(): Promise<SupabaseClient> {
  if (!initPromise) {
    initPromise = initSupabase();
  }
  return initPromise;
}

export { supabaseInstance };
