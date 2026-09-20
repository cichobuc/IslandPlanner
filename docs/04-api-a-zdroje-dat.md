# 04 · Konektory – externé zdroje dát (overené 20. 9. 2026)

Jeden vzor pre všetky zdroje: **konektor** = malý modul s rovnakým rozhraním, vlastnou cache, TTL, fallbackom a stavom. Nič v UI
nevolá externý zdroj priamo; každý riadok s cenou nesie `source` (`api / seed / manual / estimate`), `fetchedAt` a `connectorId`.

## Rozhranie konektora (jednotné)

```ts
interface Connector<Q, R> {
  id: ConnectorId;                 // 'tp-flights' | 'ryanair' | 'wizz' | 'gflights' | 'viator' | 'osrm' | 'ors' | 'overpass' | 'nominatim'
                                   // | 'gasvaktin' | 'frankfurter' | 'open-meteo' | 'openfreemap' | 'drone-zones' | 'manual'
  steps: StepNo[];                 // ktoré kroky ho používajú
  kind: 'live' | 'cached' | 'seed' | 'manual';
  ttl: number;                     // sekundy; výsledok ide do provider_cache
  rateLimit: { perSec?: number; perDay?: number };
  fetch(q: Q): Promise<Result<R>>; // Result = ok + data + fetchedAt | !ok + reason + retryable
  health(): Promise<'ok' | 'degraded' | 'down'>;   // pre tabuľku Stav zdrojov v Nastaveniach
  fallback?: ConnectorId;          // kam sa ide, keď zlyhá
  legal: 'official' | 'affiliate' | 'unofficial' | 'open-data';
  verifiedAt: string; sourceUrl: string;
}
```
Pravidlá: (1) zlyhanie = riadok „cena nedostupná – zadať ručne", nikdy chyba stránky; (2) unofficial konektory za feature flagom
a s limitom ≤ 1 req/s; (3) `manual` konektor existuje pre každý typ dát; (4) health sa ukazuje v Nastaveniach a v riadku vstupov kroku.

## Katalóg konektorov

