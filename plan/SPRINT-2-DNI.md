# Šprint 2 dni – čo postavíme s Claude Code a v akom poradí

Cieľ: po 2 dňoch beží na Verceli app, do ktorej sa 4 ľudia prihlásia dočasným heslom, vyplnia profil, založia cestu, vidia
kalendár leteniek pre september 2027 z KTW/BUD/VIE/BTS/PRG, vyberú let a dostanú rozpočet na osobu s vetvou Auto/Karavan,
trasou na mape a vstupným podľa veku. Zvyšok (návrh mesiaca, Ja/Skupina, Vziať z BA, dron mapa, CS, cron, PWA) je kostra alebo stub.

Predpoklad: pracujeme spolu celý deň (Claude Code píše, ty schvaľuješ, klikáš na účty a testuješ na iPade).
Každý blok má „hotové = " – ak nie je splnené, ďalší blok sa nezačína.

## Pred štartom (ty, ~ 45 min, ešte pred dňom 1)
- [x] GitHub repo https://github.com/cichobuc/IslandPlanner – návrh commitnutý (20. 9. 2026)
- [ ] Vercel (login GitHub – CLI nainštalované, treba `vercel login`) · Supabase Free projekt (login GitHub) – pošli mi `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`, DB heslo
- [ ] Travelpayouts účet → token (Flight Data API v1) · OpenRouteService kľúč · Resend účet (na e-maily s dočasným heslom)
- [ ] Viator affiliate (môže počkať do v1.1)
- [x] Rozhodnutia: MVP bez „Bez auta" = **áno**, správca inštancie = **l.pjecha@gmail.com** (20. 9. 2026)

