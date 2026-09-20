# Implementačný plán – Island Planner

Živý dokument. Stav úloh: `[ ]` čaká · `[~]` rozpracované · `[x]` hotové · `[-]` zrušené. Po každej práci aktualizovať aj [PROGRESS.md](PROGRESS.md).
Odhady sú v „večeroch" (≈ 3 h práce s Claude Code); reálne sa upresnia po fáze 1.

## Míľniky

| # | Míľnik | Čo je hotové | Odhad |
|---|---|---|---|
| M0 | Základ | repo, stack, Supabase, auth, design tokens, shell, i18n | 6 večerov |
| M1 | Kalkulačka bez API | obrazovka Cesta (8 krokov), krok 01, engine, rozpočet zo seed dát | 10 |
| M2 | Letenky | kalendár mesiaca, providery, batožina, parkovanie, výber + kaskáda | 12 |
| M3 | Itinerár & mapa | generátor, OSM mapa, routing, atrakcie s popismi/vekom/sezónou, dron vrstva | 14 |
| M4 | Kde spať & doprava | overpass, kempy, ručné ponuky z Booking/Airbnb linkov, auto/karavan/bez auta vetvy | 10 |
| M5 | Strava, rozpočet, export, optimalizátor | | 8 |
| M6 | Zdieľanie, šablóny, história, cron & e-maily | | 8 |
| M7 | PWA, tablet polish, testy, nasadenie | | 6 |
| | **Spolu (plný rozsah)** | | **~ 110 večerov** – preto MVP nižšie |

## MVP do konca februára 2027 (~ 50 večerov) – podľa auditu (docs/09)
Letenky na september 2027 sa kupujú ~ máj–jún 2027 → app musí vedieť letenky + rozpočet vo februári–marci.
| MVP | Obsah | Odhad |
|---|---|---|
| MVP-0 | základ, auth s dočasným heslom, profil (bez dostupnosti/mesiaca), obrazovka Cesta v6 | 8 |
| MVP-1 | krok 01 (mesiac ručne), engine jadro (vek, split, budget, cascade), krok 08 súhrn | 12 |
| MVP-2 | **spike pokrytia tp-flights** (1 večer) → tp-flights + wizz + gflights fallback, kalendár, výber → kaskáda | 12 |
| MVP-3 | predpočítaná `route_matrix`, preset trasy, mapa, atrakcie zo seedu (SK), vstupné podľa veku | 10 |
| MVP-4 | krok 03 vetvy Auto/Karavan, krok 04 rozpätia + tjalda kempy, palivo (gasvaktin) | 8 |
**v1.1 (marec–jún 2027):** návrh mesiaca, Ja/Skupina (jeden sheet cena↔preferencie), Vziať z BA, Kedy platiť, Balenie, viator, dron vrstva, šablóny, CS, cron + e-maily, PWA.
**v1.2 (júl–august 2027):** režim „Dnes", offline, Bez auta vetva, polish.

---

## Fáza 0 · Základ (M0)

### 0.0 Účty (predpoklad – zatiaľ nie sú)
- [ ] GitHub účet (zadarmo) – jediný účet, cez ktorý sa prihlási Vercel aj Supabase
- [ ] Vercel Hobby (login cez GitHub), Supabase Free (login cez GitHub), Resend (e-mail), Travelpayouts (affiliate token → Flight Data API v1), Viator affiliate (API key), OpenRouteService (API key)

### 0.1 Repo a nástroje
- [ ] `git init`, GitHub repo, `.editorconfig`, Prettier, ESLint (next/core-web-vitals, typescript-strict)
- [ ] `pnpm create next-app` (TS, App Router, Tailwind 4, src dir), `next-intl` (sk, cs), `zod`, `drizzle-orm`, `@supabase/ssr`
- [ ] Husky pre-commit (lint, typecheck), GitHub Actions (lint, typecheck, vitest)
- [ ] `.env.example` so všetkými kľúčmi (Supabase, Travelpayouts token, Viator API key, ORS, Resend, CRON_SECRET; OpenFreeMap bez kľúča)

