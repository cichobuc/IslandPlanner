/** Serializovaná kombinácia pre klienta kroku 02 (časy už naformátované v lokálnom čase letiska). */
export type OptionLite = {
  id: string;
  origin: string;
  outDate: string; // YYYY-MM-DD (lokálne v origin)
  outDep: string; // HH:MM
  outArr: string;
  retDate: string;
  retDep: string;
  retArr: string;
  days: number;
  nights: number;
  airlines: string[];
  selfTransfer: boolean;
  hub: string | null;
  farePp: number;
  bags: number;
  parking: number | null;
  access: number;
  totalGroup: number;
  totalPp: number;
  source: 'api' | 'seed' | 'manual' | 'estimate';
  isEstimate: boolean;
  deepLink: string | null;
};

export type SelectedFlight = {
  optionId: string | null;
  manual: boolean;
  origin: string;
  outLabel: string; // „KTW → KEF · 12. 9. 06:40 → 09:15"
  retLabel: string;
  days: number;
  nights: number;
  totalGroup: number;
  totalPp: number;
  source: 'api' | 'seed' | 'manual' | 'estimate';
  deepLink: string | null;
  airline: string | null;
  /** rozpis: letenky · batožina · parkovanie · cesta na letisko · nocľah na hube (vyradené = excluded) */
  lines: {
    id: 'fare' | 'bags' | 'parking' | 'access' | 'hub_night';
    label: string;
    hint: string | null;
    amount: number;
    excluded: boolean;
    source: 'api' | 'seed' | 'manual' | 'estimate';
  }[];
  parkingChoices: { id: string; name: string; kind: string; price: number; shuttleMin: number | null; url: string | null }[];
  parkingOptionId: string | null;
  parkingDays: number;
};

export type SearchMeta = {
  id: string;
  createdAt: string;
  stale: boolean;
  count: number;
  connectorStats: Record<string, { ok: boolean; count: number; reason?: string }> | null;
};
