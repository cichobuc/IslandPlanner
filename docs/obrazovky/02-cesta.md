# 02 · Obrazovka Cesta – checklist 8 krokov

> **ADR-014:** 04 = Itinerár, 05 = Kde spať (v texte nižšie sú čísla pôvodné, obsah platí).

**Route:** `/cesta/[id]#krok-N` · Jedna strana. Vzor v [00-vzor.md](00-vzor.md). Detail každého kroku v `krok-*.md`.

## Celá strana (iPad portrait 820) – vetva Auto, krok 3 práve uzavretý
```
┌──────────────────────────────────────────────────────────────────────┐
│ ‹ Cesty  ISLAND · SEPTEMBER 2027   12.–21. 9. · 10 dní · 4 os.   ⋯   │
│ 4 680 €   1 170 €/os          [Auto ▾] [⚡ Navrhnúť] [🗺 Mapa]     │
├──────────────────────────────────────────────────────────────────────┤
│ ● 01 Cestujúci & letiská  4 dospelí · BA · VIE BUD KTW BTS PRG     ▸ │
│ ● 02 Letenky              VIE 12.–21. 9. · priamy · 9 nocí  1 180 € ▸ │
│ ● 03 Doprava              Auto · Kombi · 10 dní · palivo     890 € ▾ │
│      z kroku 02: 10 dní 12.–21. 9. · pickup KEF 09:30 · return 12:00 │
│      [ Auto ✓ ]   [ Karavan ]   [ Bez auta ]   Porovnať ≈ A 4 680 · B 4 910 │
│      ▣ Dacia Jogger · Kombi   78 €/d · 6,5 l · 7 miest     780 € ✓    │
│        Poistenie SCDW ✓ Gravel ✓ · Extras 2. vodič ✓                 │
│      ▣ Dacia Duster 4×4        92 €/d · 7,0 l diesel       920 €      │
│      ⛽ Palivo · 2 140 km z návrhu trasy                    303 € odhad│
│      [+ ručne]                        [Pokračovať → 04 Ubytovanie]   │
│ ○ 04 Ubytovanie           9 nocí z kroku 02 · regióny z návrhu trasy ▸ │
│ ○ 05 Itinerár             návrh: Ring Road 10 dní · upresníš po 04    │
│ ○ 06 Atrakcie             čaká na krok 05                             │
│ ○ 07 Strava               čaká na krok 04 (kuchynka)                  │
│ ○ 08 Rozpočet             priebežne: 4 680 € (odhad)                  │
└──────────────────────────────────────────────────────────────────────┘
```
Vetva **Karavan**: krok 04 = „Kempy" (noc = kemp · elektrina · Camping Card), 07 Strava má kuchynku každý deň.
Vetva **Bez auta**: 04 = „Základňa" (1 ubytovanie v Reykjavíku na všetky noci), 05 = „Výlety" (Golden Circle, South Coast, Jökulsárlón… z Reykjavíku, cena/os.).

## Hlavička
| Prvok | Popis |
|---|---|
| ‹ Cesty | späť na zoznam |
| Názov + dátumy + dni + osoby | dátumy sa objavia po kroku 2; klik na názov = premenovať |
| Suma | aktívny scenár; pod ňou /os.; rozsah min–max ak sú odhady; klik → krok 8 |
| [Auto ▾] | voľba z kroku 3 (Auto / Karavan / Bez auta); zmena = návrat na krok 3, kroky 4–8 sa prepnú na druhú vetvu (dáta oboch vetiev sa uchovávajú) |
| ⚡ Navrhnúť cestu pre všetkých | jeden sheet: posuvník cena ↔ preferencie + parametre → kandidáti s kompromismi per člen → Použiť (kaskáda + DiffToast) |
| 🗺 Mapa | overlay ([03-mapa.md](03-mapa.md)) |
| ⋯ | Členovia · História zmien · Uložiť ako šablónu · Exportovať · Nastavenia · Duplikovať · Archivovať |
| Stavový pás | len ak treba: staré ceny, varovania itinerára, chýbajúce dátumy narodenia |

## Stavy krokov
| Ikona | Význam | Príklad |
|---|---|---|
| ○ | prázdny | žiadny let vybraný |
| ● | rozpracovaný / má odhady | ubytovanie s 1 odhadom |
| ✓ | hotový (žiadne odhady, nič nechýba) | letenky overené |
| ! | problém | deň > 5 h jazdy, F-cesta bez 4×4, kemp zatvorený |

## Reťazenie (čo krok dostane a čo posiela ďalej)
| Krok | Dostane | Pošle ďalej | Kaskáda pri zmene |
|---|---|---|---|
| 02 Letenky | letiská, pax, mesiac, rozsah dní, batožina | **dátumy, dni, noci**, časy príletu/odletu, parkovanie dni | zmena letu → 03 dni prenájmu, 04 noci (pridá/odoberie noc na konci), 05 pregeneruje nezamknuté dni, 07 dni |
| 03 Doprava | dni, časy letu, pax (sedadlá), záujmy (4×4?) | **vetva** (auto/karavan/bez auta), vozidlo, spotreba, 4×4, kuchynka=áno pri karavane | zmena vetvy → 04 prepne typ nocí, 05 prepne itinerár/výlety, 07 kuchynka |
| 04 Kde spať | noci, typ (izby/kempy/základňa), regióny z návrhu trasy | kuchynka per noc, ceny nocí, miesta nocí (súradnice) | zmena miesta noci → 05 návrh presunu prenocovania |
| 05 Itinerár / Výlety | dni, časy letu, 4×4, miesta nocí, záujmy, tempo, klenoty | km → 03 palivo, zastávky → 06, dni v aute → 07 | zmena trasy → 04 návrh (nie prepis), 03 palivo, 06 zoznam v pláne |
| 06 Atrakcie | zastávky, veky cestujúcich, cieľový mesiac | vstupné, rezervácie (časy) → 05 sloty | pridanie do dňa → 05 prepočet dňa |
| 07 Strava | dni, kuchynka per noc, dni v aute, prvý/posledný deň podľa letu | strava | – |
| 08 Rozpočet | všetko | export | – |

Kým chýba vstup, krok je stlmený s textom „čaká na krok 0N". Každý krok ukazuje svoj **riadok vstupov** („z kroku 02: …") s odkazmi späť.
Po kliknutí „Pokračovať → 0N" sa krok uzavrie (✓ alebo ● ak sú v ňom odhady) a ďalší sa rozbalí.

## Krok – dokumenty
| # | Súbor |
|---|---|
| 1 | [krok-1-cestujuci-a-letiska.md](krok-1-cestujuci-a-letiska.md) |
| 2 | [krok-2-letenky.md](krok-2-letenky.md) |
| 3 | [krok-3-doprava.md](krok-3-doprava.md) |
| 4 | [krok-4-kde-spat.md](krok-4-kde-spat.md) – Ubytovanie / Kempy / Základňa podľa vetvy |
| 5 | [krok-5-itinerar.md](krok-5-itinerar.md) – Itinerár (Auto, Karavan) / Výlety (Bez auta) |
| 6 | [krok-6-atrakcie.md](krok-6-atrakcie.md) |
| 7 | [krok-7-strava.md](krok-7-strava.md) |
| 8 | [krok-8-rozpocet.md](krok-8-rozpocet.md) |
