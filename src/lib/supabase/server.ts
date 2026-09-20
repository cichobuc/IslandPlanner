import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';

/** Supabase klient pre RSC, server actions a route handlery – nesie session používateľa (RLS). */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // volané z RSC – cookies nastaví middleware
        }
      },
    },
  });
}
