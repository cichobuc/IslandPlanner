# Log rozhodnutí (ADR)

Formát: kontext → rozhodnutie → dôsledky. Nové záznamy pridávať na koniec.

## ADR-001 · Next.js + Vercel + Supabase (2026-09-20)
**Kontext:** hosting zadarmo, jedna codebase pre iPad/Mac, potreba schovať API kľúče, auth a zdieľanie medzi používateľmi.
**Rozhodnutie:** Next.js 15 App Router na Vercel Hobby; Supabase Free (Postgres, Auth magic link, Storage); Drizzle ORM.
**Alternatívy:** SvelteKit + Cloudflare (menej ekosystému pre mapy/PDF), Expo (natívne, ale dve codebase), čisto lokálna SQLite app (bez zdieľania).
**Dôsledky:** limity Hobby (1 cron/deň, 10 s funkcie) → streamovanie vyhľadávania, cache v Postgres. Supabase pauza po neaktivite → keep-alive v crone.

## ADR-002 · Engine ako čisté funkcie, beží klient aj server (2026-09-20)
**Kontext:** prepočet musí byť okamžitý (< 200 ms) a deterministický, testovateľný.
**Rozhodnutie:** `src/engine` bez IO, vstup `TripSnapshot`, výstup `BudgetResult`; server ho volá pri zápise, klient pri každej zmene UI.
**Dôsledky:** duplicitný výpočet (klient/server) je zámerný; jediný zdroj pravdy pre uložené hodnoty je server.

## ADR-003 · Letenky: Travelpayouts v1 kalendár + Google Flights overenie (2026-09-20, revidované po overení zdrojov)
**Kontext:** žiadne oficiálne API Ryanair/Wizz; Amadeus free tier zrušený (07/2026), Kiwi len na pozvanie; používateľ nechce platiť.
**Rozhodnutie:** `tp-flights` (Flight Data API v1) ako základ kalendára; `wizz` (KTW/BUD priame) a `ryanair` (segmenty do hubov) za feature flagom; **`gflights` (fast-flights) na overenie ceny pre 4 os.** pred uložením; manuálny vstup vždy.
**Dôsledky:** ceny v kalendári sú cache; UI vždy zobrazuje vek ceny a pôvod; Python function na Verceli pre gflights.

## ADR-004 · Ubytovanie bez cenového API: ručne + odhad z regiónu (2026-09-20, revidované)
**Kontext:** Airbnb bez API; Hotellook zrušený 10/2025; Amadeus 07/2026; Booking Demand API len pre schválených affiliate partnerov (treba živý web).
**Rozhodnutie:** Overpass na zoznam ubytovaní/kempov (bez cien), seed odhad €/noc per región, predvyplnené Booking/Airbnb/tjalda linky + ručný záznam 1 ponuky na noc. Konektorové rozhranie umožní neskôr pridať `booking` bez zmeny UI.
**Dôsledky:** kategória Ubytovanie je „odhad", kým sa nevloží ponuka; cron ubytovanie nesleduje.

## ADR-005 · Mapa: MapLibre + OpenFreeMap (2026-09-20)
**Kontext:** OSM raster dlaždice majú prísnu usage policy; MapTiler má limit.
**Rozhodnutie:** vektorové dlaždice z OpenFreeMap (bez limitu), vlastný tmavý štýl; MapTiler ako záloha; offline cache pre trasu.
**Dôsledky:** štýl treba udržiavať; atribúcia OSM povinná.

## ADR-006 · Doprava ako rozhodnutie s vetvami (2026-09-20, revidované)
**Kontext:** používateľ nevie, či auto alebo karavan; rozdiel ovplyvňuje ubytovanie, stravu, palivo; chce, aby kroky nadväzovali.
**Rozhodnutie:** krok 03 = voľba Auto / Karavan / Bez auta s odhadom celej cesty pri každej; voľba určuje typ krokov 04 a 05; dáta všetkých vetiev sa uchovávajú (`scenario_key`), prepnutie nič nemaže; odhady sa prepočítavajú samy (s Vrátiť), ručne priradené veci sa len navrhnú.
**Dôsledky:** žiadny globálny prepínač scenára; porovnanie je riadok v kroku 03; viac dát na noc, ale nič sa nestráca.

## ADR-007 · Šablóny ako kópia (fork), nie odkaz (2026-09-20)
**Kontext:** používateľ chce ukladať trasy/konfigurácie pre ostatných, ktorí si ich upravia.
**Rozhodnutie:** šablóna = normalizovaný JSON payload; fork skopíruje do cesty; originál sa mení iba autorom; POI referencované slugom.
**Dôsledky:** zmeny v šablóne sa nepropagujú do forkov (zámerne); verzie šablóny sú explicitné.

