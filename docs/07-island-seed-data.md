# 07 · Island – seed dáta (regióny, atrakcie, ceny)

Orientačné ceny k **09/2026**, kurz ~ 1 € ≈ 147 ISK. Každá položka v `seed/pois.json` musí mať `verified_at` a `source_url`.
Toto je **východiskový zoznam** (~ 80 POI), nie kompletný katalóg; používateľ ho vie rozšíriť v UI.
Popisy (SK/CS) sa dopíšu pri implementácii seedu – tu je štruktúra a kľúčové čísla.

## Regióny (poradie v smere hodinových ručičiek po Ring Road)
| slug | Názov | Typické noci | Poznámka |
|---|---|---|---|
| `reykjanes` | Reykjanes (KEF) | 0–1 | prílet/odlet, Blue Lagoon, Fagradalsfjall |
| `reykjavik` | Reykjavík | 1–2 | Sky Lagoon, Perlan, Hallgrímskirkja, veľryby |
| `golden_circle` | Golden Circle | 0–1 | Þingvellir, Geysir, Gullfoss, Secret Lagoon, Kerið |
| `south` | Juh (Selfoss–Vík) | 1–2 | Seljalandsfoss, Skógafoss, Sólheimajökull, Reynisfjara, Dyrhólaey |
| `southeast` | Juhovýchod (Kirkjubæjarklaustur–Höfn) | 1–2 | Fjaðrárgljúfur, Skaftafell, Jökulsárlón, Diamond Beach, Stokksnes |
| `eastfjords` | Východné fjordy | 1 | Djúpivogur, Seyðisfjörður, Stuðlagil (odbočka) |
| `north_myvatn` | Mývatn a okolie | 1–2 | Dettifoss, Hverir, Krafla, Mývatn Nature Baths, Húsavík (veľryby) |
| `akureyri` | Akureyri / Eyjafjörður | 1 | Goðafoss, Akureyri, Forest Lagoon, Siglufjörður |
| `north_west` | Severozápad (Skagafjörður–Borgarnes) | 0–1 | Hvítserkur, Kolugljúfur, Grábrók, Deildartunguhver, Hraunfossar |
| `snaefellsnes` | Snæfellsnes | 1 | Kirkjufell, Arnarstapi, Djúpalónssandur, Ytri Tunga (tulene) |
| `westfjords` | Západné fjordy | 2–3 | Dynjandi, Látrabjarg (puffiny do polovice augusta – v septembri už nie), Rauðasandur |
| `highlands` | Vysočina (F-cesty) | 0–1 | Landmannalaugar, Þórsmörk – len 4×4, september podmienečne |

## Presety okruhov
| key | dni | regióny |
|---|---|---|
| `golden_only` | 3–4 | reykjanes → reykjavik (2) → golden_circle → reykjanes; ~400 km |
| `golden_south` | 3–5 | reykjanes → reykjavik → golden_circle → south → (southeast po Jökulsárlón pri 5) → reykjanes |
| `golden_west` | 3–5 | reykjanes → reykjavik → golden_circle → snaefellsnes (2) → reykjanes; ~650 km |
| `south_only` | 4–6 | reykjanes → south (2) → southeast po Jökulsárlón (2) → späť; bez Golden Circle, ~900 km |
| `south_west` | 5–7 | reykjanes → south (2) → golden_circle → snaefellsnes (2) → reykjavik → reykjanes; ~1 050 km |
| `south_east` | 6–7 | + southeast po Stokksnes, späť tou istou cestou |
| `ring` | 8–12 | reykjanes → golden_circle → south → southeast → eastfjords → north_myvatn → akureyri → north_west → reykjavik → reykjanes |
| `ring_snaefellsnes` | 10–13 | ring + snaefellsnes pred Reykjavíkom |
| `ring_westfjords` | 13+ | ring_snaefellsnes + westfjords |
Ring Road ≈ 1 330 km; so zachádzkami typicky **1 900–2 400 km** za 10 dní.
Okruh sa volí v kroku 04 (`trip.route_preset` = `auto` | kľúč); **hodnotenie okruhu** pre cestu (`ratePreset`): dni 40 b. (v rozsahu; −20/deň pri krátkej ceste, −10/deň navyše), jazda vs. tempo 30 b. (km/deň ≤ 0,8× tempa 30, ≤ 1× 25, ≤ 1,25× 15), záujmy 30 b. (podiel záujmov cesty, ktoré majú POI s váhou ≥ 3 alebo ≥ 35 % váhy v regiónoch okruhu). Hviezdičky = skóre / 20; „odporúčané“ = najvyššie skóre, pri zhode Auto podľa dní.

