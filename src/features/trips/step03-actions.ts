'use server';

import { and, eq, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb, schema } from '@/db';
import { deriveFromFlight } from '@/engine/cascade';
import type { ScenarioKey } from '@/engine/types';
import { canEdit, getTripAccess } from './access';
import type { ActionState } from './actions';
import { loadFlightInput } from './snapshot';

const NO_EDIT = 'Nemáš právo upravovať túto cestu.';
const revalidate = (tripId: string) => revalidatePath(`/[locale]/cesta/${tripId}`, 'layout');

async function editable(tripId: string) {
  const access = await getTripAccess(tripId);
  return access && canEdit(access.role) ? access : null;
}

/** Dni prenájmu: z letu (pickup po prílete, return 3 h pred odletom) alebo min. dní cesty. */
export async function rentalDays(tripId: string, minDays: number): Promise<number> {
  const flight = await loadFlightInput(tripId);
  return flight ? deriveFromFlight(flight).vehicleDays : minDays;
}

const modeSchema = z.object({ tripId: z.uuid(), mode: z.enum(['car', 'camper', 'no_car']) });

/** Rozhodnutie Auto / Karavan / Bez auta – určuje typ krokov 04/05; dáta druhej vetvy ostávajú (scenario_key). */
export async function setTransportModeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = modeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatná voľba.' };
  const { tripId, mode } = parsed.data;
  if (mode === 'no_car') return { ok: false, error: 'Vetva „Bez auta“ príde vo verzii 1.1.' };
  if (!(await editable(tripId))) return { ok: false, error: NO_EDIT };
  await getDb()
    .update(schema.trips)
    .set({ transportMode: mode, updatedAt: new Date() })
    .where(eq(schema.trips.id, tripId));
  revalidate(tripId);
  return { ok: true };
}

const selectSchema = z.object({
  tripId: z.uuid(),
  scenario: z.enum(['car', 'camper']),
  vehicleOptionId: z.uuid(),
});

/** Zvoliť vozidlo pre vetvu: predvolené poistenia = nezahrnuté SCDW + GP, 2. vodič ak sú vodiči ≥ 2. */
export async function selectVehicleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = selectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Neplatný výber.' };
  const { tripId, scenario, vehicleOptionId } = parsed.data;
  const access = await editable(tripId);
  if (!access) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const [opt] = await db
    .select()
    .from(schema.vehicleOptions)
    .where(
      and(
        eq(schema.vehicleOptions.id, vehicleOptionId),
        or(isNull(schema.vehicleOptions.tripId), eq(schema.vehicleOptions.tripId, tripId)),
      ),
    )
    .limit(1);
  if (!opt) return { ok: false, error: 'Vozidlo neexistuje.' };
  const drivers = await db
    .select({ n: schema.travelers.id })
    .from(schema.travelers)
    .where(and(eq(schema.travelers.tripId, tripId), eq(schema.travelers.isDriver, true)));
  const insuranceChosen = Object.entries(opt.insurance ?? {})
    .filter(([k, v]) => !v.included && (k === 'scdw' || k === 'gp'))
    .map(([k]) => k);
  const extrasChosen: Record<string, number> =
    drivers.length > 1 && opt.extras?.second_driver ? { second_driver: 1 } : {};
  const days = await rentalDays(tripId, access.trip.minDays);
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.vehicleSelection)
      .where(
        and(eq(schema.vehicleSelection.tripId, tripId), eq(schema.vehicleSelection.scenarioKey, scenario)),
      );
    await tx.insert(schema.vehicleSelection).values({
      tripId,
      scenarioKey: scenario,
      vehicleOptionId,
      days,
      insuranceChosen,
      extrasChosen,
      isManual: false,
    });
  });
  revalidate(tripId);
  return { ok: true };
}

const optionsSchema = z.object({
  tripId: z.uuid(),
  scenario: z.enum(['car', 'camper']),
  consumptionOverride: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(2).max(25).optional(),
  ),
  fuelPriceOverride: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(100).max(1000).optional(),
  ),
});

/** Poistenia (checkboxy `insurance`), extras (`extra.<key>` = počet), spotreba a cena paliva prepísateľné. */
export async function updateVehicleOptionsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = optionsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Skontroluj polia.' };
  const { tripId, scenario } = parsed.data;
  if (!(await editable(tripId))) return { ok: false, error: NO_EDIT };
  const insuranceChosen = formData
    .getAll('insurance')
    .map(String)
    .filter((k) => /^[a-z_]+$/.test(k));
  const extrasChosen: Record<string, number> = {};
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith('extra.')) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) extrasChosen[k.slice(6)] = Math.min(9, Math.floor(n));
  }
  await getDb()
    .update(schema.vehicleSelection)
    .set({
      insuranceChosen,
      extrasChosen,
      consumptionOverride:
        parsed.data.consumptionOverride != null ? String(parsed.data.consumptionOverride) : null,
      fuelPriceOverride: parsed.data.fuelPriceOverride != null ? String(parsed.data.fuelPriceOverride) : null,
      isManual: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.vehicleSelection.tripId, tripId),
        eq(schema.vehicleSelection.scenarioKey, scenario as ScenarioKey),
      ),
    );
  revalidate(tripId);
  return { ok: true };
}

const manualSchema = z.object({
  tripId: z.uuid(),
  scenario: z.enum(['car', 'camper']),
  name: z.string().trim().min(2).max(80),
  provider: z.string().trim().min(1).max(60),
  class: z.enum(['economy', 'estate', 'suv2wd', '4x4', 'camper2', 'camper4', 'camper4x4']),
  pricePerDay: z.coerce.number().min(1).max(5000),
  consumption: z.coerce.number().min(2).max(25),
  fuel: z.enum(['petrol', 'diesel']),
  seats: z.coerce.number().int().min(1).max(9).default(5),
  url: z.string().trim().url().optional().or(z.literal('')),
});

/** „+ Vozidlo ručne": vlastná ponuka (per cesta) a hneď sa zvolí. */
export async function addManualVehicleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: `Skontroluj polia (${parsed.error.issues[0]?.path.join('.')}).` };
  const v = parsed.data;
  const access = await editable(v.tripId);
  if (!access) return { ok: false, error: NO_EDIT };
  const db = getDb();
  const [row] = await db
    .insert(schema.vehicleOptions)
    .values({
      tripId: v.tripId,
      kind: v.scenario,
      class: v.class,
      provider: v.provider,
      name: v.name,
      seats: v.seats,
      sleeps: v.scenario === 'camper' ? v.seats : 0,
      fuel: v.fuel,
      consumptionL100km: String(v.consumption),
      pricePerDay: { amount: v.pricePerDay, currency: 'EUR', source: 'manual' },
      insurance: {},
      extras: {},
      url: v.url || null,
      notes: 'ručne zadané',
    })
    .returning({ id: schema.vehicleOptions.id });
  const days = await rentalDays(v.tripId, access.trip.minDays);
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.vehicleSelection)
      .where(
        and(
          eq(schema.vehicleSelection.tripId, v.tripId),
          eq(schema.vehicleSelection.scenarioKey, v.scenario),
        ),
      );
    await tx.insert(schema.vehicleSelection).values({
      tripId: v.tripId,
      scenarioKey: v.scenario,
      vehicleOptionId: row.id,
      days,
      insuranceChosen: [],
      extrasChosen: {},
      isManual: true,
    });
  });
  revalidate(v.tripId);
  return { ok: true };
}
