/** Časy s pásmom bez knižníc: KEF = Atlantic/Reykjavik (UTC+0), domov = Europe/Bratislava. */

export const TZ_KEF = 'Atlantic/Reykjavik';
export const TZ_HOME = 'Europe/Bratislava';

export type LocalParts = { date: string; hour: number; minute: number; minutesOfDay: number };

/** Lokálne časti okamihu v danom pásme. */
export function localParts(iso: string, tz: string): LocalParts {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`Neplatný čas ${iso}`);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour,
    minute,
    minutesOfDay: hour * 60 + minute,
  };
}

export const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Dátum (YYYY-MM-DD) + n dní. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}

/** Celé dni medzi dvoma dátumami (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export const hoursBetween = (isoA: string, isoB: string) => (Date.parse(isoB) - Date.parse(isoA)) / 3_600_000;

/** Je dátum (MM-DD) v sezóne {from,to}? Sezóna môže prechádzať cez Nový rok. */
export function inSeason(date: string, season: { from: string; to: string } | null | undefined): boolean {
  if (!season) return true;
  const md = date.slice(5);
  return season.from <= season.to
    ? md >= season.from && md <= season.to
    : md >= season.from || md <= season.to;
}

/** Východ/západ slnka pre Island v danom dni (lineárna interpolácia z docs/07; mimo sept. hrubý odhad). */
export function daylightMinutes(date: string): number {
  const d = new Date(`${date}T00:00:00Z`);
  const doy = Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000) + 1;
  // 1. 9. (doy 244) 14 h 35 min · 30. 9. (doy 273) 11 h 25 min; ~ −6,5 min/deň v septembri, aproximácia sínusom mimo
  const hours = 12 + 9.5 * Math.cos(((doy - 172) / 365) * 2 * Math.PI);
  return Math.round(Math.max(4, Math.min(21, hours)) * 60);
}
