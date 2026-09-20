import { describe, expect, it } from 'vitest';
import { bagsTotal, buildCombos, composeSelfTransfer, parkingFromRules, type Fare } from './flightCombos';
import { addDays } from './time';

const fare = (
  o: Partial<Fare> & { origin: string; destination: string; date: string; price: number },
): Fare => ({
  airlines: ['W6'],
  transfers: 0,
  source: 'api',
  connectorId: 'wizz',
  ...o,
});

function month(origin: string, dir: 'out' | 'ret', base: number, dep = '10:00') {
  const out: Fare[] = [];
  for (let d = 1; d <= 30; d++) {
    const date = `2027-09-${String(d).padStart(2, '0')}`;
    out.push(
      dir === 'out'
        ? fare({
            origin,
            destination: 'KEF',
            date,
            price: base + (d % 5) * 10,
            departureAt: `${date}T${dep}:00`,
          })
        : fare({
            origin: 'KEF',
            destination: origin,
            date,
            price: base + (d % 3) * 10,
            arrivalAt: `${date}T18:00:00`,
          }),
    );
  }
  return out;
}

const bagPrice = (airline: string, type: string) =>
  type === 'checked_20' ? (airline === 'W6' ? 40 : 30) : type === 'cabin_10' ? 20 : 60;
const base = {
  pax: 4,
  travelersBags: [
    { cabinSmall: 1, cabin10: 0, checked20: 1, checked32: 0 },
    { cabinSmall: 1, cabin10: 1, checked20: 0, checked32: 0 },
    { cabinSmall: 1, cabin10: 0, checked20: 0, checked32: 0 },
    { cabinSmall: 1, cabin10: 0, checked20: 0, checked32: 0 },
  ],
  bagPrice,
  parkingPrice: (o: string, days: number) => (o === 'BTS' ? null : days * 8),
  accessCost: (o: string) => (o === 'KTW' ? 60 : 20),
  hubNightCost: () => 90,
};

describe('buildCombos', () => {
  it('2 letiská × 30 dní × [8..12] dní → správny počet kombinácií', () => {
    const r = buildCombos({
      ...base,
      origins: ['KTW', 'BUD'],
      outFares: [...month('KTW', 'out', 100), ...month('BUD', 'out', 120)],
      retFares: [...month('KTW', 'ret', 100), ...month('BUD', 'ret', 120)],
      minDays: 8,
      maxDays: 12,
      limit: 1000,
    });
    // pre každý outDate d sú návraty d+7..d+11, musia byť ≤ 30. 9.
    let expected = 0;
    for (let d = 1; d <= 30; d++) for (let len = 7; len <= 11; len++) if (d + len <= 30) expected++;
    expect(r.stats.perOrigin.KTW).toBe(expected);
    expect(r.stats.kept).toBe(expected * 2);
    expect(r.combos[0].totalGroup).toBeLessThanOrEqual(r.combos[1].totalGroup);
    expect(Object.keys(r.heatmap).length).toBe(30 - 7);
  });
  it('celková cena = letenky × pax + batožina + parkovanie + cesta; parkovanie 10 dní vs 9', () => {
    const outs = [
      fare({
        origin: 'KTW',
        destination: 'KEF',
        date: '2027-09-12',
        price: 100,
        departureAt: '2027-09-12T14:15:00',
      }),
    ];
    const rets = [
      fare({ origin: 'KEF', destination: 'KTW', date: '2027-09-21', price: 110 }),
      fare({ origin: 'KEF', destination: 'KTW', date: '2027-09-20', price: 110 }),
    ];
    const r = buildCombos({
      ...base,
      origins: ['KTW'],
      outFares: outs,
      retFares: rets,
      minDays: 9,
      maxDays: 10,
    });
    const ten = r.combos.find((c) => c.days === 10)!;
    const nine = r.combos.find((c) => c.days === 9)!;
    expect(ten.parkingDays).toBe(10);
    expect(nine.parkingDays).toBe(9);
    expect(ten.bags).toBe(2 * 40 + 2 * 20); // 1× checked (W6 40) × 2 segmenty + 1× cabin10 × 2
    expect(ten.totalGroup).toBe(210 * 4 + ten.bags + 80 + 60);
    expect(ten.totalPp).toBeCloseTo(ten.totalGroup / 4, 2);
  });
  it('odlet pred 07:00 pridá deň parkovania; bez parkovania (BTS) parking = null', () => {
    const outs = [
      fare({
        origin: 'BTS',
        destination: 'KEF',
        date: '2027-09-12',
        price: 100,
        departureAt: '2027-09-12T06:40:00',
      }),
    ];
    const rets = [fare({ origin: 'KEF', destination: 'BTS', date: '2027-09-21', price: 100 })];
    const r = buildCombos({
      ...base,
      origins: ['BTS'],
      outFares: outs,
      retFares: rets,
      minDays: 10,
      maxDays: 10,
    });
    expect(r.combos[0].parkingDays).toBe(11);
    expect(r.combos[0].parking).toBeNull();
    expect(r.combos[0].comfortPenalty).toBe(1);
  });
  it('filtre: len priame, odlet po 08:00', () => {
    const outs = [
      fare({
        origin: 'VIE',
        destination: 'KEF',
        date: '2027-09-12',
        price: 100,
        transfers: 1,
        departureAt: '2027-09-12T10:00:00',
      }),
      fare({
        origin: 'VIE',
        destination: 'KEF',
        date: '2027-09-13',
        price: 150,
        departureAt: '2027-09-13T06:00:00',
      }),
      fare({
        origin: 'VIE',
        destination: 'KEF',
        date: '2027-09-14',
        price: 160,
        departureAt: '2027-09-14T09:00:00',
      }),
    ];
    const rets = ['2027-09-21', '2027-09-22', '2027-09-23'].map((date) =>
      fare({ origin: 'KEF', destination: 'VIE', date, price: 100 }),
    );
    const all = buildCombos({
      ...base,
      origins: ['VIE'],
      outFares: outs,
      retFares: rets,
      minDays: 10,
      maxDays: 10,
    });
    expect(all.combos).toHaveLength(3);
    const direct = buildCombos({
      ...base,
      origins: ['VIE'],
      outFares: outs,
      retFares: rets,
      minDays: 10,
      maxDays: 10,
      filters: { directOnly: true, departAfter: '08:00' },
    });
    expect(direct.combos.map((c) => c.outDate)).toEqual(['2027-09-14']);
  });
});

