# Krok 3 · Doprava – rozhodnutie (Auto / Karavan / Bez auta)

**Berie z krokov:** 02 dátumy a časy letu (→ dni prenájmu, pickup/return), 01 pax (sedadlá), záujmy (4×4 pre Highlands).
**Dáva ďalej:** vetva → typ kroku 04 a 05; vozidlo (spotreba, palivo, 4×4, kuchynka = áno pri karavane) → 05 palivo, 07 strava.

**Zbalený riadok:** `● 03 Doprava · Auto · Kombi · 10 dní · palivo 2 140 km · 890 € · seed` (pred rozhodnutím: `○ 03 Doprava · vyber: auto, karavan alebo bez auta`)
**Riadok vstupov:** `z kroku 02: 10 dní 12.–21. 9. · pickup KEF ~09:30 · return ~12:00 (3 h pred odletom)`
**Nástroj (rozhodnutie):** tri veľké voľby vedľa seba, každá s odhadom celej cesty z presetov:
```
[ Auto           ]  [ Karavan          ]  [ Bez auta            ]
  ≈ 4 680 € celkom    ≈ 4 910 € celkom     ≈ 5 300 € celkom
  ubytovanie + auto    kempy + kuchynka     hotel RVK + výlety
  flexibilné, teplo    sloboda, chlad v noci  bez šoférovania
```
Klik na voľbu ju zvolí (dá sa kedykoľvek zmeniť; dáta druhej vetvy sa uchovajú). Pod tým sa objaví zoznam vozidiel zvolenej vetvy.
**Filtre:** trieda [Economy][Kombi][SUV][4×4] (auto) / [2 os.][3–4 os.][4×4 camper][2× 2 os.] (karavan) · dni · palivo · viac
**ListRow (vozidlo):** `[🚗] Dacia Jogger · Kombi | 78 €/d · 6,5 l benzín · 7 miest · Blue Car Rental | ● seed 09/26 | 780 € / 10 dní | [Zvoliť] ▸`
Vnorené pod zvoleným: Poistenie (SCDW · Gravel · Sand & ash · Theft s €/deň), Extras (2. vodič · wifi · reťaze · box), **Požiadavky** (vek vodiča ≥ 20 / 4×4 ≥ 23, prax ≥ 1 rok, kreditná karta na depozit 2 500 €, km bez limitu?). Posledné riadky: `⛽ Palivo · 2 140 km z návrhu trasy · 303 € odhad`, `🛣 Tunel Vaðlaheiði · 1 990 ISK` (ak trasa).
Vetva **Bez auta**: riadky = Flybus KEF↔RVK (4× ~ 30 €), Strætó, a odkaz na krok 05 Výlety.
**Päta:** [+ Vozidlo ručne] · [Porovnať vetvy – prečo] · primárna: **[Pokračovať → 04 Ubytovanie]** (resp. → 04 Kempy / 04 Základňa)

---

