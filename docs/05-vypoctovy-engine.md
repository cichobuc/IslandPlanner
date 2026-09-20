# 05 · Výpočtový engine

Čisté TypeScript funkcie v `src/engine/`. Vstup `TripSnapshot`, výstup `BudgetResult`. Bez IO, deterministické, otestované vo Vitest.
Beží na serveri aj v prehliadači (okamžitý prepočet pri každej zmene).

## Money a zaokrúhľovanie
- Interne všetko v **EUR** s presnosťou na centy; ISK sa prepočíta kurzom zo snapshotu (`fx.ISK_EUR`).
- Zobrazenie: celé eurá v súhrnoch, centy v detailoch. Pôvod (`source`) sa propaguje: ak je v položke aspoň jeden `estimate`, položka je `estimate`.
- Konfidencia: `exact` (verify z API/manuál) · `cached` (agregátor) · `estimate` (seed/odhad). Rozpočet ukazuje rozsah `min–max` podľa podielu odhadov.

## 0. Zásady
- **Časové pásma:** vstupy s tz; „prílet 09:15" je lokálny čas KEF (UTC+0), odchod z BA lokálne (UTC+2 v septembri). Kapacita dňa, pickup/return a nocľah pri KEF sa počítajú v lokálnom čase miesta.
- **Ručné vs. odhad:** kaskáda a generátor menia len riadky `is_manual = false`; ručné riadky dostanú návrh (`Suggestion[]`), ktorý používateľ potvrdí.
- **Bez siete:** generátor používa `route_matrix` (seed) → beží v prehliadači okamžite; sieť len pre vlastné miesta (OSRM/ORS) a domov → letisko.

## 1. Vek a kategórie (`ageRules.ts`)
```
ageOn(traveler, date) = celé roky k dátumu
priceFor(poi, traveler, visitDate, variant) = prvé pravidlo, kde min_age ≤ vek ≤ max_age; bez pravidiel → 0
entryTotal(stop) = Σ_travelers priceFor(...) [per person] + parking_fee [per vehicle] + Σ group rules
```
Letenky: infant (< 2) / child (2–11) / adult – LCC účtujú dieťa ako dospelého, infant paušál (Ryanair ~ 25 €, Wizz ~ 30 € / segment).

## 2. Kombinácie letov (`flightCombos.ts`)
Vstup: `DayFare[]` za každé (origin, segment), parametre `minDays, maxDays, pax, bags, parkingEnabled, accessMode`.
```
for origin in origins:
  for outDate in month:
    outFares = direct(origin→KEF, outDate) ∪ selfTransfer(origin→hub→KEF, outDate)
    for retDate in [outDate+minDays .. outDate+maxDays]:
      retFares = direct(KEF→origin, retDate) ∪ selfTransfer(KEF→hub→origin, retDate)
      for (o, r) in outFares × retFares:
        fare      = (o.pp + r.pp) × pax
        bags      = Σ_travelers Σ_segments bagPrice(airline(segment), bagType)
        parking   = parkingEnabled ? parkingPrice(origin, days = retArrival.date − outDeparture.date + 1) : 0
        access    = accessCost(home, origin, mode, pax) × 2
        hubNight  = transferOvernight ? hubLodgingEstimate × ceil(pax/2) : 0
        total     = fare + bags + parking + access + hubNight
        emit Combo{ ..., totalGroup: total, totalPP: total/pax, days, nights }
heatmap[outDate] = min(total) cez všetky origins & retDate
top = sort(combos, totalGroup)[0..50]
```
Filtre aplikované pred emit: airline whitelist, max prestupov, max trvanie cesty, odlet po HH:MM, návrat pred HH:MM, len priame.
Skóre okrem ceny: „pohodlie" (počet prestupov, čas odletu 05:00–07:00 = malus) – zobrazuje sa ako druhotný štítok, neradí sa podľa neho, pokiaľ používateľ nezmení radenie.

