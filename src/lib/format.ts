/** Formátovanie súm a čísel pre UI (sk): „4 680 €", „1 170 €/os", „≈ 1 690 €". */
const NNBSP = ' '; // úzka nezlomiteľná medzera medzi tisíckami
const NBSP = ' ';

export function fmtInt(n: number): string {
  const rounded = Math.round(Math.abs(n));
  const s = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return n < 0 ? `−${s}` : s;
}

export function fmtEur(n: number, opts: { approx?: boolean; sign?: boolean } = {}): string {
  const prefix = opts.approx ? `≈${NBSP}` : opts.sign && n > 0 ? `+${NBSP}` : '';
  return `${prefix}${fmtInt(n)}${NBSP}€`;
}

export const fmtPerPerson = (n: number, opts: { approx?: boolean } = {}) => `${fmtEur(n, opts)}/os`;

export const fmtRange = (min: number, max: number) => `${fmtInt(min)}${NBSP}–${NBSP}${fmtInt(max)}${NBSP}€`;

export const fmtKm = (km: number) => `${fmtInt(km)}${NBSP}km`;

/** Dvojmiestne číslo kroku: 3 → „03". */
export const stepNo = (n: number) => String(n).padStart(2, '0');
