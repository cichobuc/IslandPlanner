'use client';

import { BookOpen, ExternalLink, Globe, Map as MapIcon, MapPin, Sparkles } from 'lucide-react';
import { ButtonLink, Sheet, SheetRow, Tag, Tile } from '@/components/ui';
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

/** Miniatúra POI do riadku zoznamu (36 px) – fotka z Commons, inak dlaždica s ikonou. */
export function PoiThumb({
  src,
  alt,
  tone = 'mut',
}: {
  src: string | null;
  alt: string;
  tone?: 'info' | 'vio' | 'mut' | 'ok';
}) {
  if (!src) return <Tile icon={Sparkles} tone={tone} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Wikimedia Commons
    <img src={src} alt="" loading="lazy" title={alt} className="rounded-btn h-9 w-9 shrink-0 object-cover" />
  );
}

/** Odkaz von (web POI, Wikipédia, mapy) – chip so šípkou. */
function PoiLink({ href, icon: Icon, children }: { href: string; icon: typeof Globe; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="border-line text-accent rounded-tag inline-flex h-[30px] items-center gap-1.5 border px-2.5 text-[12px] font-semibold"
    >
      <Icon size={13} aria-hidden /> {children} <ExternalLink size={11} className="text-ink-3" aria-hidden />
    </a>
  );
}

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
        {stop.photoUrl && (
          <figure className="my-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- Wikimedia Commons, bez optimalizácie (Vercel Hobby) */}
            <img
              src={stop.photoUrl}
              alt={stop.name}
              loading="lazy"
              className="rounded-option bg-mut-bg aspect-[16/10] w-full object-cover"
            />
            {stop.photoCredit && (
              <figcaption className="text-ink-3 mt-1 text-[11px]">Foto: {stop.photoCredit}</figcaption>
            )}
          </figure>
        )}
        {stop.description && <p className="text-ink-2 my-2 text-sm leading-[1.55]">{stop.description}</p>}
        {(stop.websiteUrl || stop.wikiUrl || stop.mapsUrl) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {stop.websiteUrl && (
              <PoiLink href={stop.websiteUrl} icon={Globe}>
                Oficiálny web
              </PoiLink>
            )}
            {stop.wikiUrl && (
              <PoiLink href={stop.wikiUrl} icon={BookOpen}>
                Wikipédia
              </PoiLink>
            )}
            {stop.mapsUrl && (
              <PoiLink href={stop.mapsUrl} icon={MapPin}>
                Google Maps
              </PoiLink>
            )}
          </div>
        )}
        <SheetRow label="Trvanie">
          <b>{stop.stayMin} min</b>
          {stop.visitRange ? ` · rozsah ${stop.visitRange}` : ''}
          {stop.walkKm ? ` · pešo ${stop.walkKm} km` : ''}
          {stop.difficulty ? ` · ${stop.difficulty}` : ''}
        </SheetRow>
        <SheetRow label="Hodnotenie">
          <b>{'★'.repeat(stop.stars) + '☆'.repeat(5 - stop.stars)}</b>
          {stop.valuePer10Eur != null ? ` · ${stop.valuePer10Eur} ★ za 10 € na osobu` : ' · zadarmo'}
        </SheetRow>
        <SheetRow label="Vstupné">
          <b>{stop.entryGroup ? fmtEur(stop.entryGroup) : '0 €'}</b>
          {stop.entryPpEur ? ` (${fmtEur(stop.entryPpEur)}/dosp.)` : ''}
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
        <SheetRow label="Tipy" last={!stop.cheaper}>
          {stop.tips ?? '—'}
        </SheetRow>
        {stop.cheaper && (
          <SheetRow label="Lacnejšie" last>
            <b>{stop.cheaper.name}</b> ·{' '}
            {stop.cheaper.entryPpEur ? `${fmtEur(stop.cheaper.entryPpEur)}/os` : 'zadarmo'} – podobný zážitok
            za menej
          </SheetRow>
        )}
      </div>
    </Sheet>
  );
}
