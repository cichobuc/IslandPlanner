import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env, publicEnv } from '@/lib/env';

/** Service role – len server (zakladanie kont, cron). Obchádza RLS. */
export function createSupabaseAdmin() {
  return createClient(publicEnv.supabaseUrl(), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
