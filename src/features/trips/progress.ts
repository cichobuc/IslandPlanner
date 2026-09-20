import type { StepState } from '@/components/ui/stepper';

export const STEP_NAMES = [
  'Cestujúci & kedy',
  'Letenky',
  'Doprava',
  'Itinerár',
  'Kde spať',
  'Atrakcie',
  'Strava',
  'Rozpočet',
] as const;

export type TripProgressInput = {
  travelersCount: number;
  originAirports: string[];
  startDate: string | null;
  transportMode: 'car' | 'camper' | 'no_car' | null;
  lodgingCount?: number;
  dayCount?: number;
};

/**
 * Stav 8 krokov z uložených dát cesty (čisté, bez IO). Hotový = má výstup pre ďalší krok.
 * Aktívny = prvý nehotový; ostatné čakajú. 04 = itinerár má dni so zastávkami, 05 = noci vetvy existujú.
 */
export function tripProgress(t: TripProgressInput): { steps: StepState[]; done: number; active: number } {
  const done = [
    t.travelersCount > 0 && t.originAirports.length > 0,
    Boolean(t.startDate),
    Boolean(t.transportMode),
    (t.dayCount ?? 0) > 0,
    (t.lodgingCount ?? 0) > 0,
    false,
    false,
    false,
  ];
  const firstOpen = done.findIndex((d) => !d);
  const active = firstOpen === -1 ? 8 : firstOpen + 1;
  const steps = done.map<StepState>((d, i) => (d ? 'done' : i + 1 === active ? 'active' : 'pending'));
  return { steps, done: done.filter(Boolean).length, active };
}

/** Názvy krokov 04/05 podľa vetvy (ADR-014: 04 Itinerár, 05 Kde spať). */
export function stepNames(mode: 'car' | 'camper' | 'no_car' | null): string[] {
  const names = [...STEP_NAMES] as string[];
  if (mode === 'camper') names[4] = 'Kempy';
  if (mode === 'no_car') {
    names[3] = 'Výlety';
    names[4] = 'Základňa';
  }
  return names;
}

const MONTHS_SK = [
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

/** „2027-09-01" → „september 2027". */
export function monthLabel(isoDate: string): string {
  const [y, m] = isoDate.split('-').map(Number);
  return `${MONTHS_SK[(m ?? 1) - 1]} ${y}`;
}

/** „2027-09-12", „2027-09-21" → „12.–21. 9." (rôzne mesiace: „28. 9.–3. 10."). */
export function dateRangeLabel(start: string, end: string): string {
  const [, sm, sd] = start.split('-').map(Number);
  const [, em, ed] = end.split('-').map(Number);
  return sm === em ? `${sd}.–${ed}. ${em}.` : `${sd}. ${sm}.–${ed}. ${em}.`;
}
