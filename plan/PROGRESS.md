# Denník postupu

## 2026-09-20 · Návrh
- Zadanie od používateľa + 12 upresňujúcich otázok (rok flexibilný, Bratislava, 3–4 dospelí, bezplatné API, self-transfer, porovnanie scenárov, Vercel+Supabase zadarmo, iPad, okruh podľa ceny, všetky záujmy, úsporná strava, tmavý aurora dizajn, magic link + zdieľanie, denný cron + e-mail, SK+CS).
- Doplnené požiadavky počas práce: šablóny trás/konfigurácií pre ostatných používateľov + editovateľnosť všetkého + história; popis/vstupné/trvanie pri každej atrakcii; dron (zóny, pravidlá, checklist); menej známe miesta; sezónnosť.
- Napísané: README, docs 01–07, stránky 00–12, plán, backlog, ADR.
- Dizajn: Claude Design canvas https://claude.ai/artifact/HYKyfB8V1VcKnJiuc9iNx7 (artboardy tablet + mobil).

- Prerobené na jednotný zoznamový vzor (3 obrazovky + 8 krokov + sheety) podľa spätnej väzby; staré `docs/stranky/` nahradené `docs/obrazovky/`; dizajn nakreslený nanovo.

- Vetvenie v kroku 3 (Auto / Karavan / Bez auta → 04 Ubytovanie/Kempy/Základňa, 05 Itinerár/Výlety), reťazenie krokov (vstupy, „Pokračovať → 0N").
- Prechod krok po kroku: zlepšenia a checklisty v každom `krok-*.md`, súhrn v `docs/08-prechod-a-checklisty.md`, doplnený dátový model a engine (reálne časy jazdy, noc 1/posledná, timeline platieb, balenie).
- Dizajn v3: svetlý editorial (používateľ nechce tmavý ani „AI glass").

- Konektivita overená od nuly (web, 20. 9. 2026): docs/04 prepísané ako jednotný katalóg konektorov; odstránené Amadeus/Hotellook/Kiwi; pridané gflights (overenie pre 4 os.), viator (túry), gasvaktin (palivo), oficiálna dron mapa; Camping Card do 15. 9.; jednotná terminológia v celej dokumentácii (ADR-011).

- Doplnené: kontá s dočasným heslom + profil preferencií (00a), návrh ideálneho mesiaca, režim Ja/Skupina s kompromismi, delenie skupinových nákladov (1 auto z BA), modul „Vziať z Bratislavy“ so seed cenami a colnými limitmi (ADR-012).

- Dizajn v4 „Liquid Glass × Island" (overené UI trendy 2026) → v5 „Cesta ako trasa": spine so stanicami, jeden otvorený krok s časťami Vstupy → Voľba → Vyplýva, hero „Odhad celej cesty", obrazovka „Ako to funguje". 9 artboardov.

- Dizajn v6: po vykreslení v Playwrighte (v4/v5 vyzerali ako generický SaaS so sklom) prerobené na čisté produktové UI – Postup vľavo, obsah kroku vpravo; každý artboard skontrolovaný ako PNG (`scratchpad/pw/shots`).

- Audit celého návrhu (docs/09): 6 kritických opráv (route_matrix, pokrytie leteniek spike, gflights fallback, itinerár per vetva, concurrency, is_manual), 12 dôležitých, MVP do 02/2027 (~50 večerov), plný rozsah ~110.

- Repo https://github.com/cichobuc/IslandPlanner založené, prvý commit = celý návrh (32 súborov).

## 2026-09-20 · Deň 2
- **Blok 2.1 hotový** – design system v6 v kóde: tokeny (globals.css + `--shadow-sheet`), `src/lib/format.ts` (sumy „4 680 €“, /os, rozsah),
  komponenty `src/components/ui/`: TopBar (+ModeToggle Ja/Skupina, avatary), Stepper (Postup) + ProgressBar (iPhone), TripSummary (Odhad cesty) + StepAmount,
  StepHead/StepFooter, StepSection/Label/Card, Chip/ChipRow, Tag, Tile, ListRow/ListCard (58 px, vybraný, vnorený; na telefóne akcia pod meta),
  OptionCard/OptionGrid (Auto/Karavan/Bez auta; na telefóne kompaktne), ResultsCard („Čo z toho vyplýva“), Sheet/SheetRow (zdola, ≥ 1024 pravý panel 420),
  TripLayout/PhoneHeader/StickyBar, IslandMark/RingMap (obrys z artboardu), Avatar; `Button` má `icon` a `ButtonLink`; ikony `lucide-react`.
  `/dev/ui` = krok 03 podľa artboardu Main + katalóg; verejné len mimo produkcie. Skontrolované Playwrightom (`tests/e2e/ui-kit.mjs`) na iPad 820 / iPhone 390 / Mac 1280 + sheet.
  Poučenia: Tailwind 4 neprepisuje triedy podľa poradia v `className` (px-0 vs px-[18px], bg-white vs bg-ok-fg) → podmienené triedy, nie prepisovanie; žiadny `<button>` v `<button>` (hydration).
- **Blok 2.2 hotový** – `src/features/trips/` (progress + testy, access cez `trip_members` v kóde, queries, server actions: createTrip bez wizardu, add/role/remove člena, rename).
  `/` = Cesty (prihlásený: AppBar, riadky ciest s avatarmi a n/8, „Z šablóny“ stub v1.1; neprihlásený: landing), `/ako-to-funguje` (8 dlaždíc, CTA podľa stavu),
  `/cesta/[id]` kostra v6 (TopBar s členmi, Postup z `tripProgress`, premenovanie v sheete), `/cesta/[id]/clenovia` (pridať existujúce konto = člen + cestujúci z profilu; rola; odobrať; len vlastník).
  e2e `tests/e2e/trips-flow.mjs`: 4 členovia, 4 cestujúci v DB, člen nespravuje členov, editor premenuje. Poučenia: `trips_add_owner_member` trigger už pridáva vlastníka; `trips.owner_id` bez kaskády → test cleanup maže najprv cesty; ListRow nikdy nerenderovať `action` dvakrát (grid areas).
- Požiadavka používateľa (20. 9.): v bloku 2.7 **reálna OSM mapa** (MapLibre) s bodmi trasy – tooltip pri hoveri, klik otvorí sheet/rozbalí riadok. Zapísané v SPRINT-2-DNI 2.7.
- **Blok 2.3 hotový** – obrazovka Cesta s výberom kroku `?krok=N` (predvolene prvý nehotový; nová cesta → 01), PhoneHeader + StickyBar na telefóne.
  **Krok 01** (`src/features/trips/steps/step01*.tsx`, akcie `step01-actions.ts`): cestujúci z profilov členov + ručne (sheet: meno, dátum/vek, vodič od roku, kreditka, batožina 4 steppery, kufor vo dvojici – symetricky), štítky (člen/ručne, vodič < 20, bez kreditky);
  domov + 5 letísk zo seedu s prepínačom (→ `trips.origin_airports`), riadok = km · čas · 1 auto pre ≤ 4 · najlacnejšie parkovanie na (dni+1) · známka · priamy Wizz / cez hub, suma skupina + /os (`airport-access.ts`, zdieľané so search-service);
  „Kedy a ako": mesiac ‹ ›, dĺžka 3–21, prestupy, tempo, záujmy, cieľový rozpočet; predvolený názov „Island · <mesiac>" sa premenúva s mesiacom. „Čo z toho vyplýva" → 02.
  e2e `tests/e2e/step01-flow.mjs` (iPad + iPhone). Poučenia: render-prop zo server → client komponentu nejde (riadok cestujúceho je klient); `z.coerce.number()` z '' robí 0 → `optInt/optNum` s preprocess.
- **Blok 2.4 hotový** – **krok 02 Letenky**: `snapshot.ts` (DB → `TripSnapshot` a späť: `persistFlightCascade` zapisuje dátumy, preset, kostru dní scenára `drive` a noci per vetva car/camper; zamknuté dni a ručné noci ostávajú),
  `step02-actions.ts` (výber kombinácie / ručný let / zrušenie – všetko cez `applyFlightSelection`), `steps/step02*.tsx`: auto vyhľadávanie cez SSE `/api/flights/search` s progresom per letisko,
  kalendár-heatmapa (min. cena per deň odletu, 4 kvantilové pásma, ⚡ najlacnejší deň, /os · skupina, klik = filter), chipy letísk / len priame / radenie, zoznam kombinácií (rozpis letenky · batožina · park. · cesta, štítky API/odhad/self-transfer),
  pripnutá karta vybraného letu (deep link „Overiť cenu u predajcu“, zrušiť), sheet ručného letu, DiffToast so zmenami kaskády. e2e `tests/e2e/step02-flow.mjs` (živé konektory: 200 kombinácií, výber → 18.–25. 9., 8 dní, 7 nocí × 2 vetvy, preset ring; ručný let → 12.–21. 9.).
  Stub: `verify` pre 4 os. (gflights konektor neexistuje) = deep link; „Vrátiť“ v DiffToaste príde s históriou (v1.1).
- **Blok 2.5 hotový** – **krok 03 Doprava**: `rates.ts` (kurz frankfurter EUR→ISK + palivo gasvaktin cez cache, fallback seed – živé: 268,5/304,3 ISK/l), `step03-actions.ts` (voľba vetvy → `trips.transport_mode`; výber vozidla per `scenario_key` s predvolenými poisteniami SCDW+GP a 2. vodičom; prepínanie poistení/extras; ručné vozidlo per cesta),
  `steps/step03*.tsx`: karty Auto/Karavan/Bez auta (v1.1, zakázaná) s `estimateBranch` + letenky, chipy vstupov (dni prenájmu z letu, pickup/return, vodiči + vek, kreditka, km z itinerára/presetu), triedy, riadky vozidiel zo seedu (`transportCost`: prenájom + poistenie + extras + palivo ×1,05 + tunel Vaðlaheiði pri Ring),
  vnorené Poistenie (checkboxy ukladajú hneď) · Extras · Požiadavky (`vehicleChecks`), Palivo, Tunel; „Čo z toho vyplýva“ (krok 04 = Ubytovanie/Kempy, kuchynka). Prepnutie vetvy premenuje kroky 04/05 v Postupe; dáta druhej vetvy ostávajú (e2e: car=Kia, camper=VW Caddy).
  `OptionCard` má `submit` (odošle obklopujúci form). e2e `tests/e2e/step03-flow.mjs`.
- **Hotfix DB (kritické)** – produkcia padala (`EMAXCONN`) a potom náhodne visela: (1) `getDb()` v produkcii otváral nový pool pri každom volaní; (2) postgres.js cez Supavisor (port 6543) **zamrzne, keď sa dotazy radia do fronty nad `max`** (reprodukované samostatne: max 2 + 8 dotazov → 2. kolo TIMEOUT; max 10 OK; `pg` 25 kôl OK).
  Riešenie: Drizzle na `drizzle-orm/node-postgres` (`pg` Pool, jeden na proces, max 2 v produkcii / 5 lokálne). `apply-sql.ts` a e2e skripty ostávajú na `postgres` (jedno spojenie, bez fronty).
- **Blok 2.6 hotový** – **krok 04 Kde spať**: `step04-actions.ts` (vložiť ponuku Booking/Airbnb → `lodging_options` per cesta + priradenie; priradiť kemp tjalda/seed; noc späť na odhad / bez ubytovania / kuchynka; Camping Card na vozidle vetvy Karavan),
  `steps/step04*.tsx`: noci vetvy s regiónom z trasy, rozpätie zo seedu (`stayCost`), predvyplnené Booking/Airbnb linky (miesto per región, dátumy, hostia), kempy z **tjalda (živé, 154 kempov)** + seed POI mapované na región podľa najbližšieho centroidu, otvorenie k dátumu noci, `campingCardDecision`, `lodgingWarnings` (prílet po 20:00, odlet pred 10:00, zatvorené), súčet + podiel odhadov + kuchynka → 07.
  e2e `tests/e2e/step04-flow.mjs` (Auto: ponuka + noc bez ubytovania; Karavan: kemp tjalda priradený, Camping Card zapnutá).
- **Blok 2.7 hotový** – `route_matrix` z verejného **OSRM table** (49 bodov: 36 POI/kempy + 12 centroidov regiónov + KEF, 2 352 dvojíc, `seed/route_matrix.json`, `pnpm matrix:build`; ORS kľúč nie je), engine `src/engine/itinerary.ts` (čistý generátor: deň = prenocovanie → prenocovanie, kandidáti v regiónoch po ceste, skóre popularita + záujmy + sezóna + klenoty, kapacita tempa, jazda × 1,25 + 10 min/zastávku, zamknuté/ručné zastávky ostávajú; 7 testov),
  `step05-actions.ts` (Generovať, + zastávka, odstrániť, zamknúť deň, prepočet km → palivo v 03), `itinerary-data.ts` (dni/zastávky so vstupným podľa veku, noci, katalóg, geometria z OSRM `route` cez nový konektor `osrm` s cache 30 d),
  **krok 05** (dni → vnorené zastávky s jazdou, noc, varovania, katalóg na pridanie, sheet zastávky podľa artboardu), **krok 06** (v pláne + katalóg s „+ Deň N“, filtre typ/klenoty),
  **Mapa** `/cesta/[id]/mapa` – MapLibre GL 5 + OpenFreeMap Liberty: trasy dní po cestách (aktívny deň modrý), číslované zastávky, zelené noci, katalóg (vrstva), **tooltip pri hoveri, klik → spodný riadok + Detail sheet**, ‹ › dni, `?den=&poi=`; `/dev/mapa` ukážka bez prihlásenia.
  Poučenia: MapLibre 6 (module worker) v Next dev nefunguje → v5; React strict mode dvojité mount rozbije zdieľaný worker pool → mapu vytvárať odložene (setTimeout 0 + zrušenie); maplibre prepíše `position` kontajnera (vnútorný div h-full). Seed: +3 veľké obytné autá (Happy 4, Sunlight T69, Kuku Casper) na žiadosť používateľa.
  Stub: sever/východ bez POI v seede (dni 6–8 prázdne), dron zóny, počasie, presun zastávok drag & drop (v1.1).
- **ADR-014 (používateľ potvrdil 20. 9.):** poradie krokov vymenené – **04 Itinerár, 05 Kde spať**; súbory komponentov ostali (`step04*` = Kde spať, `step05*` = Itinerár), zmenené číslovanie, odkazy, Postup, „Ako to funguje“, docs anotované. `loadSnapshot` je už plný (zastávky s POI a cenníkmi, vozidlo per vetva, strava, ručné položky, kurz/palivo) – základ pre 2.8.
- **Blok 2.8 hotový** – `budget-data.ts` (`computeBudget` nad plným snapshotom, `summaryColumns`, `foodBreakdown`; `foodDaysFor` vytiahnuté do enginu), hlavička **„Odhad cesty“** (suma, /os, rozsah, 4 stĺpce s pôvodom) + sumy v Postupe a v hlavičke telefónu,
  **krok 07 Strava** (úroveň, káva, alkohol, prvý nákup → `food_profile`; dni s kuchynkou z nocí, časti prvého/posledného dňa z letu, override úrovne per deň, porovnanie s druhou vetvou),
  **krok 08 Rozpočet** (Súhrn kategórie → položky s odkazom na krok, Scenáre Auto vs. Karavan s víťazom, Na osobu (skupinové rovným dielom, osobné presne), ručné položky, rezerva % a cieľ/os., export **JSON + CSV** `/api/trips/[id]/export`, PDF v1.1).
  e2e `tests/e2e/step0708-flow.mjs` (2 os.: strava stredná + deň komfort, položka na osobu, rezerva 5 %, cieľ 1 500 €, export JSON 200 / CSV 32 riadkov).
- **Blok 2.9 (časť)** – `pnpm e2e` = `tests/e2e/full-flow.mjs`: celý tok na iPade (4 testovacie kontá → členovia → 01 → 02 ručný let → 03 → 04 generátor → 05 ponuka → 06 → 07 → 08 export JSON, mapa) za ~45 s, kontrola Σ na osobu = celkom ✓ (7 152 € / 4 os. = 1 788 €/os pri úspornej strave 19 €/os/deň).
  Opravy z behu: ručný let ukladá cenu na osobu (`manual.farePp`) – predtým sa skupinová cena násobila počtom osôb; odhadované noci majú predvolene kuchynku (úsporná strava), vypnúť sa dá v 05. Produkcia nasadená (`cb66b18`+), logy bez chýb.
  **Čaká na používateľa:** mená + e-maily členov → kontá s dočasným heslom (`/sprava/pouzivatelia`), test na vlastných zariadeniach.
- **Generátor itinerára v2** (na žiadosť používateľa „oprav tie hlúpe časti“): (1) **globálne priradenie** – každé POI ide do dňa s najmenšou obchádzkou (max. 75 min) + penalizácia vyťaženia dňa, takže sa top miesta rozložia; (2) **poradie pozdĺž smeru jazdy** (projekcia na os noc→noc) + **2-opt** na matici – bez cúvania; (3) **časové sloty**: odchod 08:30 (deň 1 = prílet + 60 min), jazda × 1,25 + 10 min, pobyt, nič po **západe slnka** (`sunTimes` z `daylightMinutes`), posledný deň končí 3 h pred odletom, otváracie hodiny ak sú známe; (4) **rezervný deň** pri ≥ 8 dňoch (stredný deň s najkratším presunom, ideálne 2 noci v regióne, polovičná kapacita); (5) štítky **musí / voliteľné** (horný kvartil skóre dňa).
  Ukladá sa `itinerary_stops.arrive_at` a `must`; ručné pridanie zastávky prepočíta deň tým istým zoradením. UI: časy príchodov, ☀ západ, štítky, „rezerva na počasie“. 12 testov enginu. Príklad: Geysir 09:16 → Gullfoss 10:23 → Seljalandsfoss 13:29 → Lava Show Vík 15:46.
  Stále chýba: presun zastávok drag & drop, plán B pri daždi, davy podľa hodiny, rezervačné sloty s pevným časom (v1.1).
- **Seed POI pre celý okruh** (+33 → 58 atrakcií): juhovýchod (Fjallsárlón, Stokksnes, Hoffell kade, Höfn), východné fjordy (Stuðlagil, Hengifoss, Vök Baths, Seyðisfjörður, Petra, Djúpivogur), Mývatn (Dettifoss, Ásbyrgi, Hverir, Nature Baths, Dimmuborgir, Hverfjall, Grjótagjá, Krafla), Akureyri (Goðafoss, Húsavík veľryby, Forest Lagoon, mesto), severozápad (Hvítserkur, Kolugljúfur, Glaumbær, Grábrók, Hraunfossar), Snæfellsnes (Kirkjufell, Arnarstapi, Djúpalónssandur, Búðakirkja, Ytri Tunga, Vatnshellir) – SK popisy, tipy, vstupné/parkovné v ISK (orientačne 2026), sezóna, dron, otváracie hodiny kde majú zmysel.
  Matica trás prebudovaná (82 bodov, 6 642 dvojíc, OSRM). `RING_ORDER` je cyklický (sever → Reykjavík cez západ). 10-dňový Ring: 31 zastávok, žiadny prázdny deň.
- **Rozpočet na atrakcie (ADR-015)** – `trips.attraction_budget` (free/budget/balanced/unlimited), engine: penalizácia ceny v skóre, mešec na celú cestu (limit × dni × osoby), jeden 5★ zážitok nad mešec, `stars`/`valueForMoney`; 5 nových testov (17 spolu). UI: chipy „Atrakcie – koľko míňať“ v kroku 04, hviezdičky · cena/os · štítok „oplatí sa/drahé“ · filter podľa ceny · lacnejšia alternatíva v kroku 06 a detaile. e2e: vyvážene 9 platených → úsporne 7.
- **Seed +28 POI (spolu 86 atrakcií + 11 kempov)**: Reykjavík/Reykjanes (Laugardalslaug, Harpa + Sólfar, Grótta, Whales of Iceland, Seltún, Reykjanesviti + Gunnuhver, Most medzi kontinentmi), Golden Circle/juh (Brúarfoss, Friðheimar, Háifoss, Gjáin + Stöng, vrak DC-3, Vík, Systrafoss), JV (Múlagljúfur, Svínafellsjökull), sever (Aldeyjarfoss, Siglufjörður, Hofsós bazén, Kálfshamarsvík, Borgarvirki), západ (Krauma, Reykholt, Glanni, Stykkishólmur, Gerðuberg, Rauðfeldsgjá, Landbrotalaug). Matica trás 110 bodov (OSRM v blokoch 50 × 50, 11 990 dvojíc).

## Ďalší krok (stav 20. 9. 2026 večer)
- **Šprint hotový až na kontá členov (2.9).** Ďalej: (a) kontá členov po dodaní e-mailov; (b) po šprinte: odľahčiť krok 01 (tempo/záujmy/rozpočet do sheetu), mini mapa nocí v 05 + prepis regiónu noci s návrhom do 04, POI pre sever/východ, Travelpayouts token, PDF export, Ja/Skupina, história.
- Otvorené na strane používateľa: (a) Travelpayouts token – `public/tp-drive.html` je lokálne, **nie je commitnutý** (filter blokuje push cudzieho skriptu; používateľ pushne sám z Macu), potom `TRAVELPAYOUTS_TOKEN` + `TRAVELPAYOUTS_MARKER` (kandidát 576032) do `.env` a Vercel; (b) prihlásiť sa a vyplniť profil.
- Vercel env: 6 kľúčov + `FLAG_WIZZ`/`FLAG_RYANAIR`=true nahrané CLI; produkcia `/api/health` 6/7 OK.
- Lokálne: `.env` (nie `.env.local`) obsahuje kľúče; `pnpm dev -p 3111` používajú e2e skripty v `tests/e2e/`.
