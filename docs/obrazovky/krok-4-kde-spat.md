# Krok 5 · Kde spať  *(od ADR-014 je to krok 05; súbor si necháva pôvodný názov)* – Ubytovanie (Auto) / Kempy (Karavan) / Základňa (Bez auta)

**Berie z krokov:** 02 noci a dátumy, 03 vetva (typ nocí) a vozidlo, návrh trasy na pozadí (región každej noci), 01 pax.
**Dáva ďalej:** kuchynka per noc → 07 strava; miesta nocí (súradnice) → 05 itinerár; ceny → 08.

**Zbalený riadok:** `● 04 Ubytovanie · 9 nocí · 1 520 – 2 100 € (rozpätie) · 6× kuchynka` (po vložení ponúk: `1 690 € · 1 odhad`) · vetva Karavan: `04 Kempy · 9 nocí · Camping Card ✗ · 720 €` · Bez auta: `04 Základňa · Reykjavík · 9 nocí · 2 izby · 1 980 €`
**Riadok vstupov:** `z kroku 02: 9 nocí 12.–21. 9. · z kroku 03: Kombi (bez kuchynky) · regióny z návrhu trasy Ring Road 10 dní`
**Pravidlá, ktoré app aplikuje samo (a ukáže ako riadky s ⚠):**
- prílet po 20:00 → noc 1 pri KEF (Keflavík/Reykjanesbær), nie v Reykjavíku;
- odlet pred 10:00 → posledná noc ≤ 45 min od KEF;
- kemp so zatvorením pred dátumom noci (mnohé zatvárajú 15.–30. 9.) → ⚠ a náhrada;
- 4 osoby → hľadá „2 izby" alebo „apartmán 4+" alebo „4 lôžka" (hostel), prepínateľné.
**Filtre:** typ [Airbnb][Hotel][Penzión][Hostel][Sleeping-bag] (auto) / [Kemp][Camping Card sieť][s elektrinou][otvorené v sept] (karavan) · ≤ €/os · ★ · kuchynka · parkovanie · ≤ km od trasy · viac
**ListRow (noc):** `[03] Noc 3 · Ut 14. 9. · Juh (Vík) | Vík Cottages · penzión · 2 izby · kuchynka ✓ · 1,2 km od trasy · check-in 15–21 | ● ručne (Booking) | 236 € / 59 €/os | [Zmeniť] ▸`
Neobsadená noc (**predvolený stav – stačí rozpätie**): `[03] Noc 3 · Juh (Vík) | penzión/Airbnb pre 4 · rozpätie z regiónu | ● odhad | 160 – 240 € | [Spresniť] ▸` → rozpočet počíta so stredom (200 €) a ukazuje min–max. „Spresniť“ otvorí vnorené riadky: ubytovania v regióne z Overpass (názov · typ · vzdialenosť, bez ceny), predvyplnené linky `Booking: Vík 14.–15. 9., 4 hostia ↗` / `Airbnb ↗`, a `[Vložiť ponuku]` (URL + cena) – až vtedy je noc „presná“. Nikto nemusí vkladať nič – rozpätie stačí na rozhodnutie.
Vetva Karavan – riadok noci z **tjalda** (živé): `Skaftafell · 2 800 ISK/os (senior 2 300) · elektrina 1 500 · daň 400/jednotka · celoročne · drop-in ✓ · ● tjalda 09/26`; hore riadok **Camping Card**: „2 karty × 199 € vs. 9 nocí × 4 os. × ~2 300 ISK = 563 € → oplatí sa / neoplatí".
Vetva Bez auta – 1 riadok ubytovania na všetky noci + riadok „Flybus/transfer".
**Päta:** [+ Pridať ručne] · [Priradiť odhady všetkým] · primárna: **[Pokračovať → 05 Itinerár]** (resp. → 05 Výlety)

---

## Konfigurácie (chipy + sheet „viac")
| Prvok | Typ | Default | Efekt |
|---|---|---|---|
| Vetva | z kroku 03 (Auto → izby, Karavan → kempy, Bez auta → základňa) | | noci sú per vetva (`lodging_stays.scenario_key`) |
| Typy ubytovania | Chips multi | Airbnb, penzión, hostel (úsporný profil) | vyhľadávanie |
| Max cena / os. / noc | slider 15–150 € | 60 € | |
| Min hodnotenie | 3.5 / 4 / 4.5 | 4 | |
| Kuchynka | toggle | áno (úsporná strava) | filter + efekt na stravu |
| Parkovanie zdarma | toggle | áno | |
| Vzdialenosť od trasy | slider 0–50 km | 15 | POI vs. trasa dňa |
| Bezplatné storno | toggle | nie | |
| Súkromná kúpeľňa | toggle | nie | |
| Kapacita | auto z pax (4) → „2 izby / 1 apartmán / 4 lôžka v hosteli" | | |
| Zoradiť | cena · hodnotenie · vzdialenosť | cena | |
| Karavan scenár – kemp: elektrina | toggle | áno | +~ 1 200 ISK/noc |
| Karavan – Camping Card | toggle (globálne) | auto-odporúčanie ak sa oplatí | engine spočíta |
| Noc „bez ubytovania" | toggle per noc (nočný let / v aute) | nie | 0 € |

## Zoznam nocí (ľavý panel)
- Noc = dátum, deň itinerára, región (z itinerára), stav: ✓ priradené · ! odhad · ✗ chýba.
- Karta priradeného: názov, typ, osoby, cena/noc, kuchynka/parkovanie ikony, `SourceBadge`, „Zmeniť", „Rozdeliť noc na 2 ubytovania" (skupina v dvoch miestach – v2).
- Región sa dá prepísať (napr. chcem spať v Höfn, nie v Skaftafelli) → itinerár dostane návrh presunu prenocovania.
- Hromadné akcie: „Priradiť odhady všetkým prázdnym", „Vymazať všetky", „Skopírovať zo scenára auto → karavan (kde má zmysel)".

