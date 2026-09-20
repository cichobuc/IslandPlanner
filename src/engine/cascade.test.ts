import { describe, expect, it } from 'vitest';
import { applyFlightSelection, deriveFromFlight } from './cascade';
import { baseSnapshot, flightVie } from './fixtures';
import { eur } from './money';
import type { DayInput, LodgingStayInput } from './types';

describe('deriveFromFlight', () => {
  it('VIE 06:40 → KEF 09:15, späť 21. 9. 15:20: 10 dní, 9 nocí, parkovanie 11 dní (odlet < 07:00), prenájom 10 dní', () => {
    const d = deriveFromFlight(flightVie);
    expect(d).toMatchObject({
      startDate: '2027-09-12',
      endDate: '2027-09-21',
      days: 10,
      nights: 9,
      parkingDays: 11,
      vehicleDays: 10,
      lateArrival: false,
      earlyDeparture: false,
    });
    expect(d.firstDayPart).toBe('from_lunch');
    expect(d.lastDayPart).toBe('until_lunch');
  });
  it('nočný prílet 23:40 KEF a odlet 07:00 → lateArrival + earlyDeparture', () => {
    const d = deriveFromFlight({
      ...flightVie,
      outArrAt: '2027-09-12T23:40:00+00:00',
      retDepAt: '2027-09-21T07:00:00+00:00',
    });
    expect(d.lateArrival).toBe(true);
    expect(d.earlyDeparture).toBe(true);
    expect(d.lastDayPart).toBe('none');
  });
});

describe('applyFlightSelection', () => {
  it('nastaví termín, vygeneruje 10 dní + 9 nocí per scenár, prenájom 10 dní, diff obsahuje zmeny', () => {
    const r = applyFlightSelection(baseSnapshot(), flightVie);
    expect(r.snapshot.trip.startDate).toBe('2027-09-12');
    expect(r.snapshot.itinerary).toHaveLength(10);
    expect(r.snapshot.itinerary[0].date).toBe('2027-09-12');
    expect(r.snapshot.lodgingStays.car).toHaveLength(9);
    expect(r.snapshot.lodgingStays.camper?.[0].kind).toBe('camper_site');
    expect(r.snapshot.vehicle.car?.days).toBe(10);
    expect(r.changes.map((c) => c.path)).toEqual(
      expect.arrayContaining(['trip.dates', 'trip.days', 'itinerary', 'lodging.car.nights']),
    );
  });
  it('zmena letu 9 → 11 dní pregeneruje nezamknuté dni a zachová zamknutý; ručná noc ostane a dostane návrh', () => {
    const first = applyFlightSelection(baseSnapshot(), {
      ...flightVie,
      retDepAt: '2027-09-20T15:20:00+00:00',
    }).snapshot; // 9 dní
    const locked: DayInput = {
      ...first.itinerary[2],
      locked: true,
      overnightRegionId: 'highlands',
      stops: [{ id: 'st', customLabel: 'Landmannalaugar', isManual: true }],
    };
    const manualStay: LodgingStayInput = {
      ...first.lodgingStays.car![1],
      isManual: true,
      regionId: 'reykjavik',
      pricePerNight: eur(150, 'manual'),
    };
    const snap = {
      ...first,
      itinerary: first.itinerary.map((d) => (d.dayIndex === 3 ? locked : d)),
      lodgingStays: {
        ...first.lodgingStays,
        car: first.lodgingStays.car!.map((s) => (s.nightIndex === 2 ? manualStay : s)),
      },
      vehicle: { ...first.vehicle, car: { ...first.vehicle.car!, isManual: true } },
    };
    const r = applyFlightSelection(snap, { ...flightVie, retDepAt: '2027-09-22T15:20:00+00:00' }); // 11 dní
    expect(r.snapshot.itinerary).toHaveLength(11);
    const day3 = r.snapshot.itinerary.find((d) => d.dayIndex === 3)!;
    expect(day3.locked).toBe(true);
    expect(day3.overnightRegionId).toBe('highlands');
    expect(day3.stops[0].customLabel).toBe('Landmannalaugar');
    const night2 = r.snapshot.lodgingStays.car!.find((s) => s.nightIndex === 2)!;
    expect(night2.pricePerNight?.amount).toBe(150);
    expect(night2.regionId).toBe('reykjavik');
    expect(r.suggestions.some((s) => s.path === 'lodging.car.2.region')).toBe(true);
    // ručné vozidlo sa nemení, dostane návrh
    expect(r.snapshot.vehicle.car?.days).toBe(9);
    expect(r.suggestions.some((s) => s.path === 'vehicle.car.days' && s.suggested === 11)).toBe(true);
    expect(r.changes.find((c) => c.path === 'itinerary')?.labelSk).toContain('1 zamknuté');
  });
});
