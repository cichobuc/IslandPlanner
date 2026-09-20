'use client';

import { ExternalLink, Map as MapIcon, Sparkles } from 'lucide-react';
import { ButtonLink, Sheet, SheetRow, Tag } from '@/components/ui';
import { fmtEur } from '@/lib/format';
import type { StopLite } from '../itinerary-data';

export const DRONE: Record<string, { tone: 'ok' | 'warn' | 'bad' | 'mut'; label: string }> = {
  allowed: { tone: 'ok', label: 'dron ok' },
  permit: { tone: 'warn', label: 'dron povolenie' },
  restricted: { tone: 'warn', label: 'dron obmedzený' },
  banned: { tone: 'bad', label: 'dron zákaz' },
  unknown: { tone: 'mut', label: 'dron ?' },
};
export const stars = (n: number | null) =>
  n == null ? '' : '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

/** Sheet zastávky/atrakcie (artboard Sheet-Atrakcia): popis, trvanie, vstupné per osoba, sezóna, dron, tipy. */
export function PoiSheet({
  stop,
  dayIndex,
  tripId,
  onClose,
  footer,
}: {
  stop: StopLite;
  dayIndex: number | null;
  tripId: string;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const d = DRONE[stop.droneStatus] ?? DRONE.unknown;
  return (
    <Sheet
      open
      onClose={onClose}
      icon={Sparkles}
      tone="info"
      title={stop.name}
      subtitle={
        <>
          {stop.regionName} · {stop.kind}
          {dayIndex ? ` · deň ${String(dayIndex).padStart(2, '0')}` : ''}{' '}
          {stop.hiddenGem && <Tag tone="vio">skrytý klenot</Tag>}
        </>
      }
      footer={
        <>
          <ButtonLink
            href={`/cesta/${tripId}/mapa?poi=${stop.slug}${dayIndex ? `&den=${dayIndex}` : ''}`}
            variant="ghost"
            size="sm"
          >
            <MapIcon size={14} /> Na mape
          </ButtonLink>
          {stop.bookingUrl && (
            <a
              href={stop.bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent inline-flex h-[34px] items-center gap-1 px-2 text-[13px] font-semibold"
            >
              <ExternalLink size={13} /> {stop.bookingRequired ? 'Rezervovať' : 'Web'}
            </a>
          )}
          <div className="grow" />
          {footer}
        </>
      }
    >
      <div className="flex flex-col py-2">
        {stop.description && <p className="text-ink-2 my-2 text-sm leading-[1.55]">{stop.description}</p>}
        <SheetRow label="Trvanie">
          <b>{stop.stayMin} min</b>
          {stop.visitRange ? ` · rozsah ${stop.visitRange}` : ''}
          {stop.walkKm ? ` · pešo ${stop.walkKm} km` : ''}
          {stop.difficulty ? ` · ${stop.difficulty}` : ''}
        </SheetRow>
        <SheetRow label="Vstupné">
          <b>{stop.entryGroup ? fmtEur(stop.entryGroup) : '0 €'}</b>
          {stop.parkingEur ? ` · parkovné ${fmtEur(stop.parkingEur)}` : ' · parkovné 0'}
          {stop.entryNote ? <span className="text-ink-3"> · {stop.entryNote}</span> : null}
        </SheetRow>
        <SheetRow label={`Pre ${stop.perTraveler.length} os.`}>
          {stop.perTraveler.map((t) => `${t.name.split(' ')[0]} ${t.age}`).join(' · ')} →{' '}
          <b>{fmtEur(stop.entryGroup - stop.parkingEur)}</b>
        </SheetRow>
        <SheetRow label="Kedy ísť">
          {stars(stop.monthRating)} {stop.seasonNote ?? ''}
        </SheetRow>
        <SheetRow label="Dron">
          <Tag tone={d.tone}>{d.label}</Tag> {stop.droneNote ?? ''}
        </SheetRow>
        <SheetRow label="Tipy" last>
          {stop.tips ?? '—'}
        </SheetRow>
      </div>
    </Sheet>
  );
}
