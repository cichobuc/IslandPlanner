# Island Planner – pokyny pre Claude Code

Plánovač lacnej cesty na Island pre skupinu 3–4 dospelých z Bratislavy: letenky z BTS/VIE/BUD/PRG/KTW za celý mesiac,
vetvy Auto / Karavan / Bez auta, ubytovanie, trasa na OSM mape, atrakcie so vstupným podľa veku, strava, rozpočet na osobu.
Stav: **návrh hotový, implementácia začína.** Používateľ komunikuje po slovensky; UI v slovenčine (čeština v1.1), kód a identifikátory po anglicky.

## Kde čo je (čítaj pred prácou)
- `README.md` – prehľad, tabuľka rozhodnutí, mapa dokumentov
- `plan/SPRINT-2-DNI.md` – **aktuálny postup práce** (hodinové bloky s „hotové ="), začína sa blokom 1.1
- `plan/IMPLEMENTACNY-PLAN.md` – plný rozsah + MVP; `plan/ROZHODNUTIA.md` – ADR-001…013; `plan/PROGRESS.md` – denník (dopĺňaj po každom bloku)
- `docs/00-ako-to-funguje.md` – celý flow; `docs/01` požiadavky; `docs/02` stack a architektúra; `docs/03` dátový model (Drizzle schéma podľa neho);
  `docs/04` **konektory** (overené 20. 9. 2026 – Amadeus/Hotellook/Kiwi už neexistujú); `docs/05` engine (čisté TS, testy); `docs/06` design system v6;
  `docs/07` seed dáta (ceny, POI, kempy, dron, Vziať z BA); `docs/08` checklisty; `docs/09` **audit** (kritické opravy K1–K6 – dodrž ich)
- `docs/obrazovky/` – vzor obrazoviek (00-vzor = v6: Postup vľavo, obsah kroku vpravo), kroky 1–8, mapa, sheety, profil/účty
- Dizajn (Claude Design canvas, 9 artboardov v6): https://claude.ai/artifact/HYKyfB8V1VcKnJiuc9iNx7

## Kľúčové rozhodnutia (nevracaj sa k nim)
- Stack: Next.js 15 App Router + TS + Tailwind 4 + Drizzle + **Supabase Free** (Postgres, Auth e-mail+heslo) + **Vercel Hobby** (funkcie 300 s, cron 1×/deň) + MapLibre/OpenFreeMap. Všetko zadarmo.
- Účty zakladá správca s **dočasným heslom** (`profiles.must_change_password`), žiadne platobné údaje. Roly owner/editor/viewer cez RLS na `trip_members`.
- Konektory: `tp-flights` (Travelpayouts Flight Data v1), `wizz` (KTW/BUD priame, rotujúca verzia), `ryanair` (segmenty do hubov), `gflights` (fast-flights, len overenie pre 4 os., fallback deep link), `viator`, `tjalda` (kempy s cenami), `parka` (parkovné), `gasvaktin`, `frankfurter`, `open-meteo`, `overpass`, `osrm/ors`. Jednotné rozhranie `Connector` (cache, TTL, health, fallback, fixtures). Izby/Airbnb = rozpätie zo seedu + ručne.
- Engine `src/engine` = čisté funkcie bez IO, Vitest; generátor trasy používa **predpočítanú `route_matrix`** (nie živý OSRM); kaskáda mení len `is_manual = false`; optimistic concurrency cez `updated_at`; časy s tz (KEF UTC+0, BA UTC+2).
- Poradie krokov (ADR-014): 01 Cestujúci · 02 Letenky · 03 Doprava · **04 Itinerár** · **05 Kde spať** · 06 Atrakcie · 07 Strava · 08 Rozpočet. Krok 03 je rozhodnutie Auto/Karavan/Bez auta → určuje typ nocí v 05; dáta vetiev sa uchovávajú (`scenario_key`). Súbory `steps/step04*` = Kde spať, `steps/step05*` = Itinerár (historické názvy).
- Dizajn v6: svetlé, bez skla/tieňov, biele karty 1 px `#E4E8EE` na `#F4F6F9`, akcent `#0F4C81`, Sora + Instrument Sans, radius 12/10/8. **Každú obrazovku vykresli Playwrightom a pozri PNG pred tým, než ju vyhlásiš za hotovú.**

## Ako pracovať
- Postupuj podľa `plan/SPRINT-2-DNI.md` blok po bloku; blok je hotový až po splnení „hotové =". Po každom bloku zapíš riadok do `plan/PROGRESS.md`.
- Pred blokom 1.1 si vypýtaj od používateľa: GitHub repo, Supabase kľúče, Travelpayouts token, ORS kľúč, Resend; a dve odpovede (MVP bez „Bez auta"?, správca = on?).
- Kľúče len v `.env.local` / Vercel env, nikdy do repa. Neoficiálne konektory za feature flagom, ≤ 1 req/s.
- Pýtaj sa kľudne často – používateľ to výslovne chce. Nezakladaj nové dokumenty mimo `docs/` a `plan/`.
- Commituj po každom bloku (používateľ zatiaľ nemá GitHub – prvý blok ho založí).
