import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  const url = new URL(request.url);
  const locale = url.searchParams.get('locale') ?? 'sk';
  return NextResponse.redirect(new URL(`/${locale}/prihlasenie`, url.origin), { status: 303 });
}
