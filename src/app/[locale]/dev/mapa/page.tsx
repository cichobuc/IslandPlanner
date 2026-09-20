import { notFound } from 'next/navigation';
import { MapView } from '../../cesta/[id]/mapa/map-view';
import type { DayLite } from '@/features/trips/itinerary-data';

/** Ukážka mapy bez prihlásenia (len vývoj): 2 dni na juhu s priamymi úsečkami namiesto OSRM geometrie. */
export default function DevMapPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  const stop = (
    slug: string,
    name: string,
    lat: number,
    lng: number,
    order: number,
  ): DayLite['stops'][number] => ({
    stopId: slug,
    slug,
    name,
    kind: 'attraction',
    order,
    stayMin: 60,
    visitRange: null,
    driveKmFromPrev: 40,
    driveMinFromPrev: 35,
    entryGroup: 0,
    parkingEur: 7,
    perTraveler: [],
    droneStatus: 'allowed',
    droneNote: null,
    hiddenGem: slug === 'kvernufoss',
    isManual: false,
    skip: false,
    lat,
    lng,
    description: 'Ukážka.',
    tips: null,
    bookingRequired: false,
    bookingUrl: null,
    seasonNote: null,
    monthRating: 4,
    regionName: 'Juh',
    walkKm: null,
    difficulty: null,
    entryNote: null,
  });
  const days: DayLite[] = [
    {
      dayId: 'd1',
      dayIndex: 1,
      date: '2027-09-12',
      dow: 'Ne',
      regionId: 'golden_circle',
      regionName: 'Golden Circle',
      locked: false,
      driveKm: 213,
      driveMin: 190,
      driveMinReal: 260,
      warnings: [],
      overnight: { regionName: 'Golden Circle', lodgingName: null, lat: 64.25, lng: -20.6 },
      stops: [
        stop('blue-lagoon', 'Blue Lagoon', 63.8804, -22.4495, 0),
        stop('thingvellir', 'Þingvellir', 64.2661, -21.0958, 1),
        stop('geysir', 'Geysir', 64.3105, -20.3024, 2),
      ],
      entryGroup: 0,
      startLatLng: [63.985, -22.6056],
      line: [
        [-22.6056, 63.985],
        [-22.4495, 63.8804],
        [-21.0958, 64.2661],
        [-20.3024, 64.3105],
        [-20.6, 64.25],
      ],
    },
    {
      dayId: 'd2',
      dayIndex: 2,
      date: '2027-09-13',
      dow: 'Po',
      regionId: 'south',
      regionName: 'Juh',
      locked: false,
      driveKm: 180,
      driveMin: 150,
      driveMinReal: 210,
      warnings: [],
      overnight: { regionName: 'Juh (Vík)', lodgingName: 'Vík Cottages', lat: 63.42, lng: -19.0 },
      stops: [
        stop('seljalandsfoss', 'Seljalandsfoss', 63.6156, -19.9886, 0),
        stop('skogafoss', 'Skógafoss', 63.5321, -19.5114, 1),
        stop('kvernufoss', 'Kvernufoss', 63.5285, -19.4836, 2),
        stop('reynisfjara', 'Reynisfjara', 63.4045, -19.0446, 3),
      ],
      entryGroup: 0,
      startLatLng: [64.25, -20.6],
      line: [
        [-20.6, 64.25],
        [-19.9886, 63.6156],
        [-19.5114, 63.5321],
        [-19.4836, 63.5285],
        [-19.0446, 63.4045],
        [-19.0, 63.42],
      ],
    },
  ];
  return (
    <MapView
      tripId="dev"
      tripName="Ukážka"
      days={days}
      catalog={[]}
      initialDay={2}
      initialPoi={null}
      totals={{ km: 393, driveMinReal: 470, stops: 7 }}
    />
  );
}