## ADR-008 · Dron ako vrstva dát POI + zóny GeoJSON (2026-09-20)
**Kontext:** používateľ zvažuje dron; pravidlá sú roztrieštené (EASA, Samgöngustofa, Umhverfisstofnun, parky, súkromné zákazy).
**Rozhodnutie:** `drone_status` na POI + `drone_zones` polygóny; zóna má prednosť pred POI; pravidlá a checklist ako seed obsah s dátumom overenia; používateľ môže nahlásiť zákaz.
**Dôsledky:** dáta nikdy nebudú 100 % – UI to musí komunikovať („overiť značky na mieste").

## ADR-009 · Sezónnosť a návštevnosť ako číselné polia POI (2026-09-20)
**Kontext:** používateľ chce vedieť, kedy sa čo oplatí, a chce aj menej známe miesta.
**Rozhodnutie:** `month_rating[1..12]`, `best_months`, `popularity 1–5`, `hidden_gem`; generátor ich používa ako váhy; slider „davy ↔ klenoty".
**Dôsledky:** seed dáta vyžadujú kurátorstvo; hodnoty sú subjektívne, ale konzistentné v rámci katalógu.

## ADR-010 · Jedna obrazovka cesty ako checklist, jeden riadkový vzor (2026-09-20)
**Kontext:** prvý návrh mal 12 stránok s rôznymi layoutmi; používateľ chce „viac zoznamovo a jednotne".
**Rozhodnutie:** 3 obrazovky (Cesty · Cesta · Mapa overlay) + sheety. Cesta = 8 krokov ako karty zhora dole, každý krok = filtre (chipy) + zoznam `ListRow` + päta. Kalendár leteniek ostáva ako filter nad zoznamom. Mapa jedna, cez celú obrazovku.
**Dôsledky:** menej komponentov (StepCard, ListRow, Sheet, MapOverlay), jednoduchšia navigácia (URL `#krok-N`), dlhá strana → sticky hlavičky krokov; dashboard zaniká (hlavička Cesty ho nahrádza).

## ADR-011 · Konektory overené voči realite 09/2026 (2026-09-20)
**Kontext:** používateľ chcel prehodnotiť pripojenia od nuly. Overené webom: Amadeus self-service zrušený, Hotellook zrušený, Kiwi invite-only, starý Travelpayouts Data API vypnutý, Wizz VIE–KEF skončil, Camping Card len do 15. 9., Viator affiliate API bez limitu, fast-flights aktívny.
**Rozhodnutie:** jednotné rozhranie `Connector` (cache, TTL, health, fallback, legal) pre všetky zdroje; katalóg v docs/04 s dátumom overenia a zdrojmi; tabuľka Stav zdrojov v UI; každý typ dát má `manual` konektor.
**Dôsledky:** izby/Airbnb sú jediná kategória bez živých cien; kempy (tjalda) a parkovné atrakcií (parka) majú živé oficiálne ceny; letenky majú 3 vrstvy (kalendár → priame Wizz → overenie Google Flights); túry majú živé ceny (viator).

## ADR-012 · Kontá s dočasným heslom, profil, návrh mesiaca, Ja/Skupina, delenie nákladov, Vziať z domu (2026-09-20)
**Kontext:** používateľ chce zakladať kontá s dočasným heslom (nie magic link), profil s preferenciami a oprávneniami (bez platobných údajov), mesiac navrhnutý podľa preferencií (nie pevný september), výpočet za každého zvlášť a potom pre skupinu, správne delenie skupinových nákladov (1 auto na letisko z BA) a modul, čo sa oplatí priviezť z Bratislavy.
**Rozhodnutie:** Supabase e-mail + heslo, správca zakladá kontá cez service role s `must_change_password`; tabuľka `profiles`; engine `monthSuggest`, `groupPlan` (Ja/Skupina + kompromisy), `split` (group/vehicle/person), `bringFromHome` so seed `bring_items` a colnými limitmi; krok 01 dostal sekciu Mesiac; hlavička prepínač Ja/Skupina.
**Dôsledky:** viac dát v profile (jednorazový formulár), ale kroky 01–08 sú predvyplnené; jedna skupinová cesta + „Ja“ cesty na porovnanie; magic link zrušený (ADR-001 auth časť revidovaná).

## ADR-013 · Audit: predpočítaná matica trás, is_manual, concurrency, tz, jeden návrhový sheet, MVP (2026-09-20)
**Kontext:** oponentský audit (docs/09) našiel 6 vecí, ktoré by app položili, a rozsah ~110 večerov vs. termín letenky máj 2027.
**Rozhodnutie:** `route_matrix` seed (ORS Matrix offline) namiesto živého OSRM pri generovaní; `is_manual` na riadkoch a kaskáda mení len odhady; optimistic concurrency cez `updated_at`; tz na všetkých časoch; `itinerary_days.scenario_key`; „Ja" ako neukladaný náhľad; jedna akcia „Navrhnúť cestu pre všetkých" (cena ↔ preferencie); spike pokrytia tp-flights ako prvá úloha M2; **MVP ≤ 50 večerov do februára 2027**, zvyšok v1.1/v1.2.
**Dôsledky:** seed obsahuje maticu (~ 80×80); niektoré funkcie (mesiac, Ja/Skupina, Vziať z BA, CS, dron mapa) idú až po MVP.