## 1b. Návrh ideálneho mesiaca (`monthSuggest.ts`)
Vstup: profily členov (záujmy 0–3, dostupnosť, min/max dní), sezónna matica javov (docs/07: puffiny, polárna žiara, ľadové jaskyne, veľryby, Highlands, davy, ceny, počasie), cenový index leteniek po mesiacoch (tp-flights `/v1/prices/monthly`).
```
pre každý mesiac m ∈ prienik dostupnosti (alebo všetky, ak prázdny):
  interest = Σ_členov Σ_záujmov váha(člen, záujem) × rating(záujem, m) / max
  price    = 1 − priceIndex(m)             (letenky + sezónne ceny áut/ubytovania)
  crowd    = 1 − crowdIndex(m)
  risk     = 1 − weatherRisk(m)
  score(m) = 0,45·interest + 0,30·price + 0,15·crowd + 0,10·risk
  reasons  = top 3 kladné + top 2 záporné („bez puffinov“, „F-cesty zatvorené“)
výstup: mesiace zoradené, s rozsahom cien; v režime Ja váhy jedného člena, v režime Skupina súčet
```
UI: riadky mesiacov v kroku 01 („september ★★★★☆ · 4 120–4 900 € · polárna žiara možná · bez puffinov · kempy do 15. 9.“); výber mesiaca → krok 02 hľadá ten mesiac (alebo 2–3 na porovnanie).

## 1c. Režim Ja vs. Skupina (`groupPlan.ts`)
- **Ja**: `planFor(profile)` = mesiac (1b), letisko (preferované + cesta), vetva (komfort ≤ kemp → karavan kandidát), trasa (záujmy, tempo), strava (profil) → rozpočet pre 1 osobu ako člena skupiny N (skupinové položky delené N). Je to **náhľad** (neukladá sa).
- **Skupina**: `mergeProfiles(members)`: dostupnosť = prienik; záujmy = súčet váh (3 = „kvôli tomu idem“ má prednosť – atrakcia s váhou 3 u kohokoľvek je „musí“); komfort = najvyššia požadovaná úroveň (kto chce penzión, nespí v stane); strava = najvyššia úroveň z profilov, ale dni s kuchynkou ostávajú úsporné; rozpočet = najnižší cieľ (upozorní, ak sa nedá dodržať); tempo = najpomalšie.
- `compromises[]` per člen: čo stratil (puffiny mimo sezóny, drahší mesiac), čo získal, Δ € oproti jeho „Ja“ plánu.
- Kapacita: `vehicle.seats ≥ pax`, `vehicle.luggage_capacity ≥ počet 20 kg kufrov`, `camper.sleeps ≥ pax` – inak návrh 2 vozidiel alebo ⚠.
- Skupinový plán sa uloží ako cesta v režime `group`; „Ja“ plány ostávajú na porovnanie (riadok v hlavičke „Ja 1 090 € · Skupina 1 170 €“).

## 1d. Delenie nákladov (`split.ts`)
`share(item, member) = item.split == 'person' ? item.amount(member) : item.split == 'group' ? item.amount / N : item.split == 'vehicle' ? item.amount / N (per vozidlo, N = posádka) : custom_shares[member]`.
Cesta na letisko: `vehicles = ceil(max(pax/4, bags/4))` autom z Bratislavy; ak `vehicles > 1` porovná s busom (4× lístok) a vyberie lacnejšie; parkovanie × vehicles; celé `group`.

## 1e. Vziať z domu (`bringFromHome.ts`)
```
pre položku i: saving_i = (price_is_i − price_sk_i) × qty_i;  weight_i × qty_i
zoradiť podľa saving/kg; napĺňať batožinu: prvá podaná 20 kg (ak už kúpená: 0 €), ďalšia 20 kg = cena batožiny airline
odporúčanie: pridať batožinu, kým Σ saving položiek v nej > cena batožiny + 10 €
obmedzenia: colné (3 kg potravín / 25 000 ISK na os., alkohol limity, zákaz surové mäso/mlieko), airline (LiPo len príručná, plyn nie, tekutiny > 100 ml len podaná)
výstup: zoznam „vziať“ (kto nesie), „kúpiť tam“, „nechať“, úspora celkom, počet batožín
```