## Atrakcie – výber (vstupné = dospelý, ISK ak nie je uvedené inak)

### Termálne kúpele (záujem `thermal`)
| POI | Región | Vstupné | Vek. pravidlá | Trvanie | Rezervácia |
|---|---|---|---|---|---|
| Blue Lagoon (Comfort) | reykjanes | od ~ 11 990 ISK (~ 82 €), dynamicky | 0–1 zdarma, 2–13 zdarma s dospelým, 14+ plné | 2–3 h | áno, online |
| Sky Lagoon (Pure) | reykjavik | ~ 13 990 ISK (~ 95 €) | 12+ (mladší nevpustení) | 2–3 h | áno |
| Secret Lagoon (Flúðir) | golden_circle | ~ 4 200 ISK | 0–13 zdarma, 14–17 ~ 2 000 | 1–1,5 h | odporúčané |
| Laugarvatn Fontana | golden_circle | ~ 6 900 ISK | 0–12 zdarma, 13–16 ~ 3 500, senior 67+ ~ 5 000 | 1,5 h | nie |
| Mývatn Nature Baths | north_myvatn | ~ 7 900 ISK, senior 67+ ~ 5 200 | 0–12 zdarma, 13–15 ~ 3 500 | 1,5–2 h | odporúčané |
| Forest Lagoon (Akureyri) | akureyri | ~ 7 990 ISK | 12+ (mladší v sprievode) | 1,5–2 h | odporúčané |
| Vök Baths (Egilsstaðir) | eastfjords | ~ 7 990 ISK | 0–11 zdarma, 12–15 ~ 4 000 | 1,5 h | odporúčané |
| Krauma (Deildartunguhver) | north_west | ~ 7 900 ISK | 0–11 zdarma, 12–15 ~ 3 950 | 1,5 h | nie |
| Hrunalaug / Reykjadalur (horúca rieka) | golden_circle | dobrovoľné ~ 1 000 / parkovné ~ 1 000 | – | 1 h / 3 h (túra 3 km) | nie |
| Seljavallalaug | south | zdarma | – | 1 h (túra 20 min) | nie |

### Ľadovce (`glacier`)
| POI | Región | Cena | Vek | Trvanie | Poznámka |
|---|---|---|---|---|---|
| Sólheimajökull glacier walk | south | ~ 14 990 ISK (~ 100 €) | 8+ / 10+ | 3 h | poskytovateľ Arctic Adventures/Troll |
| Skaftafell (Vatnajökull) glacier hike | southeast | ~ 15 990–19 990 ISK | 8+ | 3–5 h | + parkovné 1 000 ISK |
| Katla ice cave (super jeep z Víku) | south | ~ 24 990 ISK (~ 170 €) | 6+ | 3–4 h | celoročne |
| Jökulsárlón – zodiac / amphibian boat | southeast | amphibian ~ 6 900, zodiac ~ 14 500 ISK | 6+ / 10+ | 40 min / 75 min | sezóna do konca septembra (amphibian) |
| Jökulsárlón + Diamond Beach (bez lode) | southeast | 0 + parkovné 1 000 ISK/auto | – | 1–1,5 h | |
| Fjallsárlón | southeast | 0 (parkovné) | – | 45 min | |
| Svínafellsjökull vyhliadka | southeast | 0 | – | 30 min | |
| Into the Glacier (Langjökull tunel) | north_west | ~ 19 900 ISK | – | 3–4 h | |
| Perlan – ice cave + Wonders of Iceland | reykjavik | ~ 5 490 ISK, 6–15 ~ 2 990, 0–5 zdarma | | 1,5–2 h | |

### Veľryby, puffiny, lode (`wildlife`)
| POI | Región | Cena | Vek | Trvanie |
|---|---|---|---|---|
| Húsavík whale watching (North Sailing / Gentle Giants) | north_myvatn | ~ 13 500 ISK (~ 92 €), 7–15 ~ 6 500, 0–6 zdarma | | 3 h |
| Reykjavík whale watching (Elding / Special Tours) | reykjavik | ~ 13 900 ISK, 7–15 ~ 6 950, 0–6 zdarma | | 3–3,5 h |
| Akureyri whale watching | akureyri | ~ 13 500 ISK | | 3 h |
| Ytri Tunga (tulene) | snaefellsnes | 0 (parkovné ~ 750) | | 30–45 min |
| Puffiny | – | **v septembri už odleteli** (koniec augusta) – generátor upozorní | | |
| Seal Center Hvammstangi | north_west | ~ 1 500 ISK | | 45 min |

