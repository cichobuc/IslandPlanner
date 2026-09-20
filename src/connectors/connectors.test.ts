import { describe, expect, it } from 'vitest';
import { MemoryCache, defineConnector, ConnectorError, parseIskNumber } from './base';
import { frankfurter } from './frankfurter';
import { gasvaktin } from './gasvaktin';
import { matchLot, parka } from './parka';
import { parseCampsitePrices, tjalda } from './tjalda';
import { ryanair } from './ryanair';
import { aviasalesLink, tpFlights } from './tp-flights';
import { WIZZ_FALLBACK_VERSION, discoverWizzVersion, wizz } from './wizz';

const fx = { mode: 'fixtures' as const, env: {} };

describe('base', () => {
  it('cache: druhé volanie ide z cache, po expirácii znova živé; chyba → ok:false, fallback id', async () => {
    let calls = 0;
    let t = Date.parse('2026-09-20T10:00:00Z');
    const c = defineConnector<{ x: number }, number>({
      id: 'frankfurter',
      steps: [8],
      ttlSec: 60,
      legal: 'open-data',
      verifiedAt: '2026-09-20',
      sourceUrl: 'x',
      fallback: 'seed',
      cacheKey: (q) => String(q.x),
      request: async (q) => {
        calls++;
        if (q.x < 0) throw new ConnectorError('boom', true);
        return q.x * 2;
      },
    });
    const cache = new MemoryCache();
    const ctx = { mode: 'live' as const, cache, env: {}, now: () => new Date(t) };
    const a = await c.fetch({ x: 2 }, ctx);
    const b = await c.fetch({ x: 2 }, ctx);
    expect(a).toMatchObject({ ok: true, data: 4, fromCache: false });
    expect(b).toMatchObject({ ok: true, data: 4, fromCache: true });
    expect(calls).toBe(1);
    const err = await c.fetch({ x: -1 }, ctx);
    expect(err).toMatchObject({ ok: false, reason: 'boom', retryable: true });
    expect(c.fallback).toBe('seed');
    t += 61_000;
    cache.clear();
    await c.fetch({ x: 2 }, ctx);
    expect(calls).toBe(3);
  });
  it('feature flag vypne konektor; preflight bez tokenu = degraded', async () => {
    const c = defineConnector<Record<string, never>, number>({
      id: 'wizz',
      steps: [2],
      ttlSec: 1,
      legal: 'unofficial',
      verifiedAt: 'x',
      sourceUrl: 'x',
      flag: 'FLAG_WIZZ',
      cacheKey: () => 'k',
      request: async () => 1,
    });
    expect(await c.fetch({}, { mode: 'live', env: {} })).toMatchObject({ ok: false, retryable: false });
    expect((await tpFlights.health({ mode: 'live', env: {} })).status).toBe('degraded');
  });
  it('parseIskNumber: 1,800 / 1.800 / 2800', () => {
    expect(parseIskNumber('ISK 1,800 per person')).toBe(1800);
    expect(parseIskNumber('1.800 kr')).toBe(1800);
    expect(parseIskNumber('2800 ISK')).toBe(2800);
  });
});

describe('frankfurter', () => {
  it('fixture: EUR→ISK kurz a dátum', async () => {
    const r = await frankfurter.fetch({}, fx);
    expect(r.ok && r.data).toMatchObject({ base: 'EUR', quote: 'ISK', rate: 139.4, date: '2026-09-18' });
    expect(r.ok && r.fromFixture).toBe(true);
  });
});

describe('gasvaktin', () => {
  it('fixture: medián benzínu a dieselu, stanice s GPS', async () => {
    const r = await gasvaktin.fetch({}, fx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.stationCount).toBe(20);
    expect(r.data.petrol).toBeGreaterThan(200);
    expect(r.data.petrol).toBeLessThan(400);
    expect(r.data.diesel).toBeGreaterThan(200);
    expect(r.data.min.petrol).toBeLessThanOrEqual(r.data.petrol);
    expect(r.data.stations[0]).toMatchObject({
      key: expect.any(String),
      lat: expect.any(Number),
      lng: expect.any(Number),
    });
  });
});

