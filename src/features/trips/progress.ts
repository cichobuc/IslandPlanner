import type { StepState } from '@/components/ui/stepper';

export const STEP_NAMES = [
  'Cestujúci & kedy',
  'Letenky',
  'Doprava',
  'Kde spať',
  'Itinerár',
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
 * Aktívny = prvý nehotový; ostatné čakajú. Kroky 04–08 sa spresnia v blokoch 2.6–2.8.
 */
export function tripProgress(t: TripProgressInput): { steps: StepState[]; done: number; active: number } {
  const done = [
    t.travelersCount > 0 && t.originAirports.length > 0,
    Boolean(t.startDate),
    Boolean(t.transportMode),
    (t.lodgingCount ?? 0) > 0,
    (t.dayCount ?? 0) > 0,
    false,
    false,
    false,
  ];
  const firstOpen = done.findIndex((d) => !d);
  const active = firstOpen === -1 ? 8 : firstOpen + 1;
  const steps = done.map<StepState>((d, i) => (d ? 'done' : i + 1 === active ? 'active' : 'pending'));
  return { steps, done: done.filter(Boolean).length, active };
}

/** Názov kroku 04 podľa vetvy (docs/obrazovky/00-vzor). */
export function stepNames(mode: 'car' | 'camper' | 'no_car' | null): string[] {
  const names = [...STEP_NAMES] as string[];
  if (mode === 'camper') names[3] = 'Kempy';
  if (mode === 'no_car') {
    names[3] = 'Základňa';
    names[4] = 'Výlety';
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
