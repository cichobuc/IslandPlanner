import { z } from 'zod';
import { INTEREST_KEYS, ORIGIN_AIRPORTS } from '@/engine/types';

const yesNo = z.enum(['yes', 'no']).transform((v) => v === 'yes');
const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .pipe(z.iso.date().nullable());
const optionalInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : Number(v)))
    .pipe(z.number().int().min(min).max(max).nullable());

/** Formulár profilu (docs/obrazovky/00a) – vstup z FormData, výstup pripravený pre DB. */
export const profileFormSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  birthDate: optionalDate,
  homeLabel: z.string().trim().max(80).default('Bratislava'),
  locale: z.enum(['sk', 'cs']).default('sk'),

  driverHas: yesNo,
  driverSinceYear: optionalInt(1950, 2030),
  driverCategories: z.array(z.enum(['B', 'BE', 'C'])).default([]),
  willingToDrive: z.enum(['yes', 'no', 'emergency']).default('yes'),
  hasCreditCard: yesNo,

  droneHas: yesNo,
  droneModel: z.string().trim().max(80).default(''),
  droneWeightG: optionalInt(0, 25000),
  droneOperatorId: z.string().trim().max(40).default(''),
  droneInsurance: yesNo.default(false),

  interests: z.partialRecord(z.enum(INTEREST_KEYS), z.coerce.number().int().min(0).max(3)).default({}),

  pace: z.enum(['relaxed', 'normal', 'intense']).default('normal'),
  comfort: z.enum(['camp', 'hostel', 'guesthouse', 'hotel']).default('guesthouse'),
  foodLevel: z.enum(['budget', 'mid', 'comfort']).default('budget'),
  bagsPref: z.enum(['light', 'checked']).default('light'),
  budgetTarget: optionalInt(0, 100000),

  airports: z.array(z.enum(ORIGIN_AIRPORTS)).default([]),

  availMonths: z.array(z.coerce.number().int().min(1).max(12)).default([]),
  blockedFrom: z.array(z.string().trim()).default([]),
  blockedTo: z.array(z.string().trim()).default([]),
  availMinDays: optionalInt(1, 60),
  availMaxDays: optionalInt(1, 60),

  idValidUntil: optionalDate,
  ehic: yesNo.default(false),
  insurance: yesNo.default(false),

  intent: z.enum(['save', 'done']).default('save'),
});

export type ProfileFormInput = z.input<typeof profileFormSchema>;
export type ProfileFormValues = z.output<typeof profileFormSchema>;

/** FormData → objekt: polia s [] a interests.* poskladá do polí / záznamu. */
export function formDataToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = { interests: {} };
  for (const [key, raw] of fd.entries()) {
    const value = typeof raw === 'string' ? raw : '';
    if (key.startsWith('interests.')) {
      (out.interests as Record<string, string>)[key.slice('interests.'.length)] = value;
    } else if (key.endsWith('[]')) {
      const k = key.slice(0, -2);
      ((out[k] as string[] | undefined) ?? (out[k] = [])).push(value);
    } else {
      out[key] = value;
    }
  }
  for (const k of ['driverCategories', 'airports', 'availMonths', 'blockedFrom', 'blockedTo']) if (!(k in out)) out[k] = [];
  return out;
}

/** Blokované termíny z párov od/do → 'YYYY-MM-DD/YYYY-MM-DD' (prázdne riadky sa vynechajú, od > do sa otočí). */
export function blockedRanges(from: string[], to: string[]): string[] {
  const out: string[] = [];
  from.forEach((f, i) => {
    const a = f || to[i] || '';
    const b = to[i] || f || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return;
    out.push(a <= b ? `${a}/${b}` : `${b}/${a}`);
  });
  return out;
}
