# 04 · Sheety (detaily a nastavenia)

Sheet = výsuvný panel (mobil/tablet-p zdola, 3 zarážky 20/55/92 %; tablet-l/desktop vpravo 420 px). Rovnaká kostra: úchyt · názov · ✕ · telo z riadkov „label – hodnota" · päta s 1 primárnou a 1 sekundárnou akciou. Sheety sa otvárajú z riadkov (▸) a z menu ⋯.

## Detaily riadkov
| Sheet | Odkiaľ | Obsah (riadky) | Akcie |
|---|---|---|---|
| **Let** | krok 2 | segmenty (letisko, čas, airline, číslo letu), prestup (hub, čas, self-transfer poznámka), batožina per cestujúci s cenou, parkovisko (výber, cena/dni), cesta na letisko (spôsob), rozpis sumy, pôvod + vek ceny, sparkline ceny (ak vybraný) | Vybrať / Overiť cenu / Otvoriť u predajcu / Porovnať |
| **Zastávka / atrakcia** | krok 4, 6, mapa | fotka, popis, **trvanie** (odporúčané + rozsah, pešo km, náročnosť), **vstupné** (tabuľka cestujúcich: meno, vek v deň návštevy, kategória, cena; varianty; parkovné; ako sa platí), **kedy ísť** (12 mesačných ★ + poznámka + denná doba), **dron** (status, zóna, pravidlá, permit link, „nahlásiť zákaz"), tipy, vybavenie, otváracie hodiny, rezervácia (link, čas), poloha (vzdialenosť od trasy, najbližší deň), zdroj + overené | + Pridať do dňa N / Presunúť / Odstrániť / Upraviť cenu & trvanie (manual) |
| **Deň** | krok 4 | názov, región, km/čas, slnko, počasie, prenocovanie (výber regiónu), tempo dňa, zamknúť, poznámky, varovania | Pregenerovať deň / Rozdeliť / Zlúčiť / Voľný deň |
| **Noc / ponuka** | krok 5 | typ, cena/noc + poplatky, /os., hodnotenie, izby/lôžka, vybavenie (kuchynka!), vzdialenosť od trasy, storno, link; kemp: elektrina, Camping Card, otvorené do | Priradiť k noci / Otvoriť / Uložiť do obľúbených; ručný záznam (Airbnb URL + cena) |
| **Vozidlo** | krok 3 | trieda, model, sedadlá/spí, palivo, spotreba (editovateľná), cena/deň, dni (auto z letu, prepísateľné), poistenia (checkboxy s cenou), extras, depozit (info), one-way, link | Zvoliť / Ručne |
| **Deň – strava** | krok 7 | úroveň dňa, kuchynka ráno/večer (auto + override), Ra/Ob/Ve/extra s cenami, špeciál (reštaurácia večer, piknik, let) | Uložiť |
| **Položka rozpočtu** | krok 8 | názov, suma, mena, per skupina/os., kategória, scenár, vylúčiť, poznámka | Uložiť / Odstrániť |
| **Cestujúci** | krok 1 | meno, dátum narodenia / vek, vodič, e-mail (pozvánka), batožina (4 steppery), poznámka | Uložiť / Odstrániť |
| **Letisko** | krok 1 | km/čas z domova (routing), spôsob (auto/bus/vlak/taxi), parkovanie zap/vyp + parkovisko (zoznam s cenami/dni), diaľničné známky | Uložiť |

## Nastavenia a správa (z menu ⋯ alebo z obrazovky Cesty)
| Sheet | Obsah |
|---|---|
| **Nastavenia** | účet, jazyk SK/CS, téma Aurora/Glacier/systém, mena EUR/CZK + kurz ISK (auto/ručne), domov, vlastné auto (spotreba, palivo), notifikácie (prah zmeny ceny, týždenný súhrn, pripomienky), dáta (export/import JSON, vymazať cache, offline mapa), stav zdrojov dát (provider, OK/chyba, posledné volanie, test), **profil drona** (model, hmotnosť, trieda, operátor ID, skúška, poistenie), o aplikácii + atribúcie |
| **Členovia** | riadky členov (avatar, meno, e-mail, rola, prepojený cestujúci, aktivita); pozvať (e-mail + rola); read-only link (vytvoriť / expirácia / zrušiť); „toto som ja" |
| **História zmien** | posledných 50 revízií ako riadky (kto, kedy, čo: pred → po) s „Vrátiť"; filter podľa kroku; pri konflikte (409) sheet „Jana medzitým zmenila…" s voľbou načítať / prepísať |
| **Bezpečnosť & kontakty** | 112 Iceland app, SafeTravel.is, vedur.is, road.is, požičovňa (tel.), ubytovania (adresy, tel.), poisťovňa (asistenčná linka), EHIC; offline |
| **Dron – pravidlá & checklist** | 8 kariet pravidiel (platí pre tvoj dron áno/nie, zdroj, overené), checklist pred letom (10), na čo si dať pozor (10), **po dňoch**: zastávky s ✓/⚠/✗, zóny na trase, tlačidlo „požiadať o povolenie", odporúčané spoty; „Nahlásiť zákaz" (POI + fotka značky) |
| **Šablóny – uložiť** | typ (trasa / konfig / cesta / strava / vozidlo), názov, popis, viditeľnosť, zahrnúť (checkboxy), anonymizovať, verzia |
| **Šablóny – použiť** | výber šablóny (riadky), náhľad zmien, režim nahradiť / zlúčiť / inšpirácia, potvrdiť (fork + DiffToast) |
| **Profil** | formulár preferencií (00a) – z avataru |
| **Používatelia** (správca) | riadky členov; + Používateľ (e-mail, meno, rola → dočasné heslo, zobrazí sa raz + e-mail); reset hesla; deaktivovať |
| **Navrhnúť cestu pre všetkých** | jediná akcia (nahrádza „Najlacnejšie“ aj „Navrhnúť“): posuvník cena ↔ preferencie, parametre (dni, letiská, vetvy, tempo, davy↔klenoty, prestupy) → riadky kandidátov (mesiac, dátumy, letisko, vetva, celkom, /os.) + kompromisy per člen („Jana: −puffiny, +1 termál, Δ +40 €“); Použiť (kaskáda + DiffToast) |
| **Vziať z domu** | riadky položiek so stavom vziať / kúpiť tam / nechať, kto nesie, úspora, kg; súhrn batožín; colné limity |
| **Balenie** | generovaný zoznam z plánu (atrakcie `bring[]`, vozidlo, sleeping-bag, strava z domu, dron, sezóna) ako riadky so ☐; vlastné položky; per osoba / spoločné; do PDF |
| **Kedy platiť** | časová os platieb a termínov (rezervácie, storno, depozit ako blokácia, check-in) ako riadky s dátumom; likvidita na osobu; export .ics |
| **Export** | PDF (súhrn + itinerár + dron checklist), CSV/XLSX, JSON, .ics, zdieľateľný link |
| **Viac filtrov kroku** | všetky konfigurácie kroku, ktoré sa nezmestili do riadku chipov (viď krok-*.md) |
