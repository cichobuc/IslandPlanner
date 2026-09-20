# 01 · Vízia a požiadavky

## Vízia

Jedna aplikácia, ktorá odpovie na otázku **„Koľko nás bude stáť Island v septembri a ako to spraviť najlacnejšie?"**
– nie odhadom, ale z reálnych cien: letenky z piatich letísk v regióne, parkovanie, batožina, ubytovanie
alebo karavan, palivo podľa reálnej trasy, vstupné podľa veku, strava podľa zvoleného štýlu.

Nie je to ďalší vyhľadávač leteniek. Je to **kalkulačka celej cesty**, kde výber letu je len prvý dielik
a všetko ostatné sa mu prispôsobí.

## Ciele (čo musí vedieť)

| ID | Cieľ | Merateľné kritérium |
|---|---|---|
| C1 | Nájsť najlacnejšiu kombináciu letov v celom mesiaci z viacerých letísk | Kalendár mesiaca s cenou za deň, top 20 kombinácií (odlet × návrat) zoradených podľa *celkovej* ceny |
| C2 | Zahrnúť skryté náklady letu | Batožina (po airline a type), parkovanie na letisku (podľa počtu dní), cesta domov ↔ letisko (km × palivo alebo bus) |
| C3 | Po výbere letu prepočítať celý plán | Zmena dátumov → noci, dni prenájmu, itinerár, strava, parkovanie sa zmenia do 1 s, s viditeľným rozdielom |
| C4 | Okruh na N dní s mapou OSM | Automaticky vygenerovaný itinerár (preset + úprava), denné km/hodiny jazdy, prenocovania podľa regiónu |
| C5 | Vstupné podľa veku | Každý cestujúci má dátum narodenia → vek v deň návštevy → cenová kategória atrakcie |
| C6 | Ubytovanie podľa filtrov | Airbnb / hotel / penzión / hostel / kemp / karavan, filtre cena, hodnotenie, kuchynka, vzdialenosť od trasy |
| C7 | Strava | Tri úrovne (úsporná / stredná / komfortná), závislé od toho, či má ubytovanie kuchynku |
| C8 | Rozpočet na pár a na osobu | Súhrn po kategóriách, scenáre A/B vedľa seba, export PDF/CSV |
| C9 | Ceny z API, kde sa dá | Letenky, hotely, kurzy, palivo z API; ostatné zo seed dát s dátumom overenia |
| C10 | Ovládanie na tablete | Všetky akcie dostupné dotykom, cieľové plochy ≥ 44 px, jedna stĺpcová strana + mapa cez celú obrazovku |

## Pre koho (persony)

- **Skupina 3–4 dospelých** (primárna): kamaráti/páry z Bratislavy a okolia, chcú ísť lacno, ale nie „na doraz",
  radi si veci porovnajú. Plánujú večer na iPade, jeden „správca" cesty, ostatní sa prihlásia a dopĺňajú.
  Delenie nákladov na osobu je kľúčové (kto platí auto, kto ubytovanie).
- **Pár** (sekundárna): rovnaký flow, menšie auto, menej batožiny.
- **Rodina s dieťaťom** (okrajová – ale kvôli nej sú v návrhu dátumy narodenia a vekové kategórie).

## Hlavný scenár použitia (happy path)

1. Otvorím aplikáciu → **Nová cesta** → krok 01: cestujúci (4 mená, dátumy narodenia, vodiči), domov (Bratislava), letiská
   (zapnem BTS, VIE, BUD, PRG, KTW s parkovaním/busom), september 2027, 8–12 dní, batožina (4× 10 kg + 2× 20 kg na dvojice).
   Pozvem spolucestujúcich e-mailom. → Pokračovať → 02.
2. Krok **02 Letenky**: kalendár septembra ako filter, každý deň má tmavosť podľa najnižšej celkovej ceny na osobu.
   Kliknem na deň → zoznam kombinácií. Vyberiem 12. 9. → 21. 9. z Katovíc (priamy Wizz), 4 osoby, 1 180 € vrátane
   parkovania, batožiny a cesty BA→KTW; app cenu overí pre 4 osoby. → Pokračovať → 03.
