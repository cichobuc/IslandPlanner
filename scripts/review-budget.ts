import 'dotenv/config';
// Ladenie vlastného mešca: 10-dňový Ring, 4 os., limit X €/os – porovnanie penalizácie ceny. Spustenie: tsx -r ./scripts/server-only-shim.cjs scripts/review-budget.ts 200
import { generateItinerary, lambdaForPpPerDay, type DaySkeleton } from '../src/engine/itinerary';
import { allocateNights, presetForDays } from '../src/engine/presets';
import { loadAnchorPoints, loadMatrix, loadPoiCandidates } from '../src/features/trips/step05-actions';
async function main() {
  const pool = Number(process.argv[2] ?? 200);
  const days = 10;
  const preset = presetForDays(days, { interests: ['thermal', 'glacier', 'hike'], pace: 'normal' });
  const regions = allocateNights(preset, days - 1, {});
  const skeleton: DaySkeleton[] = Array.from({ length: days }, (_, i) => ({
    dayIndex: i + 1,
    date: `2027-09-${String(12 + i).padStart(2, '0')}`,
    overnightRegionId: i === days - 1 ? null : regions[i],
    startMin: i === 0 ? 9 * 60 + 15 + 60 : undefined,
    endMin: i === days - 1 ? 15 * 60 + 20 - 180 : undefined,
  }));
  const [matrix, pois, anchorPoints] = await Promise.all([loadMatrix(), loadPoiCandidates(9, 0.0072), loadAnchorPoints()]);
  const full = lambdaForPpPerDay(pool / days);
  for (const [label, lambda] of [['plná λ', full], ['½ λ', full / 2], ['min λ', 0.005]] as const) {
    const out = generateItinerary({ days: skeleton, pois, matrix, anchorPoints, pace: 'normal', interests: ['thermal', 'glacier', 'hike'], allow4x4: false, attractionBudget: 'balanced', attractionPoolPpEur: pool, attractionSplurge: true, attractionLambda: lambda, pax: 4 });
    const paid = out.flatMap((d) => d.stops.map((s) => pois.find((x) => x.slug === s.slug)!)).filter((p) => (p.entryPpEur ?? 0) > 0);
    const eur = paid.reduce((a, p) => a + (p.entryPpEur ?? 0), 0);
    console.log(`\n=== limit ${pool} €/os · ${label} (${lambda.toFixed(4)}) → ${Math.round(eur)} €/os, ${out.reduce((a, d) => a + d.stops.length, 0)} zastávok`);
    console.log('   ' + paid.map((p) => `${p.name} ${Math.round(p.entryPpEur ?? 0)}€ ${'★'.repeat(Math.round(p.popularity))}`).join(' · '));
  }
  process.exit(0);
}
void main();
