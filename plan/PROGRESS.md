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

## Ďalší krok (stav 20. 9. 2026 večer)
- **Deň 1 hotový, bloky 2.1–2.2 hotové.** Pokračovať **blokom 2.3** (obrazovka Cesta + krok 01) podľa `plan/SPRINT-2-DNI.md`.
- Otvorené na strane používateľa: (a) Travelpayouts token – `public/tp-drive.html` je lokálne, **nie je commitnutý** (filter blokuje push cudzieho skriptu; používateľ pushne sám z Macu), potom `TRAVELPAYOUTS_TOKEN` + `TRAVELPAYOUTS_MARKER` (kandidát 576032) do `.env` a Vercel; (b) prihlásiť sa a vyplniť profil.
- Vercel env: 6 kľúčov + `FLAG_WIZZ`/`FLAG_RYANAIR`=true nahrané CLI; produkcia `/api/health` 6/7 OK.
- Lokálne: `.env` (nie `.env.local`) obsahuje kľúče; `pnpm dev -p 3111` používajú e2e skripty v `tests/e2e/`.