3. Aplikácia prepočíta odhady: 9 nocí, prenájom 10 dní, návrh trasy Ring Road 10 dní, strava 10 dní (DiffToast, Vrátiť).
4. Krok **03 Doprava**: rozhodnutie Auto ≈ 4 680 € / Karavan ≈ 4 910 € / Bez auta ≈ 5 300 €. Zvolím Auto, Kombi. → Pokračovať → 04 Ubytovanie.
5. Krok **04 Ubytovanie**: 9 nocí s regiónmi z návrhu trasy; ku každej vložím ponuku z Booking/Airbnb linku alebo nechám odhad. → 05.
6. Krok **05 Itinerár**: mapa, presuniem zastávku, pridám Kvernufoss (klenot). → 06 Atrakcie: Sky Lagoon (vstupné podľa veku ×4, rezervovať do dátumu). → 07.
7. Krok **07 Strava**: „úsporná", kuchynka 6 z 9 nocí → 3 dni sa prepnú na „stredná". → 08 Rozpočet: 4 680 € (1 170 €/os.), Kedy platiť, Balenie, PDF.
8. O týždeň sa vrátim → cron obnovil let, túry a kurz; hlavička ukáže, čo sa zmenilo.

## Funkčné požiadavky (FR)

### Účty a profily
- FR-00 Správca vytvorí používateľovi konto (e-mail + dočasné heslo); pri prvom prihlásení si používateľ heslo zmení (vynútené). Žiadne platobné údaje sa nezadávajú.
- FR-01a Profil používateľa (jednorazový formulár, upraviteľný): meno, dátum narodenia, vodičský preukaz (áno/nie, od kedy, skupiny B/BE), ochota šoférovať, dron (áno/nie, hmotnosť, registrácia), záujmy s váhou (termály, ľadovce, puffiny, veľryby, polárna žiara, túry, láva, kultúra, fotografia, dron), tempo, komfort ubytovania (kemp / hostel / penzión / hotel), strava (úsporná / stredná / komfortná), cieľový rozpočet, **dostupnosť** (mesiace/týždne, kedy môže), preferované letiská, batožina (cestuje naľahko / potrebuje 20 kg), doklady (OP platnosť, EHIC, poistenie).
- FR-01b Oprávnenia v ceste: správca (všetko, členovia, mazanie), editor (upravuje kroky), prezerajúci (číta, komentuje). Profil je osobný; do cesty sa prenáša ako „cestujúci“.

### Mesiac a režim výpočtu
- FR-02a Mesiac nie je pevný: app zo záujmov, dostupnosti a sezónnosti (docs/07) + cenovej sezónnosti navrhne **poradie mesiacov** s vysvetlením („september: polárna žiara možná, bez puffinov, ceny −25 % oproti júlu, kempy otvorené do 15. 9.“); používateľ zvolí mesiac alebo porovná 2–3.
- FR-02b **Režim Ja**: každému členovi sa cesta vykalkuluje samostatne podľa jeho profilu (mesiac, letisko, komfort, strava, atrakcie) – „koľko by ma to stálo, keby to bolo podľa mňa“.
- FR-02c **Režim Skupina**: app zlúči profily (prienik dostupnosti, vážené záujmy, komfort = najvyššia spoločná úroveň, rozpočet = najnižší cieľ) a navrhne najlepšiu cestu pre všetkých s vysvetlením kompromisov per člen („Jana: bez puffinov, +1 termálny kúpeľ“). Skupinový plán je ten, ktorý sa potom rieši v krokoch 02–08.

### Cestujúci a cesta
- FR-01 Cesta má názov, cieľový mesiac/rok, rozsah dĺžky pobytu (min–max dní), domov (mesto + súradnice).
- FR-02 Cestujúci: meno, dátum narodenia (alebo iba vek), typ (dospelý/dieťa sa odvodí), preferencie (vegetarián – iba poznámka).
- FR-03 Viac ciest naraz (napr. „September 2027 – variant A", „variant B"), duplikovanie cesty.

