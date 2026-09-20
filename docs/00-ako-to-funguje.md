# 00 · Ako to celé funguje – postup od začiatku do konca

Jedna cesta, jeden zoznam, 8 krokov. Tu je celý postup tak, ako ho zažije partia 4 ľudí z Bratislavy, a čo pri tom aplikácia robí na pozadí.

## 0. Prvý deň – účty a profily (raz)
Lukáš (správca) založí Petrovi, Jane a Martinovi kontá – každému príde e-mail s **dočasným heslom**; pri prvom prihlásení si ho zmenia
a vyplnia **profil**: dátum narodenia, vodičák (od kedy, chce šoférovať), dron, čo chcú vidieť (0–3 za každý záujem), tempo, komfort,
strava, rozpočet, **kedy môžu** (mesiace, blokované termíny), letiská, doklady. Kreditka sa nikde nezadáva (len „mám kartu na depozit“ áno/nie).
Lukáš založí cestu „Island“ a pridá ich s rolami (editor / prezerajúci). Profily sa prenesú do kroku 01 ako cestujúci.

## 0b. Ja → Skupina
Každý si môže pozrieť **„Ja“** – cestu vykalkulovanú len podľa neho (jeho mesiac, letisko, komfort, strava, atrakcie): „keby to bolo po mojom, stálo by ma to 1 090 €“.
Potom Lukáš klikne **„Navrhnúť pre všetkých“**: app zlúči profily (prienik termínov, záujmy so silou „kvôli tomu idem“ majú prednosť, komfort podľa najnáročnejšieho, rozpočet podľa najnižšieho) a navrhne mesiac, letisko, vetvu a trasu – s riadkami kompromisov („Jana: bez puffinov, +1 termál, +40 €“). To je skupinová cesta, ktorá ide krokmi 01–08.

## 1. Krok 01 · Cestujúci, letiská a mesiac (10 minút)
- **Mesiac**: riadky mesiacov zoradené podľa skóre z profilov (záujmy × sezóna × ceny × davy × dostupnosť) s dôvodmi – napr. september ★★★★☆ (polárna žiara možná, veľryby, bez puffinov, ceny −25 % vs. júl, kempy do 15. 9.). Zvolia september (alebo porovnajú 2–3 mesiace).
- Cestujúci sú predvyplnení z profilov (vek, vodič – app overí vek a prax –, dron, batožina, doklady).
- Domov = Bratislava; app cez OSRM spočíta km a čas na BTS, VIE, BUD, PRG, KTW a ku každému letisku ponúkne spôsob – **1 auto pre celú skupinu** (km × spotreba × palivo SK + známky + parkovanie, delené 4) alebo bus/taxi, ak sa nezmestia.
  Pri KTW a BUD ukáže „priamy Wizz do KEF", pri ostatných „len s prestupom".
- Mesiac september, dĺžka 8–12 dní, batožina na dvojice (2× 20 kg + 4× 10 kg), záujmy (termály, ľadovce, veľryby, príroda, dron), tempo normálne, klenoty 30 %.
- Riadok „Doklady & poistenie" ukáže, čo komu chýba (OP platnosť, EHIC, poistenie s túrami).
- **Pokračovať → 02** spustí na pozadí vyhľadávanie mesiaca.

## 2. Krok 02 · Letenky (kalendár = filter, zoznam = výsledok)
- App potiahne z Travelpayouts (Flight Data v1) kalendár cien pre každé letisko, z Wizz priame KTW/BUD–KEF, z Ryanair segmenty do Londýna/Berlína a spojí self-transfery (min. 3 h).
- Ku každej kombinácii pripočíta batožinu podľa airline, parkovanie na počet dní, cestu na letisko a prípadný nocľah na hube → **celková cena na osobu**.
- Kalendár septembra ukáže pre každý deň najnižšiu celkovú cenu (tmavšie číslo = lacnejšie, ⚡ = najlepší deň). Klik na 12. 9. → zoznam kombinácií zoradený podľa celkovej ceny.
- Vyberú `KTW → KEF 12. 9. · KEF → KTW 21. 9. · Wizz · priamy · 4 os.` → app **overí cenu pre 4 osoby cez Google Flights** (LCC dražie po sedadlách) a uloží ju.
- **Kaskáda**: dátumy 12.–21. 9., 9 nocí, 10 dní, parkovanie 10 dní, dni prenájmu, dni stravy; na pozadí sa vygeneruje **návrh trasy** (Ring Road 10 dní) → kroky 03–08 dostanú odhady. DiffToast ukáže, čo sa zmenilo, s tlačidlom Vrátiť.
- Od teraz cron každý deň overí cenu letu a pri zmene > 5 % pošle e-mail.