### 0.2 Supabase
- [ ] Projekt (free), Auth magic link (Resend SMTP), redirect URL pre Vercel a localhost
- [ ] Drizzle schema podľa `docs/03-datovy-model.md` (všetky tabuľky), migrácie, `drizzle-kit push`
- [ ] RLS politiky (trips cez trip_members; seed tabuľky verejné select)
- [ ] Seed skript: `airports`, `airlines`, `baggage_rules`, `parking_options`, `regions`, `pois` (≥ 60 s popismi SK/CS), `poi_price_rules`, `drone_zones` (GeoJSON), `vehicle_options`, `fuel_prices`, `fx_rates`
- [ ] Storage bucket `photos` (POI fotky), `exports`

### 0.3 Design system (docs/06)
- [ ] Tailwind tokeny (farby, radius, hairline) pre svetlý „Paper" vizuál (bez tmavého režimu)
- [ ] Fonty Bricolage Grotesque + Instrument Sans + Geist Mono (next/font)
- [ ] Komponenty (docs/obrazovky/00-vzor.md): Surface, TripHeader (sticky), **StepCard**, **ListRow** (+ vnorený), FilterChips, **Sheet**, MapOverlay, PriceTag, SourceBadge, Chip, Stepper, RangeSlider, ScenarioToggle, EmptyRow, DiffToast
- [ ] Stránka `/dev/ui` (StepCard, ListRow, Sheet vo všetkých stavoch) na iPade na kontrolu dotykových cieľov
- [ ] Prístupnosť: fokus, kontrast, reduced motion

### 0.4 Auth, profil a shell
- [ ] `/prihlasenie` (e-mail + heslo), `/zmena-hesla` (vynútená pri `must_change_password`), reset hesla e-mailom
- [ ] Správca: `POST /api/admin/users` (service role) – založenie konta s dočasným heslom + e-mail (Resend); sheet Používatelia
- [ ] `/profil` – formulár preferencií, dokladov, dostupnosti (00a); middleware presmeruje, kým nie je vyplnený
- [ ] Middleware (chránené routy, role), i18n routing `/sk`, `/cs`
- [ ] Obrazovka `cesta/[id]` s TripHeader a 8 prázdnymi StepCard (zatiaľ statické dáta)
- [ ] Nasadenie na Vercel (preview + production), Supabase env

**DoD M0:** prihlásim sa na iPade, vidím obrazovku Cesty a prázdnu Cestu v oboch jazykoch, DB má seed.

---

## Fáza 1 · Kalkulačka bez API (M1)

### 1.1 Engine (docs/05) – `src/engine`, čisté TS + Vitest
- [ ] `money.ts` (Money, fx, source propagácia, rozsah min–max)
- [ ] `ageRules.ts` + testy (hranice veku, deň návštevy)
- [ ] `itineraryGen.ts` presety + greedy rozdelenie dní + validácie + váhy záujmov, sezóna, klenoty, dron + reálny čas jazdy (×1,25/×1,5 + 10 min/zastávka) + servisné zastávky ⛽🛒 + rezervný deň + plán B + sloty
- [ ] `transportMode.ts` – rozhodnutie Auto/Karavan/Bez auta, odhad vetiev, typ krokov 4/5
- [ ] `monthSuggest.ts` – skóre mesiacov z profilov × sezónna matica × cenový index (tp-flights monthly)
- [ ] `groupPlan.ts` – režim Ja (plán per člen) a Skupina (zlúčenie profilov, kompromisy per člen)
- [ ] `split.ts` – delenie group / vehicle / person / custom; cesta na letisko 1 autom z BA (vehicles = ceil(max(pax/4, bags/4)))
- [ ] `bringFromHome.ts` – úspora vs. cena batožiny, colné a airline limity
- [ ] `lodging.ts` (+ pravidlá noc 1 / posledná noc, check-in, open_until), `transport.ts` (+ požiadavky vodiča, depozit, km limit), `food.ts` (+ duty free, z domu), `attractions.ts` (+ book_ahead, bring), `budget.ts` (kategórie, per osoba, kto zaplatil), `timeline.ts`
- [ ] `cascade.ts` (applyFlightSelection, applyScenario, applyTravelers) s diffom
- [ ] `TripSnapshot` builder z DB (server) a z TanStack cache (klient)
- [ ] Testy podľa zoznamu v docs/05 + tz testy (prílet 09:15 KEF vs. odchod z BA), `is_manual` (kaskáda nemení ručné), optimistic concurrency (409)

