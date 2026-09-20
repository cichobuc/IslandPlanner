'use client';

import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl';
import type { Point } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ChevronLeft, ChevronRight, Crosshair, Sparkles, Tent, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, ButtonLink, Chip, ListRow, Tag, Tile } from '@/components/ui';
import { fmtH } from '@/engine/itinerary';
import type { CatalogPoi, DayLite, StopLite } from '@/features/trips/itinerary-data';
import { DRONE, PoiSheet } from '@/features/trips/steps/poi-sheet';
import { fmtEur, fmtKm } from '@/lib/format';

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const ACCENT = '#0F4C81';
const MUTED = '#9FB3C8';
const NIGHT = '#1E6B34';

type Selected =
  | { kind: 'stop'; stop: StopLite; dayIndex: number }
  | { kind: 'night'; day: DayLite }
  | { kind: 'catalog'; poi: CatalogPoi };

const catalogToStop = (p: CatalogPoi): StopLite => ({
  stopId: `catalog-${p.slug}`,
  slug: p.slug,
  name: p.name,
  kind: p.kind,
  order: 0,
  stayMin: p.visitMin,
  visitRange: null,
  driveKmFromPrev: 0,
  driveMinFromPrev: 0,
  entryGroup: p.entryGroup,
  parkingEur: 0,
  perTraveler: [],
  droneStatus: p.droneStatus,
  droneNote: null,
  hiddenGem: p.hiddenGem,
  isManual: false,
  skip: false,
  must: false,
  arrive: null,
  lat: p.lat,
  lng: p.lng,
  description: p.description,
  tips: null,
  bookingRequired: false,
  bookingUrl: null,
  seasonNote: null,
  monthRating: p.monthRating,
  regionName: p.regionName,
  walkKm: null,
  difficulty: null,
  entryNote: null,
  stars: p.stars,
  photoUrl: p.photoUrl,
  photoCredit: p.photoCredit,
  websiteUrl: p.websiteUrl,
  wikiUrl: p.wikiUrl,
  mapsUrl: p.mapsUrl,
  entryPpEur: p.entryPpEur,
  valuePer10Eur: p.valuePer10Eur,
  cheaper: p.cheaper,
});

