import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { eq, isNull, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import type { Money } from '@/engine/types';

// Seed dáta z /seed/*.json (docs/07) → Supabase. Idempotentné (upsert podľa prirodzeného kľúča).
const read = <T>(f: string): T => JSON.parse(readFileSync(path.join(process.cwd(), 'seed', f), 'utf8')) as T;
const iskMoney = (amount: number, currency = 'ISK'): Money => ({
  amount,
  currency,
  source: 'seed',
  fetchedAt: '2026-09-20',
});
const eurMoney = (amount: number): Money => ({
  amount,
  currency: 'EUR',
  source: 'seed',
  fetchedAt: '2026-09-20',
});
const str = (n: number | null | undefined) => (n == null ? null : String(n));

async function main() {
  const db = getDb();
  const t0 = Date.now();

  // airports
  const airports = read<Array<Record<string, unknown>>>('airports.json');
  for (const a of airports) {
    const row = {
      iata: a.iata as string,
      name: a.name as string,
      city: a.city as string,
      country: a.country as string,
      lat: String(a.lat),
      lng: String(a.lng),
      tz: (a.tz as string) ?? 'Europe/Vienna',
      driveKmFromHome: str(a.drive_km_from_home as number | undefined),
      driveMinFromHome: (a.drive_min_from_home as number | undefined) ?? null,
      isOrigin: Boolean(a.is_origin),
      isHub: Boolean(a.is_hub),
    };
    await db
      .insert(schema.airports)
      .values(row)
      .onConflictDoUpdate({ target: schema.airports.iata, set: row });
  }
  console.log(`✓ airports ${airports.length}`);

  // airlines
  const airlines =
    read<Array<{ iata: string; name: string; kind: 'lcc' | 'full'; website?: string }>>('airlines.json');
  for (const a of airlines)
    await db.insert(schema.airlines).values(a).onConflictDoUpdate({ target: schema.airlines.iata, set: a });
  console.log(`✓ airlines ${airlines.length}`);

  // baggage rules – zmaž a vlož (bez prirodzeného kľúča)
  const bags = read<Array<Record<string, unknown>>>('baggage_rules.json');
  await db.delete(schema.baggageRules);
  await db.insert(schema.baggageRules).values(
    bags.map((b) => ({
      airline: b.airline as string,
      bagType: b.bag_type as 'cabin_small' | 'cabin_10' | 'checked_20' | 'checked_32' | 'priority',
      priceLow: String(b.price_low),
      priceHigh: String(b.price_high),
      currency: 'EUR',
      maxKg: (b.max_kg as number | undefined) ?? null,
      dims: (b.dims as string | undefined) ?? null,
      verifiedAt: '2026-09-20',
      notes: (b.notes as string | undefined) ?? null,
    })),
  );
  console.log(`✓ baggage_rules ${bags.length}`);

  // parking
  const parking = read<Array<Record<string, unknown>>>('parking_options.json');
  await db.delete(schema.parkingOptions);
  await db.insert(schema.parkingOptions).values(
    parking.map((p) => ({
      iata: p.iata as string,
      name: p.name as string,
      kind: p.kind as 'official' | 'external_shuttle',
      priceRules: p.price_rules as never,
      currency: (p.currency as string) ?? 'EUR',
      source: 'seed',
      url: (p.url as string | undefined) ?? null,
      shuttleMin: (p.shuttle_min as number | undefined) ?? null,
      verifiedAt: (p.verified_at as string | undefined) ?? null,
      notes: (p.notes as string | undefined) ?? null,
    })),
  );
  console.log(`✓ parking_options ${parking.length}`);

  // regions
  const regions = read<Array<Record<string, unknown>>>('regions.json');
  for (const r of regions) {
    const row = {
      id: r.id as string,
      nameSk: r.name_sk as string,
      nameCs: (r.name_cs as string) ?? null,
      nameEn: r.name_en as string,
      centroidLat: String(r.centroid_lat),
      centroidLng: String(r.centroid_lng),
      orderOnRing: (r.order_on_ring as number) ?? null,
    };
    await db.insert(schema.regions).values(row).onConflictDoUpdate({ target: schema.regions.id, set: row });
  }
  console.log(`✓ regions ${regions.length}`);

  // vehicles (seed = trip_id null)
  const vehicles = read<Array<Record<string, unknown>>>('vehicle_options.json');
  await db.delete(schema.vehicleOptions).where(isNull(schema.vehicleOptions.tripId));
  await db.insert(schema.vehicleOptions).values(
    vehicles.map((v) => ({
      tripId: null,
      kind: v.kind as 'car' | 'camper',
      class: v.class as never,
      provider: v.provider as string,
      name: v.name as string,
      seats: (v.seats as number) ?? 5,
      sleeps: (v.sleeps as number | undefined) ?? 0,
      fuel: v.fuel as 'petrol' | 'diesel',
      consumptionL100km: String(v.consumption_l_100km),
      pricePerDay: eurMoney(v.price_per_day as number),
      insurance: (v.insurance as never) ?? null,
      extras: (v.extras as never) ?? null,
      deposit: v.deposit != null ? eurMoney(v.deposit as number) : null,
      driverMinAge: (v.driver_min_age as number) ?? 20,
      driverMinYears: (v.driver_min_years as number) ?? 1,
      pickupMode: (v.pickup_mode as 'desk' | 'shuttle') ?? 'shuttle',
      heater: Boolean(v.heater),
      luggageCapacity: (v.luggage_capacity as number) ?? 2,
      fRoadsAllowed: Boolean(v.f_roads_allowed),
      url: (v.url as string | undefined) ?? null,
      notes: (v.notes as string | undefined) ?? null,
      verifiedAt: '2026-09-20',
    })),
  );
  console.log(`✓ vehicle_options ${vehicles.length}`);

  // bring items
  const bring = read<Array<Record<string, unknown>>>('bring_items.json');
  await db.delete(schema.bringItems);
  await db.insert(schema.bringItems).values(
    bring.map((b) => ({
      category: b.category as never,
      nameSk: b.name_sk as string,
      priceIs: eurMoney(b.price_is as number),
      priceSk: eurMoney(b.price_sk as number),
      weightG: (b.weight_g as number) ?? null,
      customsNote: (b.customs_note as string | undefined) ?? null,
      airlineNote: (b.airline_note as string | undefined) ?? null,
      defaultQtyPerPerson: str(b.default_qty_per_person as number) ?? '1',
      seasonal: Boolean(b.seasonal),
    })),
  );
  console.log(`✓ bring_items ${bring.length}`);

  // POI + price rules (upsert podľa slug)
  type PoiJson = Record<string, unknown> & {
    slug: string;
    price_rules: Array<Record<string, unknown>>;
    parking_fee?: { amount: number; currency: string } | null;
  };
  const pois = read<PoiJson[]>('pois.json');
  const campsites = read<Array<Record<string, unknown>>>('campsites.json');
  const allPois: PoiJson[] = [
    ...pois,
    ...campsites.map((c) => ({
      slug: c.slug as string,
      kind: 'campsite',
      category_tags: ['campsite'],
      region: c.region,
      name: c.name,
      lat: c.lat,
      lng: c.lng,
      description_sk: c.description_sk,
      visit_min: 0,
      facilities: [
        c.showers ? 'showers' : null,
        c.has_kitchen ? 'kitchen' : null,
        c.laundry ? 'laundry' : null,
      ].filter(Boolean),
      website_url: c.url ?? null,
      open_hours_season: { open_until: c.open_until },
      price_rules: [
        { label: 'Osoba / noc', min_age: 16, price: c.per_person_isk, currency: 'ISK', per: 'person' },
        { label: 'Dieťa do 15', max_age: 15, price: 0, currency: 'ISK', per: 'person' },
        ...(c.electricity_isk
          ? [{ label: 'Elektrina / noc', price: c.electricity_isk, currency: 'ISK', per: 'vehicle' }]
          : []),
      ],
      popularity: 3,
      drone_status: 'unknown',
      verified_at: '2026-09-20',
      camping_card: c.camping_card,
    })),
  ];
  let rules = 0;
  for (const p of allPois) {
    const row = {
      slug: p.slug,
      name: p.name as string,
      nameSk: (p.name_sk as string | undefined) ?? (p.name as string),
      kind: p.kind as never,
      categoryTags: (p.category_tags as string[]) ?? [],
      regionId: (p.region as string) ?? null,
      lat: String(p.lat),
      lng: String(p.lng),
      descriptionSk: (p.description_sk as string | undefined) ?? null,
      tipsSk: (p.tips_sk as string | undefined) ?? null,
      visitMin: (p.visit_min as number | undefined) ?? null,
      visitMinMin: (p.visit_min_min as number | undefined) ?? null,
      visitMinMax: (p.visit_min_max as number | undefined) ?? null,
      walkKm: str(p.walk_km as number | undefined),
      difficulty: (p.difficulty as never) ?? null,
      entryNoteSk: (p.entry_note_sk as string | undefined) ?? null,
      parkingFee: p.parking_fee ? iskMoney(p.parking_fee.amount, p.parking_fee.currency) : null,
      websiteUrl: (p.website_url as string | undefined) ?? null,
      facilities: (p.facilities as string[]) ?? [],
      bookAheadDays: (p.book_ahead_days as number | undefined) ?? null,
      cancelPolicySk: (p.cancel_policy_sk as string | undefined) ?? null,
      bring: (p.bring as string[]) ?? [],
      openHours: (p.open_hours as never) ?? null,
      openHoursSeason: (p.open_hours_season as never) ?? null,
      bestLight: (p.best_light as never) ?? 'any',
      rainyDayOk: Boolean(p.rainy_day_ok),
      popularity: (p.popularity as number | undefined) ?? 3,
      hiddenGem: Boolean(p.hidden_gem),
      bestMonths: (p.best_months as number[] | undefined) ?? null,
      seasonNoteSk: (p.season_note_sk as string | undefined) ?? null,
      droneStatus: (p.drone_status as never) ?? 'unknown',
      droneNoteSk: (p.drone_note_sk as string | undefined) ?? null,
      bookingRequired: Boolean(p.booking_required),
      bookingUrl: (p.booking_url as string | undefined) ?? null,
      season: (p.season as never) ?? null,
      requires4x4: Boolean(p.requires_4x4),
      interestWeight: (p.interest_weight as never) ?? null,
      verifiedAt: (p.verified_at as string | undefined) ?? null,
      sourceUrl: (p.source_url as string | undefined) ?? null,
    };
    const [saved] = await db
      .insert(schema.pois)
      .values(row)
      .onConflictDoUpdate({ target: schema.pois.slug, set: row })
      .returning({ id: schema.pois.id });
    await db.delete(schema.poiPriceRules).where(eq(schema.poiPriceRules.poiId, saved.id));
    if (p.price_rules.length) {
      await db.insert(schema.poiPriceRules).values(
        p.price_rules.map((r) => ({
          poiId: saved.id,
          label: r.label as string,
          minAge: (r.min_age as number | undefined) ?? null,
          maxAge: (r.max_age as number | undefined) ?? null,
          price: iskMoney(r.price as number, (r.currency as string) ?? 'ISK'),
          per: (r.per as never) ?? 'person',
          variant: (r.variant as string | undefined) ?? 'basic',
          isDefault: (r.is_default as boolean | undefined) ?? true,
          notes: (r.notes as string | undefined) ?? null,
        })),
      );
      rules += p.price_rules.length;
    }
  }
  console.log(`✓ pois ${allPois.length} (z toho kempy ${campsites.length}), price_rules ${rules}`);

  // kempy aj ako lodging_options (trip_id null) pre krok 04
  await db.delete(schema.lodgingOptions).where(isNull(schema.lodgingOptions.tripId));
  const poiIds = await db.select({ id: schema.pois.id, slug: schema.pois.slug }).from(schema.pois);
  await db.insert(schema.lodgingOptions).values(
    campsites.map((c) => ({
      tripId: null,
      regionId: c.region as string,
      poiId: poiIds.find((p) => p.slug === c.slug)?.id ?? null,
      kind: 'camper_site' as const,
      name: c.name as string,
      url: (c.url as string | undefined) ?? null,
      connectorId: 'seed',
      lat: String(c.lat),
      lng: String(c.lng),
      pricePerPerson: iskMoney(c.per_person_isk as number),
      hasKitchen: Boolean(c.has_kitchen),
      hasParking: true,
      showers: Boolean(c.showers),
      laundry: Boolean(c.laundry),
      electricity: Boolean(c.electricity_isk),
      openUntil: (c.open_until as string) ?? null,
      darkSky: c.region !== 'reykjavik',
      verifiedAt: new Date('2026-09-20'),
    })),
  );
  console.log(`✓ lodging_options (kempy) ${campsites.length}`);

  // kurz a palivo (docs/07)
  await db
    .insert(schema.fxRates)
    .values({ date: '2026-09-20', base: 'EUR', quote: 'ISK', rate: '147', source: 'seed' })
    .onConflictDoUpdate({
      target: [schema.fxRates.date, schema.fxRates.base, schema.fxRates.quote],
      set: { rate: '147', source: 'seed' },
    });
  for (const [fuel, price] of [
    ['petrol', 320],
    ['diesel', 315],
  ] as const) {
    await db
      .insert(schema.fuelPrices)
      .values({ date: '2026-09-20', fuel, priceIskPerL: String(price), source: 'seed' })
      .onConflictDoUpdate({
        target: [schema.fuelPrices.date, schema.fuelPrices.fuel],
        set: { priceIskPerL: String(price), source: 'seed' },
      });
  }
  console.log('✓ fx_rates, fuel_prices');

  // route_matrix: OSRM matica zo seed/route_matrix.json (pnpm matrix:build), pre chýbajúce dvojice Haversine × 1,25
  const regionsSeed = read<Array<{ id: string; centroid_lat: number; centroid_lng: number }>>('regions.json');
  const points = [...poiIds.map((p) => ({ slug: p.slug })), ...regionsSeed.map((r) => ({ slug: `region:${r.id}` })), { slug: 'kef' }];
  const coords = new Map<string, [number, number]>();
  for (const p of allPois) coords.set(p.slug, [Number(p.lat), Number(p.lng)]);
  for (const r of regionsSeed) coords.set(`region:${r.id}`, [r.centroid_lat, r.centroid_lng]);
  coords.set('kef', [63.985, -22.6056]);
  const hav = (a: [number, number], b: [number, number]) => {
    const R = 6371;
    const dLat = ((b[0] - a[0]) * Math.PI) / 180;
    const dLng = ((b[1] - a[1]) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  let osrm: { rows: { from: string; to: string; km: number; min: number }[] } | null = null;
  try {
    osrm = read('route_matrix.json');
  } catch {
    console.log('  route_matrix.json chýba – spusti pnpm matrix:build (zatiaľ len Haversine)');
  }
  const osrmMap = new Map((osrm?.rows ?? []).map((r) => [`${r.from}>${r.to}`, r]));
  const matrixRows: (typeof schema.routeMatrix.$inferInsert)[] = [];
  let fromOsrm = 0;
  for (const a of points)
    for (const b of points) {
      if (a.slug === b.slug) continue;
      const o = osrmMap.get(`${a.slug}>${b.slug}`);
      if (o) {
        fromOsrm++;
        matrixRows.push({ fromSlug: a.slug, toSlug: b.slug, km: String(o.km), min: String(o.min), surface: 'paved' });
        continue;
      }
      const ca = coords.get(a.slug);
      const cb = coords.get(b.slug);
      if (!ca || !cb) continue;
      const km = Math.round(hav(ca, cb) * 1.25 * 10) / 10;
      matrixRows.push({ fromSlug: a.slug, toSlug: b.slug, km: String(km), min: String(Math.round((km / 70) * 60)), surface: 'estimate' });
    }
  await db.execute(sql`delete from route_matrix`);
  for (let i = 0; i < matrixRows.length; i += 500)
    await db
      .insert(schema.routeMatrix)
      .values(matrixRows.slice(i, i + 500))
      .onConflictDoNothing();
  console.log(`✓ route_matrix ${matrixRows.length} dvojíc (OSRM ${fromOsrm}, Haversine ${matrixRows.length - fromOsrm})`);

  console.log(`Hotovo za ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