## Ponuky (pravý panel)
- Zdroje: izby/Airbnb **bez bezplatného API s cenami** (Hotellook zrušený 10/2025, Amadeus 07/2026) → Overpass (zoznam bez cien), odhad €/noc per región (seed), ručné vloženie ponuky z predvyplneného Booking/Airbnb linku. **Kempy: tjalda API** (ceny 2026, otvorenie, elektrina, sprchy, práčovňa, Parka/drop-in).
- Airbnb: nedá sa vyhľadať → karta „Airbnb: otvoriť vyhľadávanie pre Vík 14.–15. 9., 4 hostia ↗" (predvyplnený link) + „Vložiť ponuku" (URL + cena/noc + poplatky + kuchynka…). Do priradenia platí **odhad z regiónu**.
- Karta ponuky: názov, typ, ★, izby/lôžka, ikony vybavenia, vzdialenosť od trasy (z bodu prenocovania), cena/noc + /os., poplatky (Airbnb service 14 %, upratovanie), `SourceBadge`, „Priradiť", „Otvoriť", „Uložiť do obľúbených".
- Prepnutie na **mapu ponúk** (MapLibre) – piny s cenou, trasa dňa, bod prenocovania.

## Kemp karta (scenár karavan)
Názov, cena/os., elektrina, sprchy (platené?), kuchynka, WC, Camping Card ✓/✗, otvorené do (september – niektoré zatvárajú 15. 9.!), vzdialenosť. Upozornenie ak kemp v septembri zatvorený.

## Výpočet zobrazený hore
`9 nocí · 1 690 € · 422 €/os. · z toho odhady 210 €` + rozdiel oproti druhému scenáru.

## Stavy
- Bez letu: noci sa odvodia z „min dní" (8) s poznámkou „po výbere letu sa dátumy upresnia"; ponuky sa hľadajú bez dátumu (cache priemer).
- Bez ponuky: „Východné fjordy – odhad 190 €/noc; otvor Booking/Airbnb link a vlož 1 ponuku".

## Dáta
`GET /api/places/near?region&kind=lodging|campsite` (overpass, cache 30 d) · `PUT /api/trips/[id]/stays/[night]` · `POST /api/trips/[id]/lodging/manual` · predvyplnené linky Booking/Airbnb/tjalda.is.

## Akceptačné kritériá
- Každá noc má stav a cenu (reálnu alebo odhad); súčet sa zhoduje s rozpočtom.
- Zmena kuchynky pri priradení sa prejaví v strave (toast „Strava −24 €").
- Airbnb odkaz sa otvára s predvyplnenými dátumami, lokalitou a počtom hostí.

## Prechod – čo krok hľadá a čo mu chýbalo
**Hľadá:** kempy s cenami, otvorením, službami a Parka rezerváciou (**tjalda**, 154 kempov), ubytovania bez cien (Overpass), odhad z regiónu, ručne vložené ponuky (Booking/Airbnb link s dátumami a 4 hosťami); kuchynku; vzdialenosť od miesta poslednej zastávky. Camping Card 2026: ~ 26 000 ISK, **platí len do 15. 9.**, 30 kempov, max 4 noci/kemp, 2 dospelí/karta → pri 4 dospelých a ceste po 15. 9. sa neoplatí – engine to spočíta.
**Zlepšenia doplnené do návrhu:**
- **Noc 1 a posledná noc podľa letu** – automatické pravidlo (prílet po 20:00 → noc pri KEF; odlet pred 10:00 → posledná noc ≤ 45 min od KEF), ako riadok s ⚠, nie tichá zmena.
- **Check-in okno** – riadok ponuky nesie check-in hodiny; ak plán dňa (krok 05) prichádza po ich konci → ⚠ „self check-in?" (Airbnb často áno, penzióny nie).
- **Kempy zatvárajú** – september je koniec sezóny; pole `open_until` pri kempe a ⚠ ak noc je po ňom; **Camping Card platí len do 15. 9.** (overené 2026).
- **Sleeping-bag ubytovanie** („svefnpokapláss") – lacnejšia izba bez posteľnej bielizne; filter + položka „spacák so sebou" do balenia.
- **Skupina 4** – prepínač „2 dvojlôžkové / 1 apartmán / 4 lôžka v hosteli" ovplyvňuje hľadanie a delenie ceny na osobu.
- **Práčovňa** – pri 10 dňoch riadok „práčovňa v noci 5–6" (kempy ju majú, penzióny nie) → filter.
- **Polárna žiara** – noci mimo mesta dostanú štítok „tmavá obloha ✓" (ak september); tip v riadku.
- **Storno** – filter „bezplatné storno" a v časovej osi platieb dátum, dokedy sa dá zrušiť (zmena letu, počasie).
- **Airbnb poplatky** – service fee ~ 14 % + upratovanie sa vždy pripočítajú, aby /os./noc sedelo s realitou.

## Na čo nezabudnúť
- ☐ noc 1 a posledná noc vs. časy letu · ☐ check-in hodiny vs. príchod · ☐ kuchynka (kvôli strave) · ☐ parkovanie zdarma · ☐ kempy otvorené · ☐ Camping Card oplatí sa? · ☐ práčovňa v strede cesty · ☐ storno termíny do kalendára · ☐ sleeping-bag = spacák · ☐ adresa + telefón do PDF (offline)
