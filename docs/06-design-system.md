# 06 · Design system v6 – čisté produktové UI (overené renderom)

Po vykreslení predchádzajúcich verzií v Playwrighte sme sklo, farebné hmly a „trasu s kruhmi" zahodili. v6 je **čisté, kontrastné produktové UI**
v štýle najlepších nástrojov 2026 (Linear / Stripe / Notion): svetlosivá plocha, biele karty s 1 px okrajom, jeden akcent, jasná hierarchia.
Island je prítomný cez **mapu okruhu** v ľavom stĺpci a znak v hlavičke, nie cez farby. Dizajn canvas: https://claude.ai/artifact/HYKyfB8V1VcKnJiuc9iNx7 (v6, 9 artboardov, každý skontrolovaný ako PNG).

## Layout – Postup vľavo, obsah vpravo (iPad portrait 820)
```
┌ hlavička 56 · biela · ‹ Cesty · ⛰ Island · sept 2027 · [Ja|Skupina] · avatary · ⋯ ┐
│ ┌ Postup 232 ─────────┐  ┌ Odhad cesty (karta) ───────────────────────────────┐ │
│ │ ✓ 1 Cestujúci & kedy │  │ 4 680 €   1 170 €/os · rozsah        Krok 3 z 8    │ │
│ │ ✓ 2 Letenky          │  │ Letenky 1 180 € API │ Doprava │ Kde spať │ Ostatné │ │
│ │ ● 3 Doprava   (act)  │  └────────────────────────────────────────────────────┘ │
│ │ 4 Kde spať  (po 03)  │  KROK 03 · DOPRAVA                                       │
│ │ 5 … 8                │  H1 Auto, karavan alebo bez auta?          890 €  seed  │
│ ├ Mapa okruhu ─────────┤  1 veta vysvetlenia                                     │
│ │ [mini mapa] 2 140 km │  Z PREDCHÁDZAJÚCICH KROKOV  [chipy s ikonkami]           │
│ ├──────────────────────┤  TVOJA VOĽBA  [Auto ◉][Karavan ○][Bez auta ○]           │
│ │ ⚡ Najlacnejšie …     │  VOZIDLO  [Economy][Kombi][SUV][4×4]  + zoznam riadkov   │
│ └──────────────────────┘  ČO Z TOHO VYPLÝVA  │ palivo 303 € │ 04 = Ubytovanie │ … │
│                          [Prečo…] [+ ručne]           [Pokračovať na 04 ›]        │
```
- **Postup** (vždy viditeľný): 8 krokov, každý s číslom/fajkou, názvom a 1-riadkovým zhrnutím (hotové: výsledok + suma; aktívny: modré pozadie; čakajúce: „po 03", 55 % opacity). Klik prepne obsah.
- **Obsah kroku** má vždy rovnaké poradie: Odhad cesty → nadpis-otázka + 1 veta → Z predchádzajúcich krokov → Tvoja voľba → (obsah) → Čo z toho vyplýva → tlačidlo ďalej.
- **iPhone**: hlavička s 8-dielnym progres pásikom + názov kroku + suma; obsah rovnaký, sticky tlačidlo dole; postup ako sheet z hlavičky.
- **Mapa**: overlay s hornou lištou vrstiev (chipy), legendou, ovládaním a spodnou kartou vybraného objektu.

## Tokeny
| Token | Hodnota | Použitie |
|---|---|---|
| `--bg` | `#F4F6F9` | plocha |
| `--card` | `#FFFFFF` + `1px solid #E4E8EE`, radius 12 | karty, zoznamy, kalendár |
| `--line` | `#EEF1F5` | deliace linky v zoznamoch |
| `--ink` `--ink-2` `--ink-3` | `#0B1220` · `#5B6675` · `#8A94A3` | text, sekundárny, popisky |
| `--accent` | `#0F4C81` (fjord) | primárne tlačidlo, aktívny krok, výber, trasa, odkazy |
| `--accent-soft` | `#E7F1FB` / okraj `#B9D4F0` | aktívny chip, aktívny krok v postupe, ikonové dlaždice letenky/doprava |
| stavy | ok `#E6F4EA/#1E6B34` · info `#E7F1FB/#0F4C81` · warn `#FFF4E0/#8A5300` · bad `#FDE8E6/#9F2318` · vio `#EEEAFB/#4B33B8` · mut `#F1F4F8/#5B6675` | štítky (svetlý podklad + tmavý text), ikonové dlaždice |
| Radius | 12 karty · 10 karty volieb · 9 tlačidlá a dlaždice ikon · 8 chipy, vstupy, bunky kalendára · 6 štítky | žiadne kapsuly, žiadne sklo, žiadne tiene (okrem sheetu) |
| Typografia | **Sora** 600 (nadpisy 26, sumy 34/22/15 – `tabular-nums`) · **Instrument Sans** 400/500/600 (14 text, 13 meta, 12 popisky) · popisky 11 px uppercase tracking .08em | žiadne mono písmo na sumách |
| Ikony | Lucide-štýl stroke 1.8; tónované dlaždice 36 px (podklad stavu + farba textu stavu) v riadkoch a na dlaždiciach flow; v postupe iba čísla/fajky | |
| Dotyk | riadky 58 px, tlačidlá 42 (34 malé), chipy 32, bunky kalendára 46 | |

## Prvky
| Prvok | Pravidlo |
|---|---|
| Karta voľby (Auto/Karavan/Bez auta) | biela, radio vpravo hore, ikonová dlaždica, názov, ≈ suma modrou, 1 riadok popisu; zvolená = 2 px modrý okraj |
| Riadok zoznamu | dlaždica/kód · názov + meta · suma (Sora) + podtext · tlačidlo · › ; vybraný = svetlomodrý podklad + 3 px ľavý pruh; vnorený = odsadený, svetlosivý podklad |
| Súhrn „Odhad cesty" | suma 34, /os 18, rozsah, štítok „Krok N z 8"; pod tým 4 stĺpce (názov, suma, štítok pôvodu) v sivom ráme |
| Chipy vstupov | ikona 14 px + text, sivý podklad; filtre: aktívny svetlomodrý s okrajom |
| „Čo z toho vyplýva" | karta so 4 stĺpcami (popisok + hodnota) oddelenými linkami |
| Kalendár | bunky 46 px, tmavosť čísla = cena, vybraný deň modrý s bielym textom; pod ním 1 veta + legenda |
| Sheet | biela karta z dola, radius 14 hore, jediný tieň v systéme; riadky „POPISOK – hodnota" |
| Mapa | biely ostrov (vyhladený obrys z lon/lat), modrá trasa, aktívny deň hrubší, zelené noci, dron zóny červená/hnedá 10 % |

## Ikony a dashboardové prvky (v5.2)
- Sada: Lucide-štýl, stroke 1.9, zaoblené konce. Vlastné doplnky: kufor, snehová vločka, kompas, štít (poistenie), peňaženka, kalendár s fajkou (platby), trasa (route), lístok, blesk (optimalizátor), teplomer, hory, fotoaparát, iskry (atrakcie), parkovanie P, kuchyňa, mesiac (polárna žiara), vlny (termály).
- **Tónované ikonové dlaždice** (`tile`): 36–44 px, radius 9–11, podklad 10–12 % farby kategórie + ikona v plnej farbe kategórie, 1 px biely inset lesk. Farba = kategória, nie stav:
  letenky ľadová · doprava fjord · kde spať mach · trasa/itinerár aurora · atrakcie fialová · strava a rozpočet jantár · cestujúci fialová · neutrálne (čakajúce) slate.
- **KPI dlaždice** v hero: 4 v rade (ikona · popisok · suma mono · štítok stavu API/seed/≈); na iPhone 2.
- **Progres kruh** N/8 (56 px, ľadová) vedľa hlavnej sumy.
- Sekcie aktívneho kroku majú mini dlaždicu (26 px): Vstupy (slate ‹), Tvoja voľba (ľadová ✦), Čo z toho vyplýva (aurora trasa); výstupy a vstupy majú malé ikonky 13–14 px pred textom.
- Stanice na trase (node) používajú ikonu kroku; hotové = fajka na machovom podklade.
- Kategórie POI: waterfall→`droplets`, thermal→`waves`, glacier→`snow`/`mountain-snow`, whale→`fish`, hike→`footprints`, lava→`flame`, beach→`sun`, canyon→`mountain`, museum→`landmark`, campsite→`tent`, fuel→`fuel`, grocery→`shopping-basket`, aurora→`moon`, photo→`camera`.

## Prístupnosť
- Text na skle: vždy overiť kontrast voči *najsvetlejšej* možnej aurore pod panelom → captions minimálne `#8590A6`.
- Fokus: 2 px tyrkysový outline s 2 px offsetom.
- Heatmapa nesmie byť len farba: číslo v každom dni + textová legenda.
- Redukovaný pohyb: `prefers-reduced-motion` vypne aurorové animácie a parallax.

## Motion
- Aurora: pomalý 40 s posun radiálnych gradientov (opacity .16–.22).
- Panely: vstup `opacity 0→1, translateY 8→0`, 180 ms, `ease-out`.
- Zmena čísla: `count-up` 300 ms pri prepočte; diff štítok `+12 €` zelený/červený 2 s.
- Kaskáda po výbere letu: sekvenčné „prebliknutie" zmenených kariet v súhrne (100 ms rozostup).
