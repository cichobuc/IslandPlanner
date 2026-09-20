# 03 · Dátový model

Postgres (Supabase) cez Drizzle. Názvy tabuliek anglicky, `snake_case`. Všetky ceny ako `numeric(12,2)` + `currency` + `source` + `fetched_at`
(v kóde typ `Money`). Časy v UTC, dátumy cesty ako `date`.

## ER prehľad

```
users ──< trip_members >── trips ──< travelers
                              ├──< flight_searches ──< flight_options
                              ├──── flight_selection (1)
                              ├──< parking_options
                              ├──< itinerary_days ──< itinerary_stops >── pois ──< poi_price_rules
                              │        └── overnight_region
                              ├──< lodging_stays >── lodging_options
                              ├──< vehicle_options  (auto / karavan)
                              ├──── vehicle_selection (1)
                              ├──── food_profile (1)
                              ├──< manual_items
                              ├──< scenarios (snapshoty konfigurácie)
                              ├──< price_snapshots (história pre sledovanie)
                              └──< share_tokens, trip_invites
airports, airlines, baggage_rules, regions, fx_rates, fuel_prices, settings (globálne / per user)
```

## Tabuľky

### `trips`
| stĺpec | typ | poznámka |
|---|---|---|
| id | uuid pk | |
| name | text | „Island september 2027" |
| owner_id | uuid → users | správca |
| target_month | date | prvý deň mesiaca, napr. 2027-09-01 |
| min_days / max_days | int | rozsah dĺžky pobytu (8–12) |
| start_date / end_date | date null | vyplní kaskáda po výbere letu |
| home_label | text | „Bratislava" |
| home_lat / home_lng | numeric | |
| origin_airports | text[] | `['BTS','VIE','BUD','PRG','KTW']` |
| dest_airport | text | `KEF` |
| allow_self_transfer | bool | default true |
| pace | enum relaxed/normal/intense | tempo itinerára |
| interests | text[] | `thermal, glacier, wildlife, nature, hiking, culture` |
| transport_mode | enum car/camper/no_car null | **rozhodnutie z kroku 3**; určuje typ krokov 4 a 5; dáta oboch vetiev sa uchovávajú cez `scenario_key` |
| budget_target_pp | numeric null | voliteľný cieľ na osobu |
| base_currency | text | EUR |
| reserve_pct | numeric | 10 |
| status | enum draft/planned/booked/done | |
| created_at / updated_at | timestamptz | |

### `profiles` (1 : 1 s auth.users – osobný profil, zakladá správca)
| stĺpec | typ | poznámka |
|---|---|---|
| user_id pk | uuid | |
| display_name, email | | |
| must_change_password | bool | true po založení, false po prvej zmene |
| created_by | uuid | správca, ktorý konto založil |
| birth_date | date | |
| home_label, home_lat, home_lng | | predvolene Bratislava |
| driver_licence | jsonb | `{ has: bool, since: date, categories: ['B','BE'], willing_to_drive: bool }` |
| drone | jsonb | `{ has: bool, weight_g, operator_id, insurance: bool }` |
| interests | jsonb | `{ thermal: 0–3, glacier, puffin, whale, aurora, hike, lava, culture, photo, drone }` (0 = nie, 3 = kvôli tomu idem) |
| pace | enum | relaxed / normal / intense |
| comfort | enum | camp / hostel / guesthouse / hotel (najnižšia úroveň, ktorú akceptuje) |
| food_level | enum | budget / mid / comfort |
| budget_target | numeric null | €/os. cieľ |
| availability | jsonb | `{ months: [5..10], blocked: ['2027-09-01/2027-09-05'], min_days, max_days }` |
| airports | text[] | preferované letiská |
| bags_pref | enum | light / checked |
| docs | jsonb | `{ idValidUntil, ehic, insurance }` |
| locale, theme | | sk/cs |
| completed_at | timestamptz null | profil vyplnený |
Platobné údaje sa **nikde neukladajú** (kreditka = len „mám kreditnú kartu na depozit“ áno/nie v profile vodiča).

