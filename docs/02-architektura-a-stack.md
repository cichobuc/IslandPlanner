# 02 · Architektúra a technologický stack

## Rozhodnutie v skratke

**Next.js 15 (App Router, TypeScript) na Verceli + Supabase (Postgres, Auth, Storage) + MapLibre GL s OSM dlaždicami.**
Všetko v bezplatných limitoch. Jedna codebase pre web, tablet (PWA) a mobil.

Alternatívy zvážené v [plan/ROZHODNUTIA.md](../plan/ROZHODNUTIA.md) (ADR-001 až ADR-006).

## Stack

| Vrstva | Voľba | Prečo |
|---|---|---|
| Framework | **Next.js 15**, App Router, React 19, TypeScript strict | SSR + route handlers (skrytie API kľúčov), Vercel deploy zadarmo, PWA cez `@serwist/next` |
| UI | **Tailwind CSS 4** + vlastné „glass" komponenty (základ z shadcn/ui: Radix primitives) | Plná kontrola nad vizuálom, prístupnosť z Radixu |
| Stav | **TanStack Query** (server dáta) + **Zustand** (UI stav, aktívna cesta) | Cache, refetch, optimistic updates |
| Formuláre | **react-hook-form + Zod** | Validácia zdieľaná klient/server |
| DB | **Supabase Postgres** + **Drizzle ORM** | Free tier, RLS pre zdieľanie ciest, typovaná schéma, migrácie |
| Auth | **Supabase Auth** (e-mail + heslo); správca vytvára kontá cez server (service role) s dočasným heslom a príznakom `must_change_password`; pri prvom prihlásení vynútená zmena; reset hesla e-mailom | Používateľ chce dočasné heslá, nie magic link |
| Mapa | **MapLibre GL JS** + OpenFreeMap (vektor, bez limitu) | Plynulé na iPade, vlastný svetlý štýl |
| Routing | **Predpočítaná matica** vzdialeností/časov pre seed POI (`seed/route_matrix.json`, generovaná offline cez ORS Matrix) + OSRM demo / ORS len pre vlastné miesta a domov → letisko | Generovanie itinerára bez sieťových volaní; `route_cache` navždy; korekcia ×1,25/×1,5 |
| Geokódovanie / POI | **Nominatim** + **Overpass API** | Doplnenie POI (čerpacie stanice, kempy) k seed dátam |
| Cron | **Vercel Cron** (Hobby: len 1×/deň) → `/api/cron/daily` | kurz, palivo, overenie letu, túry, e-mail, keep-alive |
| E-mail | **Resend** (free 3 000/mes.) | Magic link šablóny a upozornenia na ceny |
| i18n | **next-intl** (sk, cs) | Routing `/sk/...`, `/cs/...`, správy v JSON |
| Grafy | **Recharts** (heatmapa kalendára je vlastný grid komponent) | Rozpočet, vývoj cien |
| PDF | **@react-pdf/renderer** (server route) | Export súhrnu a itinerára |
| Testy | **Vitest** (engine, konektory) + **Playwright** (iPad viewport e2e) | Engine musí byť deterministicky otestovaný |
| Python function | `fast-flights` ako Vercel Python serverless (`api/gflights.py`) | overenie ceny letu pre 4 os.; alternatíva port protobuf do TS |
| Kvalita | ESLint, Prettier, Husky pre-commit, GitHub Actions CI | |

## Architektúra (vrstvy)

```
┌──────────────────────────────────────────────────────────────────┐
│  UI (Next.js App Router, RSC + client komponenty)                 │
│  /[locale] · /cesta/[id]#krok-N · /cesta/[id]/mapa · sheety      │
├──────────────────────────────────────────────────────────────────┤
│  Feature moduly (src/features/*)                                  │
│  trip · travelers · flights · lodging · transport · itinerary     │
│  attractions · food · budget · pricing · sharing                  │
├──────────────────────────────────────────────────────────────────┤
│  Engine (src/engine/*) – čisté TS funkcie, bez IO                 │
│  budget.ts · flightCombos.ts · itineraryGen.ts · ageRules.ts      │
│  cascade.ts · scenarios.ts · fx.ts                                │
├──────────────────────────────────────────────────────────────────┤
│  Connectors (src/connectors/*) – jednotné rozhranie (docs/04)     │
│  tp-flights · ryanair · wizz · gflights · viator · osrm · ors     │
│  overpass · nominatim · gasvaktin · frankfurter · open-meteo       │
│  drone-zones · seed · manual   (každý: cache, TTL, health, fallback)│
├──────────────────────────────────────────────────────────────────┤
│  Data (Drizzle + Supabase Postgres, RLS) · Storage (PDF, JSON)    │
└──────────────────────────────────────────────────────────────────┘
```

