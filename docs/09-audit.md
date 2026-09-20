# 09 · Audit návrhu (20. 9. 2026) – je to dobre navrhnuté a bude to fungovať?

Prešiel som celý návrh ako oponent: požiadavky, uskutočniteľnosť na bezplatných limitoch, konektory, dátový model, engine, UX, bezpečnosť, obsah a plán.
**Verdikt:** návrh je úplný voči tomu, čo sme si povedali, a technicky uskutočniteľný – ale mal **6 vecí, ktoré by ho v praxi položili** (opravené nižšie),
**rozsah narástol na ~110 večerov** a preto treba vyhradiť **MVP**, ktoré musí byť hotové, keď sa objavia letenky na september 2027 (~ február 2027).

## 1. Pokrytie požiadaviek (čo si chcel × kde to je)
| Požiadavka | Stav | Kde |
|---|---|---|
| Letenky z BTS/VIE/BUD/PRG/KTW, celý mesiac, výber letu prispôsobí zvyšok | ✓ | krok 02, engine §2–3, konektory tp-flights/wizz/ryanair/gflights |
| Parkovanie, batožina, cesta na letisko (1 auto z BA) | ✓ | krok 01/02, engine §1d |
| Ubytovanie: Airbnb/hotel/karavan, filtre; rozpätie stačí | ✓ | krok 04 (vetvy), tjalda pre kempy, rozpätia pre izby |
| Okruh na N dní, mapa OSM, vstupné podľa veku | ✓ | krok 05/06, engine §1/§4, mapa overlay |
| Najlacnejšie podľa kritérií, strava, na osobu | ✓ | optimalizátor §9, krok 07/08, split §1d |
| API kde sa dá, zadarmo | ✓ (overené) | docs/04 |
| Šablóny pre ostatných, editácia, história | ✓ | 03 (templates, revisions), 01-cesty |
| Popis, vstupné, trvanie, sezóna, davy/klenoty, dron | ✓ | 03 (pois), 07 seed, 11 dron → sheet + vrstva |
| Karavan + kempy, auto → ubytovanie, nadväznosť | ✓ | vetvenie v 03, reťaz krokov |
| Kontá s dočasným heslom, profil, oprávnenia, bez kariet | ✓ | 00a, 02 auth |
| Mesiac podľa preferencií, Ja → Skupina, skupinové náklady, Vziať z BA | ✓ | engine §1b–1e, krok 01, 08 |
| Dizajn: svetlý, moderný, zrozumiteľný flow, ikony | ✓ (v6, overené renderom) | 06 |
| **Chýbalo:** režim „Dnes" počas cesty (dnešný plán, ďalšia zastávka, počasie, hodiny), bezpečnostné kontakty ako sheet, sledovanie reálnych výdavkov | doplnené do plánu (v1.1 / v2) | plán, backlog |