## Deň 1 – základ, engine, letenky
| Blok | Čas | Čo | Hotové = |
|---|---|---|---|
| 1.1 | 0:00–0:45 | repo, Next.js 15 + TS + Tailwind 4, next-intl (sk; cs prázdne), Drizzle, ESLint/Prettier, `.env.example`, deploy „hello" na Vercel | URL na Verceli otvára stránku |
| 1.2 | 0:45–1:45 | Drizzle schéma podľa docs/03 (všetky tabuľky, aj tie pre v1.1 – prázdne), migrácie, RLS podľa `trip_members`, `profiles.must_change_password` | `drizzle-kit push` prešiel, tabuľky v Supabase |
| 1.3 | 1:45–2:45 | Auth: `/prihlasenie` (e-mail + heslo), `/zmena-hesla` (vynútená), `POST /api/admin/users` (service role, dočasné heslo, e-mail cez Resend), middleware rolí | založíš Petrovi konto, on sa prihlási, zmení heslo |
| 1.4 | 2:45–3:45 | `/profil` – formulár podľa 00a (bez sekcie „Kedy môžem" – v1.1), uloženie, prenos do cestujúceho | profil uložený, vidno v DB |
| 1.5 | 3:45–5:15 | **Engine** `src/engine`: money, ageRules, split, budget, cascade, transportMode (odhad vetiev), lodging pravidlá, food, timeline stub; **Vitest** podľa docs/05 (min. 25 testov) | `vitest` zelený |
| 1.6 | 5:15–6:15 | Seed: airports, airlines, baggage_rules, parking_options, regions, vehicle_options (10), bring_items, **20 POI** (juh + Golden Circle, SK popisy, ceny podľa docs/07), campsite seed (10) | `pnpm seed` naplní DB |
| 1.7 | 6:15–7:15 | Konektory s jednotným rozhraním + `provider_cache` + `connector_health`: **tp-flights** (calendar, cheap, direct), **frankfurter**, **gasvaktin**, **tjalda** (kempy + parser cien), **parka**; fixtures nahrané z reálnych odpovedí | `/api/health` ukáže 5 konektorov OK |
| 1.8 | 7:15–8:00 | **Spike**: pokrytie tp-flights pre 5 letísk × september 2027 (skript vypíše % dní s cenou per letisko) → rozhodnutie, či pridať `wizz` hneď | číslo pokrytia v PROGRESS.md |
| 1.9 | 8:00–9:00 | `wizz` konektor (timetable KTW/BUD, self-heal verzie) ak spike < 60 %; inak `ryanair` segmenty pre huby; `FlightSearchService` + `flightCombos` + SSE route | `POST /api/flights/search` vráti kombinácie pre KTW |

## Deň 2 – obrazovky, mapa, rozpočet, nasadenie
| Blok | Čas | Čo | Hotové = |
|---|---|---|---|
| 2.1 | 0:00–1:00 | Design tokens v6 (docs/06), komponenty: TopBar, Stepper (Postup), Summary, StepHead, Chips, ListRow, ResultsCard, Sheet, OptionCard; `/dev/ui` | komponenty vyzerajú ako artboardy (kontrola Playwright screenshotom) |
| 2.2 | 1:00–1:45 | Obrazovka **Cesty** + „Ako to funguje" + založenie cesty, členovia (pozvanie = správca pridá konto) | cesta založená, 4 členovia |
| 2.3 | 1:45–2:45 | Obrazovka **Cesta** (v6 layout) + **krok 01** (cestujúci z profilov, letiská s 1 autom z BA, mesiac ručne, dni, batožina na dvojice) | krok 01 hotový → 02 |
| 2.4 | 2:45–4:15 | **krok 02**: kalendár mesiaca (heatmapa), filtre, zoznam kombinácií, výber → `verify` (gflights ak funguje z Vercelu, inak deep link) → kaskáda + DiffToast | vybraný let zmení dátumy, noci, dni v Postupe |
| 2.5 | 4:15–5:15 | **krok 03**: karty Auto/Karavan (Bez auta stub) s odhadom vetiev, vozidlá zo seedu, poistenia, požiadavky (vek/kreditka z profilov), palivo z gasvaktin × km z presetu | voľba prepne typ kroku 04 |
| 2.6 | 5:15–6:15 | **krok 04**: noci s regiónmi z presetu, izby = rozpätia zo seed tabuľky, kempy z tjalda (živé ceny, otvorenie), ručné vloženie ponuky, kuchynka → strava | 9 nocí s rozpätím / kemp cenou |
| 2.7 | 6:15–7:30 | **krok 05 + Mapa**: `route_matrix` pre 20 POI (skript cez ORS, commit), preset Ring/Juh, dni → zastávky (vstupné podľa veku), MapLibre + OpenFreeMap overlay s trasou a nocami; **krok 06** ako zoznam v pláne + katalóg zo seedu | trasa na mape, vstupné pre 4 |
| 2.8 | 7:30–8:15 | **krok 07** (úroveň, dni s kuchynkou) + **krok 08** (kategórie → položky, na osobu so splitom, JSON export; PDF stub) | súčet sedí, na osobu × 4 = celkom |
| 2.9 | 8:15–9:00 | Playwright e2e na iPad viewporte (prihlásenie → profil → 01 → 02 → 03 → 04 → 08), nasadenie na Vercel, dočasné heslá pre všetkých, PROGRESS.md | 4 ľudia sa prihlásia na svojich zariadeniach |

## Čo bude po 2 dňoch stub / chýbať (v1.1 podľa plánu)
Návrh mesiaca · Ja/Skupina a „Navrhnúť cestu pre všetkých" · Vziať z BA · Kedy platiť · Balenie · Viator túry · dron vrstva a pravidlá · šablóny a fork · história s Vrátiť (revízie sa zapisujú, UI nie) · cron + e-maily o cenách · CS preklad · PWA/offline · zvyšných ~ 60 POI a klenoty · Bez auta vetva · „Dnes".

## Riziká šprintu (kde sa môže čas roztrhnúť)
1. Konektory na živých dátach (tp-flights pokrytie, Wizz verzia, gflights z Vercelu) – preto spike a fixtures hneď v deň 1; ak niečo nejde, ide manuálny vstup a pokračujeme.
2. Supabase Auth + service role + RLS – vždy zožerie viac, než sa zdá; blok 1.3 má rezervu.
3. Seed obsah – 20 POI stačí na demo trasy Juh/Golden Circle; Ring Road bude mať v deň 2 diery (sever/východ) – doplníme v1.1.
