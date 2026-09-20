# Krok 2 · Letenky

**Zbalený riadok:** `② Letenky · VIE 12.–21. 9. · priamy · 4 os. · 1 180 € · API` (bez letu: `○ ② Letenky · vyber let z kalendára · od 244 €/os odhad`)
**Filtre (1 riadok chipov):** letiská [BTS][VIE][BUD][PRG][KTW] · dni 8–12 · prestupy · batožina · parkovanie · viac ▾
**Nástroj:** kalendár mesiaca (heatmapa) ako **filter dátumov** nad zoznamom – klik na deň filtruje zoznam na odlety v ten deň, dlhý stisk zamkne odlet a druhý klik vyberie návrat; ‹ › mesiace; prepínač /os · skupina · len letenka.
**ListRow:** `[VIE] VIE → KEF 12. 9. 06:40 · KEF → VIE 21. 9. 15:20 | Wizz · priamy · 10 dní · 4 os. | [API overené] [⚠ self-transfer] | 1 030 € / 258 €/os | [Vybrať] ▸`
Rozpis (letenky · batožina · parkovanie · cesta) je druhý riadok meta. Vybraný let je vždy prvý riadok so ✓ a tyrkysovým pruhom.
**Päta:** [+ Zadať let ručne] · [Porovnať vybrané (3)] · primárna: **[Pokračovať → 03 Doprava]** (aktívna až po vybratí letu; výber = tlačidlo v riadku)
**Sheet Let:** viď 04-sheety.md.

---

## Konfigurácie (chipy + sheet „viac") (filtre) – všetky s okamžitým efektom, uložené per cesta

| Filter | Typ | Default | Efekt |
|---|---|---|---|
| Letiská | Chips multi | z nastavenia | ktoré origins sa počítajú do min/deň |
| Dĺžka pobytu | RangeSlider | 8–12 | množina návratov |
| Prestupy | segmented: priame / max 1 / max 2 | max 1 | |
| Huby | Chips (v „viac filtrov") | všetky | |
| Airline | Chips (Wizz, Ryanair, easyJet, Icelandair, iné) | všetky | whitelist |
| Odlet po / návrat pred | time | – | |
| Max trvanie cesty | stepper h | 16 h | vrátane prestupov |
| Nočný prestup povolený | toggle | nie | pridá nocľah na hube |
| Batožina | otvorí sheet batožiny (z kroku 01, na dvojice) | | |
| Parkovanie | toggle + výber parkoviska per letisko | áno / najlacnejšie | |
| Cesta na letisko | segmented per letisko: auto / bus / vlak / taxi | auto | |
| Zobrazenie heatmapy | segmented: /os. · skupina · len letenka | /os. | len farba a číslo, nie radenie |
| Radenie kombinácií | select: celkom · letenka · trvanie · odlet čas · „pohodlie" | celkom | |
| Mesiac | ‹ › swipe; „porovnať 2 mesiace" toggle → dva kalendáre pod sebou | cieľový | |
| Vlastný rozsah | date range v mesiaci | celý | |

## Kalendár (`MonthHeatmap`)
- Bunka: číslo dňa (12 px), cena (16 px tabular), 4 stupne farby podľa kvantilov mesiaca (nie fixné prahy) + legenda s reálnymi hranicami.
- Dni bez letu = sivé „–"; dni mimo vybraného rozsahu = stlmené.
- Vybraný deň = tyrkysový okraj; **navrhovaný najlepší** deň = ikona ⚡ v rohu.
- Klik na deň → pravý panel kombinácie (odlet v ten deň, všetky návraty v rozsahu, všetky letiská).
- Dlhý stisk na deň → „Zamknúť ako odlet" → kalendár prepne do módu **výber návratu**: farby teraz ukazujú cenu za návrat v daný deň (pri zamknutom odlete). Druhý klik = combo.
- Swipe medzi mesiacmi; pri „flexibilita ±dni" sú koncové dni susedného mesiaca zobrazené šedo na kraji.

## Karta kombinácie (`FlightComboCard`)
| Riadok | Obsah |
|---|---|
| 1 | Odlet: `VIE → KEF` · dátum · čas odletu → čas príletu · airline · číslo letu (mono) |
| 2 | Návrat: to isté |
| 3 | Štítky: `10 dní` · `priamy` / `1 prestup STN 3 h 20 m ⚠ self-transfer` · `4 os.` · `nočný prestup` |
| 4 | Rozpis: letenky · batožina · parkovanie (10 dní, Mazur P) · cesta (2× 65 km) · nocľah hub |
| 5 | **Celkom skupina** · /os. · `SourceBadge` (Travelpayouts cache 2 h / overené) |
| CTA | **Vybrať** (primárne) · „Overiť cenu" (sekundárne, volá provider.verify) · „Otvoriť u predajcu" (deep link) · „Porovnať" (max 3 do porovnávacej lišty) |
Rozbalenie karty: segmenty s letiskami/terminálmi, poznámka k self-transferu (batožinu treba vyzdvihnúť a znova podať), politika batožiny airline, pravidlá zmeny.

## Výber letu → kaskáda
1. Klik **Vybrať** → ak cena je cache > 6 h, automaticky `verify`; ak sa líši > 5 %, dialóg „Cena sa zmenila 1 030 → 1 095 €. Pokračovať?".
2. Uloží `flight_selection` (+ `locked_price`), `trips.start/end_date`.
3. `cascade.applyFlightSelection` → `DiffToast`: „Dátumy 12.–21. 9. · 9 nocí · prenájom 10 dní · itinerár Ring Road 10 dní (pregenerované 10 dní) · parkovanie 10 dní · strava 10 dní" + **Vrátiť**.
4. Presmerovanie na Prehľad (alebo zostať – nastavenie).

Vybraný let sa zobrazuje hore nad filtrami ako **pripnutá karta** (zelený okraj) s „Zmeniť" a sledovaním ceny (sparkline, posledné overenie, „upozorniť pri zmene > 5 %" toggle).