### `trip_members`
`trip_id, user_id, role (owner/editor/viewer), joined_at, last_seen_at` – RLS základ. Rola určuje oprávnenia (viewer číta a komentuje; editor upravuje kroky; owner + členovia, mazanie, šablóny verejne).

### Režim Ja / Skupina
- Cesta je vždy skupinová. **„Ja“** je prepočítaný náhľad z profilu člena (`groupPlan.planFor(profile)`), neukladá sa; tlačidlo „Uložiť ako moju cestu“ vytvorí novú cestu s 1 členom.
- `group_proposals`: `id, trip_id, created_at, inputs jsonb (profily členov), result jsonb (mesiac, letisko, vetva, trasa, rozpočet), compromises jsonb [{user_id, lost: [...], gained: [...], delta_eur}]` – história návrhov „najlepšia cesta pre všetkých“.
- `month_scores`: `trip_id | user_id, month, score, reasons jsonb, price_index` – návrh ideálneho mesiaca.

### `travelers`
| stĺpec | typ | poznámka |
|---|---|---|
| id, trip_id | | |
| name | text | |
| birth_date | date null | ak null, použije sa `age_fallback` |
| age_fallback | int null | keď nechceme dátum narodenia |
| user_id | uuid null | prepojenie na účet (kto je kto); pri prepojení sa **preberajú hodnoty z `profiles`** (vek, vodič, dron, batožina, doklady) |
| is_driver | bool | ovplyvňuje „druhý vodič"; app overí vek/prax voči `driver_min_age` |
| driver_since | date null | prax vodiča |
| has_credit_card | bool | depozit auta |
| docs | jsonb | `{ idValidUntil, ehic: bool, insurance: bool, droneOperatorId? }` |
| bags | jsonb | `{ cabinSmall:1, cabin10:1, checked20:0, checked32:0 }` |
| diet_note | text | iba poznámka |

Vek v deň X: `age(birth_date, X)` – používa sa pri vstupnom (deň návštevy) aj pri letenkách (deň odletu).

### `airports`
`iata pk, name, city, country, lat, lng, drive_km_from_home?` (km sa počíta cez routing a cache-uje v `trip_airport_access`).

### `trip_airport_access` (cesta domov → letisko, per trip × letisko)
`trip_id, iata, mode (car/bus/train), distance_km, duration_min, cost_one_way (Money), vignette_needed bool, notes`.

### `parking_options`
| stĺpec | poznámka |
|---|---|
| id, iata | letisko |
| name | „VIE Parkplatz C", „BTS Long-term P3", „Mazur Parking VIE" |
| kind | official / external_shuttle |
| price_rules | jsonb: `[{days:1,price:..},{days:7,price:..},{extraDayPrice:..}]` alebo `{perDay}` |
| currency, source, verified_at, url | |

### `airlines`, `baggage_rules`
`airlines: iata, name, kind (lcc/full)`.
`baggage_rules: airline, bag_type (cabin_small/cabin_10/checked_20/checked_32/priority), price_low, price_high, currency, verified_at, notes`
– LCC ceny sú dynamické, držíme rozsah a používame stred; pri overení letu sa doplní presná.

### `flight_searches`
`id, trip_id, params jsonb (origins, month, minDays, maxDays, pax, bags, parking), status, started_at, finished_at, connector_stats jsonb`.

### `flight_options`
| stĺpec | poznámka |
|---|---|
| id, search_id | |
| origin, dest | IATA |
| out_dep_at, out_arr_at, ret_dep_at, ret_arr_at | timestamptz |
| out_legs, ret_legs | jsonb pole segmentov `{airline, flightNo, from, to, dep, arr}` |
| self_transfer | bool + `transfer_hub`, `transfer_min` |
| fare_pp | Money – letenky na osobu bez batožiny |
| bags_total | Money – batožina pre celú skupinu |
| parking_total | Money null |
| airport_access_total | Money – cesta na letisko a späť (skupina) |
| total_group / total_pp | Money – to, podľa čoho radíme |
| days, nights | int |
| connector_id, deep_link | text – `tp-flights / ryanair / wizz / gflights / manual` |
| fetched_at | |