### Letenky
- FR-10 Multi-výber odletových letísk zo zoznamu (BTS, VIE, BUD, PRG, KTW + možnosť pridať ďalšie, napr. KRK, BRQ). Priame lety do KEF má z regiónu len Wizz z KTW a BUD (09/2026) – ostatné letiská cez self-transfer.
- FR-11 Cieľové letisko: KEF (predvolené); voliteľne aj alternatívy, ak sa objavia (RKV, AEY).
- FR-12 Výber celého mesiaca alebo konkrétneho rozsahu dní; flexibilita dĺžky pobytu (min–max).
- FR-13 Hľadanie kombinácií odlet × návrat s ohľadom na min–max dní; podpora priamych aj self-transfer letov (cez hub).
- FR-14 Konfigurácia batožiny na cestujúceho: malá príručná (zdarma), 10 kg príručná / priority, podaná 20 kg, 32 kg; ceny podľa airline.
- FR-15 Parkovanie na letisku: zapnúť/vypnúť, výber parkoviska (oficiálne / externé), cena podľa dní.
- FR-16 Cesta domov → letisko: autom (km × spotreba × cena paliva + diaľničná známka) alebo bus/vlak (fixná cena).
- FR-17 Kalendárová heatmapa: min. celková cena pre každý deň odletu; zoznam top kombinácií; filter airline, max prestupov, max čas cesty, odlet nie skôr ako / nie neskôr ako.
- FR-18 Výber letu → uloží sa ako `FlightSelection`, spustí kaskádu prepočtu (viď 05-vypoctovy-engine).
- FR-19 Sledovanie ceny vybraného letu (denné obnovenie, upozornenie na zmenu > X %).

### Ubytovanie
- FR-20 Typy: Airbnb, hotel, penzión/guesthouse, hostel, kemp (stan), karavan (spí sa v aute → ubytovanie = kemp).
- FR-21 Filtre: max cena/noc, min hodnotenie, kuchynka, parkovanie, wifi, súkromná kúpeľňa, bezplatné storno, vzdialenosť od trasy.
- FR-22 Priradenie ubytovania k nociam podľa itinerára (región noci → vyhľadávanie v regióne).
- FR-23 Manuálne pridanie ubytovania (link + cena) – lebo Airbnb nemá API.
- FR-24 Kalkulácia: cena/noc × noci + poplatky (upratovanie, servisný poplatok Airbnb ~14 %, mestská daň ak je).

### Doprava na Islande
- FR-30 Možnosti: prenájom auta (economy 2WD, kombi, SUV 2WD, 4×4), karavan (2 os., 2+2, 4×4), bez auta (bus/výlety).
- FR-31 Poistenia: CDW/SCDW, gravel (GP), sand & ash (SAAP), theft; extras: druhý vodič, detská sedačka, wifi, reťaze.
- FR-32 Palivo: vzdialenosť z itinerára × spotreba triedy vozidla × aktuálna cena; diesel vs. benzín.
- FR-33 Kemp pri karavane: cena/noc/osoba alebo Camping Card; sprchy, elektrina.
- FR-34 Porovnanie scenárov auto+ubytovanie vs. karavan+kempy na rovnaké dátumy.

### Itinerár a mapa
- FR-40 Presety okruhov: Golden Circle + juh (5–7 dní), Ring Road (8–12), Ring Road + Snæfellsnes (10–13), Ring + Westfjords (13+).
- FR-41 Generátor: podľa počtu dní, tempa (pokojné / normálne / intenzívne), vozidla (4×4 otvára F-cesty a Highlands) a záujmov (vodopády, termály, ľadovce, veľryby, túry).
- FR-42 Mapa OSM (MapLibre): trasa, zastávky, prenocovania, čerpacie stanice, vzdialenosti a časy (OSRM/ORS).
- FR-43 Denný detail: zastávky v poradí, km, čas jazdy, čas na mieste, vstupné/parkovné, prenocovanie.
- FR-44 Drag & drop zastávok medzi dňami, pridanie z katalógu atrakcií, uzamknutie dňa.
- FR-45 Upozornenia: > 5 h jazdy/deň, F-cesta bez 4×4, atrakcia mimo sezóny, západ slnka (september ~19:45).

### Atrakcie
- FR-50 Katalóg s kategóriami, GPS, cenou (vstupné, parkovné) a vekovými pravidlami, sezónou, trvaním, dátumom overenia ceny.
- FR-51 Výpočet vstupného pre všetkých cestujúcich podľa veku v deň návštevy.
- FR-52 Rezervované aktivity (ľadovcová túra, veľryby, lagúna) s odkazom na poskytovateľa a časovým slotom.