## Ručný let
„+ Zadať let ručne": formulár (letiská, dátumy, časy, airline, cena skupina, link) → `flight_option` s `source: manual` – rovnaká kaskáda.

## Porovnávacia lišta
Až 3 kombinácie v spodnom pruhu; „Porovnať" otvorí tabuľku: dni, celkom, /os., letenka, batožina, parkovanie, trvanie, prestupy, odlet/prílet časy, + **odhad zvyšku cesty** pre počet dní (z optimalizátora) → „celkom cesta".

## Stavy
- Prvé načítanie: skeleton kalendára + progres „VIE ✓ · BUD ✓ · BTS … · PRG · KTW" (SSE stream).
- Konektor zlyhal: bunky z ostatných konektorov, pás „wizz nedostupný – ceny z tp-flights (cache)".
- Nič nenájdené pre deň: karta „Žiadne lety v rozsahu 8–12 dní – rozšíriť na 7–13?".
- Ceny staršie ako 24 h: badge + tlačidlo Obnoviť (limit 1× / 10 min).

## Dáta
- `POST /api/flights/search` (stream SSE; konektory tp-flights, wizz, ryanair) → `flight_options` per search.
- `POST /api/flights/verify` (gflights, pax = 4) → aktualizuje option, `price_snapshots`.
- `PUT /api/trips/[id]/flight-selection` → kaskáda na serveri (rovnaký engine), vráti diff.

## Akceptačné kritériá
- Heatmapa ukazuje min. celkovú cenu za deň pre všetky vybrané letiská a dĺžky pobytu; prepnutie filtra prekreslí < 100 ms (lokálny výpočet z načítaných options).
- Výber letu vždy skončí konzistentným stavom cesty (dátumy, noci, dni) a zobrazí diff.
- Self-transfer kombinácie sú jasne označené a majú ≥ min. prestup.

## Prechod – čo krok hľadá a čo mu chýbalo
**Hľadá:** kalendár cien pre každé letisko (tp-flights v1, wizz pre KTW/BUD), presné fares pre pax = 4 cez gflights (LCC zvyšujú cenu po sedadlách – cena ×4 z pax = 1 je podhodnotená!), self-transfer cez huby (ryanair/wizz → hub, tp-flights hub → KEF), batožinu podľa airline, parkovanie na dni, cestu na letisko. Priame do KEF z regiónu (09/2026): len Wizz KTW a BUD.
**Zlepšenia doplnené do návrhu:**
- **Overenie pre 4 osoby naraz** – `verify` sa volá s pax = 4; ak agregátor vracia cenu pre 1, riadok nesie ● odhad, kým sa neoverí.
- **Použiteľnosť dňa príletu/odletu** – meta riadku ukáže „prílet 09:15 = celý deň" / „prílet 23:40 = noc pri KEF, deň stratený"; optimalizátor to započíta ako +1 noc alebo −1 deň.
- **Nočný odlet z domu** – odlet 06:40 z VIE = odchod z BA o 03:30; riadok ponúkne „nocľah pri letisku 90 €" alebo „nočná jazda"; obe možnosti sa započítajú.
- **Self-transfer pravidlá** – min. 3 h, batožinu treba vyzdvihnúť a znova podať, dva samostatné lístky = žiadna ochrana pri meškaní → riadok má ⚠ a ponúka poistenie „missed connection" (~ 10 €/os) ako položku.
- **Kedy kúpiť** – stránka zobrazí trend ceny (30 dní) a odporúčanie: LCC do KEF sú typicky najlacnejšie 2–4 mesiace pred odletom; upozornenie e-mailom pri poklese.
- **Check-in a sedadlá** – riadok vybraného letu má „online check-in od (Wizz 30 dní / 24 h bez priority)" a poznámku „bez výberu sedadla ušetríš 4× 2× ~ 8 €" (položka voliteľne).
- **Dron v príručnej** – ak je v skupine dron, riadok batožiny pripomenie LiPo pravidlá airline (Wizz: max 100 Wh, v príručnej).
- **Prvý/posledný deň** – časy letu sa pošlú do kroku 04 (noc 1 pri KEF?) a 05 (kapacita dňa).

## Na čo nezabudnúť
- ☐ cena overená pre 4 os. · ☐ batožina kúpená pri rezervácii (na letisku 2–3× drahšia) · ☐ online check-in termín v kalendári (.ics) · ☐ parkovanie rezervované (externé parkoviská treba vopred) · ☐ self-transfer: čas a poistenie · ☐ prílet/odlet vs. otváracie hodiny požičovne (KEF pulty 24 h u veľkých, menšie nie) · ☐ nočný odlet: nocľah alebo nočná jazda