describe('tjalda', () => {
  it('parser cien: rôzne formáty EN/IS', () => {
    expect(
      parseCampsitePrices(
        'Rates 2026\n\nAdults: ISK 1,800 per person / night\nChildren 15 years and younger: Free of charge\nElectricity: ISK 1,200 per night\nAccommodation tax: ISK 400 per unit / night',
        null,
      ),
    ).toMatchObject({
      adultIsk: 1800,
      childIsk: 0,
      childFreeUnderAge: 15,
      electricityIsk: 1200,
      taxIsk: 400,
    });
    expect(
      parseCampsitePrices(
        '2800 ISK Adults 17-66 years old, per night\n1500 ISK Seniors 67+\nElectricity 1500 ISK',
        null,
      ).adultIsk,
    ).toBe(2800);
    expect(
      parseCampsitePrices(
        '',
        'Verðskrá 2026\n\nFullorðnir: 2.200 kr. á mann / nótt\nRafmagn: 1.500 kr. á nótt\nGistináttaskattur: 400 kr.',
      ),
    ).toMatchObject({ adultIsk: 2200, electricityIsk: 1500, taxIsk: 400 });
    expect(parseCampsitePrices('Price for adults*: 2,500 ISK\nElectricity: 1,300 ISK', null)).toMatchObject({
      adultIsk: 2500,
      electricityIsk: 1300,
    });
    expect(parseCampsitePrices('Ekki skráður meðlimur síðunnar', null).adultIsk).toBeNull();
  });
  it('fixture: 15 kempov, ceny dospelý parsované pre väčšinu, sezóna a služby', async () => {
    const r = await tjalda.fetch({}, fx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.length).toBe(15);
    const withPrice = r.data.filter((c) => c.prices.adultIsk);
    expect(withPrice.length).toBeGreaterThanOrEqual(11);
    const arnes = r.data.find((c) => c.slug === 'arnes')!;
    expect(arnes.season).toEqual({ from: '05-30', to: '09-15' });
    expect(arnes.prices.adultIsk).toBe(2200);
    const hamrar = r.data.find((c) => c.slug === 'hamrar')!;
    expect(hamrar.prices.adultIsk).toBe(2500);
    expect(hamrar.hasElectricity).toBe(true);
    expect(hamrar.lat).toBeCloseTo(65.65, 1);
    const grenivik = r.data.find((c) => c.slug === 'grenivik')!;
    expect(grenivik.prices).toMatchObject({
      adultIsk: 1800,
      seniorIsk: 900,
      electricityIsk: 1200,
      taxIsk: 400,
      childFreeUnderAge: 15,
    });
  });
});