### `flight_selection` (1 : 1 s trips)
`trip_id pk, flight_option_id, parking_option_id null, airport_access_mode, locked_price Money, verified_at, notes`.

### `regions`
Seed: `id, name_sk, name_cs, name_en, slug, centroid, polygon (geojson), order_on_ring` (napr. `reykjavik, golden_circle, south, southeast, eastfjords, north_myvatn, akureyri, north_west, snaefellsnes, westfjords, highlands, reykjanes`).

### `pois` (atrakcie, kempy, čerpacie stanice…)
| stĺpec | poznámka |
|---|---|
| id, slug, name, name_sk, name_cs | |
| kind | attraction / thermal / tour / museum / campsite / fuel / grocery / viewpoint |
| category_tags | text[] `waterfall, glacier, thermal, whale, puffin, hike, lava, beach, canyon` |
| region_id | |
| lat, lng | |
| description_sk, description_cs | text – 2–4 vety: čo to je, prečo ísť |
| tips_sk, tips_cs | text – praktické rady (kedy prísť, kde parkovať, čo obliecť, koľko km peši) |
| visit_min | typické trvanie (min) – **odporúčané**; `visit_min_min` / `visit_min_max` rozsah (napr. 45–90) |
| walk_km, difficulty | pešia časť a náročnosť (easy/moderate/hard) |
| entry_note_sk, entry_note_cs | text – ako sa platí (app Parka, automat, online rezervácia), čo je v cene |
| parking_fee | Money null (napr. 1 000 ISK Þingvellir) |
| photo_url, photo_credit | obrázok (Wikimedia Commons / vlastný upload do Supabase Storage) |
| website_url, maps_url | oficiálna stránka, OSM odkaz |
| facilities | text[] `toilets, cafe, shop, shelter, ev_charger` |
| book_ahead_days | int null – koľko dní vopred rezervovať (vypredanie) |
| cancel_policy_sk/cs | text – storno (počasie, 24/48 h) |
| bring | text[] `swimwear, towel, headlamp, boots, crampons_included` → sheet Balenie |
| open_hours_season | jsonb – hodiny podľa sezóny (september kratšie) |
| best_light | enum morning/evening/any – fotografia |
| cheaper_alternative_poi | fk null – lacnejšia alternatíva |
| rainy_day_ok | bool – vhodné ako plán B pri daždi |
| popularity | int 1–5 (1 = takmer prázdne, 5 = davy) – filter „menej navštevované" |
| hidden_gem | bool – menej známe, ale hodnotné miesto |
| best_months | int[] 1–12 – mesiace, kedy sa oplatí (napr. puffiny `[5,6,7,8]`) |
| month_rating | jsonb `{ "1":2, ..., "9":5 }` – hodnotenie 1–5 pre každý mesiac (generátor a filter) |
| season_note_sk, season_note_cs | text – prečo/kedy („ľadové jaskyne len nov–mar", „v septembri už bez puffinov, ale menej ľudí") |
| drone_status | enum `allowed` / `restricted` / `permit` / `banned` / `unknown` |
| drone_note_sk, drone_note_cs | text – dôvod a podmienky („národný park – zákaz bez povolenia Umhverfisstofnun", „CTR letiska KEF") |
| drone_zone_id | fk → `drone_zones` null – ak POI leží v zóne |
| booking_required | bool, `booking_url`, `provider`, `viator_product_code` null |
| season | jsonb `{from:'06-01', to:'09-30'}` alebo null |
| requires_4x4 | bool (F-cesty) |
| interest_weight | jsonb `{thermal:0.9, ...}` pre generátor |
| open_hours | jsonb null |
| verified_at, source_url | |

