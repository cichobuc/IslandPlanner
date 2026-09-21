import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fmtH } from '@/engine/itinerary';
import type { BudgetCategory } from '@/engine/types';
import { getTripAccess } from '@/features/trips/access';
import { foodBreakdown, loadBudget } from '@/features/trips/budget-data';
import { loadItinerary } from '@/features/trips/itinerary-data';
import { dateRangeLabel } from '@/features/trips/progress';
import { listTripMembers } from '@/features/trips/queries';
import { fmtEur, fmtKm, fmtRange } from '@/lib/format';
import { PrintButton } from './print-button';

export const metadata: Metadata = { title: 'Tlač' };

const CAT: Record<BudgetCategory, string> = {
  flights: 'Letenky & cesta',
  transport: 'Doprava na Islande',
  lodging: 'Kde spať',
  attractions: 'Atrakcie',
  food: 'Strava',
  other: 'Ostatné',
  reserve: 'Rezerva',
};
const dm = (iso: string) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;

/** Tlačová verzia (A4, svetlá): prehľad · rozpočet · itinerár deň po dni s časmi a vstupným · noci · checklist. Ctrl/⌘+P → PDF. */
export default async function PrintPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const access = await getTripAccess(id);
  if (!access) notFound();
  const { trip } = access;
  const [budget, it, members] = await Promise.all([
    trip.startDate ? loadBudget(id) : null,
    trip.startDate ? loadItinerary(id) : null,
    listTripMembers(id),
  ]);
  const t = budget?.totals ?? null;
  const food = budget ? foodBreakdown(budget.snapshot, budget.active) : null;
  const pax = budget?.snapshot.travelers.length ?? members.length;

  return (
    <div className="mx-auto max-w-[210mm] bg-white px-6 py-8 text-[12px] leading-[1.45] text-[#0B1220] print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 14mm 12mm; } @media print { .no-print { display: none !important; } body { background: #fff !important; } .page-break { break-before: page; } }`}</style>
      <div className="no-print mb-6 flex items-center gap-3 rounded-[10px] border border-[#E4E8EE] bg-[#F4F6F9] px-4 py-3">
        <span className="grow text-[13px]">Tlačová verzia – v prehliadači zvoľ Tlačiť → Uložiť ako PDF.</span>
        <PrintButton />
        <a href={`/${locale}/cesta/${id}?krok=8`} className="text-[13px] font-semibold text-[#0F4C81]">
          Späť
        </a>
      </div>

      <header className="mb-5 border-b border-[#E4E8EE] pb-4">
        <div className="text-[11px] font-semibold tracking-[.08em] text-[#6B7684] uppercase">
          Island Planner
        </div>
        <h1 className="font-display text-[24px] font-semibold">{trip.name}</h1>
        <div className="text-[#5B6675]">
          {trip.startDate && trip.endDate
            ? `${dateRangeLabel(trip.startDate, trip.endDate)} 2027 · ${it?.days.length ?? 0} dní`
            : 'termín zatiaľ nevybraný'}{' '}
          · {pax} os. ·{' '}
          {trip.transportMode === 'camper'
            ? 'karavan'
            : trip.transportMode === 'car'
              ? 'auto'
              : 'doprava nerozhodnutá'}{' '}
          · členovia: {members.map((m) => m.displayName).join(', ')}
        </div>
      </header>

      {t && (
        <section className="mb-6">
          <h2 className="font-display mb-2 text-[16px] font-semibold">
            Rozpočet · {fmtEur(t.group)} · {fmtEur(t.perPerson)}/os
          </h2>
          <table className="w-full border-collapse">
            <tbody>
              {(Object.keys(CAT) as BudgetCategory[]).map((k) => {
                const c = t.byCategory[k];
                if (!c.lines.length) return null;
                return (
                  <tr key={k} className="border-b border-[#EEF1F5]">
                    <td className="py-1 pr-2 font-semibold">{CAT[k]}</td>
                    <td className="py-1 pr-2 text-[#5B6675]">
                      {c.lines
                        .map((l) => l.label)
                        .slice(0, 4)
                        .join(' · ')}
                      {c.lines.length > 4 ? ` … (${c.lines.length})` : ''}
                    </td>
                    <td className="py-1 text-right font-semibold whitespace-nowrap tabular-nums">
                      {c.min !== c.max ? `≈ ${fmtEur(c.amount)}` : fmtEur(c.amount)}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="py-1 pr-2 font-semibold">Celkom</td>
                <td className="py-1 pr-2 text-[#5B6675]">
                  {t.min !== t.max ? `rozsah ${fmtRange(t.min, t.max)}` : 'presné'} · rezerva{' '}
                  {trip.reservePct} %
                </td>
                <td className="py-1 text-right font-semibold tabular-nums">{fmtEur(t.group)}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-1 text-[#5B6675]">
            Na osobu:{' '}
            {Object.entries(t.perTraveler)
              .map(
                ([tid, amt]) =>
                  `${budget!.snapshot.travelers.find((x) => x.id === tid)?.name.split(' ')[0] ?? '?'} ${fmtEur(amt)}`,
              )
              .join(' · ')}
          </div>
        </section>
      )}

      {it && (
        <section className="mb-6">
          <h2 className="font-display mb-2 text-[16px] font-semibold">
            Itinerár · {fmtKm(it.totals.km)} · {fmtH(it.totals.driveMinReal)} jazdy · {it.totals.stops}{' '}
            zastávok
          </h2>
          {it.days.map((d) => (
            <div key={d.dayId} className="mb-3 break-inside-avoid">
              <div className="flex items-baseline gap-2 border-b border-[#E4E8EE] pb-0.5">
                <span className="font-display text-[14px] font-semibold">
                  Deň {d.dayIndex} · {d.dow} {dm(d.date)} · {d.regionName}
                </span>
                <span className="text-[#5B6675]">
                  {fmtKm(d.driveKm)} · {fmtH(d.driveMinReal)} jazdy · ☀ do {d.sunset}
                  {d.reserve ? ' · rezervný deň' : ''}
                </span>
              </div>
              <table className="w-full">
                <tbody>
                  {d.stops.map((s) => (
                    <tr key={s.stopId}>
                      <td className="w-[46px] py-0.5 align-top text-[#5B6675] tabular-nums">
                        {s.arrive ?? '—'}
                      </td>
                      <td className="py-0.5 align-top">
                        <span className="font-semibold">{s.name}</span>
                        {s.hiddenGem ? ' 💎' : ''}{' '}
                        <span className="text-[#5B6675]">
                          · {s.stayMin} min
                          {s.driveMinFromPrev > 0 ? ` · + ${Math.round(s.driveMinFromPrev * 1.25)} min jazdy (${Math.round(s.driveKmFromPrev)} km)` : ''}
                          {s.bookingRequired ? ' · rezervácia vopred' : ''}
                          {s.droneStatus === 'banned'
                            ? ' · dron zákaz'
                            : s.droneStatus === 'permit'
                              ? ' · dron povolenie'
                              : ''}
                        </span>
                        {s.tips && <div className="text-[11px] text-[#5B6675]">{s.tips}</div>}
                      </td>
                      <td className="py-0.5 text-right align-top whitespace-nowrap tabular-nums">
                        {s.entryGroup ? fmtEur(s.entryGroup) : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td />
                    <td className="py-0.5 text-[#1E6B34]">
                      {d.overnight
                        ? `Noc ${d.dayIndex}: ${d.overnight.lodgingName ?? `${d.overnight.regionName} (ubytovanie ešte nevybrané)`}`
                        : 'Odovzdanie auta a odlet z KEF'}
                    </td>
                    <td />
                  </tr>
                  {d.warnings.length > 0 && (
                    <tr>
                      <td />
                      <td className="py-0.5 text-[11px] text-[#8A5300]">⚠ {d.warnings.join(' · ')}</td>
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

      {food && (
        <section className="mb-6 break-inside-avoid">
          <h2 className="font-display mb-1 text-[16px] font-semibold">
            Strava · {fmtEur(food.total.total)} · {fmtEur(food.total.perPerson)}/os
          </h2>
          <div className="text-[#5B6675]">
            Úroveň{' '}
            {budget!.snapshot.food.level === 'budget'
              ? 'úsporná'
              : budget!.snapshot.food.level === 'mid'
                ? 'stredná'
                : 'komfortná'}{' '}
            · kuchynka {food.days.filter((d) => d.kitchenMorning || d.kitchenEvening).length} z{' '}
            {food.days.length} dní · prvý nákup {fmtEur(food.total.firstShopPp)}/os (Bónus/Krónan po prílete)
          </div>
        </section>
      )}

      <section className="page-break">
        <h2 className="font-display mb-2 text-[16px] font-semibold">Checklist pred cestou</h2>
        <ul className="columns-2 gap-6 text-[12px] [&>li]:mb-1">
          {[
            'OP/pas všetkých platný po návrat (Island = Schengen)',
            'EHIC karta + cestovné poistenie s krytím ľadovcových túr',
            'Kreditná (nie debetná) karta vodiča na depozit',
            'Vodičské preukazy · 2. vodič nahlásený v požičovni',
            'Gravel poistenie k autu · fotky auta pri prevzatí',
            'Online check-in (Wizz 30 dní / 24 h) · batožina kúpená vopred',
            'Parkovanie pri letisku rezervované',
            'Rezervácie: túry/kúpele s pevným časom (viď itinerár)',
            'Aplikácie: Parka (parkovné), vedur.is (počasie), road.is, 112 Iceland',
            'Plavky, uterák, teplé vrstvy, vetrovka, pevná obuv',
            'Dron: registrácia operátora, batérie v príručnej',
            'Hotovosť netreba – všade karta; SIM/eSIM alebo roaming EÚ',
          ].map((x) => (
            <li key={x}>☐ {x}</li>
          ))}
        </ul>
        <div className="mt-6 text-[10px] text-[#8A94A3]">
          Ceny vstupného a ubytovania sú orientačné (seed 09/2026, kurz{' '}
          {budget?.snapshot.fx.ISK_EUR.toFixed(4) ?? '—'} €/ISK). Vygenerované Island Plannerom{' '}
          {new Date().toLocaleDateString('sk-SK')}.
        </div>
      </section>
    </div>
  );
}
