import 'dotenv/config';
// Kontrola generátora nad ostrými dátami: vypíše 10-dňový Ring pre 4 osoby deň po dni (vyvážene + úsporne). Spustenie: pnpm itinerary:review
import { fmtClock, fmtH, generateItinerary, type DaySkeleton } from '../src/engine/itinerary';
import { allocateNights, presetForDays } from '../src/engine/presets';
import { loadAnchorPoints, loadMatrix, loadPoiCandidates } from '../src/features/trips/step05-actions';
async function main() {
  const days = 10;
  const preset = presetForDays(days, { interests: ['thermal', 'glacier', 'hike'], pace: 'normal' });
  const regions = allocateNights(preset, days - 1, { lateArrival: false, earlyDeparture: false });
  const skeleton: DaySkeleton[] = Array.from({ length: days }, (_, i) => ({
    dayIndex: i + 1,
    date: `2027-09-${String(12 + i).padStart(2, '0')}`,
    overnightRegionId: i === days - 1 ? null : regions[i],
    startMin: i === 0 ? 9 * 60 + 15 + 60 : undefined,
    endMin: i === days - 1 ? 15 * 60 + 20 - 180 : undefined, // odlet 15:20
  }));
  const [matrix, pois, anchorPoints] = await Promise.all([
    loadMatrix(),
    loadPoiCandidates(9, 0.0072),
    loadAnchorPoints(),
  ]);
  for (const level of ['balanced', 'budget'] as const) {
    const out = generateItinerary({
      days: skeleton,
      pois,
      matrix,
      anchorPoints,
      pace: 'normal',
      interests: ['thermal', 'glacier', 'hike'],
      allow4x4: false,
      attractionBudget: level,
      pax: 4,
    });
    let totalKm = 0,
      totalEur = 0,
      totalStops = 0;
    console.log(`\n=== ${level} · preset ${preset.key} · noci: ${regions.join(' → ')}`);
    for (const d of out) {
      const stops = d.stops.map((s) => {
        const p = pois.find((x) => x.slug === s.slug)!;
        totalEur += (p.entryPpEur ?? 0) * 4;
        return `${fmtClock(s.arriveMin)} ${p.name}${s.must ? '*' : ''}${p.entryPpEur ? ` (${Math.round(p.entryPpEur)}€)` : ''}`;
      });
      totalKm += d.driveKm;
      totalStops += d.stops.length;
      console.log(
        `D${d.dayIndex} ${d.startKey}→${d.endKey} | ${fmtClock(d.startMin)}–${fmtClock(d.arriveEndMin)} ☀${fmtClock(d.sunset)} | ${d.driveKm} km · ${fmtH(d.driveMinReal)}${d.reserve ? ' · REZERVA' : ''}\n   ${stops.join('\n   ')}${d.warnings.length ? '\n   ⚠ ' + d.warnings.join(' · ') : ''}`,
      );
    }
    console.log(
      `Σ ${totalKm} km · ${totalStops} zastávok · vstupné ${Math.round(totalEur)} € / 4 os. = ${Math.round(totalEur / 4)} €/os (${Math.round(totalEur / 4 / days)} €/os/deň)`,
    );
  }
  process.exit(0);
}
void main();
