# 01 · Obrazovka Cesty (a šablóny)

**Route:** `/` · **Účel:** zoznam mojich ciest, vytvorenie novej, použitie šablóny. Rovnaký `ListRow` ako všade.

```
┌────────────────────────────────────────────────────────────────┐
│ Island Planner                          [Nastavenia] [avatar]  │
│ [+ Nová cesta]  [Z šablóny]                                     │
│ ─ Moje cesty ─────────────────────────────────────────────────  │
│ ▣ Island · september 2027   12.–21. 9. · 4 os. · 8/8 ✓  4 680 € │
│ ▣ Island · variant BUD 11 d  rozpracované · 3/8       4 590 €   │
│ ─ Šablóny (moje · zdieľané · verejné) ─ [Trasa][Konfig][Cesta]  │
│ ▤ Ring Road 10 dní úsporne   trasa · 2 140 km · 12 forkov  ▸    │
│ ▤ Juh 6 dní klenoty          trasa · 62 % 💎 · zdieľané    ▸    │
└────────────────────────────────────────────────────────────────┘
```

| Prvok | Popis |
|---|---|
| Riadok cesty | názov, mesiac, dátumy (ak je let), osoby, postup krokov `n/8`, suma aktívneho scenára, avatary členov; klik → Cesta; swipe: duplikovať / archivovať / zmazať (owner) |
| + Nová cesta | otvorí Cesta s rozbaleným krokom 1 (žiadny wizard – krok 1 je formulár v zozname) |
| Z šablóny | sheet výberu šablóny → nová cesta s predvyplneným obsahom |
| Riadok šablóny | názov, typ (trasa / konfig / cesta / strava / vozidlo), dni, km, podiel klenotov, autor, viditeľnosť, forky, verzia; ▸ = náhľad; akcia „Použiť" → výber cieľovej cesty + režim (nahradiť / zlúčiť / inšpirácia) |
| Filtre šablón | Moje · Zdieľané so mnou · Verejné; typ |
| Uložiť ako šablónu | nie je tu – je v hlavičke Cesty (menu ⋯ → „Uložiť ako šablónu") a v päte kroku 4 (len trasu) |

Model šablón, fork a verzie: `docs/03-datovy-model.md` › Ukladanie trás a konfigurácií.