## 2. Kritické nálezy (opravené v dokumentácii)
| # | Problém | Prečo by to položilo app | Oprava |
|---|---|---|---|
| K1 | **Routing cez OSRM demo**: 24 zastávok + kandidáti = 100+ volaní × 1 req/s = minúty na jedno generovanie; demo bez SLA | itinerár by sa generoval minúty alebo zlyhal | **Predpočítaná matica vzdialeností** pre všetky seed POI (skript offline cez ORS Matrix, uložená v repo `seed/route_matrix.json`, ~ 80×80); OSRM/ORS len pre vlastné miesta a domov→letisko; Haversine ×1,25 ako okamžitý fallback |
| K2 | **Pokrytie Travelpayouts kalendára pre KTW/BUD/VIE → KEF nie je overené** (cache z vyhľadávaní Aviasales – na málo hľadaných trasách môžu byť diery) | kalendár s dierami = jadro app nefunguje | **Spike ako prvá úloha M2**: 1 večer zmerať pokrytie pre 5 letísk × september; ak < 60 % dní, primárny zdroj pre KTW/BUD = `wizz` timetable (celý mesiac jedným volaním) a `gflights` pre vzorku dní (každý 3. deň) + interpolácia s označením ≈ |
| K3 | **Google Flights z Vercelu**: dynamické AWS IP → riziko blokovania/captcha | overenie ceny pre 4 os. by zlyhávalo | gflights len na vybrané kombinácie (≤ 50/deň), s fallbackom „over ručne – otvoriť Google Flights link" (deep link s dátumami a pax = 4); nikdy nie pre celý kalendár |
| K4 | **Itinerár nemal vetvu** – Bez auta (výlety) potrebuje iný itinerár než Auto/Karavan | prepnutie vetvy by prepísalo trasu | `itinerary_days.scenario_key` (`drive` pre Auto+Karavan spoločný, `no_car` samostatný); `food_profile` ostáva jeden, kuchynka sa berie z nocí vetvy |
| K5 | **Súbežná editácia 4 ľudí bez realtime** → last-write-wins prepíše cudziu zmenu | strata práce, hádky | optimistic concurrency: každý zápis nesie `updated_at`; server odmietne starší → UI „Jana medzitým zmenila noc 3 – načítať / prepísať"; + `trip_revisions` |
| K6 | **Čo je ručné a čo odhad** nebolo na úrovni riadku (kaskáda „odhady prepíše, ručné navrhne" nemala podľa čoho rozhodnúť) | kaskáda by prepisovala ručne priradené noci/zastávky | `is_manual bool` na `lodging_stays`, `itinerary_stops`, `vehicle_selection`, `manual_items`; kaskáda mení len `is_manual = false`, ostatné navrhne |

## 3. Dôležité nálezy (zapracované do plánu / modelu)
| # | Nález | Oprava |
|---|---|---|
| D1 | Vercel Hobby limit funkcie je **300 s** (nie 10 s, ako som mal) – SSE stream mesiaca je v poriadku; Python runtime je v bete na všetkých plánoch | opravené v docs/02 |
| D2 | Časové pásma: Island UTC+0, SK UTC+2 v septembri – časy letov, pickup, „prílet 09:15 = celý deň" musia byť v lokálnom čase letiska | engine: všetky časy s tz (`Europe/Bratislava`, `Atlantic/Reykjavik`), zobrazenie v lokálnom čase miesta |
| D3 | Dve podobné akcie: „Najlacnejšie pre všetkých" (optimalizátor) a „Navrhnúť pre všetkých" (zlúčenie profilov) – mätúce | zlúčené do **jedného** sheetu „Navrhnúť cestu pre všetkých" s posuvníkom *cena ↔ preferencie* (0 % = čisto najlacnejšie, 100 % = čisto podľa záujmov); výsledok vždy s kompromismi per člen |
| D4 | „Ja" ako samostatná uložená cesta pre každého člena = N+1 ciest, ťažké | „Ja" = **prepočítaný náhľad** (nie uložená cesta), read-only, s tlačidlom „Uložiť ako moju cestu" ak chce |
| D5 | E-maily z cronu bez evidencie → duplicity | tabuľka `notifications (trip_id, user_id, kind, subject_id, sent_at)`; max 1 e-mail / cesta / deň |
| D6 | Konektory sú neoficiálne a menia sa – testy proti živým API by boli nestabilné | **nahrané fixtures** (JSON odpovede) pre každý konektor + kontrakt testy; health tabuľka + e-mail správcovi, ak je konektor 3 dni down |
| D7 | Obsah: ~ 80 POI + 20 klenotov s popismi **SK aj CS**, cenami, sezónou, dronom, `bring[]`, `book_ahead` = veľká ručná práca (~ 4–5 večerov) | v pláne ako samostatná úloha; CS prvý prechod strojovo, potom kontrola; POI bez CS popisu ukáže SK |
| D8 | Kapacita vozidla vs. pax a batožina (4 ľudia + 4 kufre do Yarisu) sa neoverovala | `vehicle_options.luggage_capacity` (počet 20 kg kufrov) → ⚠ „batožina sa nezmestí" (v v6 dizajne už je štítok) |
| D9 | Kalendár leteniek pre 5 letísk = 5 × 30 dní × ~ 5 návratov = 750 kombinácií na klientovi – v poriadku, ale výsledky treba **persistovať** (`flight_options`) aby sa neopakovalo hľadanie pri každom otvorení | search sa spúšťa ručne/„Obnoviť" a pri zmene filtrov letísk/dní; cache 6 h |
| D10 | GDPR: dátumy narodenia, doklady, dostupnosť = osobné údaje | Nastavenia › „Moje údaje": export a zmazanie účtu; RLS; žiadne tretie strany okrem e-mailu |
| D11 | Offline (PWA) bolo len „posledný snapshot" | v pláne M7 konkrétne: itinerár + mapa trasy + adresy nocí + dron zóny čitateľné offline; zmeny sa zaradia do fronty a synchronizujú |
| D12 | Chýbal režim „Dnes" počas cesty | v1.1: obrazovka „Dnes" (dnešný deň itinerára, ďalšia zastávka, počasie, hodiny, checklist pred odchodom), rýchle „preskočiť/presunúť" |

## 4. Čo bude fungovať spoľahlivo vs. čo je riziko
| Časť | Spoľahlivosť | Poznámka |
|---|---|---|
| Engine (rozpočet, kaskáda, generátor, split, mesiac, skupina) | vysoká – čisté TS, testy | jediné riziko je kvalita seed dát |
| Auth, profily, zdieľanie, história, šablóny | vysoká – štandardné Supabase | |
| Mapa (OpenFreeMap + MapLibre) | vysoká | |
| Kempy (tjalda), parkovné (parka), palivo (gasvaktin), kurz, počasie | vysoká – open/undocumented JSON, jednoduché | tjalda/parka nedokumentované → fixtures + seed fallback |
| Túry (viator) | vysoká – oficiálne affiliate API | |
| Kalendár leteniek (tp-flights) | **stredná – overiť spike-om (K2)** | |
| Priame Wizz ceny (wizz) | stredná – rotujúca verzia | self-heal + fallback |
| Overenie pre 4 os. (gflights) | **stredná–nízka z Vercelu (K3)** | fallback deep link |
| Izby/Airbnb ceny | žiadne API – rozpätia + ručne | podľa dohody stačí |
| Dron zóny | seed + oficiálna mapa (export overiť) | |

## 5. Plán a termíny – realita
- Po všetkých doplneniach je rozsah **~ 110 večerov** (nie 74). Pri 2–3 večeroch týždenne je to ~ 10 mesiacov → júl 2027. **Príliš neskoro** pre letenky na september 2027 (LCC otvárajú predaj ~ 6–9 mesiacov vopred, najlacnejšie sú 2–4 mesiace pred odletom → kupovať ~ máj–jún 2027, ideálne mať app v **februári–marci 2027**).
- Preto **MVP do konca februára 2027 (~ 50 večerov)**:
  1. M0 základ + auth s dočasným heslom + profil (8)
  2. M1 obrazovka Cesta, krok 01 (bez návrhu mesiaca – mesiac ručne), engine jadro, rozpočet (12)
  3. M2 letenky: spike pokrytia, tp-flights + wizz + gflights fallback, kalendár, výber → kaskáda (12)
  4. M3-lite: preset trasy z predpočítanej matice (bez generátora záujmov), mapa, atrakcie zo seedu (len SK), vstupné podľa veku (10)
  5. M4-lite: krok 03 vetvy Auto/Karavan (Bez auta odložiť), krok 04 rozpätia + tjalda kempy, palivo (8)
- **v1.1 (marec–jún 2027)**: návrh mesiaca, Ja/Skupina, Vziať z BA, Kedy platiť, balenie, viator, dron vrstva, šablóny, CS, cron + e-maily, PWA.
- **v1.2 (júl–august 2027)**: režim „Dnes", offline, polish.
- Pred cestou (september 2027) app musí vedieť: letenky (kúpené v máji), auto/karavan (rezervované v máji), noci (jún), rezervácie túr (august), Kedy platiť, Balenie, offline itinerár.

## 6. Čo som ešte skontroloval a je v poriadku
- Všetky kroky majú vstupy/výstupy definované a nekolidujú (04 potrebuje návrh trasy → rieši „návrh na pozadí" po 02+03; 05 potrebuje noci → z 04; 03 palivo potrebuje km → z návrhu, spresní sa po 05).
- Rozpočet: súčet kategórií = celkom, per osoba = osobné + skupinové/N; testované v zozname testov.
- Bezplatné limity: Supabase 500 MB (seed + 10 ciest = < 50 MB), Vercel 100 GB BW, cron 1×/deň stačí, ORS 2 500/deň (po predpočítaní matice takmer nič), Open-Meteo < 10 k/deň.
- Bezpečnosť: kľúče v env, RLS podľa `trip_members`, service role len v admin/cron routes s `CRON_SECRET`, read-only tokeny s expiráciou, žiadne platobné dáta.
- Dizajn v6: každý artboard vykreslený a skontrolovaný; dotykové ciele ≥ 42 px; kontrast textu ≥ 4.5:1 (`#5B6675` na bielej = 5.9:1).

## 7. Otvorené otázky pre teba
1. Súhlasíš s MVP rozsahom (bez návrhu mesiaca, Ja/Skupina, Vziať z BA, CS, dron mapy) do februára 2027, zvyšok do leta?
2. Vetva „Bez auta" – nechať v MVP, alebo až v1.1 (šetrí ~ 4 večery)?
3. Kto bude „správca inštancie" (zakladá kontá, má service role) – ty?
