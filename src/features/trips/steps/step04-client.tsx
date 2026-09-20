'use client';

import { BedDouble, CalendarCheck, Car, ChevronRight, ExternalLink, Tent, Waypoints } from 'lucide-react';
import { useActionState, useState } from 'react';
import {
  Button,
  ButtonLink,
  Chip,
  ChipRow,
  FieldRow,
  Input,
  ListCard,
  ListRow,
  Notice,
  ResultsCard,
  Segmented,
  Select,
  Sheet,
  SheetRow,
  StepAmount,
  StepFooter,
  StepHead,
  StepSection,
  Tag,
  Tile,
} from '@/components/ui';
import { fmtEur, fmtInt, fmtRange } from '@/lib/format';
import type { ActionState } from '../actions';
import {
  assignCampsiteAction,
  assignOfferAction,
  setCampingCardAction,
  updateStayAction,
} from '../step04-actions';
import type { NightLite, Step04Data } from './step04-types';

const KIND_LABEL: Record<string, string> = {
  airbnb: 'Airbnb',
  hotel: 'hotel',
  guesthouse: 'penzión',
  hostel: 'hostel',
  campsite: 'kemp',
  camper_site: 'kemp',
};
const dm = (iso: string) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;

export function Step04Client({ data }: { data: Step04Data }) {
  const { tripId, mode, pax, nights, canEdit } = data;
  const [open, setOpen] = useState<string | null>(null);
  const night = nights.find((n) => n.stayId === open) ?? null;
  const [cardState, cardAct, cardPending] = useActionState<ActionState, FormData>(setCampingCardAction, null);
  const isCamper = mode === 'camper';
  const title = isCamper ? 'Kempy' : 'Ubytovanie';
  const assigned = nights.filter((n) => n.assigned || n.noLodging).length;

  return (
    <>
      <StepHead
        step={4}
        name={title}
        question={isCamper ? 'V ktorom kempe ktorú noc?' : 'Kde spíme ktorú noc?'}
        lead={
          isCamper
            ? 'Noc = kemp v regióne z návrhu trasy. Ceny sú živé z tjalda (os./noc + elektrina + daň); divoké kempovanie je zakázané. Camping Card sa oplatí len pri dostatku nocí v sieti a platí do 15. 9.'
            : 'Každá noc má región z návrhu trasy a cenové rozpätie pre skupinu – to na rozhodnutie stačí. Keď nájdeš konkrétnu ponuku (Booking/Airbnb), vlož ju a noc bude presná. Kuchynka ovplyvní stravu v kroku 07.'
        }
        aside={
          <StepAmount
            amount={data.total}
            source={data.estimateShare > 0 ? 'estimate' : 'manual'}
            approx={data.estimateShare > 0}
          />
        }
      />

      <StepSection title="Z predchádzajúcich krokov">
        <ChipRow wrap={false} className="sm:flex-wrap">
          <Chip icon={CalendarCheck} iconClassName="text-accent">
            {nights.length} nocí{data.dates ? ` · ${data.dates}` : ''}
          </Chip>
          <Chip icon={isCamper ? Tent : Car} iconClassName="text-accent">
            {isCamper ? 'karavan' : 'auto'}
            {data.vehicleLabel ? ` · ${data.vehicleLabel}` : ''}
          </Chip>
          <Chip icon={Waypoints} iconClassName="text-ink-3">
            regióny z trasy {data.presetKey ?? ''}
          </Chip>
          <Chip>
            {pax} os. → {isCamper ? '1 jednotka' : `${Math.max(1, Math.ceil(pax / 2))} izby / apartmán`}
          </Chip>
        </ChipRow>
      </StepSection>

      {isCamper && data.campingCard && (
        <StepSection title="Camping Card" hint="2 dospelí na kartu · 199 € · platí do 15. 9.">
          <ListCard>
            <ListRow
              leading={<Tile icon={Tent} tone={data.campingCard.on ? 'ok' : 'mut'} />}
              title={`${data.campingCard.cards} ${data.campingCard.cards === 1 ? 'karta' : 'karty'} × 199 € = ${fmtEur(data.campingCard.cost)} vs. úspora ${fmtEur(data.campingCard.saving)} v sieti`}
              meta={
                data.campingCard.expired
                  ? 'termín po 15. 9. – karta už neplatí'
                  : data.campingCard.worthIt
                    ? 'oplatí sa – zapni a kempy v sieti budú za osoby zadarmo (daň ostáva)'
                    : 'neoplatí sa pri týchto kempoch – nechaj vypnuté'
              }
              badges={
                <Tag tone={data.campingCard.expired ? 'bad' : data.campingCard.worthIt ? 'ok' : 'mut'}>
                  {data.campingCard.expired
                    ? 'neplatí'
                    : data.campingCard.worthIt
                      ? 'oplatí sa'
                      : 'neoplatí sa'}
                </Tag>
              }
              amount={data.campingCard.on ? fmtEur(data.campingCard.cost) : '—'}
              action={
                canEdit ? (
                  <form action={cardAct}>
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="on" value={data.campingCard.on ? '0' : '1'} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="secondary"
                      disabled={cardPending || data.campingCard.expired}
                      className={data.campingCard.on ? 'border-accent-line bg-accent-soft text-accent' : ''}
                    >
                      {data.campingCard.on ? '✓ Zapnutá' : 'Vypnutá'}
                    </Button>
                  </form>
                ) : undefined
              }
            />
          </ListCard>
          {cardState && !cardState.ok && <Notice tone="bad">{cardState.error}</Notice>}
        </StepSection>
      )}

      <StepSection
        title={`Noci · ${nights.length}`}
        hint={`${assigned} presných · ${nights.length - assigned} odhadov${isCamper && !data.tjaldaOk ? ' · tjalda nedostupná, kempy zo seedu' : ''}`}
      >
        <ListCard>
          {nights.map((n) => (
            <ListRow
              key={n.stayId}
              leading={
                <span
                  className={`font-display grid size-9 place-items-center rounded-[9px] text-[12px] font-semibold ${n.assigned ? 'bg-ok-bg text-ok-fg' : 'bg-mut-bg text-ink-2'}`}
                >
                  {String(n.nightIndex).padStart(2, '0')}
                </span>
              }
              title={`Noc ${n.nightIndex} · ${n.dow} ${dm(n.date)} · ${n.regionName}`}
              meta={
                n.noLodging
                  ? 'bez ubytovania (nočný let / v aute)'
                  : n.assigned
                    ? [
                        n.assigned.name,
                        KIND_LABEL[n.assigned.kind] ?? n.assigned.kind,
                        n.hasKitchen ? 'kuchynka ✓' : 'bez kuchynky',
                        n.assigned.checkInUntil ? `check-in do ${n.assigned.checkInUntil}` : null,
                        n.assigned.openUntil ? `otvorené do ${dm(n.assigned.openUntil)}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : isCamper
                      ? `kemp v regióne · ${pax} os. + elektrina + daň · odhad zo seedu`
                      : `${KIND_LABEL[n.kind] ?? 'izba'}/Airbnb pre ${pax} · rozpätie z regiónu${n.hasKitchen ? ' · kuchynka ✓' : ''}`
              }
              badges={
                <>
                  {n.noLodging ? (
                    <Tag tone="mut">0 €</Tag>
                  ) : n.isEstimate ? (
                    <Tag tone="warn">odhad</Tag>
                  ) : (
                    <Tag tone={n.source === 'api' ? 'info' : 'ok'}>
                      {n.source === 'api' ? 'tjalda' : n.source === 'seed' ? 'seed' : 'ručne'}
                    </Tag>
                  )}
                  {n.campingCardApplied && <Tag tone="ok">Camping Card</Tag>}
                  {n.warnings.map((w, i) => (
                    <Tag key={i} tone="warn">
                      {w}
                    </Tag>
                  ))}
                </>
              }
              amount={
                n.noLodging
                  ? '0 €'
                  : n.isEstimate && n.min !== n.max
                    ? fmtRange(n.min, n.max)
                    : fmtEur(n.amount)
              }
              amountSub={n.noLodging ? undefined : `${fmtEur(n.amount / pax)}/os`}
              selected={Boolean(n.assigned)}
              action={
                canEdit ? (
                  <Button size="sm" variant="secondary" onClick={() => setOpen(n.stayId)}>
                    {n.assigned ? 'Zmeniť' : 'Spresniť'}
                  </Button>
                ) : undefined
              }
              onOpen={() => setOpen(n.stayId)}
            />
          ))}
        </ListCard>
      </StepSection>

      <StepSection title="Čo z toho vyplýva" hint="prepočíta sa samo">
        <ResultsCard
          cells={[
            {
              label: `${nights.length} nocí`,
              value: data.estimateShare > 0 ? fmtRange(data.totalMin, data.totalMax) : fmtEur(data.total),
            },
            { label: 'Na osobu', value: fmtEur(data.total / pax) },
            { label: 'Z toho odhady', value: fmtEur(data.estimateShare) },
            { label: 'Kuchynka → 07', value: `${data.kitchenNights} z ${nights.length} nocí` },
          ]}
        />
      </StepSection>

      <StepFooter
        className="hidden sm:flex"
        primary={
          <ButtonLink href={`/cesta/${tripId}?krok=5`}>
            Pokračovať na 05 Itinerár <ChevronRight size={16} strokeWidth={1.75} />
          </ButtonLink>
        }
      />

      {night && <NightSheet key={night.stayId} night={night} data={data} onClose={() => setOpen(null)} />}
    </>
  );
}

function NightSheet({
  night: n,
  data,
  onClose,
}: {
  night: NightLite;
  data: Step04Data;
  onClose: () => void;
}) {
  const { tripId, pax, mode, canEdit } = data;
  const isCamper = mode === 'camper';
  const [offerState, offerAct, offerPending] = useActionState<ActionState, FormData>(async (p, fd) => {
    const r = await assignOfferAction(p, fd);
    if (r?.ok) onClose();
    return r;
  }, null);
  const [campState, campAct, campPending] = useActionState<ActionState, FormData>(async (p, fd) => {
    const r = await assignCampsiteAction(p, fd);
    if (r?.ok) onClose();
    return r;
  }, null);
  const [stayState, stayAct, stayPending] = useActionState<ActionState, FormData>(async (p, fd) => {
    const r = await updateStayAction(p, fd);
    if (r?.ok) onClose();
    return r;
  }, null);
  const stayOp = (op: string, label: string, variant: 'ghost' | 'secondary' = 'ghost') => (
    <form action={stayAct}>
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="stayId" value={n.stayId} />
      <input type="hidden" name="op" value={op} />
      <Button type="submit" size="sm" variant={variant} disabled={stayPending}>
        {label}
      </Button>
    </form>
  );

  return (
    <Sheet
      open
      onClose={onClose}
      icon={isCamper ? Tent : BedDouble}
      tone={isCamper ? 'ok' : 'info'}
      title={`Noc ${n.nightIndex} · ${n.dow} ${dm(n.date)}`}
      subtitle={
        <>
          {n.regionName} · {pax} os.{' '}
          <Tag tone={n.isEstimate ? 'warn' : 'ok'}>
            {n.isEstimate ? `odhad ${fmtRange(n.min, n.max)}` : fmtEur(n.amount)}
          </Tag>
        </>
      }
      footer={
        canEdit ? (
          <>
            {(n.assigned || n.noLodging) && stayOp('clear', 'Späť na odhad')}
            {!n.noLodging && stayOp('no_lodging', 'Noc bez ubytovania')}
            {!isCamper &&
              !n.assigned &&
              stayOp(
                n.hasKitchen ? 'kitchen_off' : 'kitchen_on',
                n.hasKitchen ? 'Bez kuchynky' : 'S kuchynkou',
              )}
            <div className="grow" />
            {!isCamper && (
              <Button type="submit" form="offer-form" disabled={offerPending}>
                {offerPending ? 'Ukladám…' : 'Vložiť ponuku'}
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {isCamper ? (
        <div className="flex flex-col py-2">
          <SheetRow label="Kempy v regióne">
            {n.camps.length
              ? `${n.camps.length} · zoradené: otvorené · cena/os.`
              : 'žiadny kemp v seede ani tjalda pre tento región – vlož ručne'}
          </SheetRow>
          <div className="divide-line -mx-5 divide-y">
            {n.camps.map((c) => {
              const nightIsk = c.perPersonIsk * pax + c.electricityIsk + 400 * pax;
              return (
                <div key={`${c.source}:${c.ref}`} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="flex min-w-0 grow flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">{c.name}</span>
                    <span className="text-ink-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                      {fmtInt(c.perPersonIsk)} ISK/os · el. {fmtInt(c.electricityIsk)} · {c.distanceKm} km od
                      stredu regiónu
                      {c.hasKitchen && <Tag tone="ok">kuchynka</Tag>}
                      {c.campingCard && <Tag tone="info">Camping Card</Tag>}
                      {!c.openForNight && (
                        <Tag tone="bad">zatvorené od {c.openUntil ? dm(c.openUntil) : '?'}</Tag>
                      )}
                      <Tag tone={c.source === 'tjalda' ? 'info' : 'mut'}>{c.source}</Tag>
                    </span>
                  </div>
                  <span className="font-display text-sm font-semibold tabular-nums">
                    ≈ {fmtInt(nightIsk)} ISK
                  </span>
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink-3 hover:text-accent flex"
                      aria-label="Otvoriť"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {canEdit && (
                    <form action={campAct}>
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="stayId" value={n.stayId} />
                      <input type="hidden" name="source" value={c.source} />
                      <input type="hidden" name="ref" value={c.ref} />
                      <input type="hidden" name="name" value={c.name} />
                      <input type="hidden" name="lat" value={c.lat} />
                      <input type="hidden" name="lng" value={c.lng} />
                      <input type="hidden" name="perPersonIsk" value={c.perPersonIsk} />
                      <input type="hidden" name="electricityIsk" value={c.electricityIsk} />
                      <input type="hidden" name="openUntil" value={c.openUntil ?? ''} />
                      <input type="hidden" name="campingCard" value={c.campingCard ? '1' : '0'} />
                      <input type="hidden" name="hasKitchen" value={c.hasKitchen ? '1' : '0'} />
                      <input type="hidden" name="url" value={c.url ?? ''} />
                      <Button
                        type="submit"
                        size="sm"
                        variant={n.assigned?.name === c.name ? 'primary' : 'secondary'}
                        disabled={campPending}
                      >
                        {n.assigned?.name === c.name ? 'Priradený' : 'Priradiť'}
                      </Button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
          {campState && !campState.ok && (
            <span className="text-bad-fg py-2 text-[12px]">{campState.error}</span>
          )}
          {stayState && !stayState.ok && (
            <span className="text-bad-fg py-2 text-[12px]">{stayState.error}</span>
          )}
        </div>
      ) : (
        <div className="flex flex-col py-2">
          <SheetRow label="Rozpätie">
            <b>{fmtRange(n.min, n.max)}</b> · {KIND_LABEL[n.kind] ?? 'izba'} pre {pax} v regióne{' '}
            {n.regionName} · rozpočet počíta so stredom {fmtEur(n.amount)}
          </SheetRow>
          <SheetRow label="Hľadať">
            <span className="flex flex-wrap gap-2">
              <a
                href={n.bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent inline-flex items-center gap-1 font-semibold"
              >
                <ExternalLink size={13} /> Booking: {n.place} {dm(n.date)}, {pax} hostia
              </a>
              <a
                href={n.airbnbUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent inline-flex items-center gap-1 font-semibold"
              >
                <ExternalLink size={13} /> Airbnb: {n.place}
              </a>
            </span>
          </SheetRow>
          {n.assigned && (
            <SheetRow label="Priradené">
              <b>{n.assigned.name}</b> · {KIND_LABEL[n.assigned.kind]} · {fmtEur(n.amount)}/noc{' '}
              {n.assigned.url && (
                <a href={n.assigned.url} target="_blank" rel="noreferrer" className="text-accent">
                  otvoriť ↗
                </a>
              )}
            </SheetRow>
          )}
          <form id="offer-form" action={offerAct} className="divide-line flex flex-col divide-y">
            <input type="hidden" name="tripId" value={tripId} />
            <input type="hidden" name="stayId" value={n.stayId} />
            <fieldset disabled={!canEdit} className="contents">
              <FieldRow label="Názov ponuky">
                <Input name="name" placeholder="Vík Cottages" required maxLength={120} />
              </FieldRow>
              <FieldRow label="Odkaz">
                <Input name="url" type="url" placeholder="https://www.booking.com/…" />
              </FieldRow>
              <FieldRow label="Typ">
                <Select
                  name="kind"
                  defaultValue={n.kind === 'camper_site' || n.kind === 'campsite' ? 'guesthouse' : n.kind}
                >
                  <option value="guesthouse">penzión</option>
                  <option value="airbnb">Airbnb / apartmán</option>
                  <option value="hostel">hostel</option>
                  <option value="hotel">hotel</option>
                </Select>
              </FieldRow>
              <FieldRow
                label="Cena / noc (€)"
                hint="za celú skupinu; Airbnb service fee je už v cene na webe"
              >
                <div className="flex gap-2">
                  <Input
                    name="pricePerNight"
                    type="number"
                    min={0}
                    step={1}
                    required
                    className="max-w-[130px]"
                  />
                  <Input
                    name="cleaningFee"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="upratovanie"
                    className="max-w-[150px]"
                  />
                </div>
              </FieldRow>
              <FieldRow label="Kuchynka">
                <Segmented
                  name="hasKitchen"
                  defaultValue="yes"
                  options={[
                    { value: 'yes', label: 'Áno' },
                    { value: 'no', label: 'Nie' },
                  ]}
                />
              </FieldRow>
              <FieldRow label="Check-in do">
                <Input name="checkInUntil" type="time" className="max-w-[130px]" />
              </FieldRow>
            </fieldset>
            {offerState && !offerState.ok && (
              <span className="text-bad-fg py-2 text-[12px]">{offerState.error}</span>
            )}
            {stayState && !stayState.ok && (
              <span className="text-bad-fg py-2 text-[12px]">{stayState.error}</span>
            )}
          </form>
        </div>
      )}
    </Sheet>
  );
}