### `drone_zones` (seed, GeoJSON)
| stĺpec | poznámka |
|---|---|
| id, name | „Vatnajökull NP", „CTR Keflavík", „Reykjavík city", „Þingvellir NP" |
| kind | `national_park` / `nature_reserve` / `airport_ctr` / `urban` / `bird_sanctuary` / `private_ban` / `seasonal` |
| status | `banned` / `permit` / `restricted` (napr. max výška, sezóna) |
| geometry | geojson polygon / kruh (stred + polomer km) |
| season | jsonb null – napr. hniezdenie `{from:'05-01', to:'08-15'}` |
| rules_sk, rules_cs | text – čo presne platí |
| authority, permit_url, source_url, verified_at | Samgöngustofa / Umhverfisstofnun / Isavia / správa parku |

### `poi_price_rules`
`poi_id, label ('Dospelý','Senior 67+','Dieťa 6–15','Do 5 rokov'), min_age, max_age, price Money, per ('person'|'vehicle'|'group'), variant ('basic'|'premium'|'weekday'|'weekend'), notes`.
Vek sa vyhodnocuje **v deň návštevy** (z itinerára). Atrakcia bez pravidiel = zadarmo (vstupné 0), parkovné sa počíta zvlášť `per vehicle`.
Varianty (napr. Blue Lagoon Comfort/Premium, Sky Lagoon Pure/Sér) sa vyberajú v karte atrakcie; predvolený je najlacnejší.

### `itinerary_days`
`id, trip_id, scenario_key ('drive' pre Auto+Karavan | 'no_car'), day_index (1..N), date, title, overnight_region_id, overnight_poi_id null (kemp), drive_km, drive_min, drive_min_real, locked bool, notes, sunrise, sunset, updated_at`.

### `itinerary_stops`
`id, day_id, order, poi_id null, custom_label, arrive_at, stay_min, drive_km_from_prev, drive_min_from_prev, entry_total Money (vyhodnotené), skip bool, must bool, is_manual bool, updated_at`.

### `lodging_options` (nájdené alebo ručne pridané)
| stĺpec | poznámka |
|---|---|
| id, trip_id, region_id | |
| kind | airbnb / hotel / guesthouse / hostel / campsite / camper_site |
| name, url, connector_id | `lodging-manual / lodging-estimate / overpass` |
| lat, lng | |
| price_per_night Money, cleaning_fee, service_fee_pct, city_tax_pp | |
| capacity, bedrooms | |
| has_kitchen, has_parking, has_wifi, private_bath, free_cancel | bool |
| rating, reviews_count | |
| check_in_from, check_in_until | time – okno check-inu (⚠ pri neskorom príchode) |
| open_until | date null – kempy: zatvorenie sezóny |
| sleeping_bag | bool – svefnpokapláss (lacnejšie, vlastný spacák) |
| laundry | bool |
| dark_sky | bool – mimo mesta (polárna žiara) |
| distance_from_route_km | |
| fetched_at, verified_at | |

### `lodging_stays` (ktorá noc kde)
`id, trip_id, night_date, day_id, lodging_option_id null, kind_override, price_override Money null, price_range_min/max Money (rozpätie), is_manual bool, scenario_key ('car'|'camper'|'no_car'), updated_at`.

### `vehicle_options`, `vehicle_selection`
`vehicle_options: id, trip_id null (seed alebo per trip), kind (car/camper), class (economy/estate/suv2wd/4x4/camper2/camper4/camper4x4), provider, name, seats, sleeps, fuel (petrol/diesel), consumption_l_100km, price_per_day Money, insurance jsonb {cdw, gp, saap, theft}, extras jsonb, deposit, driver_min_age, driver_min_years, km_limit_per_day null, fuel_policy, pickup_mode (desk/shuttle), heater bool (karavan), url, verified_at`.
`vehicle_selection: trip_id, scenario_key, vehicle_option_id, days, insurance_chosen text[], extras_chosen jsonb, camping_card bool, is_manual bool, updated_at`.
`vehicle_options` navyše: `luggage_capacity int` (počet 20 kg kufrov) → ⚠ „batožina sa nezmestí".