## 2b. Rozhodnutie o doprave (`transportMode.ts`)
`transport_mode ∈ {car, camper, no_car}` určuje `step4.kind` (lodging | campsites | base) a `step5.kind` (itinerary | tours). Zmena módu nemaže dáta druhej vetvy (`scenario_key`).
Odhad pre rozhodovací riadok: `estimateBranch(mode)` = preset(dni) → km → palivo + vozidlo trieda default + noci × odhad regiónu (izby / kempy / RVK hotel) + strava (kuchynka podľa módu) + výlety (no_car).

## 3. Kaskáda po výbere letu (`cascade.ts`)
```
applyFlightSelection(snapshot, combo):
  trip.startDate = combo.out.dep.date; trip.endDate = combo.ret.arr.date
  days = endDate − startDate + 1; nights = days − 1
  parking.days = days (ak sa odchádza z domu v deň odletu; +1 ak odlet < 07:00 a prespáva sa pri letisku)
  vehicle.days = ceil((ret.dep − out.arr − 2h buffer) / 24h)   // pickup po prílete, return 3 h pred odletom
  itinerary = generateItinerary({ days, arrival: out.arr, departure: ret.dep, vehicle, pace, interests, locked days zachovať })
  lodgingStays = itinerary.nights.map(n => existing(n.region) ?? { region: n.region, kind: scenárDefault })
  food.days = days; first day from 'lunch' if arrival < 13:00 else 'dinner'; last day until 'lunch'
  return { snapshot', diff: Change[] }
```
`Change` = `{ path, before, after, label_sk, label_cs }` → toast + možnosť undo (uloží sa `trip_revisions`).

## 4. Generátor itinerára (`itineraryGen.ts`)
1. **Výber presetu podľa dní a vozidla** (ak `trip.routePreset = auto`; ručný kľúč z kroku 04 má prednosť a kaskáda po zmene letu ho zachová – `resolvePreset`; krátke okruhy `golden_only`, `golden_west`, `south_only`, `south_west` sú len na ručný výber, hodnotenie `ratePresets` v docs/07):
   - ≤ 5 dní → `golden_south` (Reykjavík, Golden Circle, juh po Vík/Jökulsárlón podľa dní)
   - 6–7 → `south_east` (po Höfn/Stokksnes a späť)
   - 8–12 → `ring` (Ring Road, smer proti smeru hodín pri zlom počasí na juhu – default v smere hodín: juh → východ → sever → západ)
   - 10–13 + záujem `nature` → `ring_snaefellsnes`
   - ≥ 13 → `ring_westfjords`; 4×4 + `intense` → pridá Landmannalaugar/Highlands (len ak F-cesty otvorené – september áno do ~ polovice)
2. **Kostra**: preset definuje poradie regiónov a povinné „kotvy" (Þingvellir, Seljalandsfoss, Skógafoss, Reynisfjara, Jökulsárlón, Stokksnes, Stuðlagil, Dettifoss, Mývatn, Goðafoss, Akureyri, Kirkjufell…).
3. **Rozdelenie dní**: cieľ jazdy/deň podľa tempa: relaxed ≤ 3 h (~ 200 km), normal ≤ 4,5 h (~ 300 km), intense ≤ 6 h (~ 400 km). Deň príletu/odletu má polovičnú kapacitu.
   Greedy: prechádzaj kotvy po trase, pridávaj do dňa, kým `drive + Σ visit_min ≤ dayCapacity(sunset − sunrise − 1h)`; inak nový deň.
