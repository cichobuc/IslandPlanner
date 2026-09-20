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

## ADR-014 · Poradie krokov: 03 Doprava → 04 Itinerár → 05 Kde spať (2026-09-20)
**Kontext:** používateľ pri testovaní: „prečo najprv počíta palivo a ešte pred trasou kempy?“ Pôvodné poradie (04 Kde spať → 05 Itinerár) stálo na tichej kostre trasy po kroku 02; pre používateľa to bolo neintuitívne – vyberal noci do regiónov, ktoré ešte nevidel na mape.
**Rozhodnutie:** kroky 04 a 05 vymenené: **04 Itinerár** (trasa určí, kde ktorý deň končí), **05 Kde spať** (izby/kempy presne na miesta nocí). Krok 03 ďalej počíta palivo z kostry trasy ako *odhad* (potrebný na férové porovnanie Auto vs. Karavan) a prepočíta sa po kroku 04. Kostra trasy po kroku 02 ostáva (noci a regióny existujú hneď, krok 04 ich len upresní). Súbory komponentov ostávajú (`step04*` = Kde spať, `step05*` = Itinerár), mení sa číslovanie v UI, Postupe a docs.
**Dôsledky:** pri karavane môže dostupný kemp ovplyvniť koniec dňa → v kroku 05 pôjde región noci prepísať a itinerár dostane návrh (v1.1); docs/obrazovky krok-4/krok-5 majú nové čísla v hlavičke, názvy súborov sa nemenili.

## ADR-015 · Rozpočet na atrakcie: hviezdičky, mešec na cestu, jeden „veľký zážitok“ (2026-09-20)
**Kontext:** používateľ chce nastaviť, aké drahé atrakcie chce, „ohodnotené hviezdičkami, ale múdro“.
**Rozhodnutie:** každé POI má hviezdičky kvality 1–5 (`popularity` v seede = „oplatí sa vidieť“) a vstupné dospelého v EUR; **hodnota za peniaze** = hviezdičky na 10 €/os. Úroveň na ceste `trips.attraction_budget`: **free · budget (12 €/os/deň) · balanced (35) · unlimited**. Generátor: (a) zadarmo miesta nie sú dotknuté, (b) platené majú v skóre penalizáciu λ × cena (úsporne 0,06/€, vyvážene 0,025, bez limitu 0,005), (c) **mešec na celú cestu** = limit × dni × osoby – aby sa dalo „našetriť“ na jednu drahú vec, (d) **jeden 5★ zážitok so záujmom skupiny smie mešec prekročiť** (nie pri „úsporne“). UI: chipy v kroku 04, hviezdičky + cena/os + štítok „oplatí sa / drahé“ + **lacnejšia alternatíva** (`cheaper_alternative_poi_id`, napr. Blue Lagoon → Secret Lagoon, Sky Lagoon → Laugardalslaug, Mývatn Baths → Hofsós) v kroku 06 a v detaile.
**Dôsledky:** rozhodnutie je vysvetliteľné jednou vetou („5★ za 86 € = 0,6★ na 10 €; Secret Lagoon 4★ za 30 € = 1,3“); hviezdičky sú kurátorské, nie recenzie – neskôr sa dajú nahradiť priemerom z hodnotení členov.

## ADR-016 · Vlastný limit na atrakcie, krok 06 bez duplikátu kroku 04, reálne ceny izieb (2026-09-20)
**Kontext:** používateľ po prejdení celej aplikácie: (1) chce presne nastaviť, koľko dať na atrakcie – aj pri generovaní; (2) krok 06 opakoval celý zoznam zastávok z kroku 04; (3) ceny ubytovania boli „extrémne poddimenzované“; (4) okruh „tam a späť“ dával posledný deň 6 h jazdy z Höfnu na KEF.
**Rozhodnutie:**
- **Limit na atrakcie = € na osobu za celú cestu** (`trips.attraction_budget_pp_eur`), má prednosť pred úrovňami z ADR-015 (chipy ostávajú ako predvoľby). Mešec = limit × osoby; penalizácia ceny v skóre je pri vlastnom limite **polovičná** oproti interpolovanej úrovni (inak 200 €/os skončilo na ~90 €). Prepínač `attraction_splurge` (jeden 5★ zážitok nad limit). Rovnaký panel „Koľko míňať“ s priebehom „v pláne vs. limit“ v kroku 04 (pred generovaním) aj 06.
- **Krok 06 = peniaze**: len platené miesta (vstupné/os podľa veku, hodnota za peniaze, rezervácia), parkovné jedným riadkom, zadarmo zastávky jedným riadkom s odkazom na 04; **Vymeniť** za lacnejšiu alternatívu (ak je v inom regióne, zastávka sa presunie do dňa, ktorý tam nocuje/odtiaľ vyráža). Zoznam všetkých zastávok s časmi je len v kroku 04.
- **Izby**: seed prepísaný na reálne rozpätia 09/2026 (penzión 2 izby 280–460 €, Airbnb 240–400, hostel 170–260, hotel 380–620 podľa regiónu) + **sezónny faktor podľa mesiaca noci** (júl/aug 1,3, zima 0,75); kempy +10–15 %. V kroku 05 chipy „štandard pre odhadované noci“ (hostel/penzión/Airbnb/hotel → `kind_override` všetkých nocí bez ponuky).
- **Okruhy tam a späť** (`south_only`, `south_east`) majú poslednú noc späť na juhu (Vík ~ 2,5 h od KEF), nie v Höfne; `regionsBetween` ide **kratším smerom** po okruhu (návrat z juhovýchodu cez juh, nie okolo ostrova) – dovtedy generátor na návratový deň nevidel POI na juhu. Posledný deň si pri skorom odlete **posunie odchod skôr** (najskôr 05:00) namiesto varovania „príchod po limite“.
- Drobné duplicity: rezervný deň má jeden štítok; krok 07 chip vetvy bez sumy (rozdiel druhej vetvy je v „Čo z toho vyplýva“ ako ±); štítky nocí v rozpočte/tlači po slovensky.
**Dôsledky:** staré cesty majú `attraction_budget_pp_eur = null` (správajú sa podľa úrovne); odhady nocí narastú ~1,5×, presné ponuky sa nemenia.