describe('composeSelfTransfer', () => {
  const seg1 = (date: string, arr: string) =>
    fare({
      origin: 'BTS',
      destination: 'STN',
      date,
      price: 50,
      airlines: ['FR'],
      connectorId: 'ryanair',
      arrivalAt: `${date}T${arr}:00`,
    });
  const seg2 = (date: string, dep: string, price = 80) =>
    fare({
      origin: 'STN',
      destination: 'KEF',
      date,
      price,
      airlines: ['U2'],
      connectorId: 'seed',
      source: 'estimate',
      departureAt: `${date}T${dep}:00`,
    });
  it('prestup < 3 h je vylúčený; ≥ 3 h spojí v ten istý deň', () => {
    const a = composeSelfTransfer([seg1('2027-09-12', '10:00')], [seg2('2027-09-12', '12:30')]);
    expect(a).toHaveLength(0);
    const b = composeSelfTransfer([seg1('2027-09-12', '10:00')], [seg2('2027-09-12', '13:30')]);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({
      origin: 'BTS',
      destination: 'KEF',
      price: 130,
      transfers: 1,
      hub: 'STN',
      hubNight: false,
      source: 'estimate',
      airlines: ['FR', 'U2'],
    });
    expect(b[0].legs).toHaveLength(2);
  });
  it('bez spojenia v ten deň → ďalší deň s nocľahom na hube', () => {
    const c = composeSelfTransfer(
      [seg1('2027-09-12', '20:00')],
      [seg2('2027-09-12', '21:00'), seg2(addDays('2027-09-12', 1), '09:00', 70)],
    );
    expect(c[0].hubNight).toBe(true);
    expect(c[0].price).toBe(120);
  });
});

describe('parkingFromRules / bagsTotal', () => {
  it('tiers + extra dni, perDay, medzi tiermi vyberie lacnejšie', () => {
    const rules = [
      { days: 7, price: 59 },
      { days: 10, price: 84 },
      { days: 14, price: 109 },
      { extraDayPrice: 6 },
    ];
    expect(parkingFromRules(rules, 10)).toBe(84);
    expect(parkingFromRules(rules, 8)).toBe(65); // 59 + 1×6 < 84
    expect(parkingFromRules(rules, 16)).toBe(121); // 109 + 2×6
    expect(parkingFromRules([{ perDay: 6 }], 11)).toBe(66);
  });
  it('batožina: každý cestujúci × každý segment, self-transfer = 2 segmenty na cestu', () => {
    const out = fare({
      origin: 'BTS',
      destination: 'KEF',
      date: '2027-09-12',
      price: 1,
      airlines: ['FR', 'U2'],
      transfers: 1,
    });
    const ret = fare({
      origin: 'KEF',
      destination: 'BTS',
      date: '2027-09-21',
      price: 1,
      airlines: ['U2', 'FR'],
      transfers: 1,
    });
    expect(bagsTotal([{ cabinSmall: 1, cabin10: 0, checked20: 1, checked32: 0 }], out, ret, bagPrice)).toBe(
      4 * 30,
    );
  });
});