## 3. Krok 03 · Doprava – rozhodnutie
- Tri karty s odhadom **celej cesty** (nie len vozidla), z presetov a rozpätí: `Auto ≈ 4 680 € · Karavan ≈ 4 910 € · Bez auta ≈ 5 300 €` + jednou vetou prečo (kempy vs. izby, kuchynka, palivo, výlety).
- Zvolia **Auto** → zoznam vozidiel (seed cenníky s odkazmi na požičovne), Kombi 78 €/deň; pod ním poistenie (Gravel odporúčané, SCDW), extras (2. vodič), **požiadavky** (vek ✓, kreditka ✓, km bez limitu, depozit 2 500 € = blokácia), palivo z km návrhu trasy × spotreba × aktuálna cena (gasvaktin).
- Keby zvolili Karavan: to isté s campermi + kúrenie + upozornenie na noci 3–8 °C; krok 04 sa zmení na Kempy. Bez auta: Flybus + krok 05 = Výlety.
- **Pokračovať → 04 Ubytovanie.** (Voľba sa dá kedykoľvek zmeniť, nič sa nestratí.)

## 4. Krok 04 · Kde spať
- 9 riadkov nocí, každá už má **región z návrhu trasy** (Keflavík → Flúðir → Vík → Höfn → Egilsstaðir → Mývatn → Akureyri → Borgarnes → Reykjavík).
- Pravidlá app: prílet 09:15 → noc 1 môže byť v Reykjavíku; odlet 15:20 → posledná noc v Reykjavíku/Reykjanesi je OK; 4 osoby → „2 izby / apartmán / 4 lôžka".
- **Predvolene každá noc ukáže rozpätie** z regiónu a typu (napr. Juh · penzión pre 4 · 160–240 €). Rozpočet počíta so stredom a ukazuje min–max. To stačí na rozhodnutie.
- Kto chce, klikne „Spresniť": zoznam ubytovaní v regióne (bez cien), link na Booking/Airbnb s dátumami a 4 hosťami, vloží 1 ponuku → noc je presná. Kuchynka pri noci sa prenesie do stravy.
- Vo vetve Karavan sú tu kempy so **živými cenami z tjalda.is** (2 500–2 950 ISK/os + elektrina), otvorením (⚠ ak zatvára pred dátumom), službami a Parka rezerváciou; Camping Card sa neoplatí (platí len do 15. 9.).
- **Pokračovať → 05 Itinerár.**

## 5. Krok 05 · Itinerár
- 10 riadkov dní z návrhu trasy; každý deň: km a čas (OSRM + korekcia na islandské cesty), svetlo (06:48–19:52), zastávky s popisom, trvaním, vstupným podľa veku, parkovným (živo z Parka) a dron statusom; medzi zastávkami riadky jazdy s ⛽ a 🛒.
- Generátor už zohľadnil: záujmy, sezónu (puffiny v septembri preč, ľadovcové túry áno), 30 % klenotov (Kvernufoss, Múlagljúfur, Stuðlagil), 2WD (žiadne F-cesty), sloty rezervácií, rezervný deň pri Mývatne, plán B pri daždi.
- Upravujú: presunú Reynisfjaru na ráno (dlhý stisk), pridajú Hoffell horúce vane z katalógu, zamknú deň 3. Zmena trasy → app navrhne posun noci (nepíše sám, len navrhne, lebo noc už je ručne spresnená).
- 🗺 Mapa: jedna obrazovka cez celý iPad – trasa, dni, noci, kempy, čerpačky, **dron zóny** (červená zákaz, oranžová povolenie); klik na čokoľvek = ten istý riadok dole.
- **Pokračovať → 06 Atrakcie.**