### 1.2 Obrazovka Cesta + krok 1 (obrazovky/02, krok-1)
- [ ] TripHeader, 8 StepCard so stavmi ○●✓!, URL `#krok-N`, sticky hlavička rozbaleného kroku
- [ ] Krok 1: riadky **mesiacov (návrh)**, cestujúcich (z profilov) a letísk (1 auto pre skupinu), sheety Cestujúci/Letisko/Mesiac; react-hook-form + Zod, autosave
- [ ] Prepínač Ja / Skupina v hlavičke, „Navrhnúť pre všetkých“ (sheet s kompromismi)
- [ ] Nominatim autocomplete domova; routing domov → letiská (OSRM) s cache
- [ ] Pozvanie e-mailom (uloží `trip_invites`, e-mail vo fáze 6)

### 1.3 Obrazovka Cesty (obrazovky/01)
- [ ] `GET /api/trips` riadky ciest, nová cesta, duplikovať, archivovať; sekcia šablón (zatiaľ prázdna)

### 1.4 Krok 8 – základ (krok-8)
- [ ] Riadky kategórií → položky, manuálne položky, rezerva, cieľ

**DoD M1:** po kroku 01 vidím odhad celej cesty pre všetky tri voľby dopravy zo seed dát; zmena voľby prepočíta < 200 ms.

---

## Fáza 2 · Letenky (M2)

### 2.0 Spike (1 večer, prvá úloha fázy)
- [ ] Zmerať pokrytie `tp-flights /v1/prices/calendar` pre BTS/VIE/BUD/PRG/KTW → KEF, september; ak < 60 % dní → wizz timetable primárne pre KTW/BUD + gflights vzorka každý 3. deň + interpolácia ≈
- [ ] Overiť, že `gflights` (fast-flights) funguje z Vercel IP; ak nie → deep-link fallback (Google Flights URL s dátumami a pax = 4)

### 2.1 Konektory (docs/04)
- [ ] Jednotné rozhranie `Connector`, `Result<T>`, `provider_cache`, `connector_health`, tabuľka Stav zdrojov v Nastaveniach
- [ ] Nahrané fixtures (JSON) pre každý konektor + kontrakt testy; e-mail správcovi, ak je konektor 3 dni down
- [ ] `tp-flights.ts` (Flight Data API v1: calendar, cheap, direct, monthly; deep link) – primárny
- [ ] `wizz.ts` (timetable KTW/BUD–KEF, rotujúca verzia → self-heal, feature flag), `ryanair.ts` (farfnd v4, len segment do hubu)
- [ ] `gflights` – `fast-flights` ako Vercel Python function (`api/gflights.py`) na overenie ceny pre 4 os. a self-transfer kombinácie
- [ ] `manual-flight.ts`
- [ ] `FlightSearchService`: paralelné volania, self-transfer spájanie (min 3 h), dedup, SSE stream

### 2.2 Engine
- [ ] `flightCombos.ts` (combos, batožina, parkovanie, cesta na letisko, hub nocľah, heatmapa, filtre) + testy
- [ ] `priceWatch.ts`

### 2.3 Krok 2 UI (krok-2)
- [ ] MonthHeatmap (kvantilové farby, výber dňa, dlhý stisk = zamknúť odlet, swipe mesiacov)
- [ ] Chipy filtrov, ListRow kombinácie, porovnanie (sheet), vybraný let ako prvý riadok ✓
- [ ] Výber → verify → kaskáda → DiffToast s undo
- [ ] Ručný let
- [ ] Nastavenia batožiny a parkovania (sheet)

