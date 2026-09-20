# Krok 1 · Cestujúci & letiská

Bez wizardu – krok 1 je zoznam v tej istej karte ako všetko ostatné. Nová cesta sa otvorí s rozbaleným krokom 1.

**Zbalený riadok:** `① Cestujúci & letiská · 4 dospelí · Bratislava · VIE BUD KTW BTS PRG · ✓`
**Filtre (nástroj):** mesiac [‹ september 2027 ›] · dni [8 – 12] · tempo · záujmy · viac ▾

## Sekcia 0 – Mesiac (riadky návrhu)
`[09] September 2027 ★★★★☆ | 4 120 – 4 900 € skupina · polárna žiara možná · veľryby ✓ · bez puffinov · kempy do 15. 9. · davy nízke | [Zvoliť] ▸`
`[06] Jún 2027 ★★★★☆ | 4 600 – 5 400 € · puffiny ✓ · polnočné slnko · ceny vyššie · davy stredné | [Zvoliť] ▸`
`[03] Marec 2027 ★★★☆☆ | 3 900 – 4 700 € · ľadové jaskyne ✓ · polárna žiara ✓ · krátke dni · riziko počasia | [Zvoliť] ▸`
- Riadky zoradené podľa skóre (docs/05 §1b) z profilov členov (režim Skupina) alebo môjho (Ja); ▸ = sheet s celou sezónnou tabuľkou mesiaca.
- „Porovnať 2–3 mesiace“ → krok 02 hľadá letenky pre všetky vybrané, kalendáre pod sebou.
- Mimo dostupnosti člena = riadok stlmený s menom („Peter nemôže 1.–15. 9.“).

## Sekcia A – Cestujúci (riadky – predvyplnené z profilov členov)
`[LP] Lukáš · 34 r. (12. 3. 1993) | vodič · 1× 10 kg · 1× 20 kg · účet ✓ | ▸`
- Riadok = osoba; ▸ otvorí sheet Cestujúci (meno, dátum narodenia **alebo** vek, vodič, e-mail → pozvánka, batožina 4 steppery, poznámka).
- Vek sa počíta v deň návštevy (vstupné) a v deň odletu (infant/child pri letenkách).
- Päta sekcie: [+ Cestujúci] · [Pozvať e-mailom]

## Sekcia B – Domov a letiská (riadky)
`[🏠] Bratislava · vlastné auto 6,5 l benzín | ▸`
`[VIE] Viedeň Schwechat | 65 km · 55 min · **1 auto pre 4 (skupinovo)** · parkovanie Mazur P ✓ · známka AT · do KEF len s prestupom | [seed] | 46 € cesta + 84 € park. · 33 €/os | [✓ zapnuté] ▸`
`[BUD] Budapešť | 200 km · 2 h 10 · auto · Holiday Parking · **priamy Wizz do KEF** | … | [✓] ▸`
`[BTS] Bratislava | 12 km · 15 min · taxi 20 € · bez parkovania | … | [✓] ▸`
`[PRG] Praha | 330 km · 3 h 30 · bus RegioJet 4× 18 € | … | [○ vypnuté] ▸`
`[KTW] Katowice | 320 km · 3 h 20 · auto · P3 · **priamy Wizz do KEF (ut/št/so/ne)** | … | [✓] ▸`
- Riadok = letisko; prepínač zapnuté/vypnuté rozhoduje, či sa hľadá; ▸ sheet Letisko (spôsob dopravy, parkovisko z cenníka, známky).
- Päta: [+ Letisko (KRK, BRQ, LNZ, WAW…)] · cieľ [KEF ▾]

## Sekcia C – Kedy a ako (chipy, rozbaľujú sa na 1 riadok nastavení)
| Nastavenie | Typ | Default | Efekt |
|---|---|---|---|
| Mesiac | month picker | najbližší september | vyhľadávanie |
| Rozsah v mesiaci | celý / od–do | celý | |
| Dĺžka pobytu | RangeSlider 3–21 | 8–12 | kombinácie, preset |
| Flexibilita ± dni | stepper | 0 | susedný mesiac |
| Prestupy | priame / max 1 / max 2 | max 1 | |
| Min. prestup | h | 3 | |
| Huby | chipy | všetky | |
| Odlet po / návrat pred | time | – | |
| Tempo | pokojné / normálne / intenzívne | normálne | itinerár |
| Záujmy | termály · ľadovce · zvieratá · príroda · túry · láva · kultúra · dron | prvé 4 | váhy POI |
| Davy ↔ klenoty | 0–100 % | 30 % | |
| Strava | úsporná / stredná / komfortná | úsporná | krok 7 |
| Cieľový rozpočet / os. | € | – | krok 8 |
| Rezerva | % | 10 | |
| Mena | EUR / CZK | EUR | |

**Päta kroku:** [Uložiť konfiguráciu ako šablónu] · [Navrhnúť pre všetkých] (režim Skupina) · primárna: [Pokračovať → 02 Letenky] (spustí vyhľadávanie pre zvolený mesiac na pozadí)

## Stavy
- ✓ keď je ≥ 1 cestujúci, domov a ≥ 1 letisko zapnuté; ! ak chýbajú dátumy narodenia a v kroku 6 sú atrakcie s vekovými cenami.
- Zmena letísk/mesiaca/pax po vybratom lete: pás „Vybraný let už nezodpovedá – zrušiť výber?".

## Prechod – čo krok hľadá a čo mu chýbalo
**Hľadá:** vzdialenosť a čas domov → každé letisko (OSRM), cenník parkovísk (seed), ceny busov (seed), vek každého cestujúceho k dátumu cesty.
**Zlepšenia doplnené do návrhu:**
- **Spôsobilosť vodičov** – pri cestujúcom „vodič ✓" app hneď overí vek (≥ 20 auto, ≥ 23 pre 4×4/karavan u väčšiny požičovní) a prax ≥ 1 rok; výsledok ide do kroku 03 ako filter vozidiel.
- **Kreditná karta** – pole „mám kreditnú (nie debetnú) kartu na depozit" pri vodičovi; bez nej krok 03 upozorní (požičovne blokujú 1 500–3 000 €).
- **Zdieľaná batožina** – podaný kufor sa priraďuje dvojici (kto s kým), nie osobe; cena batožiny sa počíta správne pre 2× 20 kg na 4 ľudí.
- **Doklady** – riadok „Doklady & poistenie" so stavom pre každého: OP/pas platnosť (Island = Schengen, OP stačí, platnosť po návrat), EHIC/GDPR karta (platí na Islande), cestovné poistenie s krytím ľadovcových túr (bežné poistky ich vylučujú!), vodičský preukaz.
- **Dron** – ak niekto vezie dron: registrácia operátora, batérie do príručnej (LiPo nesmú do podanej) → automaticky sa pridá do batožiny poznámka a do kroku 02 pravidlo airline.
- **Návrat v noci** – ak let končí po 23:00, app v riadku letiska ukáže, či existuje spoj domov (bus nie → auto/parkovanie alebo nocľah pri letisku).

## Na čo nezabudnúť (checklist kroku – zobrazí sa ako riadky so ☐)
- ☐ platnosť OP/pasu všetkých 4 · ☐ EHIC · ☐ poistenie s pripoistením na túry/ľadovce · ☐ kreditná karta vodiča · ☐ vodičský preukaz (EÚ stačí) · ☐ rozdelenie do dvojíc na batožinu · ☐ kto je hlavný vodič (vek, prax) · ☐ dron: registrácia + poistenie