### Príroda zadarmo (`nature`, `hike`) – len parkovné
| POI | Región | Parkovné/auto | Trvanie | Poznámka |
|---|---|---|---|---|
| Þingvellir | golden_circle | 1 000 ISK | 1,5–2 h | UNESCO, Silfra snorkel ~ 19 990 ISK (voliteľne) |
| Geysir / Strokkur | golden_circle | 0 | 45 min | |
| Gullfoss | golden_circle | 0 | 45 min | |
| Kerið kráter | golden_circle | vstup 600 ISK/os. (0–12 zdarma) | 30 min | |
| Seljalandsfoss + Gljúfrabúi | south | 1 000 ISK | 1 h | pršiplášť |
| Skógafoss | south | 1 000 ISK (2024+) | 1 h (+ schody 45 min) | |
| Sólheimasandur vrak lietadla | south | 0 (shuttle ~ 2 000 ISK/os. voliteľne) | 2–3 h pešo | |
| Dyrhólaey | south | 0 | 45 min | |
| Reynisfjara | south | 1 000 ISK | 45 min | pozor na vlny |
| Fjaðrárgljúfur | southeast | 1 000 ISK | 1 h | |
| Skaftafell – Svartifoss túra | southeast | 1 000 ISK | 2 h | |
| Vestrahorn / Stokksnes | southeast | 1 000 ISK/os. (Viking café) | 1 h | |
| Hvalnes | eastfjords | 0 | 20 min | |
| Stuðlagil kaňon | eastfjords | 0 (~ 1 000 parkovné na východnom brehu) | 1,5–2 h | zachádzka 60 km |
| Dettifoss (západ, cesta 862) | north_myvatn | 1 000 ISK | 1 h | |
| Hverir / Námaskarð | north_myvatn | 1 000 ISK | 45 min | |
| Krafla / Víti | north_myvatn | 0 | 45 min | |
| Grjótagjá, Dimmuborgir, Hverfjall | north_myvatn | 0 / 0 / 0 | 20 min / 1 h / 1,5 h | |
| Goðafoss | akureyri | 0 | 45 min | |
| Hvítserkur | north_west | 0 | 30 min | štrková cesta |
| Kolugljúfur | north_west | 0 | 30 min | |
| Hraunfossar / Barnafoss | north_west | 0 | 30 min | |
| Grábrók | north_west | 0 | 30 min | |
| Kirkjufell / Kirkjufellsfoss | snaefellsnes | 1 000 ISK | 45 min | |
| Arnarstapi – Hellnar pobrežná túra | snaefellsnes | 0 | 1,5 h | |
| Djúpalónssandur | snaefellsnes | 0 | 45 min | |
| Búðakirkja | snaefellsnes | 0 | 20 min | |
| Fagradalsfjall lávové pole | reykjanes | 1 000 ISK | 2–4 h túra | podľa aktivity sopiek |
| Reykjadalur horúca rieka | golden_circle | 1 000 ISK (Parka) | 3 h | |

### Mestá, múzeá (`culture`)
| POI | Cena | Trvanie |
|---|---|---|
| Hallgrímskirkja veža | ~ 1 400 ISK, 7–16 ~ 200 | 30 min |
| Harpa | 0 | 30 min |
| Lava Show Reykjavík / Vík | ~ 6 900 ISK, deti 3–12 ~ 3 500 | 1 h |
| Skógar Museum | ~ 3 000 ISK, senior 67+ ~ 2 500, 0–11 zdarma | 1 h |
| Akureyri – Botanická záhrada | 0 | 45 min |
| Seyðisfjörður (modrý kostol, dúhová ulica) | 0 | 1 h |