**DoD M2:** kalendár septembra pre 5 letísk s celkovými cenami, výber letu prepočíta celú cestu.

---

## Fáza 3 · Itinerár, mapa, atrakcie, dron (M3)

### 3.1 Mapa overlay (obrazovky/03)
- [ ] MapLibre + OpenFreeMap svetlý štýl (biely ostrov, ľadová trasa); atribúcia
- [ ] Vrstvy: trasa (dni), zastávky, noci, katalóg okolia, palivo (Overpass), kempy, dron zóny (GeoJSON), počasie (Open-Meteo), stav ciest (road.is)
- [ ] Ovládanie pre tablet (48 px), centrovať deň / okruh, offline cache dlaždíc

### 3.2 Routing
- [ ] Skript `scripts/build-route-matrix.ts`: ORS Matrix pre všetky seed POI + letiská → `seed/route_matrix.json` (km, min, surface); commit do repa
- [ ] `/api/routing` OSRM → ORS fallback → Haversine len pre vlastné miesta; `route_cache`
- [ ] Prepočet km/čas pri zmene zastávok

### 3.3 Krok 05 Itinerár UI (krok-5)
- [ ] Riadky dní → vnorené riadky zastávok, drag & drop (dnd-kit, touch sensor), zamknutie, presun medzi dňami
- [ ] Generátor sheet s parametrami + náhľad zmien
- [ ] Karta zastávky (popis, trvanie, vstupné per osoba, sezóna, dron, tipy, rezervácia, úprava ceny)
- [ ] Validácie a varovania (jazda, F-cesty, sezóna, dron permit, západ slnka)
- [ ] Pridať zastávku (katalóg / mapa / vlastné)

### 3.4 Krok 06 Atrakcie (krok-6)
- [ ] `viator.ts` konektor (affiliate API): vyhľadanie túr, ceny, dostupnosť, deep link; mapovanie na POI (`viator_product_code`)
- [ ] Sekcie V pláne + Katalóg ako riadky, filtre (kategória, región, cena, sezóna ★, klenoty, návštevnosť, dron, rezervácia, trvanie, náročnosť)
- [ ] Detail sheet, „+ Deň N" s logikou zachádzky, hromadný výber
- [ ] Vlastné POI, override cien, „Nahlásiť zákaz dronu"
- [ ] Dopísať popisy SK/CS a ceny pre všetkých ≥ 60 POI + ≥ 20 klenotov (seed)

### 3.5 Dron (sheet + vrstva mapy)
- [ ] Profil drona v nastaveniach, stránka pravidiel (8 kariet), checklist, „na čo si dať pozor"
- [ ] Zóny GeoJSON (CTR, NP, rezervácie, súkromné) – seed + overenie zdrojov
- [ ] Po dňoch prehľad, odporúčané spoty

**DoD M3:** vygenerovaný Ring Road 10 dní na mape s km/časmi, každá zastávka má popis, vstupné podľa veku, sezónu a dron status; vrstva zón funguje.

---

## Fáza 4 · Ubytovanie & doprava (M4)

### 4.1 Krok 04 Kde spať (krok-4)
- [ ] `tjalda.ts` (kempy: ceny parser + ručný override, otvorenie, služby, Parka), `parka.ts` (parkovné atrakcií), `tjalda-geo.ts` (pramene, vodopády, obchody/čerpačky), `overpass.ts` (izby bez cien), seed kempy ako záloha, odhady per región
- [ ] Riadky nocí → vnorené ponuky, filtre, priradenie, ručný záznam s predvyplneným Booking/Airbnb/tjalda linkom; pravidlá noc 1 / posledná noc; Camping Card do 15. 9.
- [ ] Kuchynka → strava kaskáda; Camping Card logika; upozornenie na zatvorené kempy

### 4.2 Krok 03 Doprava (krok-3)
- [ ] Prepínač A/B, riadky vozidiel s vnorenými poisteniami, extras, palivo z km, tunel, „prečo" porovnanie
- [ ] Seed `vehicle_options` s odkazmi a požiadavkami; `gasvaktin.ts` konektor paliva

