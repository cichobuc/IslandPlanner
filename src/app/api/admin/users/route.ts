import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUserWithTempPassword } from '@/lib/auth/create-user';
import { requireAdmin } from '@/lib/auth/session';

const body = z.object({
  email: z.email(),
  displayName: z.string().min(1).max(80),
  tripId: z.uuid().optional(),
  role: z.enum(['owner', 'editor', 'viewer']).optional(),
  isAdmin: z.boolean().optional(),
});

/** POST /api/admin/users – len správca. Dočasné heslo sa vráti raz. */
export async function POST(request: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const result = await createUserWithTempPassword({ ...parsed.data, createdBy: me.user.id });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
  return NextResponse.json(result, { status: result.existed ? 200 : 201 });
}