4. **Doplnenie záujmov**: z POI v okruhu ≤ 15 km od trasy vyber tie s najvyšším `interest_weight[záujmy]`, kým je v dni voľná kapacita; rezervované aktivity (ľadovec, veľryby) dostanú prioritu a pevný slot.
5. **Prenocovanie**: koniec dňa → najbližší región s ubytovaním/kempom ≤ 30 min od poslednej zastávky.
6. **Validácie**: > 5 h jazdy = varovanie; F-cesta bez 4×4 = chyba; POI mimo sezóny = varovanie; príchod po západe = varovanie.
7. **Zamknuté dni** sa nemenia; okolité sa prepočítajú.
8. **Reálny čas jazdy**: `drive_min_real = osrm_min × (1,25 asfalt | 1,5 štrk) + 10 min × počet zastávok`; kapacita dňa sa počíta z reálneho času.
9. **Servisné zastávky**: pred úsekom > 100 km bez čerpacej stanice vloží ⛽; každý 2.–3. deň 🛒 (Bónus/Krónan podľa hodín, nedeľa ⚠); Vínbúðin len ak `food.alcohol`.
10. **Rezervný deň a plán B**: pri ≥ 8 dňoch 1 deň `reserve`; každá zastávka má `must | optional`; každý deň 1–2 `rainy_day_ok` alternatívy.
11. **Sloty**: zastávky s `booking_time` sú pevné; generátor plánuje okolo nich; kolízia = chyba.
Výstup: `ItineraryDay[]` s km/min (z `route_cache`, inak Haversine × 1,25 a označenie `estimate`).

## 5. Ubytovanie (`lodging.ts`)
Pravidlá pred hľadaním: `arrival > 20:00 → night1.region = reykjanes`; `departure < 10:00 → lastNight.maxMinutesToKEF = 45`; `stay.open_until < night.date → warn`;
`check_in_until < plannedArrival(day) → warn(self_checkin?)`; `pax = 4 → roomMode ∈ {2×double, apt4, 4×dorm}`.
```
stayCost(stay) = kind == 'camper_site' ? campsite(nights=1, pax, electricity) 
               : option.price_per_night + cleaning_fee/nights + service_fee_pct × ... + city_tax_pp × pax
campsite(pax) = campingCard ? 0 (ak kemp v sieti; card cena je manual item)  : pax × perPersonNight + electricity
scenárTotal = Σ nights stayCost
```
Kuchynka: `stay.has_kitchen` → posúva stravu na `self` pre raňajky/večeru v tú noc/ráno.

## 6. Doprava na Islande (`transport.ts`)
```
rental = price_per_day × days + Σ insurance/day × days + Σ extras + one-way fee
fuel   = Σ_days drive_km / 100 × consumption × fuelPrice(fuel type) (ISK→EUR) × 1.05 (rezerva)
camperExtras = bedding + kitchenKit + heater (ak nie v cene)
scenárTotal = rental + fuel + camperExtras + tolls (Vaðlaheiði tunnel 1 990 ISK ak trasa cez neho)
```
Cesta na letisko a parkovanie patria do kategórie *Letenky & cesta* (počítané v combo).

## 7. Strava (`food.ts`)
```
pre každý deň d:
  level = day_overrides[d] ?? profile.level
  hasKitchenEve = stay(d).has_kitchen || vehicle.kind == 'camper'
  hasKitchenMorn = stay(d-1).has_kitchen || camper
  breakfast = hasKitchenMorn && level != 'comfort' ? p.breakfastSelf : p.breakfastOut
  lunch     = level == 'budget' ? p.lunchSelf : level == 'mid' ? p.lunchFast : p.lunchOut   (deň na cestách → vždy 'self' pri budget)
  dinner    = hasKitchenEve && level != 'comfort' ? p.dinnerSelf : p.dinnerOut
  extras    = coffee_per_day × p.coffee + (alcohol ? p.alcoholPerDay : 0) + snack
  dayTotal  = (breakfast + lunch + dinner + extras) × pax   (prvý/posledný deň podľa časti dňa)
total = Σ dayTotal + first_shop (jednorazovo, nahrádza ~ prvý deň potravín)
```