### Dron
- FR-55 Vrstva **Dron** na mape: zóny zákazu / povolenia / obmedzenia (národné parky, rezervácie, CTR letísk, mesto Reykjavík, vtáčie rezervácie, sezónne zákazy) s farebným rozlíšením a legendou.
- FR-56 Každé POI má `drone_status` + poznámku; v itinerári sa pri zastávke ukáže ikona drona (zelená/žltá/červená) a v dennom prehľade „kde dnes môžeš lietať".
- FR-57 Stránka/sekcia **Pravidlá pre dron na Islande**: registrácia (EASA/Samgöngustofa), kategórie A1/A3, max 120 m, VLOS, vzdialenosti od ľudí a zvierat, poistenie, na čo si dať pozor (vietor, chlad, batérie, soľ, vtáky), checklist pred letom.
- FR-58 Filter „vhodné na dron" v katalógu atrakcií a v generátore itinerára (váha záujmu `drone`).

### Sezónnosť a menej známe miesta
- FR-59 Každé POI má hodnotenie po mesiacoch (1–5) a poznámku, kedy sa oplatí; katalóg a generátor uprednostnia POI s vysokým hodnotením pre cieľový mesiac a upozornia na tie, ktoré mimo sezóny nemajú zmysel (puffiny, ľadové jaskyne, polárna žiara, F-cesty).
- FR-5A Každé POI má `popularity` (1–5) a príznak `hidden_gem`; filter „menej navštevované" a slider „davy vs. klenoty" v generátore (koľko % zastávok majú byť menej známe miesta).

### Strava
- FR-60 Úrovne: úsporná (samovarenie), stredná (mix), komfortná (reštaurácie); vlastné ceny.
- FR-61 Denný rozpis raňajky/obed/večera/snack s ohľadom na kuchynku v ubytovaní/karavane a na dni v aute.
- FR-62 Špeciálne položky: prvý nákup v Bónus/Krónan, káva denne, alkohol (voliteľné), voda z kohútika (0 €).

### Skupinové vs. osobné náklady
- FR-65 Každá položka má `split`: `group` (rovným dielom – prenájom, palivo, poistky vozidla, parkovanie, cesta 1 autom na letisko z Bratislavy, ubytovanie/kemp, tunel), `vehicle` (per vozidlo – parkovné), `person` (presne – letenka, batožina, vstupné podľa veku, strava podľa profilu, poistenie osoby), `custom` (ručný podiel).
- FR-66 Cesta na letisko sa počíta ako **1 auto zo Bratislavy pre celú skupinu** (km × spotreba vlastného auta × cena paliva SK + známky + parkovanie), ak sa všetci zmestia (max 4 + batožina); inak 2 autá alebo bus – app to rozhodne podľa počtu ľudí a kufrov.
- FR-67 Na osobu: súčet osobných + podiel skupinových; „kto zaplatil“ a vyrovnanie.

### Vziať z domu
- FR-68 Modul **„Vziať z Bratislavy“**: zoznam položiek s cenou na Islande vs. v SK, hmotnosťou a objemom (jedlo, káva, alkohol podľa colných limitov, hygiena, lieky, výstroj); app spočíta úsporu a porovná ju s cenou ďalšej podanej batožiny (20 kg ~ 40–70 €) → odporučí, koľko batožiny kúpiť a čo do nej dať; rešpektuje colné limity (3 kg potravín do 25 000 ISK/os., zákaz surového mäsa/mliečnych výrobkov, alkohol limity) a pravidlá airline (LiPo, plyn nie).

### Rozpočet
- FR-70 Súhrn po kategóriách, celkom na pár a na osobu; ISK ↔ EUR kurz s dátumom.
- FR-71 Scenáre: uložiť aktuálnu konfiguráciu ako scenár, porovnať 2–3 vedľa seba.
- FR-72 Rezerva (%), poistenie (cestovné), SIM/eSIM, suveníry – manuálne položky.
- FR-73 Export: PDF (prehľad + itinerár), CSV (položky), zdieľateľný link (read-only).
- FR-74 „Čo sa zmenilo": diff cien od poslednej návštevy.

