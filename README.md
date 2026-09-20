# Island Planner

Plánovač lacnej cesty na Island pre skupinu 3–4 dospelých (funguje aj pre pár či rodinu): nájde najlacnejšie letenky z regiónu
(BTS · VIE · BUD · PRG · KTW), naplánuje okruh na zvolený počet dní, vypočíta ubytovanie, dopravu,
palivo, vstupné (podľa veku cestujúcich), stravu a parkovanie – a z toho urobí presný rozpočet
na skupinu aj na osobu.

> Stav: **implementácia** – šprint deň 1 (blok 1.1 hotový: základ projektu), návrh v `docs/` a `plan/`.
> Dizajn (Claude Design canvas): https://claude.ai/artifact/HYKyfB8V1VcKnJiuc9iNx7

## Kľúčová myšlienka

1. Zadáš cestujúcich (dátumy narodenia), domov, letiská, približný počet dní, batožinu, parkovanie.
2. Vyklikáš celý mesiac (september) → aplikácia prehľadá všetky kombinácie *letisko × dátum odletu × dĺžka pobytu*
   a zoradí ich podľa **celkovej ceny** (letenka + batožina + parkovanie + cesta na letisko), nie len podľa ceny letenky.
3. Vyberieš let → **všetko ostatné sa prepočíta** na tie dátumy: noci, dni prenájmu auta/karavanu, okruh, strava, vstupné.
4. Porovnáš scenáre (auto + Airbnb vs. karavan + kempy) a vidíš najlacnejšiu kombináciu podľa tvojich filtrov.
5. Každá atrakcia má popis, vstupné podľa veku, trvanie, sezónnosť (kedy sa oplatí), návštevnosť (davy vs. skryté klenoty) a dron status;
   mapa má vrstvu zón, kde sa s dronom smie/nesmie lietať.
6. Trasu alebo konfiguráciu uložíš ako šablónu – ostatní si ju skopírujú a upravia; členovia cesty editujú všetko spoločne, s históriou zmien.

## Štruktúra dokumentácie

| Súbor | Obsah |
|---|---|
| [docs/00-ako-to-funguje.md](docs/00-ako-to-funguje.md) | **Celý postup od začiatku do konca** – čo robí používateľ a čo app na pozadí |
| [docs/01-vizia-a-poziadavky.md](docs/01-vizia-a-poziadavky.md) | Vízia, ciele, persony, funkčné a nefunkčné požiadavky |
| [docs/02-architektura-a-stack.md](docs/02-architektura-a-stack.md) | Technológie, architektúra, moduly, hosting |
| [docs/03-datovy-model.md](docs/03-datovy-model.md) | Entity, vzťahy, schéma DB |
| [docs/04-api-a-zdroje-dat.md](docs/04-api-a-zdroje-dat.md) | **Konektory** – jednotný katalóg externých zdrojov, overený 20. 9. 2026 (čo je živé, čo seed, čo ručne) |
| [docs/05-vypoctovy-engine.md](docs/05-vypoctovy-engine.md) | Ako sa počíta rozpočet, optimalizácia, kaskáda po výbere letu |
| [docs/06-design-system.md](docs/06-design-system.md) | Vizuál 2026 „glass", tokeny, komponenty, tablet/mobil |
| [docs/07-island-seed-data.md](docs/07-island-seed-data.md) | Zoznam atrakcií, regiónov, orientačných cien (seed dáta) |
| [docs/08-prechod-a-checklisty.md](docs/08-prechod-a-checklisty.md) | Prechod krok po kroku: čo app hľadá, časová os platieb, balenie, bezpečnosť, na čo nezabudnúť |
| [docs/09-audit.md](docs/09-audit.md) | **Audit návrhu**: čo by to položilo (opravené), riziká, MVP do februára 2027 |
| [docs/obrazovky/](docs/obrazovky/) | **Jednotný vzor + každý krok samostatne** – riadky, filtre, všetky konfigurácie, stavy, dátové toky |
| [plan/IMPLEMENTACNY-PLAN.md](plan/IMPLEMENTACNY-PLAN.md) | Fázy, míľniky, úlohy s checkboxmi (plný rozsah + MVP) |
| [plan/SPRINT-2-DNI.md](plan/SPRINT-2-DNI.md) | **2-dňový šprint s Claude Code** – hodinové bloky, čo potrebujem od teba, čo ostane stub |
| [plan/BACKLOG.md](plan/BACKLOG.md) | Nápady a odložené veci |
| [plan/ROZHODNUTIA.md](plan/ROZHODNUTIA.md) | Log architektonických rozhodnutí (ADR) |
| [plan/PROGRESS.md](plan/PROGRESS.md) | Denník postupu |