Zásady:
1. **Engine je čistý.** Vstup: `TripSnapshot` (všetko, čo treba na výpočet), výstup: `BudgetResult`. Žiadne fetch-e.
   Vďaka tomu je prepočet < 200 ms, testovateľný a beží aj offline v prehliadači.
2. **Konektory sú jednotné a vymeniteľné** (docs/04): rovnaké rozhranie, cache, TTL, health, fallback; pri chybe `{ ok:false, reason }`
   a UI ukáže riadok „cena nedostupná – zadaj ručne". Pád jedného zdroja nezhodí stránku.
3. **Každá cena má pôvod.** Typ `Money = { amount, currency, source: 'api'|'seed'|'manual'|'estimate', fetchedAt, provider? }`.
4. **Server drží kľúče.** Konektory bežia iba v route handleroch / server actions (gflights ako Python function). Klient volá `/api/...`.
5. **Kaskáda je explicitná.** Výber letu vyvolá `applyFlightSelection(trip, flight)` → vráti nový snapshot + zoznam zmien (diff), ktorý UI zobrazí. Mení len riadky s `is_manual = false`; ručne priradené veci sa iba navrhnú.
6. **Súbežná editácia bez realtime:** každý zápis nesie `updated_at` pôvodného riadku; server odmietne zápis nad novšou verziou (409) a UI ponúkne „načítať / prepísať". Všetky zmeny idú do `trip_revisions`.
7. **Časové pásma:** všetky časy sa ukladajú v UTC s tz miesta (`Europe/Bratislava`, `Atlantic/Reykjavik`); prílet/odlet, pickup a kapacita dňa sa počítajú v lokálnom čase letiska/miesta.

## Adresárová štruktúra (návrh)

```
island-planner/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/prihlasenie/page.tsx     # e-mail + heslo
│   │   ├── (auth)/zmena-hesla/page.tsx     # vynútená pri prvom prihlásení
│   │   ├── profil/page.tsx                 # preferencie, doklady, dostupnosť (formulár)
│   │   ├── page.tsx                      # Prehľad
│   │   ├── page.tsx                      # Cesty (zoznam + šablóny)
│   │   ├── cesta/[id]/page.tsx           # Cesta – checklist 8 krokov (#krok-N)
│   │   ├── cesta/[id]/mapa/page.tsx      # Mapa overlay (paralelná route)
│   │   ├── zdielane/[token]/page.tsx     # read-only
│   │   └── (sheety sú komponenty, nie routes)
│   └── api/
│       ├── flights/search/route.ts       # POST: mesiac × letiská → kombinácie (SSE)
│       ├── flights/verify/route.ts       # POST: overenie ceny pre 4 os. (gflights)
│       ├── tours/search/route.ts         # viator
│       ├── places/near/route.ts          # overpass: kempy, čerpačky, obchody
│       ├── routing/route.ts              # OSRM/ORS proxy + cache
│       ├── fx/route.ts
│       ├── cron/daily/route.ts           # Vercel Cron 1×/deň (kurz, palivo, verify, túry, snapshoty, e-mail, keep-alive)
│       ├── export/pdf/route.ts
│       └── share/[token]/route.ts        # read-only snapshot
├── src/
│   ├── engine/          # čisté výpočty (viď 05)
│   ├── connectors/      # jednotné konektory (viď 04)
│   ├── features/        # UI + hooks po doménach
│   ├── components/ui/   # glass design system (viď 06)
│   ├── db/              # drizzle schema, migrácie, seed
│   ├── i18n/            # sk.json, cs.json
│   └── lib/             # utils, money, dates, supabase klient
├── seed/                # JSON: letiská, atrakcie, regióny, ceny (viď 07)
├── tests/               # vitest + playwright
└── docs/, plan/         # táto dokumentácia
```

## Dátové toky

### Vyhľadanie mesiaca leteniek
```
UI (výber mesiaca, letísk, dní, batožiny, parkovania)
 → POST /api/flights/search { tripId, month, origins[], minDays, maxDays, pax, bags }
   → FlightSearchService
       ├─ pre každé origin: tp-flights.calendar(origin, KEF) ∪ wizz (KTW, BUD)          (paralelne, cache 6 h)
       ├─ self-transfer: ryanair/wizz/tp (origin → hub) + tp-flights (hub → KEF), spoj s min. 3 h prestupom
       ├─ engine/flightCombos: všetky (out, ret) kde ret-out ∈ [minDays, maxDays]
       ├─ + batožina (BaggageRules[airline]) + parkovanie (ParkingOption × dní) + cesta na letisko
       └─ zoradiť podľa totalGroup, vrátiť heatmapu (min/deň) + top N kombinácií
 → UI: kalendár + zoznam; výber → POST /api/flights/verify (gflights, pax = 4) → uloženie FlightSelection → kaskáda
```