### Systém
- FR-80 Cache cien s TTL a dátumom; ručné obnovenie; indikátor „cena z API / seed / manuálne".
- FR-81 Nastavenia: stav konektorov, mena, jednotky, jazyk (SK/CS), profil drona; API kľúče len v env.
- FR-83 Účty: e-mail + heslo; kontá zakladá správca s dočasným heslom, vynútená zmena pri prvom prihlásení; role správca / editor / prezerajúci.
- FR-84 Sledovanie cien: denný cron obnoví vybraný let, ubytovanie a kurz; e-mail pri zmene celkovej ceny > 5 % alebo > 20 €.
- FR-85 Šablóny: trasu, konfiguráciu cesty, stravu alebo vozidlo uložiť ako šablónu (súkromná / link / zdieľaná / verejná);
  iný používateľ si ju skopíruje (fork) do svojej cesty a ľubovoľne upraví; originál sa nemení.
- FR-86 Každý člen cesty vie upravovať všetky časti (trasa, zastávky, ceny, ubytovanie, vozidlo, strava); história zmien s možnosťou vrátiť späť.
- FR-82 Offline: posledný stav aplikácie čitateľný bez siete (PWA), mapa s cache dlaždíc pre trasu.

## Nefunkčné požiadavky (NFR)

| ID | Požiadavka |
|---|---|
| NFR-1 | Prepočet rozpočtu po zmene vstupu < 200 ms (čisto lokálne, bez sieťových volaní) |
| NFR-2 | Vyhľadanie mesiaca leteniek pre 5 letísk < 30 s pri studenej cache, < 1 s z cache |
| NFR-3 | Responzívne: 390 px (mobil) → 1180 px (tablet landscape) → 1440+ px (desktop); tablet je *first-class* |
| NFR-4 | Dotykové ciele ≥ 44 px, kontrast textu ≥ 4.5:1 aj na sklenených plochách |
| NFR-5 | API kľúče nikdy v prehliadači – vždy cez server (route handlers) |
| NFR-6 | Každá cena nesie pôvod (`source`), čas (`fetchedAt`) a menu; nič sa nezobrazí bez toho |
| NFR-7 | Dáta cesty sú exportovateľné ako JSON (záloha, presun medzi zariadeniami) |
| NFR-8 | Adaptéry API sú vymeniteľné (interface) – pád jedného zdroja nepoloží stránku, len označí chýbajúce ceny |
| NFR-9 | Jazyk UI slovenčina a čeština (i18n od začiatku), dátumy `d. M. yyyy`, čísla `1 234,56 €` |
| NFR-10 | Beží v bezplatných limitoch Vercel Hobby + Supabase Free; žiadne platené API |

## Mimo rozsah (v1)

- Rezervácie a platby priamo v aplikácii (iba odkazy na poskytovateľa).
- Editácia v reálnom čase (v1: zdieľaná cesta, zmeny sa prejavia po obnovení / cez Supabase Realtime až vo v2).
- Iné destinácie ako Island (architektúra to nevylučuje, seed dáta sú islandské).
- Automatické scrapovanie Airbnb (porušuje podmienky; ceny sa zadávajú ručne alebo odhadom z regiónu).

## Riziká

| Riziko | Dopad | Zmiernenie |
|---|---|---|
| Neoficiálne API Ryanair/Wizz sa zmení alebo blokuje | Chýbajú ceny LCC | Adaptérová vrstva, fallback na agregátor (Travelpayouts / SerpApi Google Flights), manuálny vstup ceny |
| Priame lety z regiónu do KEF v septembri nemusia existovať | Vyššia cena, prestupy | Engine podporuje self-transfer cez hub (LON/BER/CPH/AMS), s min. prestupovým časom |
| OSM tile policy zakazuje ťažké používanie verejných dlaždíc | Mapa nefunguje | MapTiler/Stadia free tier alebo vlastný tile server; cache pre trasu |
| ISK kurz kolíše | Rozpočet ±5 % | Denný kurz z ECB/Frankfurter, „rezerva" v rozpočte |
| Seed ceny atrakcií zastarajú | Podhodnotený rozpočet | Pole `verifiedAt`, upozornenie > 90 dní, jednoduchý editor cien |
