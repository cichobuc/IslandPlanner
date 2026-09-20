# Krok 6 · Atrakcie & vstupné

**Berie z krokov:** 05 zastávky (sekcia „V pláne"), 01 veky cestujúcich a cieľový mesiac, 03 vozidlo (F-cesty), Mapa.
**Dáva ďalej:** vstupné a parkovné → 08; rezervácie s časom → 05 sloty; „čo si vziať" → balenie.

**Zbalený riadok:** `⑥ Atrakcie · 12 v pláne · 3 rezervácie · 610 € · seed`
**Filtre:** 🔍 · kategórie [Termály][Ľadovce][Zvieratá][Vodopády][Túry][Láva][Kultúra] · ★ sezóna ≥ 3 · 💎 klenoty · 🚁 dron ✓ · po trase · zadarmo · viac ▾ · [🗺]
**Zoznam:** hore sekcia **V pláne** (12 riadkov, zoradené podľa dňa), pod ňou **Katalóg** (filtrované, zoradené podľa odporúčania).
**ListRow (atrakcia):** `[🌊] Sky Lagoon · Reykjavík | 2–3 h · 12+ · ★★★★★ sept · davy ●●●●○ | [dron ✗ CTR] [rezervácia] [deň 9] | 95 €/os · 4 os. 380 € | [+ Deň N / V pláne] ▸`
Klenot = 💎 pri názve. Vek: cena „4 os." je už podľa vekov cestujúcich. Sheet atrakcie (popis, trvanie, vstupné podľa veku, kedy ísť, dron, tipy) v 04-sheety.md.
**Päta:** [+ Vlastné miesto] · [Nahlásiť zákaz dronu] · primárna: **[Pokračovať → 07 Strava]** (sekundárne: Rezervovať 3 aktivity – sheet s odkazmi a termínmi)

---

## Konfigurácie (chipy + sheet „viac") / filtre
| Filter | Typ | Default | Poznámka |
|---|---|---|---|
| Hľadanie | text (názov SK/CS/IS, tagy) | | |
| Kategórie | Chips multi | podľa záujmov cesty | |
| Región | select / multi | všetky; „po trase" = regióny z itinerára | |
| Cena | segmented | všetky | vstupné dospelý |
| Sezóna | toggle „★ ≥ 3 pre {cieľový mesiac}" | zapnuté | skrýva puffiny, ľadové jaskyne v septembri |
| Klenoty | toggle `hidden_gem` | vypnuté | |
| Návštevnosť | slider max popularity 1–5 | 5 | |
| Dron | segmented: všetky / ✓ povolené / bez zákazu | všetky | |
| V pláne / mimo plánu | segmented | všetky | |
| Rezervácia potrebná | toggle | | |
| Trvanie | slider ≤ 1 h / ≤ 3 h / celý deň | | |
| Náročnosť | ľahké / stredné / náročné | | túry |
| 4×4 | toggle „len bez F-ciest" | podľa vozidla | |
| Zobrazenie | Zoznam / Mapa | zoznam | mapa = piny s cenou + trasa |
| Zoradiť | odporúčané (skóre záujmy × sezóna × vzdialenosť od trasy) · cena · trvanie · návštevnosť · vzdialenosť po trase | odporúčané | |

## Karta atrakcie (grid)
Fotka (alebo ikona kategórie na sklenenom pozadí), názov, región, trvanie, veková hranica/náročnosť, cena dospelý (alebo „zadarmo" / „parkovné 1 000 ISK"), sezóna ★ pre cieľový mesiac, dron ikona + krátky dôvod, návštevnosť 5 bodiek, **cena pre skupinu** (podľa vekov), CTA „+ Deň N" (navrhne deň podľa regiónu) alebo „V pláne · Deň 3" (link), `[i]` detail.

## Detail (sheet 92 % / pravý panel)
Sekcie v poradí: Fotka · Popis · **Trvanie** (odporúčané, rozsah, pešo km, náročnosť) · **Vstupné** (tabuľka pre cestujúcich s vekom v deň návštevy alebo v cieľovom mesiaci ak nie je v pláne; varianty; parkovné; ako sa platí) · **Kedy ísť** (12 mesačných ★ ako malý pás, poznámka; denná doba „ráno bez davov") · **Dron** (status, zóna, pravidlá, permit link) · Tipy · Vybavenie · Otváracie hodiny · Rezervácia (poskytovateľ, link, „zapísať čas") · Poloha (mini mapa, vzdialenosť od trasy, ktorý deň je najbližšie) · Zdroj & overené · **Upraviť** (cena, trvanie, poznámka – `source: manual`, uloží revíziu) · Podobné miesta (rovnaký tag, menej navštevované).

## Pridanie do plánu
„+ Deň N": ak POI je ≤ 30 km od trasy dňa N → pridá na optimálne miesto v dni (min. zachádzka) a prepočíta; inak dialóg „Zachádzka 84 km / 1 h 10 – pridať aj tak do dňa 5, alebo navrhnúť presun noci?".

## Hromadné
Výber viacerých kariet (dlhý stisk) → „Pridať vybrané (generátor rozmiestni)", „Porovnať" (tabuľka cena/trvanie/sezóna/dron).

## Správa katalógu
Používateľ (editor) môže: pridať vlastné POI (formulár so všetkými poľami, súradnice z mapy), upraviť seed POI pre svoju cestu (override) alebo navrhnúť opravu do seedu (v2), „Nahlásiť zákaz dronu" (nastaví `drone_status` override + poznámku).

## Stavy
- Bez cestujúcich s vekom: ceny len „dospelý"; badge „doplň dátumy narodenia pre presné vstupné".
- POI s cenou overenou > 90 dní: oranžový bod pri cene.

## Akceptačné kritériá
- Filter sezóna skryje v septembri puffiny a prírodné ľadové jaskyne, ale ukáže Katla ice cave.
- Suma „Vstupné v pláne" = kategória Atrakcie v rozpočte.
- Každá karta ukazuje dron status a návštevnosť.

## Prechod – čo krok hľadá a čo mu chýbalo
**Hľadá:** katalóg (seed) s vekovými cenami, sezónnosťou, návštevnosťou, dron statusom; POI v okolí trasy (Overpass); **živé ceny a dostupnosť túr cez Viator affiliate API** (ľadovec, veľryby, ice cave, Golden Circle) – bezplatné, bez minimálnej návštevnosti; GetYourGuide nie (100k návštev).
**Zlepšenia doplnené do návrhu:**
- **Vypredanie a termín rezervácie** – pole `book_ahead_days` (Blue Lagoon 2–4 týždne v sezóne, Sky Lagoon 1–2 týždne, ľadovec 1–2 týždne, veľryby pár dní) → riadok „rezervovať do {dátum}" v časovej osi platieb (krok 08) a ⚠ ak už je neskoro.
- **Storno pri počasí** – túry zrušené poskytovateľom = vrátenie peňazí; vlastné zrušenie 24–48 h; pole a štítok v riadku.
- **Čo si vziať** – per atrakcia (`bring[]`: plavky, uterák (v kúpeľoch prenájom ~ 1 000 ISK), pevná obuv, čelovka, mačky sú v cene túry…) → generuje **spoločný zoznam na balenie** (sheet Balenie).
- **Otváracie hodiny v septembri** – kratšie než v lete (múzeá, kúpele Mývatn do 22:00 → od októbra kratšie); pole `open_hours_season`.
- **Parkovné cez app Parka** – ceny sa berú živo z `tjalda.is/api/parkings` (102 parkovísk, kategórie vozidiel; Reynisfjara/Skógafoss 1 000, Jökulsárlón 1 110 ISK…); pri POI tip „Parka app, registruj ŠPZ vopred"; jedna položka v balení: „Parka účet".
- **Bezplatné alternatívy** – k drahej položke riadok „lacnejšia alternatíva" (Blue Lagoon → Secret Lagoon / Hrunalaug; Sky Lagoon → mestské bazény Laugardalslaug ~ 1 300 ISK).
- **Vek v deň návštevy** – deti/senior kategórie sa počítajú k dátumu z kroku 05, nie k dnešku.
- **Fotografické časy** – pri klenotoch a vodopádoch „najlepšie svetlo: ráno/večer" + smer slnka; zastávka dostane odporúčaný čas.

## Na čo nezabudnúť
- ☐ rezervácie s termínom (do kalendára) · ☐ storno podmienky · ☐ plavky + uterák · ☐ Parka app · ☐ hotovosť netreba (karta všade) · ☐ prepitné nie · ☐ otváracie hodiny v septembri · ☐ lacnejšia alternatíva zvážená · ☐ vek detí/seniorov správne