describe('parka', () => {
  it('fixture: parkoviská s cenou pre osobné auto; priradenie k POI', async () => {
    const r = await parka.fetch({}, fx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const sk = r.data.find((l) => l.slug === 'skogafoss')!;
    expect(sk.carPriceIsk).toBe(1000);
    expect(sk.tiers.length).toBeGreaterThan(1);
    expect(r.data.find((l) => l.slug === 'jokulsarlon')?.carPriceIsk).toBe(1110);
    expect(matchLot(r.data, 'skogafoss')?.slug).toBe('skogafoss');
    expect(matchLot(r.data, 'jokulsarlon', 'Jökulsárlón + Diamond Beach')?.slug).toBe('jokulsarlon');
    expect(matchLot(r.data, 'thingvellir')).toBeNull();
  });
});

describe('tp-flights', () => {
  it('fixture calendar: 1 cena/deň, zoradené, deep link; direct filtruje prestupy', async () => {
    const cal = await tpFlights.fetch(
      { kind: 'calendar', origin: 'VIE', destination: 'KEF', departDate: '2027-09' },
      fx,
    );
    expect(cal.ok).toBe(true);
    if (!cal.ok) return;
    expect(cal.data.length).toBeGreaterThan(20);
    expect(cal.data[0].departDate < cal.data[1].departDate).toBe(true);
    expect(cal.data[0]).toMatchObject({
      origin: 'VIE',
      destination: 'KEF',
      currency: 'EUR',
      price: expect.any(Number),
    });
    expect(cal.data[0].deepLink).toMatch(/aviasales\.com\/search\/VIE\d{4}KEF\d{4}1/);
    const direct = await tpFlights.fetch(
      { kind: 'direct', origin: 'VIE', destination: 'KEF', departDate: '2027-09' },
      fx,
    );
    expect(direct.ok && direct.data.every((f) => f.transfers === 0)).toBe(true);
    expect(aviasalesLink('VIE', 'KEF', '2027-09-12', '2027-09-21', 4, 'm1')).toBe(
      'https://www.aviasales.com/search/VIE1209KEF21094?marker=m1',
    );
  });
  it('live bez tokenu → ok:false s dôvodom, bez sieťového volania', async () => {
    let called = false;
    const r = await tpFlights.fetch(
      { kind: 'cheap', origin: 'VIE', destination: 'KEF' },
      {
        mode: 'live',
        env: {},
        cache: new MemoryCache(),
        fetchImpl: (async () => {
          called = true;
          return new Response('{}');
        }) as typeof fetch,
      },
    );
    expect(r).toMatchObject({ ok: false, reason: 'chýba TRAVELPAYOUTS_TOKEN' });
    expect(called).toBe(false);
  });
});

describe('wizz', () => {
  it('fixture KTW: 19 dní tam, 19 späť, PLN, zoradené, deep link', async () => {
    const r = await wizz.fetch(
      { origin: 'KTW', destination: 'KEF', from: '2027-09-01', to: '2027-09-30' },
      { ...fx, env: { FLAG_WIZZ: 'true' } },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.outbound).toHaveLength(19);
    expect(r.data.inbound).toHaveLength(19);
    expect(r.data.outbound[0]).toMatchObject({
      origin: 'KTW',
      destination: 'KEF',
      departDate: '2027-09-02',
      price: 589,
      currency: 'PLN',
      airline: 'W6',
      transfers: 0,
    });
    expect(r.data.outbound.find((f) => f.departDate === '2027-09-11')?.price).toBe(245.6);
    expect(r.data.inbound[0].origin).toBe('KEF');
    expect(r.data.outbound[0].deepLink).toContain('/KTW/KEF/2027-09-02/');
  });
  it('bez flagu je vypnutý; BUD fixture v HUF', async () => {
    expect(
      await wizz.fetch(
        { origin: 'BUD', destination: 'KEF', from: '2027-09-01', to: '2027-09-30' },
        { ...fx, env: {} },
      ),
    ).toMatchObject({ ok: false, retryable: false });
    const r = await wizz.fetch(
      { origin: 'BUD', destination: 'KEF', from: '2027-09-01', to: '2027-09-30' },
      { ...fx, env: { FLAG_WIZZ: 'true' } },
    );
    expect(r.ok && r.data.outbound[0].currency).toBe('HUF');
    expect(r.ok && r.data.outbound.length).toBe(13);
  });
  it('discoverWizzVersion: z HTML, cache, fallback', async () => {
    const cache = new MemoryCache();
    const ctx = {
      cache,
      mode: 'live' as const,
      env: {},
      now: () => new Date(),
      bypassCache: false,
      fetchImpl: (async () =>
        new Response('<script src="https://be.wizzair.com/30.1.0/x.js">')) as unknown as typeof fetch,
    };
    expect(await discoverWizzVersion(ctx)).toBe('30.1.0');
    expect(
      await discoverWizzVersion({
        ...ctx,
        fetchImpl: (async () => new Response('nič')) as unknown as typeof fetch,
      }),
    ).toBe('30.1.0'); // z cache
    expect(
      await discoverWizzVersion({
        ...ctx,
        cache: new MemoryCache(),
        fetchImpl: (async () => new Response('nič')) as unknown as typeof fetch,
      }),
    ).toBe(WIZZ_FALLBACK_VERSION);
  });
});

describe('ryanair', () => {
  it('fixture BTS→STN: 30/30 dní, EUR, min 47.99', async () => {
    const r = await ryanair.fetch(
      { origin: 'BTS', destination: 'STN', month: '2027-09' },
      { ...fx, env: { FLAG_RYANAIR: 'true' } },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toHaveLength(30);
    expect(Math.min(...r.data.map((f) => f.price))).toBe(47.99);
    expect(r.data[0]).toMatchObject({
      departDate: '2027-09-01',
      airline: 'FR',
      currency: 'EUR',
      transfers: 0,
    });
    expect(r.data[0].deepLink).toContain('originIata=BTS');
  });
});