export function MapView({
  tripId,
  tripName,
  days,
  catalog,
  initialDay,
  initialPoi,
  totals,
}: {
  tripId: string;
  tripName: string;
  days: DayLite[];
  catalog: CatalogPoi[];
  initialDay: number | null;
  initialPoi: string | null;
  totals: { km: number; driveMinReal: number; stops: number };
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  const [day, setDay] = useState<number | null>(initialDay);
  const [layers, setLayers] = useState({ route: true, stops: true, nights: true, catalog: false });
  const [selected, setSelected] = useState<Selected | null>(() => {
    if (!initialPoi) return null;
    for (const d of days)
      for (const s of d.stops)
        if (s.slug === initialPoi) return { kind: 'stop', stop: s, dayIndex: d.dayIndex };
    const c = catalog.find((p) => p.slug === initialPoi);
    return c ? { kind: 'catalog', poi: c } : null;
  });
  const [detail, setDetail] = useState(false);
  const [ready, setReady] = useState(false);

  const geo = useMemo(() => {
    const routes = {
      type: 'FeatureCollection' as const,
      features: days
        .filter((d) => d.line && d.line.length > 1)
        .map((d) => ({
          type: 'Feature' as const,
          properties: { day: d.dayIndex },
          geometry: { type: 'LineString' as const, coordinates: d.line! },
        })),
    };
    const stops = {
      type: 'FeatureCollection' as const,
      features: days.flatMap((d) =>
        d.stops
          .filter((s) => !s.skip)
          .map((s) => ({
            type: 'Feature' as const,
            properties: {
              day: d.dayIndex,
              order: s.order + 1,
              slug: s.slug,
              name: s.name,
              entry: s.entryGroup,
              stay: s.stayMin,
              drone: s.droneStatus,
              gem: s.hiddenGem,
            },
            geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
          })),
      ),
    };
    const nights = {
      type: 'FeatureCollection' as const,
      features: days
        .filter((d) => d.overnight)
        .map((d) => ({
          type: 'Feature' as const,
          properties: {
            day: d.dayIndex,
            name: d.overnight!.lodgingName ?? d.overnight!.regionName,
            region: d.overnight!.regionName,
          },
          geometry: { type: 'Point' as const, coordinates: [d.overnight!.lng, d.overnight!.lat] },
        })),
    };
    const cat = {
      type: 'FeatureCollection' as const,
      features: catalog
        .filter((p) => p.inPlanDay == null)
        .map((p) => ({
          type: 'Feature' as const,
          properties: { slug: p.slug, name: p.name, entry: p.entryGroup, stay: p.visitMin, gem: p.hiddenGem },
          geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        })),
    };
    return { routes, stops, nights, cat };
  }, [days, catalog]);

  // init mapy – odložene: React strict mode v dev montuje dvakrát a MapLibre po map.remove() stratí zdieľaný worker pool
  useEffect(() => {
    if (!el.current || mapRef.current) return;
    let cancelled = false;
    let map: maplibregl.Map | null = null;
    const timer = setTimeout(() => {
      if (cancelled || !el.current) return;
      map = new maplibregl.Map({
        container: el.current,
        style: STYLE,
        center: [-19.0, 64.9],
        zoom: 5.4,
        attributionControl: { compact: false },
      });
      setupMap(map);
    }, 0);
    const setupMap = (map: maplibregl.Map) => {
      mapRef.current = map;
      map.on('error', (e) => console.warn('[map]', e.error?.message ?? e));
      if (process.env.NODE_ENV !== 'production')
        (window as unknown as { __ipMap?: maplibregl.Map }).__ipMap = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
      popup.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: 'ip-popup',
      });
      map.on('load', () => {
        map.addSource('routes', { type: 'geojson', data: geo.routes });
        map.addSource('stops', { type: 'geojson', data: geo.stops });
        map.addSource('nights', { type: 'geojson', data: geo.nights });
        map.addSource('catalog', { type: 'geojson', data: geo.cat });
        map.addLayer({
          id: 'routes-muted',
          type: 'line',
          source: 'routes',
          paint: { 'line-color': MUTED, 'line-width': 3, 'line-opacity': 0.9 },
          layout: { 'line-cap': 'round', 'line-join': 'round' },
        });
        map.addLayer({
          id: 'routes-active',
          type: 'line',
          source: 'routes',
          paint: { 'line-color': ACCENT, 'line-width': 5 },
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          filter: ['==', ['get', 'day'], -1],
        });
        map.addLayer({
          id: 'catalog-pts',
          type: 'circle',
          source: 'catalog',
          paint: {
            'circle-radius': 5,
            'circle-color': '#C9D2DD',
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 1.5,
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({
          id: 'nights-pts',
          type: 'circle',
          source: 'nights',
          paint: {
            'circle-radius': 7,
            'circle-color': NIGHT,
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 2,
          },
        });
        map.addLayer({
          id: 'stops-pts',
          type: 'circle',
          source: 'stops',
          paint: {
            'circle-radius': 11,
            'circle-color': ['case', ['==', ['get', 'day'], -1], ACCENT, '#fff'],
            'circle-stroke-color': ACCENT,
            'circle-stroke-width': 2,
          },
        });
        map.addLayer({
          id: 'stops-num',
          type: 'symbol',
          source: 'stops',
          layout: {
            'text-field': ['to-string', ['get', 'order']],
            'text-size': 11,
            'text-font': ['Noto Sans Bold'],
            'text-allow-overlap': true,
          },
          paint: { 'text-color': ACCENT },
        });
        const hover = (e: MapMouseEvent, html: (p: Record<string, unknown>) => string) => {
          const f = map.queryRenderedFeatures(e.point, {
            layers: ['stops-pts', 'nights-pts', 'catalog-pts'],
          })[0];
          if (!f) return;
          map.getCanvas().style.cursor = 'pointer';
          popup.current
            ?.setLngLat((f.geometry as Point).coordinates as [number, number])
            .setHTML(html(f.properties as Record<string, unknown>))
            .addTo(map);
        };
        const tip = (p: Record<string, unknown>) =>
          `<div class="ip-tip"><b>${p.name}</b>${p.gem ? ' 💎' : ''}<br/>${p.day != null && p.order != null ? `deň ${p.day} · #${p.order} · ` : p.region ? `noc ${p.day} · ${p.region}` : ''}${p.stay ? `${p.stay} min · ` : ''}${p.entry != null ? (Number(p.entry) ? `${Math.round(Number(p.entry))} € skupina` : 'zadarmo') : ''}</div>`;
        for (const id of ['stops-pts', 'nights-pts', 'catalog-pts']) {
          map.on('mousemove', id, (e: MapLayerMouseEvent) => hover(e, tip));
          map.on('mouseleave', id, () => {
            map.getCanvas().style.cursor = '';
            popup.current?.remove();
          });
        }
        map.on('click', 'stops-pts', (e: MapLayerMouseEvent) => {
          const p = e.features?.[0]?.properties as { slug: string; day: number } | undefined;
          if (!p) return;
          const d = days.find((x) => x.dayIndex === Number(p.day));
          const s = d?.stops.find((x) => x.slug === p.slug);
          if (d && s) {
            setSelected({ kind: 'stop', stop: s, dayIndex: d.dayIndex });
            setDay(d.dayIndex);
          }
        });
        map.on('click', 'nights-pts', (e: MapLayerMouseEvent) => {
          const p = e.features?.[0]?.properties as { day: number } | undefined;
          const d = p && days.find((x) => x.dayIndex === Number(p.day));
          if (d) {
            setSelected({ kind: 'night', day: d });
            setDay(d.dayIndex);
          }
        });
        map.on('click', 'catalog-pts', (e: MapLayerMouseEvent) => {
          const p = e.features?.[0]?.properties as { slug: string } | undefined;
          const c = p && catalog.find((x) => x.slug === p.slug);
          if (c) setSelected({ kind: 'catalog', poi: c });
        });
        setReady(true);
        // fit na celý okruh
        const all = [...geo.stops.features, ...geo.nights.features].map(
          (f) => f.geometry.coordinates as [number, number],
        );
        if (all.length > 1) {
          const b = all.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(all[0], all[0]));
          map.fitBounds(b, { padding: 60, maxZoom: 9, duration: 0 });
        }
      });
    };
    return () => {
      cancelled = true;
      clearTimeout(timer);
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // aktívny deň + vrstvy
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setFilter('routes-active', ['==', ['get', 'day'], day ?? -1]);
    map.setPaintProperty('stops-pts', 'circle-color', [
      'case',
      ['==', ['get', 'day'], day ?? -1],
      ACCENT,
      '#fff',
    ]);
    map.setPaintProperty('stops-num', 'text-color', [
      'case',
      ['==', ['get', 'day'], day ?? -1],
      '#fff',
      ACCENT,
    ]);
    map.setLayoutProperty('routes-muted', 'visibility', layers.route ? 'visible' : 'none');
    map.setLayoutProperty('routes-active', 'visibility', layers.route ? 'visible' : 'none');
    map.setLayoutProperty('stops-pts', 'visibility', layers.stops ? 'visible' : 'none');
    map.setLayoutProperty('stops-num', 'visibility', layers.stops ? 'visible' : 'none');
    map.setLayoutProperty('nights-pts', 'visibility', layers.nights ? 'visible' : 'none');
    map.setLayoutProperty('catalog-pts', 'visibility', layers.catalog ? 'visible' : 'none');
    (map.getSource('stops') as GeoJSONSource | undefined)?.setData(geo.stops);
    if (day != null) {
      const d = days.find((x) => x.dayIndex === day);
      const pts = d
        ? [
            d.startLatLng.slice().reverse() as [number, number],
            ...d.stops.map((s) => [s.lng, s.lat] as [number, number]),
            ...(d.overnight ? [[d.overnight.lng, d.overnight.lat] as [number, number]] : []),
          ]
        : [];
      if (pts.length > 1)
        map.fitBounds(
          pts.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(pts[0], pts[0])),
          { padding: 70, maxZoom: 10, duration: 500 },
        );
    }
  }, [day, layers, ready, days, geo.stops]);

  const cur = day != null ? days.find((d) => d.dayIndex === day) : null;
  const step = (delta: number) => {
    const idx = days.findIndex((d) => d.dayIndex === day);
    const next = days[idx + delta] ?? (idx === -1 && delta > 0 ? days[0] : null);
    setDay(next ? next.dayIndex : null);
    setSelected(null);
  };

  return (
    <div className="bg-bg relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        {/* maplibre prepíše position na relative – preto vnútorný div s h-full */}
        <div ref={el} className="h-full w-full" />
      </div>
      {/* horný pás */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-3 sm:p-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <ButtonLink href={`/cesta/${tripId}?krok=4`} variant="secondary" size="sm">
            <X size={14} /> Zavrieť
          </ButtonLink>
          <span className="rounded-btn border-card-line bg-card flex h-[34px] items-center gap-2 border px-3 text-[13px] font-semibold">
            {cur
              ? `Deň ${cur.dayIndex} · ${cur.regionName} · ${fmtKm(cur.driveKm)} · ${fmtH(cur.driveMinReal)}`
              : `${tripName} · ${fmtKm(totals.km)} · ${totals.stops} zastávok`}
          </span>
          <div className="grow" />
          <Button variant="secondary" size="sm" icon aria-label="Celý okruh" onClick={() => setDay(null)}>
            <Crosshair size={14} />
          </Button>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-1.5">
          {(
            [
              ['route', 'Trasa'],
              ['stops', 'Zastávky'],
              ['nights', 'Noci'],
              ['catalog', 'Katalóg'],
            ] as const
          ).map(([k, l]) => (
            <Chip
              key={k}
              on={layers[k]}
              onClick={() => setLayers((s) => ({ ...s, [k]: !s[k] }))}
              className="h-7 text-[12px]"
            >
              {l}
            </Chip>
          ))}
        </div>
      </div>
      {/* spodný pás */}
      <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:p-4">
        <div className="rounded-card border-card-line bg-card mx-auto flex max-w-[820px] items-center gap-1 border p-1.5 shadow-[var(--shadow-sheet)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step(-1)}
            disabled={!day || days[0]?.dayIndex === day}
            aria-label="Predchádzajúci deň"
          >
            <ChevronLeft size={16} />{' '}
            <span className="hidden sm:inline">deň {cur ? cur.dayIndex - 1 : ''}</span>
          </Button>
          <div className="min-w-0 grow">
            {selected?.kind === 'stop' && (
              <ListRow
                leading={
                  <span className="font-display bg-accent-soft text-accent grid size-9 place-items-center rounded-[9px] text-[12px] font-semibold">
                    {String(selected.stop.order + 1).padStart(2, '0')}
                  </span>
                }
                title={`${selected.stop.name}${selected.stop.hiddenGem ? ' 💎' : ''}`}
                meta={`deň ${selected.dayIndex} · ${selected.stop.stayMin} min · ${selected.stop.entryGroup ? fmtEur(selected.stop.entryGroup) : 'zadarmo'}`}
                badges={
                  <Tag tone={(DRONE[selected.stop.droneStatus] ?? DRONE.unknown).tone}>
                    {(DRONE[selected.stop.droneStatus] ?? DRONE.unknown).label}
                  </Tag>
                }
                action={
                  <Button size="sm" variant="secondary" onClick={() => setDetail(true)}>
                    Detail
                  </Button>
                }
                onOpen={() => setDetail(true)}
                className="border-t-0"
              />
            )}
            {selected?.kind === 'night' && (
              <ListRow
                leading={<Tile icon={Tent} tone="ok" />}
                title={`Noc ${selected.day.dayIndex} · ${selected.day.overnight?.regionName}`}
                meta={selected.day.overnight?.lodgingName ?? 'ubytovanie z kroku 05 (odhad)'}
                action={
                  <ButtonLink href={`/cesta/${tripId}?krok=5`} size="sm" variant="secondary">
                    Krok 05
                  </ButtonLink>
                }
                className="border-t-0"
              />
            )}
            {selected?.kind === 'catalog' && (
              <ListRow
                leading={<Tile icon={Sparkles} tone="mut" />}
                title={`${selected.poi.name}${selected.poi.hiddenGem ? ' 💎' : ''}`}
                meta={`${selected.poi.regionName} · ${selected.poi.visitMin} min · ${selected.poi.entryGroup ? fmtEur(selected.poi.entryGroup) : 'zadarmo'} · nie je v pláne`}
                action={
                  <Button size="sm" variant="secondary" onClick={() => setDetail(true)}>
                    Detail
                  </Button>
                }
                onOpen={() => setDetail(true)}
                className="border-t-0"
              />
            )}
            {!selected && (
              <div className="text-ink-3 px-3 py-2 text-[13px]">
                Klikni na bod trasy – tooltip pri prejdení, klik otvorí detail. ‹ › prepína dni.
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step(1)}
            disabled={days[days.length - 1]?.dayIndex === day}
            aria-label="Ďalší deň"
          >
            <span className="hidden sm:inline">deň {cur ? cur.dayIndex + 1 : 1}</span>{' '}
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      {detail && selected?.kind === 'stop' && (
        <PoiSheet
          stop={selected.stop}
          dayIndex={selected.dayIndex}
          tripId={tripId}
          onClose={() => setDetail(false)}
        />
      )}
      {detail && selected?.kind === 'catalog' && (
        <PoiSheet
          stop={catalogToStop(selected.poi)}
          dayIndex={null}
          tripId={tripId}
          onClose={() => setDetail(false)}
        />
      )}
      <style>{`.ip-popup .maplibregl-popup-content{padding:6px 10px;border-radius:8px;font:500 12px 'Instrument Sans',system-ui,sans-serif;color:#0B1220;box-shadow:0 4px 16px rgba(11,18,32,.14)} .ip-popup .maplibregl-popup-tip{display:none}`}</style>
    </div>
  );
}