### `food_profile` (1 : 1 s trips)
`trip_id, level (budget/mid/comfort), custom_prices jsonb {breakfastSelf, breakfastOut, lunchSelf, lunchOut, dinnerSelf, dinnerOut, coffee, snack, alcoholPerDay}, coffee_per_day int, alcohol bool, first_shop Money, day_overrides jsonb {date: level}`.

### `manual_items`
`id, trip_id, category (insurance/sim/souvenir/other), label, amount Money, split (group/vehicle/person/custom), custom_shares jsonb null, paid_by uuid null, scenario_key null`.
Každý typ položky má predvolený `split`: letenka/batožina/vstupné/strava/poistenie osoby = `person`; prenájom/palivo/poistky vozidla/parkovanie/ubytovanie/kemp/tunel/cesta na letisko = `group`; parkovné = `vehicle`.

### `airport_transfer` (cesta na letisko – skupinovo)
`trip_id, iata, vehicles int (1 auto pre ≤ 4 os. + kufre, inak 2 alebo bus), mode, km, consumption, fuel_price_sk, vignettes jsonb, parking_option_id, cost_total Money (split group)`.

### `bring_items` (Vziať z domu – seed + vlastné)
`id, category (food/drink/hygiene/meds/gear/other), name_sk, name_cs, price_is Money, price_sk Money, weight_g, volume_l, customs_note, airline_note (LiPo, plyn, tekutiny), default_qty_per_person, seasonal bool`.
`trip_bring`: `trip_id, item_id, qty, for_user_id null (osobné) | null (spoločné), decided (take/buy_there/skip)` → engine porovná úsporu s cenou batožiny navyše.

### `scenarios`
`id, trip_id, name, key (car/camper/custom), snapshot jsonb (TripSnapshot), result jsonb (BudgetResult), created_at`.

### `price_snapshots`
`id, trip_id, subject (flight/tour/vehicle/fx/fuel), subject_id, total Money, connector_id, captured_at` → graf vývoja + e-mail diff. (Ubytovanie sa nesleduje – bez bezplatného zdroja.)

### `fx_rates`, `fuel_prices`
`fx_rates: date, base, quote, rate, source`.
`notifications: id, trip_id, user_id, kind (price_change/booking_deadline/connector_down/weekly), subject_id, sent_at` – evidencia e-mailov (max 1/cesta/deň).
`route_matrix` (seed, read-only): `from_slug, to_slug, km, min, surface (paved/gravel)` – predpočítané cez ORS Matrix pre všetky seed POI + letiská; itinerár sa generuje bez sieťových volaní.
`fuel_prices: date, fuel (petrol/diesel), price_isk_per_l, source (gasvaktin/manual)`.
`provider_cache: key pk, connector_id, payload jsonb, fetched_at, expires_at` · `route_cache: from_key, to_key, km, min, geometry`.

### `share_tokens`, `trip_invites`
`share_tokens: token pk, trip_id, expires_at`.
`trip_invites: token, trip_id, email, role, accepted_at`.

### `settings`
`user_id null (globálne) , key, value jsonb` – predvolená mena, jazyk, téma, profil drona; API tokeny sú v env, nie v DB.
`connector_health: connector_id pk, status, last_ok_at, last_error, checked_at` – tabuľka Stav zdrojov.

## TripSnapshot (vstup enginu)

```ts
type TripSnapshot = {
  trip: Trip; travelers: TravelerWithAge[];
  flight?: FlightSelectionResolved;        // vrátane batožiny, parkovania, cesty na letisko
  itinerary: ItineraryDay[];               // so stops a POI cenami
  lodgingStays: Record<ScenarioKey, LodgingStay[]>;
  vehicle: Record<ScenarioKey, VehicleSelectionResolved | null>;
  food: FoodProfile; manualItems: ManualItem[];
  fx: { ISK_EUR: number; date: string }; fuel: { petrol: number; diesel: number };
}
```

## RLS pravidlá (Supabase)