## 6. Krok 06 · Atrakcie & vstupné
- Hore „V pláne" (12 zastávok s cenou pre 4 podľa vekov), dole katalóg s filtrami (kategórie, ★ sezóna, klenoty, dron ok, po trase).
- Rezervované aktivity (Sólheimajökull túra, Húsavík veľryby, Sky Lagoon) majú **živú cenu z Viator** (kde sa dá), termín „rezervovať do", storno podmienky a „čo si vziať" → ide do balenia.
- Ku každej atrakcii detail: popis, trvanie, vstupné po osobách, kedy sa oplatí (12 mesiacov), dron pravidlá, tipy, lacnejšia alternatíva.
- **Pokračovať → 07 Strava.**

## 7. Krok 07 · Strava
- Úroveň úsporná; 10 riadkov dní: kuchynka z kroku 04 určí raňajky/večere doma vs. vonku; dni v aute = sendvič; prvý deň od obeda, posledný do obeda.
- Riadky navyše: duty free na KEF po prílete (alkohol), prvý nákup v Reykjanesbæ, veci z domu (káva, korenie), káva 1×/deň. Karavan by mal kuchynku každý deň (o ~ 80 € lacnejšie).
- **Pokračovať → 08 Rozpočet.**

## 8. Krok 08 · Rozpočet
- Celkom pre 4 a na osobu, rozpätie min–max podľa toho, koľko položiek je ešte odhad; kategórie → položky s pôvodom (API / seed / odhad / ručne), klik na položku skočí na krok, kde sa dá zmeniť.
- Záložky: **Scenáre** (Auto vs. Karavan vedľa seba), **Na osobu** (skupinové položky – auto na letisko, prenájom, palivo, poistky vozidla, ubytovanie – rovným dielom; osobné – letenka, batožina, vstupné, strava – presne; kto zaplatil; „Ja vs. Skupina“), **Vziať z domu** (čo priviezť z Bratislavy: Island je 2–3× drahší; úspora vs. cena batožiny navyše, colné limity, kto čo nesie), **Kedy platiť** (letenky teraz, auto do dátumu, túry 2–4 týždne vopred, depozit v deň prevzatia ako blokácia, storno termíny; .ics), **História** (vývoj ceny), **Export** (PDF s itinerárom a checklistami, CSV, JSON, .ics, link).
- Sheet **Balenie** vygenerovaný z plánu (plavky + uterák, čelovka, spacák ak treba, dron batérie do príručnej, Parka účet…).

## 9. Do odchodu
Cron denne: kurz ISK, palivo, cena letu, ceny túr; e-mail pri zmene. Hlavička ukazuje „čo sa zmenilo od poslednej návštevy".
Týždeň pred: počasie a stav ciest v itinerári, stiahnutá offline mapa, PDF v telefóne. Deň pred: online check-in (pripomienka z .ics).

## 10. Na Islande
iPad/iPhone offline: itinerár, mapa trasy, dron zóny, adresy nocí, Parka, 112 app. Každý deň riadok „pred odchodom" (vietor, cesty, svetlo).
Zmeny na mieste (preskočená zastávka, iný kemp) sa zapíšu a rozpočet sa prepočíta; na konci „reálne vs. plán" a vyrovnanie medzi štyrmi.

## 11. Po ceste
Trasu uložia ako **šablónu** („Ring Road 10 dní úsporne, 30 % klenotov") – ktokoľvek si ju skopíruje do svojej cesty a upraví; originál ostáva.

---
Kde sa čo berie: [04-api-a-zdroje-dat.md](04-api-a-zdroje-dat.md). Ako sa čo počíta: [05-vypoctovy-engine.md](05-vypoctovy-engine.md). Obrazovky a kroky: [obrazovky/](obrazovky/).
