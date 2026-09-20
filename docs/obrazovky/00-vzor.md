# 00 · Jednotný vzor – 3 obrazovky, 1 riadok

Aplikácia má **tri obrazovky** a **jeden vizuálny vzor**. Všetko – letenky, noci, dni, zastávky, vozidlá, jedlá, položky rozpočtu –
je **zoznam riadkov** rovnakého tvaru. Nič iné (žiadne dashboardy, žiadne rôzne layouty).

```
Cesty  ──►  Cesta (checklist 8 krokov)  ──►  Mapa (cez celú obrazovku, z ktoréhokoľvek kroku)
                       │
                       └── Sheety (detail riadku, nastavenia, členovia, dron pravidlá, história)
```

| Obrazovka | Route | Čo je to |
|---|---|---|
| **Profil** | `/profil` (po prvom prihlásení povinný) | formulár preferencií, dokladov, dostupnosti – [00a-profil-a-ucty.md](00a-profil-a-ucty.md) |
| **Cesty** | `/` | zoznam mojich ciest + šablóny (riadky) |
| **Cesta** | `/cesta/[id]` | jedna strana zhora dole: hlavička so sumou + **8 krokov** ako karty so zoznamom; krok sa rozbalí/zbalí; URL nesie otvorený krok `#krok-2` |
| **Mapa** | `/cesta/[id]/mapa` (overlay) | jedna mapa pre všetko: trasa, dni, noci, atrakcie, kempy, palivo, dron zóny; vrstvy a spodný pás s riadkom vybraného objektu |

Sheety (výsuvné panely zdola na mobile/tablete, vpravo na desktope) nie sú obrazovky – otvárajú sa z riadku a zatvárajú späť na to isté miesto.

## Kroky – reťaz s vetvením v kroku 3

> **ADR-014 (20. 9. 2026):** poradie je **03 Doprava → 04 Itinerár → 05 Kde spať**. Schéma nižšie ukazuje pôvodný návrh (04 Kde spať, 05 Itinerár) – čísla čítaj vymenené; obsah krokov platí.

Kroky idú za sebou a **každý si berie vstupy z predchádzajúcich** (dátumy z letu, počet nocí, vozidlo, kuchynku…). Hlavné tlačidlo kroku
vždy vedie na ďalší krok. Krok 3 je rozhodnutie, ktoré určí, ako vyzerajú kroky 4 a 5:

```
01 Cestujúci & letiská ──► 02 Letenky (dátumy, noci) ──► 03 Doprava: rozhodnutie
                                                              │
                 ┌──────────────── Auto ───────────────────────┼──────────── Karavan ────────────────┐──── Bez auta ────┐
                 ▼                                             │                 ▼                   │        ▼         │
   04 Ubytovanie (noc = izba/Airbnb/penzión)                   │   04 Kempy (noc = kemp, Camping Card)│  04 Základňa (hotel Reykjavík)
                 ▼                                             │                 ▼                   │        ▼         │
   05 Itinerár (trasa, zastávky)                               │   05 Itinerár (trasa, zastávky)     │  05 Výlety (tours z Reykjavíku)
                 └──────────────────────────────┬──────────────┘─────────────────┘───────────────────┘
                                                ▼
                        06 Atrakcie ──► 07 Strava (kuchynka z 04) ──► 08 Rozpočet
```

| # | Krok | Berie z | Riadky | Dáva ďalej |
|---|---|---|---|---|
| 1 | Cestujúci & letiská & **mesiac** | profily členov | cestujúci (z profilov), letiská, **návrh mesiacov** (riadky so skóre a dôvodmi) | pax, veky, letiská, **zvolený mesiac** (alebo 2–3), rozsah dní |
| 2 | Letenky | 1 | kombinácie (kalendár = filter) | **dátumy, noci, dni**, parkovanie, cena letu |
| 3 | Doprava – rozhodnutie | 2 (dni) | 3 voľby (Auto / Karavan / Bez auta) → po výbere vozidlá tej voľby | vozidlo, 4×4, kuchynka (karavan), spotreba, **typ kroku 4 a 5** |
| 4 | Kde spať – podľa voľby: **Ubytovanie** / **Kempy** / **Základňa** | 2 (noci), 3 (typ), návrh trasy (regióny nocí) | noci → ponuky | kuchynka per noc, cena nocí, regióny |
| 5 | **Itinerár** (Auto, Karavan) / **Výlety** (Bez auta) | 2 (dni, časy letu), 3 (4×4), 4 (kde spíme) | dni → zastávky / výlety | km → palivo do 3, zastávky do 6, dni do 7 |
| 6 | Atrakcie | 5 (zastávky), 1 (veky) | v pláne + katalóg | vstupné |
| 7 | Strava | 2 (dni), 4 (kuchynka), 5 (dni v aute) | dni | strava |
| 8 | Rozpočet | všetko | položky | export |

