# Krok 7 · Strava

**Berie z krokov:** 02 dni (prvý od obeda, posledný do obeda), 04 kuchynka per noc (karavan = vždy), 05 dni v aute a zastávky pri obchodoch.
**Dáva ďalej:** strava → 08; nákupné zastávky → 05 (riadok jazdy „🛒 Krónan").

**Zbalený riadok:** `⑦ Strava · úsporná · 18 €/os/deň · 720 € · [A | B 640 €]`
**Nástroj:** prepínač úrovne [Úsporná][Stredná][Komfortná] + riadok chipov: káva/deň · alkohol · prvý nákup · ceny položiek (sheet)
**ListRow (deň):** `[3] Deň 3 · Ut 14. 9. | kuchynka ✓ · Ra 3 · Ob 5 · Ve 8 · extra 5 | [úsporná] | 21 €/os · 84 € | ▸`; deň bez kuchynky má `[⚠ hotel bez kuchynky]` a vyššiu sumu; prvý/posledný deň `od obeda` / `do obeda`.
Riadky na konci: `Prvý nákup Bónus · 4 os. · 90 €`, `Káva 1×/deň · 200 €`, `Alkohol · vyp · 0 €`.
**Päta:** [Upraviť ceny položiek] · primárna: **[Pokračovať → 08 Rozpočet]**

---

## Konfigurácie (chipy + sheet „viac")
| Prvok | Typ | Default | Efekt |
|---|---|---|---|
| Úroveň | segmented | Úsporná | predvolené ceny a pravidlá |
| Ceny položiek | tabuľka editovateľná (11 položiek) | seed (docs/07) | `custom_prices` |
| Káva / deň | stepper 0–4 | 1 | |
| Alkohol | toggle + cena/deň | vyp | |
| Snack / deň | stepper | 1 | |
| Prvý nákup | number | 22 €/os. | jednorazovo |
| Deň – úroveň | per deň override (sheet) | – | `day_overrides` |
| Deň – kuchynka | auto z ubytovania/karavanu; ručný override | | Ra/Ve self vs out |
| Deň – špeciál | „reštaurácia večer" (cena), „piknik", „nič (let)" | | |
| Prvý/posledný deň | auto podľa časov letu (od obeda / do obeda) | | |
| Mena | EUR / ISK zobrazenie | EUR | |
| Nakupovanie tip | info: Bónus/Krónan na trase (ikony v itinerári) | | |

## Pravidlá (zhrnutie z enginu)
- Kuchynka ráno = self raňajky; kuchynka večer = self večera (okrem Komfort).
- Úsporná: obed vždy vlastný (sendvič z nákupu); Stredná: fast food/polievka; Komfort: reštaurácia.
- Karavan (vetva z kroku 03) = kuchynka každý deň → lacnejšie; rozdiel zobrazený v rozhodovacom riadku kroku 03.
- Deň s > 4 h jazdy: snack +1 (auto).

## Stavy
- Bez ubytovania: kuchynka „?" → počíta s úrovňou bez kuchynky a označí odhad; po priradení sa prepočíta.

## Akceptačné kritériá
- Zmena ktorejkoľvek ceny prepočíta rozpis a rozpočet okamžite.
- Rozpis dní zodpovedá dátumom cesty a kuchynkám z ubytovania.

## Prechod – čo krok hľadá a čo mu chýbalo
**Hľadá:** seed ceny položiek, kuchynku z kroku 04, dni v aute z kroku 05, obchody na trase (Overpass).
**Zlepšenia doplnené do návrhu:**
- **Alkohol = duty free na KEF** – Vínbúðin (štátne obchody) je drahá, s krátkymi hodinami a v nedeľu zatvorená; najlacnejšie je kúpiť limit v duty free hneď po prílete → riadok „nákup na KEF pri prílete" s limitmi (napr. 1 l tvrdý + 6 l pivo/os. – overiť aktuálne).
- **Prvý nákup** – Bónus/Krónan v Reykjanesbæ (10 min od KEF) v deň 1; riadok s otváracími hodinami a odhadom 90 € pre 4 na 3 dni.
- **Z domu** – riadok „vezieme si z domu" (káva, korenie, olej, čaj, instantné polievky, energetické tyčinky) – ušetrí ~ 40–60 € a ide do balenia.
- **Nedeľa a malé mestá** – Bónus v nedeľu krátko / niekde zatvorený; reštaurácie v malých mestách zatvárajú ~ 21:00 → plán dňa varuje.
- **Voda** – z kohútika zdarma všade (aj horúca so sírou); fľaše = 0 €; riadok pripomenie „termosky".
- **Karavan** – kuchynka každý deň, ale plyn/varič a riad v cene? (z kroku 03) → ak nie, položka.
- **Costco Reykjavík** – len s členstvom, oplatí sa pri 4 ľuďoch len ak niekto má kartu → voliteľný riadok.
- **Jedlo na čerpačkách** – N1 hot dog/polievka ~ 8–12 € ako reálna „stredná" možnosť na dlhé dni.

## Na čo nezabudnúť
- ☐ duty free na KEF po prílete · ☐ prvý nákup deň 1 · ☐ veci z domu · ☐ nedeľa · ☐ termosky · ☐ karavan: varič, plyn, riad · ☐ raňajky v ubytovaní v cene? (ovplyvní riadok dňa)