## Obrazovky aplikácie (jednotný vzor – 3 obrazovky, 1 riadok)

| Obrazovka | Route | Dokument |
|---|---|---|
| Vzor – **trasa krokov** (spine, hero, Vstupy → Voľba → Vyplýva), ListRow, Sheet | – | [obrazovky/00-vzor.md](docs/obrazovky/00-vzor.md) |
| Ako to funguje (úvodná obrazovka s flow) | `/ako-to-funguje` | v 00-vzor.md |
| Účty a Profil (dočasné heslo, preferencie, oprávnenia) | `/prihlasenie`, `/profil` | [obrazovky/00a-profil-a-ucty.md](docs/obrazovky/00a-profil-a-ucty.md) |
| Cesty (zoznam + šablóny) | `/` | [obrazovky/01-cesty.md](docs/obrazovky/01-cesty.md) |
| **Cesta – checklist 8 krokov** | `/cesta/[id]#krok-N` | [obrazovky/02-cesta.md](docs/obrazovky/02-cesta.md) |
| Mapa (overlay, aj dron zóny) | `/cesta/[id]/mapa` | [obrazovky/03-mapa.md](docs/obrazovky/03-mapa.md) |
| Sheety (detaily, nastavenia, členovia, dron, história, šablóny, export) | – | [obrazovky/04-sheety.md](docs/obrazovky/04-sheety.md) |

| Krok | Dokument |
|---|---|
| 1 Cestujúci, letiská & **návrh mesiaca** | [krok-1](docs/obrazovky/krok-1-cestujuci-a-letiska.md) |
| 2 Letenky (kalendár ako filter + zoznam) | [krok-2](docs/obrazovky/krok-2-letenky.md) |
| 3 Doprava – **rozhodnutie** Auto / Karavan / Bez auta | [krok-3](docs/obrazovky/krok-3-doprava.md) |
| 4 Kde spať – Ubytovanie / Kempy / Základňa (podľa 3) | [krok-4](docs/obrazovky/krok-4-kde-spat.md) |
| 5 Itinerár / Výlety (podľa 3) | [krok-5](docs/obrazovky/krok-5-itinerar.md) |
| 6 Atrakcie (v pláne + katalóg) | [krok-6](docs/obrazovky/krok-6-atrakcie.md) |
| 7 Strava (dni) | [krok-7](docs/obrazovky/krok-7-strava.md) |
| 8 Rozpočet (položky, scenáre, na osobu, export) | [krok-8](docs/obrazovky/krok-8-rozpocet.md) |

## Rozhodnutia z úvodných otázok (20. 9. 2026)

