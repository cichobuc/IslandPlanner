import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import { publicEnv } from '@/lib/env';

/** Obnoví session cookies na odpovedi a vráti používateľa (overeného na auth serveri). */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
