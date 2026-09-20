# 03 · Mapa (overlay cez celú obrazovku)

**Route:** `/cesta/[id]/mapa?vrstvy=trasa,zastavky,noci,dron&den=3` · Otvára sa tlačidlom 🗺 z hlavičky, z riadku dňa/zastávky/noci („na mape") alebo z riadku atrakcie.
Jedna mapa pre všetko. Zoznam ostáva pod ňou – zatvorenie vráti na to isté miesto.

```
┌──────────────────────────────────────────────────────────────────────┐
│ [✕ Zavrieť]  Deň 3 · Juh · 168 km · 2 h 40          [Vrstvy ▾] [⌖]  │
│                                                                      │
│              (MapLibre · OSM · tmavý štýl aurora)                    │
│      trasa dňa 3 tyrkys · ostatné dni stlmené · ① ② ③ zastávky      │
│      ◆ noci · ▨ dron zóny (červená/oranžová/žltá) · ⛽ palivo        │
│                                                          [+][−][⌂]   │
├──────────────────────────────────────────────────────────────────────┤
│ ‹ deň 2   ② Kvernufoss 💎  11:20 · 45 min · zadarmo · dron ✓  ▸  deň 4 › │
└──────────────────────────────────────────────────────────────────────┘
```

## Prvky
| Prvok | Popis |
|---|---|
| Horný pás | zavrieť; kontext (celá cesta / deň N); Vrstvy (sheet s checkboxmi); ⌖ centrovať (deň / okruh / moja poloha) |
| Vrstvy | Trasa · Zastávky · Noci · Katalóg (nezaradené POI ≤ 15 km) · Kempy · Ubytovanie · Palivo · **Dron zóny** · Počasie · Stav ciest · Klenoty; stav vrstiev je v URL |
| Spodný pás | **ten istý ListRow** ako v zozname pre vybraný objekt (zastávka, noc, POI, zóna); ‹ › prepína dni; swipe hore = sheet detailu |
| Dron zóny | polygóny: červená zákaz (CTR, mesto, súkromné), oranžová povolenie (NP), žltá obmedzenie/sezónne; klik → riadok zóny (názov, status, pravidlá, permit link) |
| Katalóg | sivé bodky; klik → riadok POI s „+ Pridať do dňa N" |
| Kreslenie | dlhý stisk na mape = „vlastné miesto" (názov, cena, trvanie) |
| Offline | „Stiahnuť mapu trasy (~ 30 MB)" vo Vrstvách |
| Atribúcia | © OpenStreetMap contributors · OpenFreeMap (vždy viditeľná) |

## Ovládanie (tablet)
Pinch zoom, dvojklep = zoom na deň, ovládanie 44 px vpravo dole, swipe na spodnom páse = ďalší objekt. Landscape aj portrait; orientácia zachová stav.

## Dáta
Trasa a body z itinerára (krok 4), dron zóny `GET /api/drone-zones` (GeoJSON, cache 30 dní), POI okolie `GET /api/pois?near=`, palivo/kempy Overpass (cache 30 dní), počasie Open-Meteo, stav ciest road.is.
