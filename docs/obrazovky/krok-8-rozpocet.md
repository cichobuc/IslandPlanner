# Krok 8 · Rozpočet

**Berie z krokov:** všetko. **Dáva ďalej:** export, zdieľanie, sledovanie cien, časová os platieb.

**Zbalený riadok:** `⑧ Rozpočet · 4 680 € · 1 170 €/os · rozsah 4 520–4 840 · [Export]`
**Nástroj:** záložky [Súhrn][Scenáre][Na osobu][História] ako chipy; scenár [A ▾]; rezerva %; cieľ/os.
**ListRow (kategória → položky):** `[✈] Letenky & cesta | VIE ↔ KEF · 4 os. | [API] | 1 180 € ▾` → vnorené: `Letenky VIE–KEF–VIE · Wizz · overené · 720 €`, `Batožina · 4×10 + 2×20 kg · seed · 180 €`, `Parkovanie Mazur · 10 dní · 84 €`, `Cesta BA–VIE · 2× 65 km + známka · odhad · 46 €`. Klik na položku = skok na krok, kde sa dá zmeniť; swipe = upraviť ručne / vylúčiť.
Záložka Scenáre: riadky kategórií so stĺpcami Auto | Karavan | Bez auta | uložené. Na osobu: riadky cestujúcich so sumou (`split` group rovným dielom, person presne, vehicle per posádka; kto zaplatil → vyrovnanie); riadok „Ja vs. Skupina“ per člen. **Vziať z domu**: riadky položiek (cena Island vs. SK, úspora, kg, colné/airline poznámka, kto nesie) + súhrn „úspora 320 € · +1 batožina 20 kg za 55 € → oplatí sa“. História: riadky zmien + graf 90 dní.
**Päta:** [+ Položka] · [Uložiť ako scenár] · primárna: [Export →] (sheet: PDF, CSV, JSON, .ics, link)

---

## Záložky a konfigurácie

### Súhrn
| Prvok | Popis |
|---|---|
| Scenár | select A / B / vlastný; „Porovnať" → záložka Scenáre |
| Rezerva % | stepper (uloží do cesty) |
| Cieľ / os. | number; progress bar „zostáva / prekročené" |
| Riadky | rozbaľovanie kategórií; každý riadok: názov, detail, suma, `SourceBadge`, klik → stránka/položka; swipe doľava = „upraviť ručne / vylúčiť" |
| Manuálne položky | + Pridať: názov, suma, mena, per skupina/os., kategória, scenár (oba / A / B) |
| Vylúčené položky | prečiarknuté, nepočítajú sa (napr. „letenky platíme z bodov") |
| Zobrazenie | EUR / ISK / CZK; celé eurá / centy |

### Scenáre
Tabuľka: riadky = kategórie (+ rozbaľ), stĺpce = scenáre (A, B, + uložené snapshoty), víťaz zvýraznený per riadok a celkom; „Uložiť aktuálny stav ako scenár" (názov) – snapshot `scenarios`; „Načítať scenár" (prepíše konfiguráciu po potvrdení); rozdiel v € a %; neceňové poznámky.

### Na osobu
Tabuľka cestujúci × kategórie: spoločné položky rovným dielom, osobné (letenka, batožina, vstupné podľa veku, káva) presne; celkom per osoba; „kto platí" (v2: vyrovnanie). Prepínač „rovným dielom všetko".

### História
Graf (Recharts) celkovej ceny a po kategóriách za 90 dní z `price_snapshots`; udalosti (výber letu, zmena scenára) ako značky; tabuľka zmien (dátum, položka, pred → po, Δ); nastavenie upozornení (prah €/%, e-mail členom).

### Export
- **PDF**: súhrn + itinerár deň po dni (zastávky, časy, vstupné, dron ✓/✗, ubytovanie s adresou) + checklist; formát A4, tmavý alebo tlačový svetlý.
- **CSV / XLSX**: položky rozpočtu; itinerár.
- **JSON**: kompletná cesta (záloha / import).
- **Zdieľateľný link** (read-only, expirácia 30/90 dní/nikdy, zrušiť).
- **Kalendár (.ics)**: lety, rezervácie, prenocovania.

## Stavy
- Bez letu: letenky = najlepší odhad z kalendára (min combo) s badge; ostatné z presetu.
- Nič nevyplnené: „Rozpočet sa začne skladať po nastavení cesty".

## Akceptačné kritériá
- Súčet riadkov = celkom; per osoba × pax = celkom (±1 € zaokrúhlenie).
- Každá suma má pôvod a klik vedie na miesto, kde sa dá zmeniť.
- PDF export < 5 s, obsahuje všetky dni itinerára.

## Prechod – čo krok hľadá a čo mu chýbalo
**Hľadá:** všetky položky z krokov, kurz ISK (denne), históriu cien; exporty.
**Zlepšenia doplnené do návrhu:**
- **Časová os platieb** (nová záložka „Kedy platiť") – riadky s dátumom: letenky (teraz), auto/karavan záloha (do X), rezervácie túr (do Y), ubytovanie (pri storno termíne), **depozit auta pri prevzatí (blokácia 2 500 € – musí byť voľný limit na karte!)**, kempy na mieste, strava priebežne. Export do .ics.
- **Likvidita na osobu** – koľko hotovosti/limitu potrebuje každý v ktorý deň (zo splitu položiek).
- **Karta bez poplatku za konverziu** – tip + pole „poplatok karty %" (0–3 %) započítané do islandských položiek; platiť vždy v ISK, nie v EUR (DCC).
- **Vrátenie DPH** – suveníry > 6 000 ISK na jednom bloku, formulár na KEF; informačný riadok.
- **Kto zaplatil** – pri položke „zaplatil: Peter" → záložka Na osobu ukáže vyrovnanie (v1 jednoduché, bez transakcií).
- **Rezerva podľa rizika** – rezerva 10 % predvolene, ale pri ● odhad položkách sa ukáže „rezerva pokryje/nepokryje rozsah max".
- **Fixné vs. variabilné** – štítok pri položke (letenky fixné; strava, palivo variabilné) → „čo ešte vieme ovplyvniť".
- **Čo sa zmenilo** – diff od poslednej návštevy člena (nie globálne).

## Na čo nezabudnúť
- ☐ karta bez FX poplatku · ☐ voľný limit na depozit · ☐ platby v ISK (odmietnuť DCC) · ☐ storno termíny · ☐ rezervácie do dátumu · ☐ poistenie · ☐ eSIM · ☐ DPH refund · ☐ vyrovnanie medzi 4 ľuďmi