## Izby / Airbnb – rozpätia per región × typ (seed pre `lodging-estimate`, 4 dospelí, september 2026)
Predvolený výsledok kroku 05 vo vetve Auto; presná ponuka je voliteľné spresnenie. Overovať 2× ročne podľa Booking/Airbnb.
Penzión = 2 dvojlôžkové izby (často spoločná kúpeľňa), Airbnb = celý byt/chata pre 4, hostel = 4 lôžka (dorm alebo 4-lôžková izba), hotel = 2 izby.
**Prepísané 20. 9. 2026** – pôvodné rozpätia (160–260 €) boli ~40 % pod realitou Bookingu.
| Región | Airbnb/apartmán 4 os. | Penzión 2 izby | Hostel 4 lôžka | Hotel 2 izby |
|---|---|---|---|---|
| Reykjavík | 270–400 € | 300–440 | 190–260 | 420–600 |
| Reykjanes (KEF) | 250–370 | 280–410 | 180–240 | 380–540 |
| Golden Circle | 240–360 | 280–410 | 170–240 | 380–540 |
| Juh (Selfoss–Vík) | 250–380 | 290–430 | 180–250 | 400–570 |
| Juhovýchod (Höfn) | 270–400 | 310–460 | 190–260 | 430–620 |
| Východné fjordy | 220–330 | 260–380 | 160–220 | 340–490 |
| Mývatn | 250–370 | 290–420 | 170–240 | 390–560 |
| Akureyri | 230–340 | 270–390 | 160–230 | 360–510 |
| Severozápad | 220–330 | 260–380 | 160–220 | 340–490 |
| Snæfellsnes | 240–350 | 280–400 | 160–230 | 370–520 |
| Westfjords | 220–320 | 250–370 | 150–210 | 330–470 |
| Vysočina (chaty) | – | 300–440 | 240–320 | – |

**Sezónny faktor** (`LODGING_SEASON_FACTOR`, násobí rozpätie podľa mesiaca noci): jan–feb 0,75 · mar–apr 0,85 · máj 0,95 · jún 1,15 · júl–aug 1,3 · **sep 1,0** · okt 0,85 · nov 0,75 · dec 0,85.
Škálovanie na osoby: 4 os. = 1×, +1 izba na každé 2 osoby (3 os. = 1×, 2 os. = 0,5×).
Sleeping-bag izby (svefnpokapláss) ≈ −30 %; Airbnb + service fee ~ 14 % a upratovanie 30–60 € sú v rozpätí započítané.
V kroku 05 sa dá jedným klikom nastaviť štandard pre všetky odhadované noci (hostel / penzión / Airbnb / hotel); presná ponuka prepíše odhad.

## Kempy (vetva karavan) – seed je len záloha, živé dáta dáva `tjalda` konektor (docs/04)
| Kemp | Región | Cena/os./noc | Elektrina | Camping Card |
|---|---|---|---|---|
| Reykjavík Campsite (Laugardalur) | reykjavik | ~ 3 200 ISK | ~ 1 300 | nie |
| Þingvellir | golden_circle | ~ 2 000 | – | nie |
| Skógar / Vík (Vík Camping) | south | ~ 2 500 | ~ 1 200 | nie |
| Skaftafell | southeast | ~ 2 400 | ~ 1 500 | nie |
| Höfn | southeast | ~ 2 200 | ~ 1 200 | áno |
| Egilsstaðir / Seyðisfjörður | eastfjords | ~ 2 200 | ~ 1 000 | áno |
| Mývatn (Hlíð / Bjarg) | north_myvatn | ~ 2 500 | ~ 1 200 | nie |
| Akureyri (Hamrar) | akureyri | ~ 2 200 | ~ 1 200 | áno |
| Grundarfjörður / Ólafsvík | snaefellsnes | ~ 2 000 | ~ 1 000 | áno |
Camping Card: ~ 199 € (2 dospelí + deti, 28 nocí) – pri 4 dospelých treba 2 karty → oplatí sa až od ~ 10 nocí v sieti; engine to spočíta.
Kempovacia daň ~ 333 ISK/os./noc.

## Ostatné seed čísla
| Položka | Hodnota |
|---|---|
| Palivo (09/2026) | benzín ~ 320 ISK/l, diesel ~ 315 ISK/l |
| Spotreba | economy 6,0 l/100 km · kombi 6,5 · SUV 2WD 7,5 · 4×4 Duster 7,0 (diesel) · camper VW 8,5 · 4×4 camper 10 · **obytné auto (trieda `motorhome`: WC, sprcha, kúrenie – Happy 4, Sunlight T69) 11** |
| Vaðlaheiði tunel | 1 990 ISK / prejazd (platí sa online do 24 h) |
| Cestovné poistenie | ~ 15–30 €/os. (seed 20 €) |
| eSIM 10 GB | ~ 15 €/os. (seed) |
| Slnko september | 1. 9.: 06:10–20:45 · 15. 9.: 06:50–19:50 · 30. 9.: 07:30–18:55 |
| Nocľah na hube (self-transfer) | LON ~ 90 €/izba, BER ~ 80 €, CPH ~ 110 € (seed) |