## 8. Rozpočet (`budget.ts`)
Kategórie a poradie v UI:
1. **Letenky & cesta** – letenky, batožina, parkovanie, cesta na letisko, nocľah na hube
2. **Ubytovanie** (per scenár)
3. **Doprava na Islande** – prenájom, poistenie, extras, palivo, tunel
4. **Atrakcie** – vstupné (po osobách), parkovné, rezervované túry
5. **Strava**
6. **Ostatné** – poistenie, SIM, suveníry, Camping Card, manuálne položky
7. **Rezerva** – `reserve_pct` × (1–6)
```
BudgetResult = {
  scenarios: { car: Totals, camper: Totals, custom?: Totals },
  Totals = { byCategory: {cat: {amount, confidence, min, max, lines: Line[]}}, group, perPerson, perTraveler: {id: amount}, vsTarget? }
}
```
`perTraveler` rieši delenie nákladov: spoločné položky rovným dielom, osobné (vstupné, batožina, letenka) podľa osoby. Voliteľne „kto zaplatil" → vyrovnanie (v2).

## 8b. Časová os platieb (`timeline.ts`)
Z položiek: letenky (dnes), vozidlo (`T−120 d` odporúčanie, depozit v deň pickupu ako *blokácia*), ubytovanie (storno termín), atrakcie (`visitDate − book_ahead_days`), poistenie/eSIM (`T−21 d`), parkovanie (`T−14 d`), tunel (`day+1`).
Výstup: `PaymentEvent[] { date, label, amount, kind: pay|hold|deadline, step }` → záložka „Kedy platiť" + .ics + likvidita na osobu.

## 9. Návrh cesty pre všetkých (`optimizer.ts` + `groupPlan.ts` – jeden sheet)
Jedna akcia „Navrhnúť cestu pre všetkých" s posuvníkom **cena ↔ preferencie** (w ∈ 0..1): skóre kandidáta = `(1−w) · (1 − cena/maxCena) + w · preferencie(mergeProfiles)`; w = 0 → čisto najlacnejšie, w = 1 → čisto podľa záujmov (mesiac, atrakcie). Výsledok vždy s kompromismi per člen. Postup:
1. Letenky: top 10 combos z kalendára (už zoradené podľa total).
2. Pre každé combo (dní D): itinerár preset(D) → km → palivo; noci → ubytovanie *odhad* per región (seed) pre oba scenáre; strava podľa profilu; atrakcie z presetu.
3. Výsledok: tabuľka `combo × scenár` s celkovou cenou → odporúčanie + „prečo" (napr. „11 dní z BUD je o 140 € lacnejšie než 9 dní z VIE, lebo letenka je lacnejšia o 220 € a dva dni navyše stoja 80 €").
4. Klik = aplikuj (kaskáda).

## 10. Sledovanie cien (`priceWatch.ts`)
Cron vytvorí `price_snapshots` a spočíta `Δ = total_today − total_yesterday` per cesta; ak `|Δ| > max(20 €, 5 %)` → e-mail s rozpisom, čo sa zmenilo.

## Testovacie prípady (Vitest) – minimum
- ageRules: narodený 15. 9. 1959, návšteva 14. 9. 2027 → 67 (senior), 16. 9. → 68; infant hranica.
- flightCombos: 2 letiská × 30 dní × [8..12] → správny počet kombinácií; parkovanie 10 dní vs 9; self-transfer s prestupom < 3 h vylúčený.
- cascade: zmena letu 9 → 11 dní pregeneruje 2 nezamknuté dni a zachová zamknutý.
- itineraryGen: 10 dní normal 4×4 → Ring, žiadny deň > 4,5 h; 5 dní → golden_south.
- food: kemp s karavanom → všetky raňajky/večere self; hotel bez kuchynky → out.
- budget: súčet kategórií = group; perPerson × pax = group ± zaokrúhlenie.
