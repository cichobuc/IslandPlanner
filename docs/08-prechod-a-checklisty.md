# 08 · Prechod krok po kroku – zlepšenia, časová os, balenie, bezpečnosť

Výsledok kontroly „ako to reálne funguje a na čo nesmieme zabudnúť" (20. 9. 2026). Detaily pre každý krok sú v `docs/obrazovky/krok-*.md`
v sekciách **Prechod** a **Na čo nezabudnúť**. Tu je to, čo presahuje jeden krok.

## 1. Reťaz krokov (čo bolo zle a ako je to teraz)
| Pred | Teraz |
|---|---|
| 8 nezávislých krokov, scenár A/B ako globálny prepínač | krok 03 je **rozhodnutie** (Auto / Karavan / Bez auta) a určuje, čo je 04 (Ubytovanie / Kempy / Základňa) a 05 (Itinerár / Výlety) |
| ubytovanie až po itinerári | po výbere auta ide **Kde spať**; regióny nocí dá návrh trasy na pozadí; itinerár sa potom upresní |
| kroky bez vstupov | každý krok má riadok „z kroku 0N: …" a hlavné tlačidlo **Pokračovať → 0N** |
| chýbali reálne prevádzkové veci | vek vodiča, depozit na kreditke, kempy zatvárajúce v septembri, check-in okná, sloty rezervácií, duty free, časová os platieb, balenie |

## 2. Čo aplikácia hľadá (a odkiaľ) – súhrn
| Vec | Zdroj | Kedy sa obnovuje |
|---|---|---|
| Letenky – mesiac, kombinácie, overenie pre 4 os. | tp-flights v1 · wizz (KTW/BUD) · ryanair (segmenty) · gflights (overenie) · ručne | 6 h / denne pri vybranom lete |
| Cesta na letisko, km | OSRM/ORS | raz, cache |
| Parkovanie, batožina | seed cenníky s dátumom overenia | ručne, upozornenie po 90 dňoch |
| Vozidlá, poistenia, požiadavky | seed + odkazy na požičovne | ručne / v2 scraping |
| Palivo IS | gasvaktin (open data, 15 min) / ručne | týždenne |
| Ubytovanie | **bez bezplatného API s cenami** → Overpass (zoznam), odhad z regiónu, ručne z Booking/Airbnb linku | nesleduje sa (len storno termín) |
| Kempy (ceny, otvorenie, služby, Parka, Camping Card do 15. 9.) | **tjalda API** (živé) + seed | 7 dní |
| Trasa, km, časy (+ korekcia štrk) | OSRM → ORS → Haversine; `route_cache` | raz |
| POI, ceny, vek, sezóna, davy, dron, čo si vziať, book_ahead | seed katalóg (~ 80 + klenoty) + **viator** (túry živo) + **parka** (parkovné živo) | ručne / 24 h / 7 d |
| Dron zóny | oficiálna mapa Samgöngustofa (kort.gis.is, overiť export) + seed GeoJSON | mesačne / nahlásenia |
| Čerpačky, obchody, pramene, vodopády okolo trasy | tjalda-geo (GeoJSON) / Overpass | 30 dní |
| Slnko | lokálny výpočet | – |
| Počasie, vietor | Open-Meteo (vedur.is odkaz) | od −7 dní denne |
| Stav ciest, F-cesty | umferdin.is (bez API – odkaz) | ručne −7 dní |
| Kurz ISK | Frankfurter (ECB) | denne |

## 3. Časová os pred cestou (generuje sa z plánu, záložka „Kedy platiť" v kroku 08 + .ics)
| Kedy | Čo | Z kroku |
|---|---|---|
| T−6 až −4 mes. | letenky (LCC najlacnejšie 2–4 mes. vopred; sledovať cenu) · batožina hneď pri kúpe | 02 |
| T−4 mes. | auto/karavan (september = ešte sezóna) · overiť vek/prax vodičov, kreditku | 03 |
| T−3 mes. | ubytovanie s bezplatným stornom · kempy nič (platí sa na mieste) | 04 |
| T−4 týž. | Blue Lagoon / Sky Lagoon / ľadovec / veľryby (`book_ahead_days`) | 06 |
| T−3 týž. | poistenie s pripoistením túr · eSIM · Parka app + ŠPZ · SafeTravel.is plán | 01, 05 |
| T−2 týž. | parkovanie na letisku (externé vopred) · dron: registrácia, poistenie | 01, 02 |
| T−7 dní | počasie, road.is, F-cesty · offline mapa · PDF plánu | 05 |
| T−1 deň | online check-in · fotky dokladov do telefónu · nabité batérie | 02 |
| Deň 1 | duty free KEF · fotky auta pri prevzatí · Bónus Reykjanesbær | 07, 03 |
| Priebežne | tunel Vaðlaheiði platba do 24 h · storno termíny | 05, 04 |
| Po návrate | DPH refund (KEF pred odletom) · vyrovnanie medzi 4 · reálne výdavky vs. plán | 08 |

## 4. Balenie (sheet „Balenie" – generuje sa z plánu)
Z atrakcií (`bring[]`), vozidla, ubytovania (sleeping-bag), stravy (z domu), dronu a sezóny:
- Vrstvy (merino, fleece, nepremokavá bunda + nohavice), čiapka/rukavice (september 3–12 °C, vietor), pevná nepremokavá obuv, plavky + rýchloschnúci uterák (kúpele, horúce rieky), čelovka (tmavé večery), termoska, powerbanka, autonabíjačka, adaptér **netreba** (typ F ako SK/CZ), spacák ak sleeping-bag/karavan, sušené jedlo z domu, káva, lieky, cestovná lekárnička, fotky dokladov, kreditka + záložná karta, Parka/112/SafeTravel apky, offline mapa.
- Dron: batérie v príručnej, ND filtre, podložka na štart, náhradné vrtule, registrácia vytlačená.

## 5. Bezpečnosť a prevádzka na Islande (riadky „pred odchodom" v každom dni itinerára)
- **112 Iceland** app (poloha záchranárom), **SafeTravel.is** (plán cesty, upozornenia), **vedur.is** (vietor – nad 15–20 m/s nejazdiť s karavanom, dvere držať oboma rukami), **road.is** (uzávery).
- Jednoprúdové mosty, štrkové cesty (spomaliť pri míňaní), ovce na ceste, zákaz jazdy mimo ciest (pokuty), rieky nebrodiť s 2WD (poistenie neplatí).
- Reynisfjara sneaker waves, ľadovce len s vodcom, horúce pramene – teplota, prírodné kúpele: sprcha bez plaviek pred vstupom (pravidlo).
- Kempovanie len v kempoch; ohne nie; toalety – nie v prírode (pokuty).
- Lekárska pomoc: EHIC platí, ale evakuácia vrtuľníkom nie → poistenie.

## 6. Čo ešte pridať do backlogu (z prechodu)
- Sheet **Balenie** a záložka **Kedy platiť** (.ics) – do v1 (fáza 5).
- Pole `book_ahead_days`, `bring[]`, `open_until` (kempy), `check_in_hours` (ubytovanie), `driver_min_age`, `km_limit`, `deposit` (vozidlá) – do dátového modelu (03) a seedu (07).
- Korekčný faktor času jazdy (asfalt ×1,25, štrk ×1,5, +10 min/zastávka) – do enginu (05 §4).
- Pravidlá noc 1 / posledná noc podľa letu – do enginu (05 §5).
- Riadok „ak prší" (plán B) a „rezervný deň" – generátor (05 §4).
- Polárna žiara: tmavá obloha štítok pri nociach + KP index (v2).