**Návrh trasy na pozadí:** hneď po kroku 2 + 3 aplikácia potichu vygeneruje trasu (preset podľa dní a vozidla), aby krok 4 vedel, v ktorom
regióne je ktorá noc. Krok 5 tú trasu len upresňuje; zmena trasy → krok 4 dostane návrh presunu nocí (DiffToast, nie automatické prepísanie priradených nocí).

**Porovnanie auto vs. karavan** nie je samostatný mód – je to riadok v kroku 3 pred rozhodnutím („Porovnať: Auto ≈ 4 680 € · Karavan ≈ 4 910 €"
z odhadov). Po rozhodnutí sa zobrazuje len zvolená vetva; dáta ostatných vetiev sa uchovajú (`scenario_key`), takže prepnutie späť nič nestratí.

## Obrazovka Cesta (v6) – Postup vľavo, obsah vpravo

Po kontrole renderov: namiesto zvislej trasy s kruhmi je vľavo **stĺpec Postup** (vždy viditeľný, 232 px) a vpravo **obsah jedného aktívneho kroku**.
Používateľ vždy vidí: kde je (postup), koľko to stojí (súhrn), čo do kroku vstupuje, čo volí, čo z toho vyplýva a jedno tlačidlo ďalej.

| Časť | Pravidlo |
|---|---|
| Hlavička | biela 56 px: ‹ Cesty · znak Islandu + názov · prepínač **Ja / Skupina** („Ja“ = read-only náhľad podľa môjho profilu s „Uložiť ako moju cestu“; „Skupina“ = spoločná editovateľná cesta) · avatary členov · menu |
| Postup (ľavý stĺpec) | 8 riadkov: číslo alebo ✓, názov, 1-riadkové zhrnutie (hotové: výsledok + suma, aktívne: modré pozadie, čakajúce: „po 03", stlmené); klik prepne obsah. Pod ním mini **Mapa okruhu** (klik = overlay) a tlačidlo ⚡ **Navrhnúť cestu pre všetkých** (jeden sheet: posuvník cena ↔ preferencie, výsledok s kompromismi per člen) |
| Súhrn „Odhad cesty" | suma, /os., rozsah, „Krok N z 8"; 4 stĺpce Letenky / Doprava / Kde spať / Ostatné so sumou a štítkom pôvodu (API · seed · ≈ rozpätie · ≈ odhad); na kroku 05+ štvrtý stĺpec = Trasa / Atrakcie |
| Hlavička kroku | `KROK 03 · DOPRAVA`, **otázka** ako H1 („Auto, karavan alebo bez auta?"), 1–2 vety čo sa tu deje, vpravo suma kroku + pôvod |
| Z predchádzajúcich krokov | chipy s ikonkou (dátumy, pickup, vodiči, kreditka…) – klik skočí na krok |
| Tvoja voľba | obsah kroku (karty volieb / kalendár + zoznam / riadky dní) |
| Čo z toho vyplýva | karta so 4 hodnotami (čo sa prepočíta a kam ide) |
| Päta | sekundárne vľavo (ghost), **jedno primárne „Pokračovať na 0N ›"** vpravo |
| iPhone | hlavička: 8-dielny progres pásik + „Krok 03 · Doprava" + suma; obsah rovnaký (karty volieb v 3 stĺpcoch, riadky); sticky spodná lišta [Mapa][Pokračovať] |

Obrazovka **„Ako to funguje"**: nadpis + 1 odsek + mini mapa; 8 dlaždíc (ikonová dlaždica, číslo, názov, 1–2 vety, čo dáva ďalej); dole karta „Začať – Profil".

## ListRow – jediný riadok pre všetko
```
┌──────────────────────────────────────────────────────────────────────────┐
│ [ikona] Názov riadku                       meta · meta · meta   1 030 €  │
│         druhý riadok (detail)               [badge][badge]      258 €/os │
│                                                              [akcia] ▸   │
└──────────────────────────────────────────────────────────────────────────┘
```
| Slot | Obsah podľa kroku |
|---|---|
| ikona / číslo | letisko (kód), poradie zastávky, číslo dňa, avatar cestujúceho, kategória atrakcie |
| názov | „VIE → KEF 12. 9. · KEF → VIE 21. 9." / „Deň 3 · Ut 14. 9. · Juh" / „Skógafoss" / „Noc 3 · Vík" |
| meta | 2–4 krátke údaje: „priamy · 10 dní · Wizz", „168 km · 2 h 40 · 5 zast.", „60 min · park. 1 000 ISK" |
| badges | pôvod ceny (API/seed/odhad/ručne), stav (vybrané ✓, rezervácia, mimo sezóny, dron ✓/⚠/✗, klenot 💎) |
| suma | vpravo, tabulárne číslice; druhý riadok /os. alebo ISK |
| akcia | jedno tlačidlo: Vybrať / Priradiť / + Pridať / Otvoriť; ▸ = detail (sheet) |
| stav riadku | vybraný = tyrkysový ľavý pruh 3 px + svetlejšie sklo; vylúčený = prečiarknutý |
| gestá (tablet) | swipe ← = upraviť / vylúčiť / odstrániť; dlhý stisk = presunúť (dni, zastávky); ▸ alebo klik na názov = sheet |
| výška | 64 px (1 riadok) / 84 px (2 riadky); dotykové ciele ≥ 44 px |

Vnorenie (len 1 úroveň): deň → zastávky, noc → ponuky, vozidlo → poistenia. Vnorené riadky sú odsadené 32 px, bez vlastnej sumy vpravo ak ju má rodič.

## Sheet – detail riadku (rovnaký pre všetky typy)
Zhora: úchyt · názov · zatvoriť. Telo: sekcie ako jednoduché riadky „label – hodnota" (editovateľné inline). Dole: primárna akcia + sekundárna.
Typy sheetov: let (segmenty, batožina, parkovanie, overiť), zastávka/atrakcia (popis, vstupné podľa veku, trvanie, sezóna, dron, tipy), noc/ponuka, vozidlo, deň strava, položka rozpočtu, cestujúci, letisko, **nastavenia**, **členovia**, **dron pravidlá & checklist**, **história zmien**, **šablóny (uložiť/použiť)**, **optimalizátor**.
Mapa nie je sheet – je to overlay (docs/obrazovky/03-mapa.md).

## Responzivita (jedna stĺpcová strana všade)
| Zariadenie | Šírka obsahu | Rozdiely |
|---|---|---|
| iPhone 390 | 100 % − 16 px | hlavička 2 riadky; tlačidlá Navrhnúť/Mapa v spodnej lište; sheet cez 92 % |
| iPad portrait 820 | 760 px centrované | ideálne pre checklist |
| iPad landscape 1180 / Mac | 820 px centrované, vpravo voľné miesto pre otvorený sheet (420 px) namiesto prekrytia | sheet ako pravý panel |
Krok rozbalený na tablete zaberá toľko, koľko treba – strana scrolluje; hlavička kroku sa „prilepí" pod hlavičku obrazovky, kým je krok rozbalený.

## Čo z pôvodného návrhu ostáva a čo sa mení
- Všetky **konfigurácie** ostávajú (sú v `krok-*.md`), len sú teraz v chipoch + „viac" sheete namiesto samostatných stránok.
- Dashboard, samostatné stránky Atrakcie/Strava/Rozpočet/Dron/Šablóny **zanikajú** – sú to kroky alebo sheety.
- Mapa je jedna, cez celú obrazovku, s vrstvami (aj dron).
- Kaskáda po výbere letu ostáva (docs/05); prejaví sa ako zmena súm v hlavičkách krokov + DiffToast.
