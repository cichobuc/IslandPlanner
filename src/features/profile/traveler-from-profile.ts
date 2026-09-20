import type { Bags } from '@/engine/types';
import type { schema } from '@/db';

type Profile = typeof schema.profiles.$inferSelect;
type TravelerInsert = Omit<typeof schema.travelers.$inferInsert, 'tripId'>;

/** Prenos profilu do riadku cestujúceho (krok 01) – vek, vodič, batožina, doklady. Ručná aktualizácia, nie automatická. */
export function travelerFromProfile(p: Profile): TravelerInsert {
  const bags: Bags =
    p.bagsPref === 'checked'
      ? { cabinSmall: 1, cabin10: 0, checked20: 1, checked32: 0 }
      : { cabinSmall: 1, cabin10: 0, checked20: 0, checked32: 0 };
  const driverSince = p.driverLicence?.sinceYear ? `${p.driverLicence.sinceYear}-01-01` : null;
  return {
    name: p.displayName,
    birthDate: p.birthDate,
    userId: p.userId,
    isDriver: Boolean(p.driverLicence?.has) && p.driverLicence?.willingToDrive !== 'no',
    driverSince,
    hasCreditCard: p.hasCreditCard ?? false,
    docs: { ...(p.docs ?? {}), droneOperatorId: p.drone?.operatorId || undefined },
    bags,
  };
}