- `trips`: `select/update` ak `exists (trip_members where trip_id = trips.id and user_id = auth.uid())`; `delete` len owner.
- Všetky detské tabuľky: cez `trip_id` rovnaká podmienka.
- `pois, regions, airports, airlines, baggage_rules, parking_options, fx_rates, fuel_prices`: verejné `select`, zápis len service role (seed/cron).
- `share_tokens`: čítanie snapshotu cez route handler so service role, nie priamo klientom.

## Ukladanie trás a konfigurácií pre ostatných používateľov

Každá cesta je editovateľná všetkými členmi (`trip_members` s rolou `editor`). Navyše sa dá **čokoľvek uložiť ako šablónu**,
ktorú si iný používateľ skopíruje (fork) do vlastnej cesty a ďalej upraví, bez toho, aby zmenil originál.

### `templates`
| stĺpec | poznámka |
|---|---|
| id, owner_id | autor |
| kind | `route` (itinerár + zastávky) / `config` (celé nastavenie cesty bez dátumov) / `trip` (kompletná cesta vrátane scenárov) / `food` / `vehicle` |
| name, description | „Ring Road 10 dní úsporne", „Naša konfigurácia 4 ľudia + karavan" |
| visibility | `private` / `link` (kto má odkaz) / `shared` (konkrétni používatelia cez `template_shares`) / `public` (zoznam v aplikácii) |
| payload | jsonb – normalizovaný export (POI sa referencujú `slug`-om, nie id, aby prežili re-seed) |
| days, base_region_order | metadáta pre filtrovanie v katalógu šablón |
| source_trip_id | odkiaľ vznikla |
| forks_count, version | |
| created_at, updated_at | |

### `template_shares`
`template_id, user_id | email, can_edit bool` – zdieľanie konkrétnym ľuďom (pozvánka e-mailom ako pri ceste).

### Fork
`POST /api/templates/[id]/fork { tripId }` → skopíruje payload do cesty používateľa (itinerár, zastávky, ubytovanie ako
„návrh", vozidlo, strava…). Uloží sa `trips.forked_from_template_id`. Originál sa nemení; autor vidí počet forkov.
Pri forku trasy do cesty s **iným počtom dní** sa itinerár prispôsobí generátorom (zlúčenie/rozdelenie dní) a UI ukáže diff.

### `trip_revisions` (história + undo)
| stĺpec | poznámka |
|---|---|
| id, trip_id, user_id | kto zmenil |
| entity | `itinerary_stop` / `itinerary_day` / `lodging_stay` / `vehicle_selection` / `food_profile` / `flight_selection` / `trip` |
| entity_id | |
| op | `create` / `update` / `delete` / `reorder` |
| before, after | jsonb |
| created_at | |

Každá stránka má tlačidlo **„História"** (kto, kedy, čo) a **„Vrátiť"** na poslednú vlastnú zmenu; správca môže vrátiť čokoľvek.
Revízie starnú po 90 dňoch (zmazanie cronom), okrem posledných 50 na cestu.

### Čo presne si používateľ vie upraviť (a kde)

| Vec | Kde | Ako |
|---|---|---|
| Trasa – poradie dní, zastávky, prenocovania | Krok 05 | drag & drop, pridať/odobrať, zamknúť deň, prepísať čas jazdy ručne |
| Cena vstupného / parkovného pri POI | Krok 06, 05 | inline editácia s poznámkou a `source: manual` |
| Ubytovanie – výber, cena, poplatky | Krok 04 | výber z výsledkov, ručný záznam s URL |
| Vozidlo, poistenia, extras, spotreba | Krok 03 | formulár; spotreba a cena paliva prepísateľné |
| Strava – úroveň, ceny položiek, denné výnimky | Krok 07 | slider + tabuľka |
| Letenka – iný let, batožina, parkovisko | Krok 02 | výber z výsledkov alebo ručná cena + link |
| Cestujúci, letiská, rozsah dní | Krok 01 | kedykoľvek rozbaliť krok 01 |
| Manuálne položky | Krok 08 | riadky |

Všetky úpravy sa ukladajú do DB okamžite (optimistic update), zapisujú `trip_revisions` a sú viditeľné pre všetkých členov cesty po obnovení
(v2: Supabase Realtime).
