# 00a · Účty a profil (formulár preferencií)

## Účty
- **Správca zakladá kontá**: v Členoch cesty (alebo v Nastaveniach › Používatelia) klikne „+ Používateľ“ → e-mail, meno, rola v ceste → app vygeneruje **dočasné heslo** (zobrazí raz + pošle e-mail cez Resend).
- Prvé prihlásenie: e-mail + dočasné heslo → povinná obrazovka **Zmena hesla** (min. 10 znakov) → **Profil** (formulár nižšie) → Cesty.
- Zabudnuté heslo: e-mail s odkazom na reset. Správca môže heslo resetovať (nové dočasné).
- Nikde sa nezadáva platobná karta. Oprávnenia: správca / editor / prezerajúci (viď 03-datovy-model › trip_members).

## Profil – jeden formulár, rovnaké riadky ako všade (FieldRow), sekcie:
| Sekcia | Polia | Načo |
|---|---|---|
| O mne | meno, dátum narodenia, domov (Bratislava), jazyk SK/CS | vek pre vstupné/letenky, cesta na letisko |
| Vodič | mám vodičák (od roku, skupiny B/BE), chcem šoférovať (áno/nie/núdzovo), kreditná karta na depozit (áno/nie – **bez čísla**) | požiadavky požičovní, delenie šoférovania |
| Dron | mám dron (model, hmotnosť), registrácia operátora, poistenie | pravidlá, zóny, batožina |
| Čo chcem vidieť | 10 záujmov, každý 0–3 (nie / rád / chcem / **kvôli tomu idem**): termály, ľadovce & ice cave, puffiny, veľryby, polárna žiara, túry, láva & sopky, kultúra, fotografia, dron | návrh mesiaca, generátor, skupinový kompromis |
| Ako cestujem | tempo (pokojné/normálne/intenzívne), komfort (kemp / hostel / penzión / hotel = najnižšia úroveň, ktorú akceptujem), strava (úsporná/stredná/komfortná), batožina (naľahko / potrebujem 20 kg), cieľový rozpočet €/os. | vetva, ubytovanie, strava, rozpočet |
| Kedy môžem | mesiace (multi), blokované termíny (od–do), min/max dní | prienik dostupnosti skupiny |
| Letiská | preferované z BTS/VIE/BUD/PRG/KTW (+ iné) | krok 01/02 |
| Doklady | OP/pas platný do, EHIC (áno/nie), poistenie s túrami (áno/nie) | checklist |
Uloženie priebežné; „Hotovo“ označí `completed_at`. Profil sa dá kedykoľvek upraviť z menu (avatar).

## Prenos do cesty
Pri pridaní člena do cesty sa z profilu vytvorí riadok cestujúceho (krok 01) – vek, vodič, dron, batožina, doklady; zmeny profilu sa ponúknu na aktualizáciu (nie automaticky, aby sa nerozbila cesta).
