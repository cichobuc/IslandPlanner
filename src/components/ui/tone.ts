/** Stavové/kategóriové tóny (docs/06): svetlý podklad + tmavý text. */
export type Tone = 'ok' | 'info' | 'warn' | 'bad' | 'vio' | 'mut';

export const toneBg: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok-fg',
  info: 'bg-info-bg text-info-fg',
  warn: 'bg-warn-bg text-warn-fg',
  bad: 'bg-bad-bg text-bad-fg',
  vio: 'bg-vio-bg text-vio-fg',
  mut: 'bg-mut-bg text-mut-fg',
};

/** Tón podľa pôvodu ceny (MoneySource) – štítok API / seed / odhad / ručne. */
export const sourceTag: Record<'api' | 'seed' | 'estimate' | 'manual' | 'range', { tone: Tone; label: string }> = {
  api: { tone: 'info', label: 'API' },
  seed: { tone: 'mut', label: 'seed' },
  estimate: { tone: 'warn', label: 'odhad' },
  range: { tone: 'warn', label: 'rozpätie' },
  manual: { tone: 'ok', label: 'ručne' },
};