**DoD M4:** oba scenáre majú reálne alebo odhadované ceny pre každú noc a vozidlo; rozdiel je vysvetlený.

---

## Fáza 5 · Strava, rozpočet, export, optimalizátor (M5)
- [ ] Krok 7 (krok-7): úroveň, ceny, riadky dní, overrides
- [ ] Sheet Balenie (z `bring[]`, vozidla, stravy, dronu), záložka **Vziať z domu** (bringFromHome, seed `bring_items`) a záložka „Kedy platiť" (timeline.ts, .ics, likvidita)
- [ ] Krok 8: Scenáre (snapshoty), Na osobu, História (Recharts), Export PDF (@react-pdf), CSV/XLSX, JSON, .ics
- [ ] Optimalizátor „Nájdi najlacnejšie" (docs/05 §9) so streamovaním výsledkov
- [ ] „Čo sa zmenilo" na Prehľade

**DoD M5:** PDF s rozpočtom a itinerárom; optimalizátor navrhne top 5 kombinácií s vysvetlením.

---

## Fáza 6 · Zdieľanie, šablóny, história, cron (M6)
- [ ] Členovia: role (owner/editor/viewer) s RLS, „toto som ja", read-only link `/zdielane/[token]`
- [ ] `trip_revisions` zápis pri každej zmene + UI História + Vrátiť; optimistic concurrency (`updated_at`, 409 → sheet načítať/prepísať); `notifications` evidencia e-mailov
- [ ] Šablóny (obrazovky/01 + sheety): uložiť / katalóg / fork s režimami nahradiť–zlúčiť–inšpirácia, verzie, viditeľnosť
- [ ] Vercel Cron `/api/cron/daily` (frankfurter, gasvaktin, gflights verify, viator, snapshoty, keep-alive Supabase) + e-mail pri zmene
- [ ] Nastavenia: stav providerov, notifikácie, export/import

**DoD M6:** druhý používateľ sa prihlási, vidí a upraví cestu; fork verejnej šablóny; e-mail o zmene ceny.

---

## Fáza 7 · PWA, tablet, testy, nasadenie (M7)
- [ ] `@serwist/next` PWA: manifest, ikony, offline shell, IndexedDB snapshot (itinerár, mapa trasy, adresy nocí, dron zóny, kontakty), fronta zmien so synchronizáciou
- [ ] Obrazovka „Dnes" (dnešný deň, ďalšia zastávka, počasie, hodiny, checklist pred odchodom) – v1.2
- [ ] iPad: safe-area, 100dvh, klávesnica + sticky CTA, gestá (swipe dní/mesiacov, bottom sheet), dlhý stisk menu
- [ ] Playwright e2e na iPad viewporte: krok 01 → 02 výber letu → 03 voľba → 04 → 05 → 06 → 07 → 08 PDF
- [ ] Výkon: RSC cache, streaming, bundle < 300 kB (mapa lazy)
- [ ] Prístupnostný audit (kontrast na skle, fokus, čítačka)
- [ ] Produkčné nasadenie, doména, monitoring (Vercel logs), zálohy DB (týždenný JSON export cronom do Storage)

**DoD M7:** aplikácia nainštalovaná na iPade ako PWA, e2e zelené, Lighthouse PWA ✓.

---

## Poradie práce (odporúčanie)
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. Fázy 3 a 4 sa dajú prehodiť, ak sú letenky zatiaľ v nedohľadne (ceny na september 2027 sa objavia ~ 6–9 mesiacov vopred pri LCC).

## Priebežné úlohy
- [ ] Každý mesiac: overiť seed ceny (atrakcie, parkovanie, batožina) – `verified_at`
- [ ] Sledovať zmeny neoficiálnych endpointov (Ryanair/Wizz/Google Flights) – feature flagy, health tabuľka
- [ ] Skúsiť Booking affiliate cez Awin (ak bude verejný web) → konektor `booking` nahradí ručné ubytovanie
- [ ] Dopĺňať klenoty a dron zóny podľa reálnych skúseností (po ceste)
