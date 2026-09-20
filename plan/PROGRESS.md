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

## Ďalší krok
- Účty: Supabase, Vercel, Travelpayouts, ORS, Resend → blok 1.1 šprintu.
- Prejsť dokumentáciu, opraviť/potvrdiť seed ceny, začať Fázu 0.