## Formát `seed/pois.json` (príklad)
```json
{
  "slug": "skogafoss",
  "kind": "attraction",
  "category_tags": ["waterfall", "nature", "hike"],
  "region": "south",
  "name": "Skógafoss",
  "description_sk": "Jeden z najväčších vodopádov Islandu, 60 m vysoký a 25 m široký. Po schodoch (527) sa dá vyjsť na vyhliadku nad vodopádom, odkiaľ začína túra Fimmvörðuháls.",
  "description_cs": "Jeden z největších vodopádů Islandu, 60 m vysoký a 25 m široký. ...",
  "tips_sk": "Príď skoro ráno alebo po 17:00, cez deň sú tu autobusy. Pri slnku vidno dvojitú dúhu.",
  "lat": 63.5321, "lng": -19.5114,
  "visit_min": 60, "visit_min_min": 40, "visit_min_max": 120,
  "walk_km": 1.2, "difficulty": "easy",
  "parking_fee": { "amount": 1000, "currency": "ISK" },
  "entry_note_sk": "Vstup zadarmo, parkovné 1 000 ISK/auto cez automat alebo app Parka.",
  "price_rules": [],
  "booking_required": false,
  "season": null,
  "requires_4x4": false,
  "interest_weight": { "nature": 1.0, "hike": 0.6 },
  "facilities": ["toilets", "cafe", "campsite"],
  "photo_url": null,
  "website_url": "https://www.south.is/",
  "verified_at": "2026-09-20",
  "source_url": "..."
}
```

## Dron – zóny, pravidlá, na čo si dať pozor

> Právne detaily **overiť pred cestou** na Samgöngustofa (Icelandic Transport Authority) a Umhverfisstofnun (Environment Agency of Iceland).
> Island uplatňuje EÚ/EASA pravidlá pre bezpilotné lietadlá (nariadenie 2019/947) + vlastné pravidlá pre chránené územia.

### Základné pravidlá (seed pre stránku „Pravidlá pre dron")
| Téma | Pravidlo |
|---|---|
| Registrácia | Dron > 250 g alebo s kamerou → registrácia operátora (EÚ operátor ID zo Slovenska/Česka platí na Islande, stačí nalepiť). Kategória „open" A1/A3 – online skúška z domovskej krajiny platí. |
| Výška | max **120 m** nad terénom |
| Dohľad | len na dohľad (VLOS), nie nad davmi, nie nad ľuďmi bez ich súhlasu; A3: ≥ 150 m od obytných/rekreačných oblastí |
| Letiská | zákaz v CTR (KEF ~ 5 km +, Reykjavík RKV – prakticky celé centrum mesta, Akureyri AEY, Egilsstaðir EGS, Ísafjörður IFJ, Vestmannaeyjar) bez povolenia Isavia |
| Národné parky | **Vatnajökull NP** (Skaftafell, Jökulsárlón, Dettifoss, Askja…): zákaz bez povolenia správy parku; **Þingvellir NP**: zákaz bez povolenia; **Snæfellsjökull NP**: zákaz bez povolenia |
| Chránené územia | Mnohé rezervácie (Fjaðrárgljúfur, Dyrhólaey, Gullfoss, Geysir, Reynisfjara okolie, Mývatn–Laxá) majú zákaz alebo obmedzenia; povolenie od Umhverfisstofnun (žiadosť online, dopredu) |
| Súkromné pozemky | Kerið, Blue Lagoon, Sky Lagoon, Skógafoss kemp, Seljalandsfoss (zákaz značený), farmy – rešpektovať značky |
| Vtáky | Hniezdenie máj–august: zákaz/obmedzenia v kolóniách (Látrabjarg, Dyrhólaey, Ingólfshöfði); v septembri už menej kritické, ale rešpektovať |
| Poistenie | Zodpovednosť odporúčaná (na Islande nie je pre open kategóriu povinná, ale drahé škody) |
| Zvieratá | Nelietať nad ovcami, koňmi, tuleňmi (Ytri Tunga), sobmi na východe |

