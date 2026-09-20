# Krok 4 · Itinerár  *(od ADR-014 je to krok 04; súbor si necháva pôvodný názov)* (Auto, Karavan) / Výlety (Bez auta)

**Berie z krokov:** 02 dni a časy letu, 03 vozidlo (4×4 → F-cesty), 04 miesta nocí (trasa dňa končí tam, kde spíme), 01 záujmy, tempo, klenoty.
**Dáva ďalej:** km → 03 palivo; zastávky → 06 atrakcie; dni v aute a sloty → 07 strava; body a trasa → Mapa.

**Zbalený riadok:** `● 05 Itinerár · Ring Road · 10 dní · 2 140 km · 31 h · 24 zastávok · 2 ⚠ · [🗺 na mape]`
**Riadok vstupov:** `z kroku 02: 10 dní, prílet 09:15 / odlet 15:20 · z kroku 03: Kombi (2WD – bez F-ciest) · z kroku 04: noci Keflavík → Flúðir → Vík → Höfn → …`
**Filtre:** preset [Auto][Ring][Juh]… · tempo · davy↔klenoty · dron ok · viac · **[⚙ Generovať]**
**ListRow (deň):** `[03] Ut 14. 9. · Juh: Seljalandsfoss → Vík | 168 km · 2 h 40 · 5 zast. · ☀ 06:48–19:52 · noc Vík (z kroku 04) | ● 1 povolenie · 🔒 | vstupné 404 € | [🗺] ▸`
Rozbalený deň → vnorené riadky **zastávok**: `[01] Seljalandsfoss | 09:10 · 60 min · park. 1 000 ISK | ● dron zákaz | ≡ ▸`, medzi nimi tenký riadok jazdy `38 km · 35 min · ⛽ N1 Hvolsvöllur · 🛒 Krónan`, na konci riadok noci `◆ Noc 3 · Vík · Vík Cottages (kuchynka) · 236 € · krok 04`.
Dlhý stisk = presun zastávky (aj do iného dňa), swipe = preskočiť / odstrániť / zamknúť.
Vetva **Bez auta** – riadky = dni s výletmi z Reykjavíku (`Golden Circle tour · 8 h · 4 × 68 € · vyzdvihnutie 08:30`), voľné dni v meste.
**Päta:** [+ Pridať zastávku] (katalóg = krok 06 / mapa / vlastné) · [Uložiť trasu ako šablónu] · primárna: **[Pokračovať → 06 Atrakcie]**
**Mapa:** tlačidlo 🗺 v hlavičke kroku alebo v riadku dňa → overlay (03-mapa.md) s vybraným dňom.

---

## Konfigurácie (chipy + sheet „viac") generátora (⚙ „Generovať")
| Parameter | Typ | Default | Efekt |
|---|---|---|---|
| Preset | Auto (podľa dní a ceny) / Golden+juh / Juh+východ / Ring / Ring+Snæfellsnes / Ring+Westfjords / Vlastný | Auto | kostra |
| Smer | v smere / proti smeru hodín | v smere (juh najskôr) | |
| Tempo | pokojné / normálne / intenzívne | z cesty | kapacita dňa |
| Max jazda / deň | stepper h | podľa tempa | validácia |
| Záujmy | Chips (z cesty, prepísateľné) | | váhy |
| Davy ↔ klenoty | slider | 30 % | podiel hidden_gem |
| Sezónny filter | toggle „skryť POI s hodnotením < 3 pre {mesiac}" | áno | |
| Dron | toggle „uprednostniť miesta, kde sa smie lietať" | podľa záujmu | váha |
| Rezervované aktivity | zoznam zaškrtnutých (glacier hike, veľryby, lagúna) → dostanú pevný slot | | |
| Prvý / posledný deň | čas príletu/odletu z letu; „prvý deň: Blue Lagoon áno/nie" | | |
| Zachovať zamknuté dni | toggle | áno | |
Tlačidlo **Generovať** → náhľad zmien (počet dní zmenených, nové/odstránené zastávky) → Potvrdiť.

