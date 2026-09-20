import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, schema } from '@/db';
import { persistSearch, searchFlights, type ProgressEvent } from '@/features/flights/search-service';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const bags = z.object({
  cabinSmall: z.number().int().min(0).default(1),
  cabin10: z.number().int().min(0).default(0),
  checked20: z.number().int().min(0).default(0),
  checked32: z.number().int().min(0).default(0),
});
const body = z.object({
  tripId: z.uuid().optional(),
  origins: z.array(z.string().length(3)).min(1).max(8),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  minDays: z.number().int().min(2).max(30).default(8),
  maxDays: z.number().int().min(2).max(30).default(12),
  pax: z.number().int().min(1).max(9).default(4),
  travelersBags: z.array(bags).optional(),
  parking: z.boolean().default(true),
  allowSelfTransfer: z.boolean().default(true),
  filters: z
    .object({
      directOnly: z.boolean().optional(),
      maxTransfers: z.number().int().optional(),
      airlines: z.array(z.string()).optional(),
      departAfter: z.string().optional(),
      returnBefore: z.string().optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(200).optional(),
  stream: z.boolean().default(true),
});

/**
 * POST /api/flights/search – mesiac × letiská → kombinácie (docs/02). SSE: `progress` udalosti, na konci `result`.
 * `stream:false` vráti JSON naraz.
 */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  const p = parsed.data;
  if (p.minDays > p.maxDays) return NextResponse.json({ error: 'minDays > maxDays' }, { status: 400 });
  if (p.tripId) {
    const [m] = await getDb()
      .select()
      .from(schema.tripMembers)
      .where(and(eq(schema.tripMembers.tripId, p.tripId), eq(schema.tripMembers.userId, me.user.id)))
      .limit(1);
    if (!m || m.role === 'viewer') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const params = {
    origins: p.origins.map((o) => o.toUpperCase()),
    month: p.month,
    minDays: p.minDays,
    maxDays: p.maxDays,
    pax: p.pax,
    travelersBags:
      p.travelersBags ??
      Array.from({ length: p.pax }, () => ({ cabinSmall: 1, cabin10: 0, checked20: 0, checked32: 0 })),
    parking: p.parking,
    allowSelfTransfer: p.allowSelfTransfer,
    filters: p.filters,
    limit: p.limit,
  };

  if (!p.stream) {
    const result = await searchFlights(params);
    const searchId = p.tripId ? await persistSearch(p.tripId, params, result) : null;
    return NextResponse.json({ searchId, ...result });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        const result = await searchFlights(params, (e: ProgressEvent) => send('progress', e));
        const searchId = p.tripId ? await persistSearch(p.tripId, params, result) : null;
        send('result', { searchId, ...result });
      } catch (e) {
        send('error', { message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