### Na čo si dať pozor (checklist pred letom)
1. **Vietor** – najčastejšia príčina straty drona; nad 10 m/s nelietať (vedur.is predpoveď, nárazy v kaňonoch a pri vodopádoch).
2. **Chlad a batérie** – v septembri 3–10 °C; batérie zohriať vo vrecku, počítať s –30 % dolet.
3. **Vodná triešť** – vodopády (Skógafoss, Dettifoss, Gullfoss) zmáčajú dron do 100 m; senzory mokré = nekontrolovaný let.
4. **Soľ a piesok** – čierne pláže (Reynisfjara, Diamond Beach): piesok do motorov; štartovať z podložky.
5. **Magnetické rušenie** – čadič a láva rušia kompas; kalibrovať ďalej od lávy, štartovať z ruky nad kovom nikdy.
6. **GPS a slnko** – na severe horší GPS fix; nízke slnko oslepuje senzory.
7. **Ľudia** – na populárnych miestach nie je možné dodržať odstup → lietať skoro ráno / večer.
8. **Značky** – ikona preškrtnutého drona = zákaz, aj keď to app nemá v dátach → nahlásiť v app (tlačidlo „Nahlásiť zákaz").
9. **Diaľnica a cesta 1** – nelietať nad cestou, autá vodičov rozptyľujú.
10. **Rešpekt** – hluk v tichej prírode; nad kúpeľmi a ľuďmi vo vode nikdy.

### Zóny (seed `seed/drone_zones.geojson`)
| Zóna | Typ | Status | Poznámka |
|---|---|---|---|
| CTR Keflavík | airport_ctr | banned | kruh ~ 8 km + prístupové koridory; Reykjanes lávové polia čiastočne |
| CTR Reykjavík (RKV) | airport_ctr | banned | pokrýva centrum Reykjavíku, Sky Lagoon, Perlan |
| CTR Akureyri | airport_ctr | banned | mesto Akureyri, Forest Lagoon |
| CTR Egilsstaðir / Ísafjörður / Vestmannaeyjar | airport_ctr | banned | |
| Vatnajökull NP | national_park | permit | Skaftafell, Jökulsárlón, Diamond Beach, Fjallsárlón, Dettifoss, Askja |
| Þingvellir NP | national_park | permit | |
| Snæfellsjökull NP | national_park | permit | Djúpalónssandur, Lóndrangar |
| Fjaðrárgljúfur | nature_reserve | banned | |
| Dyrhólaey | bird_sanctuary | seasonal banned (máj–jún), inak restricted | |
| Gullfoss, Geysir | nature_reserve | banned | |
| Mývatn–Laxá | nature_reserve | permit | vtáčia oblasť |
| Blue Lagoon, Sky Lagoon, Kerið, Seljalandsfoss | private_ban | banned | |
| Reynisfjara | – | restricted | mimo ľudí, brzy ráno; okolie Dyrhólaey banned |
| Stuðlagil, Hvítserkur, Kolugljúfur, Stokksnes (Viking café povoľuje za poplatok), Hraunfossar, Kirkjufell (mimo davov) | – | allowed / restricted | overiť značky |
| Highlands (Landmannalaugar – Fjallabak rezervácia) | nature_reserve | permit | |

Vrstva na mape: červená (banned), oranžová (permit), žltá (restricted), zelená (allowed – len POI so `drone_status=allowed`), sivá (unknown).

## Menej známe miesta (hidden gems) – výber do seedu
| POI | Región | Prečo | Popularity | Dron |
|---|---|---|---|---|
| Gjáin (Þjórsárdalur) | south/highlands | údolie vodopádov ako z Pána prsteňov, 4×4 posledné km | 2 | allowed |
| Háifoss | south | 2. najvyšší vodopád, štrková cesta | 2 | allowed |
| Nauthúsagil | south | úzky kaňon s vodopádom, mokrá túra | 1 | restricted |
| Kvernufoss | south | 5 min od Skógafoss, dá sa ísť za vodopád, takmer prázdno | 2 | allowed |
| Þakgil | south | kemp v kaňone, túry | 1 | allowed |
| Múlagljúfur | southeast | kaňon s výhľadom na ľadovec, 2 h túra | 2 | permit (Vatnajökull NP okraj – overiť) |
| Hoffellsjökull / Hoffell horúce vane | southeast | ľadovec bez turistov, vane ~ 1 500 ISK | 1 | permit |
| Klifbrekkufossar (Mjóifjörður) | eastfjords | štrková cesta do fjordu, 7-stupňový vodopád | 1 | allowed |
| Hengifoss + Litlanesfoss | eastfjords | 2,5 h túra, červené vrstvy | 2 | allowed |
| Rjúkandi | eastfjords | vodopád priamo pri Ring Road, prázdno | 2 | allowed |
| Aldeyjarfoss | north_myvatn | čadičové stĺpy, štrk 15 km | 2 | allowed |
| Hvítserkur – tuleňa pláž | north_west | okrem skaly aj tulene | 2 | restricted |
| Glymur (túra 3–4 h) | north_west | 2. najvyšší vodopád, brodenie | 2 | allowed |
| Rauðfeldsgjá | snaefellsnes | úzka rozsadlina | 2 | allowed |
| Bjarnarfoss | snaefellsnes | pri ceste, prázdno | 1 | allowed |
| Brúarfoss | golden_circle | modrý vodopád, 3,5 km túra alebo nové parkovisko (~ 1 000 ISK) | 2 | allowed |
| Hjálparfoss | south | 2 vodopády, zadarmo, prázdno | 1 | allowed |
| Stórurð (východ) | eastfjords | túra 4–5 h k tyrkysovým jazierkam medzi balvanmi | 1 | allowed |
| Gerðuberg čadičové stĺpy | snaefellsnes | pri ceste | 1 | allowed |
| Djúpavík (Strandir) | westfjords | opustená továreň, koniec sveta | 1 | allowed |

## Sezónnosť (kedy sa čo oplatí)
| Jav / atrakcia | J | F | M | A | M | J | J | A | **S** | O | N | D | Poznámka |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Polárna žiara | 5 | 5 | 5 | 3 | 1 | – | – | 1 | **3** | 4 | 5 | 5 | september: tmavé noci od ~ 21:00, prvé žiary |
| Puffiny | – | – | – | 2 | 5 | 5 | 5 | 3 | **–** | – | – | – | odlietajú koncom augusta |
| Veľryby | 2 | 2 | 3 | 4 | 5 | 5 | 5 | 5 | **4** | 3 | 2 | 2 | Húsavík sezóna do konca októbra |
| Ľadové jaskyne (prírodné, Vatnajökull) | 5 | 5 | 4 | – | – | – | – | – | **–** | 2 | 5 | 5 | Katla ice cave celoročne (3) |
| Glacier hike | 3 | 3 | 4 | 4 | 5 | 5 | 5 | 5 | **5** | 4 | 3 | 3 | |
| Highlands / F-cesty | – | – | – | – | – | 3 | 5 | 5 | **3** | – | – | – | zatvárajú od polovice septembra |
| Polnočné slnko | – | – | – | – | 3 | 5 | 5 | 2 | **–** | – | – | – | |
| Termálne kúpele | 5 | 5 | 5 | 4 | 4 | 4 | 4 | 4 | **5** | 5 | 5 | 5 | |
| Vodopády | 3 | 3 | 4 | 5 | 5 | 5 | 5 | 5 | **5** | 4 | 3 | 3 | najviac vody máj–jún |
| Túry | – | – | 2 | 3 | 4 | 5 | 5 | 5 | **4** | 3 | – | – | |
| Davy turistov (menej = lepšie) | 4 | 4 | 4 | 4 | 3 | 2 | 1 | 1 | **3** | 4 | 5 | 4 | september = po sezóne, ceny klesajú |
| Ceny ubytovania/auta | 5 | 5 | 4 | 4 | 3 | 2 | 1 | 1 | **3** | 4 | 5 | 4 | (5 = najlacnejšie) |
| Westfjords | – | – | – | 2 | 3 | 5 | 5 | 5 | **4** | 2 | – | – | Dynjandi cesta otvorená |
| Vlk – vietor/búrky (riziko) | 5 | 5 | 4 | 3 | 2 | 1 | 1 | 1 | **2** | 3 | 4 | 5 | (5 = najhoršie) |

Každé POI má vlastné `month_rating` odvodené z týchto radov + individuálnu poznámku; UI pri cieľovom mesiaci ukáže „★★★★☆ september – po sezóne, menej ľudí, vodopády plné, polárna žiara možná".

## Vziať z Bratislavy (seed `bring_items`, orientačné ceny 09/2026, 1 € ≈ 147 ISK)
Island je 2–3× drahší pri potravinách a alkohole; oplatí sa priviezť trvanlivé a ľahké veci. Colné limity (overiť pred cestou): potraviny do **3 kg a 25 000 ISK na osobu**, zákaz surového mäsa, surových mliečnych výrobkov a surových vajec (tepelne spracované balené výrobky – konzervy, salámy vákuovo – zvyčajne OK), alkohol pre osoby 20+: napr. 1 l tvrdý + 0,75 l víno + 3 l pivo (varianty), tabak 200 cigariet. Plynové kartuše do lietadla **nie** (kúpiť tam), LiPo batérie len v príručnej.
| Položka | Cena Island | Cena SK | Úspora/ks | Hmotnosť | Poznámka |
|---|---|---|---|---|---|
| Pivo 0,5 l (obchod/duty free) | 3,5–4,5 € / 2,2 € DF | 1 € | 2,5–3,5 € | 0,5 kg | duty free na KEF je lacnejšie než viezť; limit |
| Víno 0,75 l | 15–25 € | 5 € | 10–20 € | 1,2 kg | limit 0,75–1,5 l |
| Tvrdý alkohol 0,7 l | 40–60 € | 12 € | 30–45 € | 1,2 kg | limit 1 l; duty free KEF ~ 25 € |
| Káva mletá 250 g | 8–10 € | 3 € | 5–7 € | 0,25 kg | |
| Cestoviny 500 g | 2,5 € | 1 € | 1,5 € | 0,5 kg | ťažké – len ak je miesto |
| Ryža 1 kg | 4 € | 1,8 € | 2 € | 1 kg | |
| Instantné polievky / rezance | 2–3 € | 0,6 € | 1,5–2 € | 0,1 kg | výborný pomer úspora/kg |
| Müsli tyčinky, orechy | 2,5 € / 100 g | 1 € | 1,5 € | 0,1 kg | |
| Sušené mäso, saláma vákuovo | 8 € / 100 g | 3 € | 5 € | 0,1 kg | tepelne spracované balené – OK |
| Syr tvrdý 250 g | 7 € | 2,5 € | 4,5 € | 0,25 kg | pasterizovaný balený – OK |
| Korenie, olej v malom, čaj, cukor | 3–5 € | 1 € | 2–4 € | 0,1–0,3 kg | |
| Sušené ovocie, čokoláda | 4 € / 100 g | 1,5 € | 2,5 € | 0,1 kg | |
| Sprchový gél, šampón, zubná pasta | 6–9 € | 2–3 € | 4–6 € | 0,3 kg | tekutiny > 100 ml do podanej |
| Lieky (ibuprofen, náplasti, lekárnička) | 10–15 € | 4 € | 6–10 € | 0,2 kg | lekáreň na Islande drahá a zriedkavá |
| Opaľovací krém 50+ | 15 € | 6 € | 9 € | 0,2 kg | |
| Pršiplášť / pončo | 30–50 € | 10 € | 20–40 € | 0,3 kg | |
| Termoska 0,75 l | 30 € | 12 € | 18 € | 0,4 kg | voda z kohútika zadarmo |
| Rýchloschnúci uterák | 25 € | 8 € | 17 € | 0,2 kg | kúpele prenajímajú za ~ 7 € |
| Čelovka + batérie | 30 € | 10 € | 20 € | 0,1 kg | |
| Spacák (ak sleeping-bag ubytovanie / karavan bez bielizne) | prenájom 30–40 € | vlastný | 30 € | 1,2 kg | |
| Plynová kartuša | 8 € | – | – | – | **nesmie do lietadla** – kúpiť na N1/Bónus |
| Powerbanka, autonabíjačka, kábel | 25–40 € | 10 € | 15–30 € | 0,3 kg | |
Príklad pre 4 osoby na 10 dní: jedlo + hygiena + drobná výstroj z domu ≈ 8–10 kg/os. → úspora ~ 60–90 €/os.; druhá podaná batožina 20 kg u Wizz ~ 45–70 € na dvojicu → **oplatí sa 1 podaná na dvojicu navyše**, engine to spočíta presne podľa vybranej airline. Alkohol: duty free na KEF po prílete je lacnejšie a ľahšie než viezť z BA (okrem vína).
