import { frankfurter } from './frankfurter';
import { gasvaktin } from './gasvaktin';
import { osrm } from './osrm';
import { parka } from './parka';
import { ryanair } from './ryanair';
import { tjalda } from './tjalda';
import { tpFlights } from './tp-flights';
import { wizz } from './wizz';
import type { Connector } from './types';

export * from './types';
export { MemoryCache, setDefaultCache, resolveContext, ConnectorError } from './base';
export { frankfurter, gasvaktin, tjalda, parka, tpFlights, wizz, ryanair, osrm };

/** Registrované konektory (docs/04) – ďalšie (wizz, ryanair, gflights, viator, ors…) pribudnú v ďalších blokoch. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CONNECTORS: Connector<any, any>[] = [
  tpFlights,
  wizz,
  ryanair,
  frankfurter,
  gasvaktin,
  tjalda,
  parka,
  osrm,
];
