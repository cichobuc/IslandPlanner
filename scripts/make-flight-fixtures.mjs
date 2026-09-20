// Ručne prepísané testovacie fixtures pre wizz/ryanair konektory (tvar odpovede + hodnoty pozorované 20. 9. 2026).
// Spustenie: node scripts/make-flight-fixtures.mjs
import { writeFileSync } from 'node:fs';

const wizzFlight = (dep, arr, day, amount, currency, time) => ({
  departureStation: dep,
  arrivalStation: arr,
  departureDate: `2027-09-${day}T00:00:00`,
  price: { amount, currencyCode: currency, exchangedAmount: null, exchangedCurrencyCode: null },
  originalPrice: { amount, currencyCode: currency, exchangedAmount: null, exchangedCurrencyCode: null },
  priceType: 'price',
  departureDates: [`2027-09-${day}T${time}:00`],
  hasMacFlight: false,
});
const parse = (s) => s.split('|').map((x) => x.trim().split(' '));

const ktwOut = parse(
  '02 589 15:05 | 04 409 16:05 | 05 499 14:15 | 07 409 16:05 | 09 409 15:05 | 11 245.6 16:05 | 12 319 14:15 | 14 359 16:05 | 16 359 15:05 | 18 499 16:05 | 19 589 14:15 | 21 449 14:15 | 22 499 16:05 | 23 499 14:15 | 25 499 14:15 | 26 589 14:15 | 28 499 14:15 | 29 539 16:05 | 30 499 14:15',
);
const ktwRet = parse(
  '02 449 18:05 | 04 409 19:05 | 05 409 17:15 | 07 409 19:05 | 09 589 18:05 | 11 409 19:05 | 12 409 17:15 | 14 359 19:05 | 16 499 18:05 | 18 589 19:05 | 19 589 17:15 | 21 589 17:15 | 22 589 19:05 | 23 659 17:15 | 25 589 17:15 | 26 589 17:15 | 28 539 17:15 | 29 589 19:05 | 30 589 17:15',
);
const budOut = parse(
  '02 38290 15:25 | 04 42190 15:40 | 07 68990 13:25 | 09 42190 15:25 | 11 42190 15:40 | 14 42190 13:25 | 16 42190 15:25 | 18 34490 15:40 | 21 34490 13:25 | 23 34490 15:25 | 25 30690 15:40 | 28 38290 13:25 | 30 30690 15:25',
);
const budRet = parse(
  '02 61290 18:45 | 04 61290 19:00 | 07 49790 16:45 | 09 49790 18:45 | 11 72790 19:00 | 14 49790 16:45 | 16 49790 18:45 | 18 32990 19:00 | 21 34490 16:45 | 23 34490 18:45 | 25 30690 19:00 | 28 32990 16:45 | 30 49790 18:45',
);

writeFileSync(
  'src/connectors/fixtures/wizz-KTW-KEF.json',
  JSON.stringify(
    {
      outboundFlights: ktwOut.map(([d, p, t]) => wizzFlight('KTW', 'KEF', d, Number(p), 'PLN', t)),
      returnFlights: ktwRet.map(([d, p, t]) => wizzFlight('KEF', 'KTW', d, Number(p), 'PLN', t)),
    },
    null,
    1,
  ),
);
writeFileSync(
  'src/connectors/fixtures/wizz-BUD-KEF.json',
  JSON.stringify(
    {
      outboundFlights: budOut.map(([d, p, t]) => wizzFlight('BUD', 'KEF', d, Number(p), 'HUF', t)),
      returnFlights: budRet.map(([d, p, t]) => wizzFlight('KEF', 'BUD', d, Number(p), 'HUF', t)),
    },
    null,
    1,
  ),
);

const ry =
  '114.99 63.99 83.99 83.99 94.99 94.99 63.99 55.99 47.99 63.99 63.99 72.99 72.99 55.99 47.99 47.99 47.99 47.99 63.99 63.99 47.99 47.99 47.99 47.99 47.99 47.99 47.99 47.99 47.99 47.99'
    .split(' ')
    .map(Number);
writeFileSync(
  'src/connectors/fixtures/ryanair-BTS-STN.json',
  JSON.stringify(
    {
      outbound: {
        fares: ry.map((v, i) => {
          const day = `2027-09-${String(i + 1).padStart(2, '0')}`;
          return {
            day,
            arrivalDate: `${day}T12:00:00`,
            departureDate: `${day}T10:40:00`,
            price: {
              value: v,
              valueMainUnit: String(Math.floor(v)),
              valueFractionalUnit: '99',
              currencyCode: 'EUR',
              currencySymbol: '€',
            },
            soldOut: false,
            unavailable: false,
          };
        }),
      },
    },
    null,
    1,
  ),
);
console.log('fixtures zapísané');