| ID | Krok | Čo dáva | Prístup | Limity / čerstvosť | Istota | Fallback | TTL |
|---|---|---|---|---|---|---|---|
| **tp-flights** – Travelpayouts *Flight Data Access API v1* (`/v1/prices/calendar`, `/v1/prices/cheap`, `/v1/prices/direct`, `/v1/prices/monthly`) | 02 | najlacnejšie ceny po dňoch/mesiacoch pre pár letísk (priame aj s prestupom), deep link | zadarmo, token z affiliate účtu (`X-Access-Token`) | cache z vyhľadávaní Aviasales, história 7 dní, ceny majú `expires_at`; starý Data API **vypnutý 15. 6. 2026** – používať iba v1 | ★★★★ | gflights | 6 h |
| **ryanair** – `services-api.ryanair.com/farfnd/v4/oneWayFares`, `roundTripFares` (neofic., bez kľúča, CORS *) + `/timtbl/3/schedules` | 02 | fares po dňoch len Ryanair; do KEF nelieta → **len prvý segment self-transferu** (BTS/VIE/BUD/KTW/PRG → STN/LTN/BER/DUB…) | zadarmo | overené funkčné 09/2026; existuje aj oficiálny *Ryanair for Developers – Farefinder API* (overiť podmienky) | ★★★ | gflights | 6 h |
| **wizz** – `be.wizzair.com/{ver}/Api/search/timetable` (neofic., verzia v URL **rotuje**) | 02 | ceny po dňoch Wizz; **priame do KEF: KTW (ut/št/so/ne), BUD**; VIE–KEF skončil 04/2025 | zadarmo | musí mať „self-heal" zisťovanie verzie (`DiscoverWizzVersion`), WAF 503 občas; ≤ 1 req/s | ★★ | tp-flights → gflights | 6 h |
| **gflights** – Google Flights cez `fast-flights` (protobuf URL, Python, aktívne 08/2026) | 02 | **overenie ceny pre 4 os.** a self-transfer kombinácie naprieč všetkými airlines (Wizz, Ryanair, easyJet, Icelandair) | zadarmo, neofic. | nízky objem (len verify vybraných kombinácií, ≤ 50/deň); beží ako Vercel Python function alebo port do TS | ★★★ | manual | 24 h |
| **manual-flight** | 02 | ručne zadaný let (cena, link) | – | – | ★★★★★ | – | – |
| ~~Amadeus Self-Service~~ | – | **zrušené** – self-service portál vypnutý 17. 7. 2026, bez free tieru | | | ✗ | | |
| ~~Kiwi Tequila~~ | – | **nedostupné** – od 05/2024 len na pozvanie | | | ✗ | | |
| **viator** – Viator Partner API (affiliate, `/products/search`, `/availability`) | 06 | živé ceny a dostupnosť túr: ľadovcové túry, veľryby, Katla ice cave, lávové show, Golden Circle výlety (vetva Bez auta) | zadarmo, affiliate účet, **bez minimálnej návštevnosti** | basic access bez schvaľovania; predaj cez Viator link | ★★★★ | seed | 24 h |
| ~~GetYourGuide~~ | – | vyžaduje 100 000 návštev/mes. → **nie** | | | ✗ | | |
| **lodging-estimate** | 04 | **rozpätie €/noc per región × typ × počet osôb** (seed tabuľka, september; napr. Juh · penzión · 4 os. · 160–240 €); rozpočet počíta stred a ukazuje min–max | seed | overuje sa 2× ročne ručne podľa Booking/Airbnb | ★★★ | – | – |
| **lodging-manual** | 04 | ručný záznam (URL + cena) – voliteľné spresnenie | – | – | ★★★★★ | – | – |
| **lodging-links** | 04 | predvyplnené odkazy: Booking (dátumy, 4 hostia, región), Airbnb, Hostelworld, tjalda.is (kempy) | – | | ★★★★ | | |
| **tjalda** – `tjalda.is/api/campsites` (nedokumentované JSON, beží na Parka) | 04 | **180 kempov (154 viditeľných)**: GPS, ceny 2026 ako text (131/154 s parsovateľnou cenou dospelý, elektrina, daň 400 ISK), otvorenie (39 celoročne, texty typu „do 15. 9."), služby (elektrina, sprchy, práčovňa, kuchyňa), `bookable_with_parka`, `accepts_drop_in`, popis EN/IS, web, telefón | zadarmo, bez kľúča | overené 20. 9. 2026 (1,9 MB JSON); parser cien regex + ručný override; ≤ 1 req/deň (cache) | ★★★★ | seed kempy | 7 d |
| **parka** – `tjalda.is/api/parkings` (Parka platobný systém) | 05, 06 | **102 parkovísk s oficiálnymi cenníkmi**: atrakcie (Reynisfjara 1 000, Skógafoss 1 000, Jökulsárlón 1 110, Stuðlagil, Múlagljúfur, Kvernufoss, Fjaðrárgljúfur, Dyrhólaey, Geysir, Gullfoss, Skaftafell, Hverfjall, Hvítserkur, Dynjandi, Brúarfoss, Reykjadalur, Sólheimajökull, Sólheimasandur…) po kategóriách vozidla, KEF/ISAVIA parkoviská, mestá | zadarmo, bez kľúča | overené 20. 9. 2026; Þingvellir a Seljalandsfoss majú vlastný systém → seed | ★★★★ | seed parkovné | 7 d |
| **tjalda-geo** – `tjalda.is/api/{hot_springs,waterfalls,grocery_stores}` (GeoJSON z OSM) | 05, 06, 07 | 127 horúcich prameňov, 761 vodopádov, 254 obchodov/čerpačiek s tagmi a otváracími hodinami | zadarmo | duplikuje Overpass, ale bez limitov a už prefiltrované pre Island | ★★★★ | overpass | 30 d |
| ~~Hotellook~~ | – | **zrušený 10/2025** (odkazy presmerované na Booking) | | | ✗ | | |
| ~~Booking Demand API~~ | (v2) | len pre schválených affiliate partnerov (Awin/CJ, treba živý web s obsahom) – skúsiť neskôr | affiliate | | ★ | | |
| **overpass** – Overpass API (`tourism=camp_site|hostel|guest_house|hotel`, `amenity=fuel`, `shop=supermarket`) | 04, 05 | kempy, ubytovanie (bez cien), čerpačky, Bónus/Krónan, WC v okolí trasy | zadarmo, open data | ≤ 1 req/s, fair use; dotazy po regiónoch, nie po bodoch | ★★★★ | seed | 30 d |
| **nominatim** | 01, 06 | geokódovanie domova a vlastných miest | zadarmo | 1 req/s, User-Agent | ★★★★ | – | ∞ |
| **osrm** – `router.project-osrm.org` demo | 01, 05 | km/čas medzi bodmi | zadarmo, **≤ 1 req/s, nekomerčné, bez SLA** | | ★★★ | ors | ∞ (`route_cache`) |
| **ors** – OpenRouteService Directions/Matrix | 01, 05 | to isté | zadarmo, API kľúč, ~ 2 500 req/deň | | ★★★★ | haversine × 1,25 | ∞ |
| **openfreemap** – vektorové dlaždice (MapLibre) | Mapa | podklad OSM | zadarmo, **bez limitov a bez kľúča** | | ★★★★ | MapTiler free | – |
| **gasvaktin** – `github.com/gasvaktin/gasvaktin` → `vaktin/gas.json` | 03 | ceny benzín 95 / diesel po staniciach, aktualizácia každých 15 min | zadarmo, open data (raw GitHub) | | ★★★★ | seed | 7 d |
| **frankfurter** – `api.frankfurter.dev/latest?from=EUR&to=ISK` | 08 | kurz ECB | zadarmo, bez kľúča, bez limitu | denne ~ 16:00 CET | ★★★★★ | seed | 24 h |
| **open-meteo** | 05, Mapa | predpoveď (teplota, vietor, zrážky) po dňoch/bodoch | zadarmo nekomerčne, < 10 000/deň | | ★★★★ | – | 6 h (od −7 dní) |
| **drone-zones** – oficiálna mapa Samgöngustofa `kort.gis.is/mapview/?app=dronar` (LMÍ) | 05, 06, Mapa | zóny obmedzení dronov | open data cez mapový server (ArcGIS/WMS – **overiť pri implementácii**, inak seed polygóny z docs/07) | | ★★★ | seed GeoJSON | 30 d |
| **roads** – umferdin.is / road.is (bez dokumentovaného API) | 05 | stav ciest, F-cesty | len odkaz + ručná kontrola; v2 scraping | | ★ | – | – |
| **suncalc** | 05 | východ/západ | lokálne | | ★★★★★ | – | – |
| **seed** (docs/07) | všetky | POI, ceny vstupného, kempy, vozidlá, parkovanie, batožina, strava, dron pravidlá | v repo, `verified_at` | | ★★★ | – | ručne |

## Čo z toho vyplýva pre kroky

| Krok | Živé dáta | Odhad/seed | Ručne |
|---|---|---|---|
| 01 | km na letiská (osrm/ors), geokód (nominatim) | parkoviská, busy | – |
| 02 | kalendár mesiaca (tp-flights), Ryanair segmenty, Wizz KTW/BUD, **overenie pre 4 os. (gflights)** | batožina (rozsahy) | let ručne |
| 03 | palivo (gasvaktin), km (z 05) | vozidlá a poistenia (seed + odkazy) | vozidlo ručne |
| 04 | **kempy s cenami, otvorením a službami (tjalda)**; ubytovanie bez cien (overpass) | €/noc per región (izby) | **izby/Airbnb s cenou vždy ručne** (Booking/Airbnb link) |
| 05 | trasa (osrm/ors), počasie, slnko, obchody/čerpačky/pramene/vodopády (tjalda-geo, overpass), **parkovné (parka)**, dron zóny | presety, POI | zastávky |
| 06 | **túry (viator)**, **parkovné (parka)** | vstupné (seed) | ceny override |
| 07 | – | ceny jedla (seed) | ceny override |
| 08 | kurz (frankfurter) | – | položky |

**Najslabšie miesto sú izby/Airbnb** (vetva Auto) – bez bezplatného API s cenami; **kempy (vetva Karavan) majú živé ceny z tjalda**. Riešenie: odhad z regiónu, kým používateľ nevloží 1 ponuku
(3 kliky: otvoriť predvyplnený Booking/Airbnb link → skopírovať cenu → vložiť); cron potom cenu nesleduje (nie je odkiaľ) –
sleduje len storno termín. Ak sa neskôr podarí Booking affiliate cez Awin, konektor `booking` nahradí `lodging-manual` bez zmeny UI.

## Reálne letecké spojenia do KEF z regiónu (09/2026 – overiť pred kúpou)
- **Priame:** Wizz Air **KTW–KEF** (ut, št, so, ne) a **BUD–KEF**; VIE–KEF Wizz ukončil 04/2025; PLAY skončil 09/2025; z BTS a PRG priamo nič.
- **Self-transfer huby:** Londýn (STN/LTN/LGW – Ryanair/Wizz z regiónu + easyJet/Icelandair do KEF), Berlín (Ryanair/easyJet + easyJet do KEF), Kodaň/Amsterdam/Zürich/Mníchov (Icelandair), Dublin (Ryanair + Icelandair). Min. prestup 3 h, batožina znova.
- Dôsledok pre krok 02: heatmapa má pre KTW a BUD priame ceny (wizz/tp-flights), pre VIE/BTS/PRG prakticky len kombinácie → optimalizátor zohľadní cestu BA→KTW (320 km) vs. lacnejšia letenka.

## Cache, keep-alive a cron (Vercel Hobby + Supabase Free)
- `provider_cache(key, connector_id, payload, fetched_at, expires_at)` v Postgres; `route_cache` navždy.
- Vercel Hobby: až 100 cron jobov, ale **len 1× denne** (čas ± 1 h). Jeden job `/api/cron/daily`: kurz → palivo → overenie vybraných letov (gflights) → túry (viator) → snapshoty → e-mail → **keep-alive dotaz do Supabase** (free projekt sa pauzuje po 7 dňoch nečinnosti).
- Vyhľadávanie mesiaca (5 letísk × 30 dní) sa spúšťa používateľom, nie cronom; streamuje sa (SSE) do zoznamu.

## Právne
- Neoficiálne konektory (ryanair, wizz, gflights): osobné použitie, ≤ 1 req/s, identifikovaný User-Agent, feature flag; pri blokovaní automaticky fallback.
- Žiadny scraping Airbnb/Booking. OSM/OpenFreeMap atribúcia povinná. Open-Meteo a OSRM demo iba nekomerčne (aplikácia je súkromná).

## Zdroje overenia (20. 9. 2026)
Travelpayouts Flight Data API v1 (travelpayouts.github.io/slate) · Travelpayouts help (deprecation starého API 15. 6. 2026, MAU 50k len pre Search API) · Ryanair endpointy (gist vool, overené 4. 9. 2026) · Wizz rotujúca verzia (GitHub MikkoParkkola/trvl #115) · Wizz KEF: wizzair.com Katowice/Budapest–Reykjavik, reykjavik-airport.com (KTW ut/št/so/ne), flightmapper KEF–VIE (posledný let 7. 4. 2025) · Amadeus decommission 17. 7. 2026 (GitHub issue + developers.amadeus.com/pricing) · Kiwi Tequila invite-only · Hotellook FAQ on closure (support.travelpayouts.com) · Booking Affiliate (partnerships.booking.com, Awin/CJ) · Viator Partner API docs (docs.viator.com/partner-api/affiliate) · GetYourGuide requirements (100k visits) · fast-flights (github AWeirdDev/flights, 08/2026) · OpenFreeMap (openfreemap.org) · OSRM demo policy (github wiki) · ORS plans (account.heigit.org) · gasvaktin (github) · island.is/en/drone-map → kort.gis.is · utilegukortid.is Camping Card 2026 (do 15. 9., ~ 26 000 ISK, 30 kempov, max 4 noci/kemp) · tjalda.is/api/campsites + /api/parkings (vlastné overenie curl, 20. 9. 2026) · Vercel cron limits (vercel.com/docs/cron-jobs) · Supabase project pausing docs · frankfurter.dev · open-meteo.com/en/terms.