| Téma | Rozhodnutie |
|---|---|
| Termín | Rok je **parameter** (predvolene najbližší september); aplikácia je opakovane použiteľná |
| Domov | **Bratislava a okolie** → BTS/VIE do 1 h, BUD ~2 h, PRG ~3,5 h, KTW ~3,5 h autom |
| Cestujúci | **Skupina 3–4 dospelých**; formulár podporuje ľubovoľný počet + dátumy narodenia |
| API | **Len bezplatné zdroje** – overené 09/2026: Travelpayouts Flight Data v1, Wizz/Ryanair (neofic.), Google Flights (fast-flights) na overenie, Viator (túry), Overpass, OSRM/ORS, OpenFreeMap, gasvaktin, Frankfurter, Open-Meteo. Amadeus/Hotellook/Kiwi už nie sú dostupné. Kempy a parkovné atrakcií živo z tjalda.is/Parka API; izby/Airbnb s cenou = ručne z Booking/Airbnb linku |
| Lety | **Priame aj self-transfer** cez hub (LON, BER, CPH, AMS…) |
| Doprava/ubytovanie | Predvolene **dva scenáre vedľa seba**: auto + ubytovanie vs. karavan + kempy |
| Hosting | **Zadarmo**: Vercel Hobby + Supabase Free (Postgres, Auth, Storage) |
| Zariadenie | **iPad (Safari) + Mac** – PWA, tablet first-class |
| Okruh | **Rozhodne cena a počet dní** – generátor vyberie preset podľa vybraného letu |
| Záujmy | Termálne kúpele, ľadovce/ice cave, veľryby/puffiny, príroda zadarmo – všetko v seed dátach |
| Strava | Predvolene **úsporná** (varenie z Bónus/Krónan) |
| Dizajn | **v6 čisté produktové UI** (overené renderom v Playwrighte): postup vľavo + obsah kroku vpravo, biele karty s 1 px okrajom na #F4F6F9, jeden akcent fjord #0F4C81, Sora + Instrument Sans, tónované ikonové dlaždice, mapa okruhu; bez skla, tieňov a tmavého režimu |
| Účty | **Správca vytvorí konto s dočasným heslom**, používateľ si ho pri prvom prihlásení zmení; každý má profil s preferenciami a oprávneniami (správca / editor / prezerajúci); cesta zdieľaná |
| Mesiac | **Nie je pevný** – app navrhne najideálnejší mesiac podľa toho, čo chcú členovia vidieť (puffiny, polárna žiara, ľadové jaskyne, ceny, davy) a kedy môžu; potom kalkuluje |
| Ja vs. skupina | Každému vykalkuluje **samostatne** podľa jeho preferencií; potom „Skupina“ prepočíta a navrhne najlepšiu cestu pre všetkých (kompromis s vysvetlením) |
| Náklady | Skupinové položky sa delia (1 auto na letisko z Bratislavy, parkovanie, prenájom, palivo, poistky), osobné sa počítajú presne (letenka, batožina, vstupné) |
| Z domu | Modul **„Vziať z Bratislavy“**: čo sa oplatí priviezť (Island je drahý) vs. kúpiť tam; porovná úsporu s cenou batožiny navyše |
| Ceny | **Denné obnovenie (Vercel Cron) + e-mail pri zmene** (Resend free tier) |
| Rozpočet | Bez limitu; cieľová suma je voliteľné pole |
| Jazyk | **Slovenčina + čeština** (i18n od začiatku, kód po anglicky) |

## Predpoklady návrhu

- Základná mena **EUR**, islandské ceny sa prepočítavajú z **ISK** aktuálnym kurzom.
- Ryanair a Wizz Air nemajú oficiálne verejné API – návrh počíta s konektormi (agregátor + neoficiálne endpointy + Google Flights overenie) a s tým,
  že sa môžu kedykoľvek pokaziť. Priame lety do KEF má z regiónu len Wizz z **KTW a BUD**. Detaily v `docs/04-api-a-zdroje-dat.md`.
- Všetko musí bežať v bezplatných limitoch (Vercel Hobby: cron 1×/deň, Supabase Free: 500 MB DB, 50 000 MAU).

## Vývoj (od 20. 9. 2026)
```bash
corepack enable && pnpm install     # Node 24, pnpm 12
cp .env.example .env.local          # doplň Supabase, Travelpayouts, ORS, Resend
pnpm dev                            # http://localhost:3000 → /sk
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm db:push                        # Drizzle → Supabase (blok 1.2)
pnpm seed                           # seed dáta (blok 1.6)
```
Štruktúra: `src/app/[locale]` (obrazovky, sk/cs cez next-intl), `src/engine` (čisté výpočty), `src/connectors`,
`src/db` (Drizzle schéma, migrácie, seed), `src/components/ui` (design system v6), `src/features`, `seed/` (JSON), `tests/`.
Nasadenie: Vercel (Hobby) z `main`; env premenné podľa `.env.example`.