## Deň (ľavý panel)
- Hlavička: číslo, dátum, názov (auto: „Juh: Seljalandsfoss → Vík", editovateľný), km, čas jazdy, zastávky, slnko, počasie (ikona + °C z Open-Meteo, od –7 dní pred cestou), varovania (⚠ 5 h+ jazdy, F-cesta, mimo sezóny, dron permit).
- Zoznam zastávok: drag handle, poradie, názov (klenot = ikona diamant), plánovaný čas príchodu (auto z časov + jazdy, prepísateľný), trvanie (stepper, default `visit_min`), vstupné pre skupinu (rozbaliť: per osoba podľa veku), parkovné, ikona dronu (✓ zelená / ⚠ žltá permit-restricted / ✗ červená), ikona sezóny (★ mesiaca), rezervácia (link, čas), „preskočiť" (zachová, ale nepočíta), odstrániť.
- Medzi zastávkami: riadok jazdy „38 km · 35 min · ⛽ Vík N1" (klik → alternatívna trasa / pridať čerpanie).
- Prenocovanie: región + priradené ubytovanie/kemp (link na Ubytovanie), „zmeniť miesto noci".
- Deň akcie: zamknúť, pregenerovať iba tento deň, presunúť deň (drag v prehľade dní), rozdeliť/zlúčiť s ďalším, poznámky, „voľný deň".
- Prehľad dní: horizontálny pás 10 chipov (deň, región, km) – swipe; ťahanie chipu = zmena poradia.

## Karta zastávky (klik na zastávku → sheet/panel)
Fotka · názov · región · popis (SK/CS) · **trvanie** (odporúčané + rozsah) · pešo km / náročnosť · **vstupné** – tabuľka cestujúcich: meno, vek v deň návštevy, kategória, cena; parkovné per auto; variant (Comfort/Premium) · sezóna (★ pre mesiac + poznámka) · **dron** status + poznámka + link na zónu · tipy · vybavenie · otváracie hodiny · rezervácia (link + čas) · zdroj a dátum overenia · „Upraviť cenu" (manuálne) · „Presunúť do dňa…" · „Odstrániť".

## Mapa
Jedna mapa pre všetko – overlay, viď [03-mapa.md](03-mapa.md). Z kroku 05 sa otvára s vybraným dňom; vrstvy, dron zóny a ovládanie sú tam.

## Pridanie zastávky
„+ Pridať" → sheet: vyhľadávanie v katalógu (fulltext, filtre kategória / región / dron ✓ / klenot / sezóna ★≥3), „z mapy" (klik na sivú bodku), „vlastné miesto" (názov + súradnice klepnutím na mapu + cena + trvanie). Po pridaní sa deň prepočíta (časy, km cez routing) a validuje.

## Stavy
- Bez letu: dátumy relatívne „Deň 1..N", slnko podľa 15. dňa cieľového mesiaca.
- Routing nedostupný: km/čas ako odhad (Haversine × 1,25) s badge; „Prepočítať trasy" keď je OSRM späť.
- Deň bez zastávok: „Voľný deň – pridať zastávku alebo generovať".

## Dáta
`GET /api/trips/[id]/itinerary` · `PUT .../days/[i]` · `POST .../generate` (náhľad) · `POST /api/routing` (cache) · `GET /api/pois?near=…` · `GET /api/drone-zones` (GeoJSON, cache 30 dní).

## Akceptačné kritériá
- Každý deň má km/čas z routingu (alebo označený odhad), žiadny deň neprekračuje limit tempa bez varovania.
- Vstupné v karte zastávky = presne to, čo je v rozpočte.
- Vrstva dron zobrazí zóny pre celý Island a status pri každej zastávke.

## Prechod – čo krok hľadá a čo mu chýbalo
**Hľadá:** preset trasy, POI podľa záujmov/sezóny/klenotov, km a časy (OSRM), slnko, počasie, kempy/ubytovanie z kroku 04 ako ciele dňa, čerpacie stanice a obchody (Overpass), dron zóny.
**Zlepšenia doplnené do návrhu:**
- **Reálne časy jazdy** – OSRM podceňuje štrk a Ring Road (max 90 km/h asfalt, 80 štrk, časté 50/70, ovce, fotozastávky): korekčný faktor ×1,25 asfalt / ×1,5 štrk + 10 min na každú zastávku; deň ukazuje „čistá jazda 2 h 40 · realisticky 3 h 20".
- **Denné svetlo** – september 06:30–19:45 a skracuje sa o ~ 6 min/deň; kapacita dňa = svetlo − 1 h; príchod na poslednú zastávku po západe = ⚠.
- **Rezervný deň na počasie** – generátor pri ≥ 8 dňoch nechá 1 deň „voľný/rezerva" (predvolene pri Mývatne alebo Reykjavíku) a každý deň má štítok zastávok „musí / voliteľné", aby sa dal skrátiť pri búrke.
- **Plán B pri daždi** – pre každý deň 1–2 alternatívy (kúpele, múzeum, Lava Show) ako skrytý riadok „ak prší".
- **Automatické servisné zastávky** – ⛽ pred úsekmi > 100 km bez stanice, 🛒 Bónus/Krónan pri každom 2.–3. dni (otváracie hodiny: Bónus ~ 11–18:30, nedeľa kratšie; Krónan dlhšie), Vínbúðin len ak alkohol.
- **Sloty rezervácií** – zastávka s pevným časom (Blue Lagoon, ľadovec, veľryby) zamkne časový slot; generátor okolo nej plánuje; kolízia = chyba.
- **F-cesty a stav ciest** – ak 2WD, F-cesty sa ani neponúknu; road.is vrstva 7 dní pred cestou; Highlands v septembri podmienené.
- **Reykjavík detaily** – parkovanie v zónach P1–P4 (platené 9–18), v septembri o víkendoch zdarma v niektorých zónach; tip v riadku dňa v RVK.
- **Bezpečnosť** – SafeTravel.is (registrácia plánu cesty), 112 Iceland app, vedur.is vietor > 20 m/s = nejazdiť s karavanom; riadok „pred odchodom" v každom dni s odkazmi.
- **Tunel a mýto** – Vaðlaheiði (1 990 ISK, platba online do 24 h) sa objaví ako riadok jazdy, nie skrytá položka.

## Na čo nezabudnúť
- ☐ realistické časy jazdy · ☐ svetlo · ☐ rezervný deň · ☐ plán B pri daždi · ☐ palivo pred dlhými úsekmi · ☐ nákupy vs. nedeľa · ☐ sloty rezervácií nekolidujú · ☐ vietor a karavan · ☐ SafeTravel + 112 app · ☐ offline mapa stiahnutá · ☐ tunel platba · ☐ parkovanie RVK