### Kaskáda po výbere letu
```
FlightSelection { out: 12.9. 06:40 VIE→KEF, ret: 21.9. 15:20 KEF→VIE }
 → engine/cascade.applyFlightSelection(snapshot, sel)
     ├─ trip.startDate/endDate, nights = 9, days = 10
     ├─ parking.days = 10 (od odchodu z domu po návrat)
     ├─ transport.rentalDays = 10 (pickup 12.9. ~09:00, return 21.9. ~12:00)
     ├─ itinerary = generate(days=10, vehicle, pace, interests, arrivalTime, departureTime)
     ├─ lodging.nights = itinerary.nights (región za noc) → invalidácia vyhľadávania ubytovania
     ├─ food.days = 10 (prvý deň od obeda, posledný do obeda)
     └─ diff[]: „Noci 8 → 9", „Itinerár pregenerovaný (Ring Road 10 dní)", ...
 → UI zobrazí toast s diffom + možnosť „Vrátiť späť"
```

### Denný cron
```
/api/cron/daily (Vercel Cron, Hobby = 1×/deň ± 1 h)
 ├─ frankfurter → kurz ISK/EUR
 ├─ gasvaktin → palivo
 ├─ pre každú aktívnu cestu s FlightSelection: gflights.verify(pax) → PriceSnapshot
 ├─ viator → ceny rezervovaných túr
 ├─ (ubytovanie sa nesleduje – nie je bezplatný zdroj; sleduje sa len storno termín)
 ├─ ak Δ celkovej ceny > 5 % alebo > 20 €: Resend e-mail členom cesty
 └─ keep-alive dotaz do Supabase (free projekt sa pauzuje po 7 dňoch nečinnosti)
```

## Bezpečnosť a zdieľanie

- Tabuľky s RLS: používateľ vidí cesty, kde je v `trip_members`. Správca zakladá kontá (`POST /api/admin/users` so service role): e-mail, meno, dočasné heslo (vygenerované, zobrazí sa raz), rola v ceste. Používateľ dostane e-mail (Resend) s dočasným heslom; po prihlásení ho middleware presmeruje na `/zmena-hesla`, kým `profiles.must_change_password = true`; potom na `/profil`, kým profil nie je vyplnený.
- Oprávnenia: `trip_members.role ∈ {owner, editor, viewer}`; RLS: viewer len select; editor insert/update na krokoch; owner + delete a správa členov.
- Read-only link: `share_tokens` s náhodným tokenom → `/api/share/[token]` vráti JSON snapshot, stránka `/zdielane/[token]`.
- API kľúče v Vercel env; klient nikdy nevolá externé API priamo (výnimka: dlaždice mapy, kde je kľúč doménovo obmedzený).

## Výkon a offline

- Engine beží aj v prehliadači (rovnaký TS kód) → prepočet okamžite, server ukladá výsledok.
- PWA: `serwist` cache pre app shell + posledný snapshot cesty v IndexedDB (Dexie). Mapa: cache dlaždíc zoom 6–10 pre Island (~30 MB) na požiadanie.
- Vercel Hobby (fluid compute): funkcie až **300 s** (overené 08/2026) → vyhľadanie mesiaca sa deje po letiskách paralelne a streamuje (SSE); Python runtime (beta) dostupný na všetkých plánoch. Vercel IP sú dynamické AWS → Google Flights (gflights) len na vybrané overenia, s deep-link fallbackom.

## Bezplatné limity, s ktorými návrh počíta

| Služba | Limit | Ako to zvládneme |
|---|---|---|
| Vercel Hobby | 100 GB BW, cron len 1×/deň (± 1 h), funkcie 300 s, 2 GB RAM | Cache v DB, streamovanie, jeden denný cron |
| Supabase Free | 500 MB DB, 50k MAU, pauza po týždni neaktivity | denný cron robí keep-alive dotaz; snapshoty cien mažeme po 90 dňoch |
| MapTiler Free | 100k dlaždíc/mes. | Cache dlaždíc, alternatíva OpenFreeMap (bez limitu) |
| ORS Free | 2 000 req/deň | OSRM demo primárne, routing výsledky cache v DB (trasa sa mení zriedka) |
| Resend Free | 3 000 e-mailov/mes. | Max 1 e-mail/cesta/deň |
| Travelpayouts Flight Data v1 | cached dáta (7 dní história) | Primárny zdroj kalendára; presné ceny pre 4 os. overiť cez gflights |
| Viator affiliate | bez limitu návštevnosti | živé ceny túr |