## Konfigurácie (chipy + sheet „viac") – scenár Auto
| Prvok | Typ | Default | Efekt |
|---|---|---|---|
| Trieda | Chips: Economy / Kombi / SUV 2WD / 4×4 malé / 4×4 veľké | Kombi (4 os. + batožina) | cena/deň, spotreba, F-cesty |
| Konkrétny model/ponuka | select zo seed `vehicle_options` alebo „ručne" (názov, cena/deň, link, spotreba, palivo) | najlacnejší v triede | |
| Dni | auto z letu (pickup po prílete, return 3 h pred odletom); prepísateľné | 10 | |
| Poistenia | checkboxy s cenou/deň: CDW (v cene) · SCDW · GP · SAAP · Theft · Zero excess balík | SCDW + GP | |
| Extras | 2. vodič (počet vodičov z cestujúcich) · wifi · detská sedačka · reťaze · strešný box · GPS | 2. vodič | |
| Spotreba | number l/100 km | podľa triedy | palivo |
| Palivo | benzín / diesel | podľa modelu | cena/l |
| Cena paliva | number ISK/l (z providera, prepísateľné) | seed/API | |
| Rezerva paliva | % | 5 | |
| Depozit | info (nie do rozpočtu, ale zobraziť „blokácia na karte 2 500 €") | | |
| One-way | toggle (iné miesto vrátenia) | nie | poplatok |
| Mýto | auto: Vaðlaheiði tunel ak trasa cez neho | z itinerára | 1 990 ISK |

## Konfigurácie (chipy + sheet „viac") – scenár Karavan
| Prvok | Typ | Default | Efekt |
|---|---|---|---|
| Trieda | 2 os. / 3–4 os. / 4×4 camper / 2× 2-os. camper (skupina 4 v dvoch) | 3–4 os. (4 os.); ponuka „2× 2 os." ako alternatíva | |
| Spí / sedadlá | z ponuky | | kontrola pax |
| Kúrenie, kuchynka, chladnička | info/ikony | | strava (kuchynka = áno) |
| Poistenia, extras, dni, palivo | ako pri aute | | |
| Kemp default | elektrina áno/nie, Camping Card (platí len do 15. 9.!) | | krok 04 Kempy |
| Sprchy/wc info | text | | |

## Bez auta (tretia voľba)
Flybus/Strætó + denné výlety z Reykjavíku so živými cenami z **viator** (Golden Circle ~ 10 000 ISK/os., South Coast ~ 15 000, Jökulsárlón ~ 25 000) – krok 05 = Výlety.

## Porovnanie („prečo")
Rozbalí tabuľku: prenájom, poistenie, extras, palivo, ubytovanie/kempy, strava (rozdiel kvôli kuchynke), celkom, /os., + neceňové faktory (pohodlie, počasie v septembri, flexibilita, hluk).

## Stavy
- Bez itinerára: km z presetu podľa dní („Ring 10 dní ≈ 2 100 km, odhad").
- Bez letu: dni = min dní.
- Vozidlo bez 4×4 a itinerár s F-cestou: červené varovanie s odkazom na deň.

## Dáta
Seed `vehicle_options`, `fuel_prices`; `PUT /api/trips/[id]/vehicle/[scenario]`.

## Akceptačné kritériá
- Zmena triedy prepočíta palivo a celkom < 200 ms; palivo sa zhoduje s km itinerára.
- Zmena voľby v kroku 03 prepne typ krokov 04/05 a sumu v hlavičke; dáta druhej vetvy ostanú.

## Prechod – čo krok hľadá a čo mu chýbalo
**Hľadá:** ceny/deň podľa triedy (seed + odkazy), poistenia, spotrebu, cenu paliva (provider), km z návrhu trasy, kempy pri karavane (krok 04).
**Zlepšenia doplnené do návrhu:**
- **Požiadavky požičovne ako riadok** – vek/prax vodičov (z kroku 01), kreditná karta, depozit (blokácia – nie výdavok, ale likvidita!), km limit (niektoré 100–200 km/deň → pri 2 140 km za 10 dní tesné), palivová politika full-to-full, miesto vyzdvihnutia (pult na KEF vs. shuttle 10 min).
- **Poistenie s vysvetlením** – Gravel (GP) je na Ring Road prakticky nutné (štrkové úseky, odletujúce kamene); Sand & Ash relevantné najmä juh pri vetre (v septembri nižšie riziko – „odporúčané, nie nutné"); **poškodenie dverí vetrom nie je kryté žiadnym poistením** → ⚠ tip v riadku.
- **2WD vs 4×4** – ak itinerár obsahuje F-cestu, 2WD auto je nielen nevhodné, ale **poistenie je neplatné** → tvrdá chyba, nie varovanie.
- **Karavan realisticky** – 4 dospelí v jednom camperi = tesné; app ponúkne riadok „2× 2-os. camper" s cenou a ⚠ „september: noci 3–8 °C → kúrenie (Webasto) nutné"; divoké kempovanie je od 2015 zakázané → noci musia byť v kempoch (krok 04 to vynúti).
- **Bez auta** – riadky Flybus (KEF↔RVK), mestský bus, a napojenie na krok 05 Výlety; ukáže sa, že 4 osoby × výlety sú typicky drahšie než auto → porovnanie v rozhodovacom riadku.
- **Palivo** – riadok ukáže, že medzi Vík a Höfn / vo východných fjordoch sú úseky > 100 km bez stanice; do kroku 05 sa pridajú ⛽ zastávky.
- **Rezervovať kedy** – september je ešte sezóna, autá/karavany dražejú posledné 2 mesiace → odporúčanie „rezervovať do {dátum}" (položka v časovej osi platieb).

## Na čo nezabudnúť
- ☐ vek/prax vodičov vyhovuje · ☐ kreditná karta na depozit (výška!) · ☐ Gravel poistenie · ☐ km bez limitu · ☐ 2. vodič nahlásený · ☐ fotky auta pri prevzatí (škrabance) · ☐ full-to-full · ☐ karavan: kúrenie, plyn, voda, bielizeň, čo je v cene · ☐ dvere vs. vietor · ☐ tunel Vaðlaheiði platba online do 24 h · ☐ rezervovať do dátumu
