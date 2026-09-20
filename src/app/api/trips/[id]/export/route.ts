import { NextResponse } from 'next/server';
import { getTripAccess } from '@/features/trips/access';
import { loadBudget } from '@/features/trips/budget-data';
import { loadItinerary } from '@/features/trips/itinerary-data';

export const dynamic = 'force-dynamic';

/** GET /api/trips/[id]/export?format=json|csv – celá cesta (záloha) alebo položky rozpočtu aktívnej vetvy. PDF príde v 1.1. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getTripAccess(id);
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const format = new URL(request.url).searchParams.get('format') ?? 'json';
  const [budget, itinerary] = await Promise.all([loadBudget(id), loadItinerary(id)]);
  const safeName = access.trip.name.replace(/[^\w\-]+/g, '_');
  if (format === 'csv') {
    const t = budget.totals;
    const rows = [['kategoria', 'krok', 'polozka', 'delenie', 'zdroj', 'suma_eur', 'min_eur', 'max_eur']];
    for (const [cat, c] of Object.entries(t?.byCategory ?? {}))
      for (const l of c.lines)
        rows.push([
          cat,
          String(l.step),
          l.label,
          l.split,
          l.source,
          String(l.amount),
          String(l.min),
          String(l.max),
        ]);
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    return new Response(`﻿${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}-rozpocet.csv"`,
      },
    });
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    trip: access.trip,
    snapshot: budget.snapshot,
    budget: budget.result,
    itinerary: itinerary.days,
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}.json"`,
    },
  });
}
