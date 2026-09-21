import type { Availability } from './types';

export const MONTHS_SK = [
  'január',
  'február',
  'marec',
  'apríl',
  'máj',
  'jún',
  'júl',
  'august',
  'september',
  'október',
  'november',
  'december',
];

/** Lokál („v septembri“). */
export const MONTHS_SK_LOC = [
  'januári',
  'februári',
  'marci',
  'apríli',
  'máji',
  'júni',
  'júli',
  'auguste',
  'septembri',
  'októbri',
  'novembri',
  'decembri',
];

export type MemberAvailability = { name: string; availability: Availability | null | undefined };

export type GroupAvailability = {
  /** mesiace, ktoré vyhovujú všetkým, čo mesiace vyplnili (1–12); [] = nikto nič nevyplnil alebo prázdny prienik */
  monthsAll: number[];
  /** kto cieľový mesiac nemá medzi svojimi (len tí, čo mesiace vyplnili) */
  monthConflicts: string[];
  /** blokované dni v cieľovom mesiaci: ISO dátum → mená */
  blockedDays: Record<string, string[]>;
  /** prienik min/max dní členov (null = nikto nevyplnil) */
  days: { min: number; max: number } | null;
  /** varovania po slovensky pre krok 01 (mesiac, dĺžka, blokované termíny) */
  warnings: string[];
  /** koľko členov má vyplnené aspoň niečo z „Kedy môžem“ */
  filled: number;
};

/** Rozpíše rozsah 'YYYY-MM-DD/YYYY-MM-DD' (alebo jeden deň) na ISO dni. */
export function expandRange(range: string): string[] {
  const [a, b = a] = range.split('/');
  const from = Date.parse(a);
  const to = Date.parse(b);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return [];
  const out: string[] = [];
  for (let t = from; t <= to && out.length < 400; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

const fmtDm = (iso: string) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;

/**
 * Prienik dostupnosti skupiny z profilov (00a „Kedy môžem“) voči cieľovému mesiacu a dĺžke cesty.
 * Kto nič nevyplnil, neobmedzuje (ráta sa ako „môžem vždy“).
 */
export function groupAvailability(
  members: MemberAvailability[],
  targetMonth: string, // YYYY-MM
  tripDays: { min: number; max: number },
): GroupAvailability {
  const month = Number(targetMonth.slice(5, 7));
  const withMonths = members.filter((m) => m.availability?.months?.length);
  let monthsAll: number[] = [];
  if (withMonths.length) {
    monthsAll = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((mo) =>
      withMonths.every((m) => m.availability!.months!.includes(mo)),
    );
  }
  const monthConflicts = withMonths.filter((m) => !m.availability!.months!.includes(month)).map((m) => m.name);

  const blockedDays: Record<string, string[]> = {};
  for (const m of members) {
    for (const r of m.availability?.blocked ?? []) {
      for (const d of expandRange(r)) {
        if (!d.startsWith(targetMonth)) continue;
        (blockedDays[d] ??= []).push(m.name);
      }
    }
  }

  const withDays = members.filter((m) => m.availability?.minDays != null || m.availability?.maxDays != null);
  let days: GroupAvailability['days'] = null;
  if (withDays.length) {
    const min = Math.max(...withDays.map((m) => m.availability?.minDays ?? 1));
    const max = Math.min(...withDays.map((m) => m.availability?.maxDays ?? 60));
    days = { min, max };
  }

  const warnings: string[] = [];
  if (monthConflicts.length)
    warnings.push(
      `${monthConflicts.join(', ')} ${monthConflicts.length === 1 ? 'nemôže' : 'nemôžu'} v ${MONTHS_SK_LOC[month - 1]}${
        monthsAll.length ? ` – všetkým sedí ${monthsAll.map((mo) => MONTHS_SK[mo - 1]).join(', ')}` : ''
      }.`,
    );
  const blockedList = Object.entries(blockedDays).sort(([a], [b]) => a.localeCompare(b));
  if (blockedList.length) {
    // zhrnutie: meno → súvislé úseky
    const byName = new Map<string, string[]>();
    for (const [d, names] of blockedList) for (const n of names) (byName.get(n) ?? byName.set(n, []).get(n)!).push(d);
    const parts: string[] = [];
    for (const [name, ds] of byName) {
      const segs: string[] = [];
      let start = ds[0];
      let prev = ds[0];
      for (const d of ds.slice(1)) {
        if (Date.parse(d) - Date.parse(prev) > 86_400_000) {
          segs.push(start === prev ? fmtDm(start) : `${fmtDm(start)}–${fmtDm(prev)}`);
          start = d;
        }
        prev = d;
      }
      segs.push(start === prev ? fmtDm(start) : `${fmtDm(start)}–${fmtDm(prev)}`);
      parts.push(`${name}: ${segs.join(', ')}`);
    }
    warnings.push(`Blokované termíny v ${MONTHS_SK_LOC[month - 1]}: ${parts.join(' · ')}`);
  }
  if (days) {
    if (days.min > days.max) warnings.push(`Dĺžka: členovia sa nezhodnú (min ${days.min} > max ${days.max} dní).`);
    else if (tripDays.max < days.min || tripDays.min > days.max)
      warnings.push(`Dĺžka cesty ${tripDays.min}–${tripDays.max} dní je mimo toho, čo členom vyhovuje (${days.min}–${days.max}).`);
    else if (tripDays.min < days.min || tripDays.max > days.max)
      warnings.push(`Členom vyhovuje ${days.min}–${days.max} dní – zváž zúžiť ${tripDays.min}–${tripDays.max}.`);
  }
  const filled = members.filter(
    (m) =>
      m.availability?.months?.length ||
      m.availability?.blocked?.length ||
      m.availability?.minDays != null ||
      m.availability?.maxDays != null,
  ).length;
  return { monthsAll, monthConflicts, blockedDays, days, warnings, filled };
}
