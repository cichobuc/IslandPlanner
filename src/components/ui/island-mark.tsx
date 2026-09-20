import { cn } from '@/lib/cn';

/** Vyhladený obrys Islandu (viewBox 560×400) – znak v hlavičke a podklad mini mapy. */
export const ISLAND_PATH =
  'M95.0,328.0 C91.2,324.6 95.8,313.3 102.5,306.8 C109.2,300.3 128.8,296.0 135.0,289.1 C141.2,282.2 140.0,273.4 140.0,265.5 C140.0,257.6 141.7,248.8 135.0,241.9 C128.3,235.0 112.5,229.1 100.0,224.2 C87.5,219.3 72.1,214.4 60.0,212.4 C47.9,210.4 28.3,214.8 27.5,212.4 C26.7,210.0 43.8,203.7 55.0,198.2 C66.2,192.7 82.5,185.9 95.0,179.4 C107.5,172.9 125.8,166.6 130.0,159.3 C134.2,152.0 140.8,140.6 120.0,135.7 C99.2,130.8 20.0,132.8 5.0,129.8 C-10.0,126.9 22.5,121.9 30.0,118.0 C37.5,114.1 47.5,112.1 50.0,106.2 C52.5,100.3 42.5,91.4 45.0,82.6 C47.5,73.8 60.8,63.9 65.0,53.1 C69.2,42.3 62.5,23.6 70.0,17.7 C77.5,11.8 97.5,12.8 110.0,17.7 C122.5,22.6 139.2,32.5 145.0,47.2 C150.8,62.0 140.0,90.5 145.0,106.2 C150.0,121.9 166.7,138.7 175.0,141.6 C183.3,144.5 188.3,129.8 195.0,123.9 C201.7,118.0 209.2,117.0 215.0,106.2 C220.8,95.4 224.2,60.0 230.0,59.0 C235.8,58.0 240.8,101.3 250.0,100.3 C259.2,99.3 275.8,57.0 285.0,53.1 C294.2,49.2 298.3,67.5 305.0,76.7 C311.7,86.0 320.8,112.5 325.0,108.6 C329.2,104.7 321.7,63.3 330.0,53.1 C338.3,42.9 361.7,50.2 375.0,47.2 C388.3,44.2 402.5,41.9 410.0,35.4 C417.5,28.9 415.8,11.2 420.0,8.3 C424.2,5.4 427.5,11.2 435.0,17.7 C442.5,24.2 453.3,46.2 465.0,47.2 C476.7,48.2 501.7,19.7 505.0,23.6 C508.3,27.5 487.5,58.0 485.0,70.8 C482.5,83.6 480.0,90.5 490.0,100.3 C500.0,110.1 534.2,119.0 545.0,129.8 C555.8,140.6 553.3,154.4 555.0,165.2 C556.7,176.0 561.7,183.9 555.0,194.7 C548.3,205.5 526.7,216.3 515.0,230.1 C503.3,243.9 500.8,265.5 485.0,277.3 C469.2,289.1 435.0,292.0 420.0,300.9 C405.0,309.8 405.8,324.5 395.0,330.4 C384.2,336.3 374.2,328.8 355.0,336.3 C335.8,343.8 297.5,370.3 280.0,375.2 C262.5,380.1 261.7,369.3 250.0,365.8 C238.3,362.3 221.7,359.9 210.0,354.0 C198.3,348.1 188.3,335.3 180.0,330.4 C171.7,325.5 169.2,325.1 160.0,324.5 C150.8,323.9 135.8,326.3 125.0,326.9 C114.2,327.5 98.8,331.4 95.0,328.0 Z';

export function IslandMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 560 400" aria-hidden className={cn('shrink-0', className)}>
      <path d={ISLAND_PATH} fill="currentColor" />
    </svg>
  );
}

export type RingMapPoint = { x: number; y: number; night?: boolean };

/**
 * Mini mapa okruhu do ľavého stĺpca: ostrov, modrá trasa, zelené kosoštvorce = noci, biele krúžky = zastávky.
 * Body sú v súradniciach viewBoxu 560×400 (prevod lon/lat rieši volajúci).
 */
export function RingMap({
  points,
  width = 210,
  height = 150,
  className,
}: {
  points: RingMapPoint[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const d = points.length ? 'M' + points.map((p) => `${p.x},${p.y}`).join(' L') : '';
  return (
    <svg viewBox="0 0 560 400" width={width} height={height} role="img" aria-label="Mapa okruhu" className={className}>
      <path d={ISLAND_PATH} fill="#EAF0F6" stroke="#C9D2DD" strokeWidth={2} />
      {d && <path d={d} fill="none" stroke="#0F4C81" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
      {points
        .filter((p) => p.night)
        .map((p, i) => (
          <rect key={`n${i}`} x={p.x - 4} y={p.y - 4} width={8} height={8} transform={`rotate(45 ${p.x} ${p.y})`} fill="#1E6B34" />
        ))}
      {points
        .filter((p) => !p.night)
        .map((p, i) => (
          <circle key={`s${i}`} cx={p.x} cy={p.y} r={6} fill="#fff" stroke="#0F4C81" strokeWidth={2} />
        ))}
    </svg>
  );
}
