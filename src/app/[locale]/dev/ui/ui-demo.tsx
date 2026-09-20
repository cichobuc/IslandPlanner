'use client';

import {
  Bus,
  CalendarCheck,
  Car,
  ChevronRight,
  Droplets,
  Fuel,
  Map as MapIcon,
  Mountain,
  Plane,
  ShieldCheck,
  Tent,
  Users,
  Zap,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  Card,
  Chip,
  ChipRow,
  ListCard,
  ListRow,
  Notice,
  OptionCard,
  OptionGrid,
  PhoneHeader,
  ResultsCard,
  RingMap,
  Sheet,
  SheetRow,
  StepAmount,
  StepFooter,
  StepHead,
  StepSection,
  Stepper,
  StickyBar,
  Tag,
  Tile,
  TopBar,
  TripLayout,
  TripSummary,
  type StepItem,
} from '@/components/ui';
import { fmtEur } from '@/lib/format';

const STEPS: StepItem[] = [
  { n: 1, name: 'Cestujúci & kedy', summary: '4 dospelí · BA · sept 2027', state: 'done' },
  { n: 2, name: 'Letenky', summary: 'KTW 12.–21. 9. · 1 180 €', state: 'done' },
  { n: 3, name: 'Doprava', summary: 'Auto · Kombi · 890 €', state: 'active' },
  { n: 4, name: 'Itinerár', summary: 'Ring Road · 10 dní', state: 'pending' },
  { n: 5, name: 'Kde spať', summary: '9 nocí · ≈ 1 690 €', state: 'pending' },
  { n: 6, name: 'Atrakcie', summary: '12 v pláne · 610 €', state: 'pending' },
  { n: 7, name: 'Strava', summary: 'úsporná · 720 €', state: 'pending' },
  { n: 8, name: 'Rozpočet', summary: '4 680 € · 1 170 €/os', state: 'pending' },
];

const RING = [
  { x: 100, y: 308, night: true },
  { x: 133, y: 289.1, night: true },
  { x: 174, y: 276.1 },
  { x: 230.5, y: 351.6 },
  { x: 279.5, y: 375.2, night: true },
  { x: 421, y: 300.9 },
  { x: 510, y: 158.1, night: true },
  { x: 363, y: 64.9 },
  { x: 325.5, y: 108.6, night: true },
  { x: 134, y: 243.1 },
];

type Mode = 'car' | 'camper' | 'no_car';

export function UiDemo() {
  const [mode, setMode] = useState<Mode>('car');
  const [vehicle, setVehicle] = useState<'jogger' | 'duster'>('jogger');
  const [sheet, setSheet] = useState(false);
  const [view, setView] = useState<'me' | 'group'>('group');

  return (
    <div className="bg-bg min-h-dvh pb-24 sm:pb-0">
      <TopBar title="Island · september 2027" mode={view} onModeChange={setView} members={['Lukáš', 'Peter', 'Jana', 'Martin']} />
      <PhoneHeader steps={STEPS} step={3} name="Doprava" total={4680} perPerson={1170} />

      <TripLayout
        aside={
          <>
            <Stepper steps={STEPS} onSelect={() => {}} />
            <Card className="flex flex-col gap-1.5 p-2.5">
              <RingMap points={RING} width={210} height={150} />
              <span className="flex justify-between px-1">
                <span className="text-[13px] font-semibold">Mapa okruhu</span>
                <span className="text-ink-3 text-[12px]">2 140 km</span>
              </span>
            </Card>
            <Button variant="secondary">
              <Zap size={16} strokeWidth={1.8} className="text-accent" /> Najlacnejšie pre všetkých
            </Button>
          </>
        }
      >
        <TripSummary
          total={4680}
          perPerson={1170}
          pax={4}
          range={{ min: 4520, max: 4840 }}
          step={3}
          columns={[
            { label: 'Letenky', amount: 1180, source: 'api' },
            { label: 'Doprava', amount: 890, source: 'seed' },
            { label: 'Kde spať', amount: 1690, approx: true, source: 'range' },
            { label: 'Ostatné', amount: 920, approx: true, source: 'estimate' },
          ]}
          className="hidden sm:flex"
        />

        <StepHead
          step={3}
          name="Doprava"
          question="Auto, karavan alebo bez auta?"
          lead="Tri možnosti s odhadom celej cesty. Voľba určí, či ďalší krok budú izby (Ubytovanie), kempy, alebo hotel v Reykjavíku s výletmi. Dá sa kedykoľvek zmeniť."
          aside={<StepAmount amount={890} source="seed" />}
        />

        <StepSection title="Z predchádzajúcich krokov">
          <ChipRow wrap={false} className="sm:flex-wrap">
            <Chip icon={CalendarCheck} iconClassName="text-accent">
              10 dní · 12.–21. 9.
            </Chip>
            <Chip icon={Plane} iconClassName="text-accent">
              pickup KEF 09:30 · return 12:00
            </Chip>
            <Chip icon={Users} iconClassName="text-vio-fg">
              2 vodiči · 34 a 41 r.
            </Chip>
            <Chip icon={ShieldCheck} iconClassName="text-ok-fg">
              kreditná karta ✓
            </Chip>
            <Chip icon={Mountain} iconClassName="text-ink-3">
              4×4 netreba
            </Chip>
          </ChipRow>
        </StepSection>

        <StepSection title="Tvoja voľba">
          <OptionGrid>
            <OptionCard icon={Car} title="Auto" amount="≈ 4 680 €" description="izby po trase · flexibilné · teplo" selected={mode === 'car'} onSelect={() => setMode('car')} />
            <OptionCard icon={Tent} title="Karavan" amount="≈ 4 910 €" description="kempy · kuchynka vždy · noci 3–8 °C" selected={mode === 'camper'} onSelect={() => setMode('camper')} />
            <OptionCard icon={Bus} title="Bez auta" amount="≈ 5 300 €" description="hotel v Reykjavíku · výlety z mesta" selected={mode === 'no_car'} onSelect={() => setMode('no_car')} />
          </OptionGrid>
        </StepSection>

        <StepSection title="Vozidlo" hint="tu rozhoduješ">
          <ChipRow wrap={false} className="items-center sm:flex-wrap">
            <Chip onClick={() => {}}>Economy</Chip>
            <Chip on onClick={() => {}}>
              Kombi
            </Chip>
            <Chip onClick={() => {}}>SUV</Chip>
            <Chip onClick={() => {}}>4×4</Chip>
            <span className="text-ink-3 ml-auto hidden text-[12px] sm:inline">seed cenníky 09/2026 · odkazy na požičovne</span>
          </ChipRow>
          <ListCard>
            <ListRow
              leading={<Tile icon={Car} tone="info" />}
              title="Dacia Jogger · Kombi"
              meta="78 €/deň · 6,5 l benzín · 7 miest · Blue Car Rental"
              amount={fmtEur(780)}
              amountSub="10 dní"
              selected={vehicle === 'jogger'}
              action={
                <Button variant="secondary" size="sm" onClick={() => setVehicle('jogger')}>
                  {vehicle === 'jogger' ? 'Zvolené' : 'Zvoliť'}
                </Button>
              }
              onOpen={() => setSheet(true)}
            />
            <ListRow
              nested
              leading={<ShieldCheck size={14} strokeWidth={1.8} className="text-ok-fg" />}
              title="Poistenie"
              meta="SCDW 12 €/d ✓ · Gravel 6 €/d ✓ – na Ring Road prakticky nutné · Sand & ash — · Theft —"
              badges={<Tag tone="ok">kryté</Tag>}
              amount={fmtEur(180)}
              onOpen={() => setSheet(true)}
            />
            <ListRow
              nested
              leading={<Check size={14} strokeWidth={1.8} className="text-ok-fg" />}
              title="Požiadavky"
              meta="vodič ≥ 20 r. ✓ · prax ≥ 1 r. ✓ · kreditka na depozit 2 500 € ✓ · km bez limitu ✓"
              onOpen={() => setSheet(true)}
            />
            <ListRow
              leading={<Tile icon={Car} tone="info" />}
              title="Dacia Duster · 4×4"
              meta="92 €/deň · 7,0 l diesel · otvára F-cesty a Highlands"
              amount={fmtEur(920)}
              amountSub="10 dní"
              selected={vehicle === 'duster'}
              action={
                <Button variant="secondary" size="sm" onClick={() => setVehicle('duster')}>
                  {vehicle === 'duster' ? 'Zvolené' : 'Zvoliť'}
                </Button>
              }
              onOpen={() => setSheet(true)}
            />
            <ListRow
              leading={<Tile icon={Fuel} tone="warn" />}
              title="Palivo"
              meta="2 140 km z návrhu trasy × 6,5 l/100 km × 320 ISK/l · +5 % rezerva"
              badges={<Tag tone="warn">odhad</Tag>}
              amount={fmtEur(303)}
              onOpen={() => setSheet(true)}
            />
          </ListCard>
        </StepSection>

        <StepSection title="Čo z toho vyplýva" hint="prepočíta sa samo">
          <ResultsCard
            cells={[
              { label: 'Palivo → krok 03', value: fmtEur(303) },
              { label: 'Krok 05 bude', value: mode === 'car' ? 'Ubytovanie' : mode === 'camper' ? 'Kempy' : 'Základňa' },
              { label: 'Strava v aute', value: mode === 'camper' ? 'kuchynka vždy' : 'bez kuchynky' },
              { label: 'Na osobu', value: fmtEur(223, { sign: true }) },
            ]}
          />
        </StepSection>

        <StepFooter
          className="hidden sm:flex"
          secondary={
            <>
              <Button variant="ghost" size="sm">
                Prečo auto vs. karavan
              </Button>
              <Button variant="ghost" size="sm">
                + Vozidlo ručne
              </Button>
            </>
          }
          primary={
            <Button>
              Pokračovať na 04 Itinerár <ChevronRight size={16} strokeWidth={1.75} />
            </Button>
          }
        />

        {/* ── Katalóg ostatných prvkov (len /dev/ui) ── */}
        <div className="mt-8 flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold">Katalóg prvkov</h2>
          <Card className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Primárne</Button>
              <Button variant="secondary">Sekundárne</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Odstrániť</Button>
              <Button size="sm">Malé</Button>
              <Button variant="secondary" size="sm">
                Malé sek.
              </Button>
              <Button variant="secondary" icon aria-label="Mapa">
                <MapIcon size={18} strokeWidth={1.75} />
              </Button>
              <Button disabled>Zakázané</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone="info">API</Tag>
              <Tag tone="mut">seed</Tag>
              <Tag tone="warn">odhad</Tag>
              <Tag tone="ok">ručne</Tag>
              <Tag tone="bad">dron zákaz</Tag>
              <Tag tone="vio">rezervácia</Tag>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tile icon={Plane} tone="info" />
              <Tile icon={Car} tone="info" />
              <Tile icon={Tent} tone="ok" />
              <Tile icon={Droplets} tone="info" size={40} />
              <Tile icon={Mountain} tone="vio" size={32} />
              <Tile icon={Fuel} tone="warn" size={26} />
              <Tile icon={Users} tone="mut" />
            </div>
            <div className="flex flex-col gap-2">
              <Notice tone="info">Ceny leteniek sú z cache (2 h). Overiť pred rezerváciou.</Notice>
              <Notice tone="warn">Deň 5 má 5 h 40 min jazdy – nad limitom tempa „normálne“.</Notice>
              <Notice tone="bad">F-cesta 208 bez 4×4 nie je povolená.</Notice>
              <Notice tone="ok">Poistenie kryje štrk aj piesok.</Notice>
            </div>
          </Card>
        </div>
      </TripLayout>

      <StickyBar>
        <Button variant="secondary" icon aria-label="Mapa">
          <MapIcon size={18} strokeWidth={1.75} />
        </Button>
        <Button className="grow">
          Pokračovať na 04 Itinerár <ChevronRight size={16} strokeWidth={1.75} />
        </Button>
      </StickyBar>

      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        icon={Droplets}
        title="Kvernufoss"
        subtitle={
          <>
            Juh · vodopád · 2,1 km od trasy dňa 03 <Tag tone="vio">skrytý klenot</Tag>
          </>
        }
        footer={
          <>
            <Button variant="ghost" size="sm">
              Upraviť cenu / trvanie
            </Button>
            <Button variant="ghost" size="sm">
              <MapIcon size={14} strokeWidth={1.8} /> Na mape
            </Button>
            <div className="grow" />
            <Button className="w-full sm:w-auto">Pridať do dňa 03</Button>
          </>
        }
      >
        <div className="border-card-line mt-3.5 mb-1.5 flex h-[150px] items-center justify-center rounded-[10px] border bg-[linear-gradient(160deg,#DCE9F5,#EEF3F8)]">
          <span className="text-[11px] font-semibold tracking-[.08em] text-[#6B7684] uppercase">Fotka</span>
        </div>
        <p className="text-ink-2 my-2 text-sm leading-[1.55]">
          Vodopád v úzkej rokline päť minút chôdze od Skógafossu. Chodník vedie priamo za vodnú clonu. Väčšina turistov ho minie – aj v
          hlavnej sezóne tu býva takmer prázdno.
        </p>
        <SheetRow label="Trvanie">
          <b>45 min</b> · rozsah 30–60 · pešo 1,2 km · ľahké
        </SheetRow>
        <SheetRow label="Vstupné">
          <b>0 €</b> · parkovné 0 (pri Skógar Museum)
        </SheetRow>
        <SheetRow label="Pre 4 osoby">
          Lukáš 34 · Peter 31 · Jana 29 · Martin 41 → <b>0 €</b>
        </SheetRow>
        <SheetRow label="Kedy ísť">★★★★☆ september · máj–sept najviac vody · ráno bez ľudí</SheetRow>
        <SheetRow label="Dron">
          <Tag tone="ok">povolené</Tag> mimo NP · nelietať nad ľuďmi · vodná triešť
        </SheetRow>
        <SheetRow label="Tipy" last>
          Pršiplášť, protišmyková obuv; kombinuj so Skógafoss (deň 03)
        </SheetRow>
      </Sheet>
    </div>
  );
}
