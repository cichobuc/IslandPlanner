// Fotky a odkazy pre POI zo seedu: Wikipedia (en) summary → 800 px náhľad z Wikimedia Commons + autor/licencia + odkaz na článok.
// Článok sa berie len, ak má súradnice ≤ 30 km od POI (bez falošných zhôd); `wiki_title` v pois.json je ručný override.
// Spustenie: pnpm exec tsx scripts/fetch-poi-photos.ts [--force]   (≤ 1 req/s, zapíše späť do seed/pois.json)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const UA = 'IslandPlanner/0.1 (https://github.com/cichobuc/island; seed script)';
const FILE = path.join(process.cwd(), 'seed', 'pois.json');
const force = process.argv.includes('--force');
type Poi = Record<string, unknown> & { slug: string; name: string; lat: number; lng: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const get = async <T>(url: string): Promise<T | null> => {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
  await sleep(400);
  return r.ok ? ((await r.json()) as T) : null;
};
const km = (a: [number, number], b: [number, number]) => {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

type Summary = {
  title: string;
  coordinates?: { lat: number; lon: number };
  originalimage?: { source: string };
  content_urls?: { desktop?: { page?: string } };
  type?: string;
};

async function summary(title: string) {
  return get<Summary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
}
async function search(q: string) {
  const r = await get<{ pages: { title: string }[] }>(
    `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(q)}&limit=4`,
  );
  return r?.pages.map((p) => p.title) ?? [];
}
/** Autor + licencia súboru na Commons (extmetadata). */
async function credit(fileName: string) {
  const r = await get<{ query: { pages: Record<string, { imageinfo?: { extmetadata?: Record<string, { value: string }> }[] }> } }>(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=extmetadata&format=json`,
  );
  const meta = Object.values(r?.query.pages ?? {})[0]?.imageinfo?.[0]?.extmetadata;
  if (!meta) return null;
  const artist = (meta.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim();
  const lic = meta.LicenseShortName?.value ?? '';
  return [artist, lic, 'Wikimedia Commons'].filter(Boolean).join(' · ');
}

type CommonsHit = { title: string; imageinfo?: { thumburl?: string; extmetadata?: Record<string, { value: string }> }[] };
/** Záloha bez článku: hľadanie súborov na Commons podľa názvu (prvý JPG/PNG s náhľadom 800 px). */
async function commonsSearch(q: string) {
  const r = await get<{ query?: { pages?: Record<string, CommonsHit> } }>(
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=960&format=json`,
  );
  // len JPG (PNG bývajú mapy/logá) a názov súboru musí obsahovať slovo z dopytu (bez diakritiky)
  const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae');
  const words = norm(q).split(/[^a-z]+/).filter((w) => w.length > 3);
  const hits = Object.values(r?.query?.pages ?? {}).filter(
    (h) => /\.jpe?g$/i.test(h.title) && !/map|karte|mapa/i.test(h.title) && words.some((w) => norm(h.title).includes(w)),
  );
  const h = hits.sort((a, b) => a.title.localeCompare(b.title))[0];
  const info = h?.imageinfo?.[0];
  if (!info?.thumburl) return null;
  const meta = info.extmetadata ?? {};
  const artist = (meta.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim();
  return {
    file: h.title,
    url: info.thumburl.split("?")[0],
    credit: [artist, meta.LicenseShortName?.value ?? '', 'Wikimedia Commons'].filter(Boolean).join(' · '),
  };
}

async function main() {
  const pois = JSON.parse(readFileSync(FILE, 'utf8')) as Poi[];
  let hit = 0;
  const misses: string[] = [];
  for (const p of pois) {
    if (p.photo_url && !force) {
      hit++;
      continue;
    }
    // názov aj jeho časti („Geysir / Strokkur“, „Hraunfossar + Barnafoss“, „Perlan (múzeum)“), potom vyhľadávanie
    const parts = p.name
      .split(/\s*[/+–,(]\s*/)
      .map((x) => x.replace(/[)]/g, '').trim())
      .filter((x) => x.length > 2);
    const candidates = p.wiki_title
      ? [String(p.wiki_title)]
      : [p.name, ...parts, ...(await search(parts[0] ?? p.name)), ...(await search(`${p.name} Iceland`))];
    let found: Summary | null = null;
    for (const t of [...new Set(candidates)]) {
      const s = await summary(t);
      if (!s || s.type === 'disambiguation') continue;
      if (p.wiki_title || (s.coordinates && km([p.lat, p.lng], [s.coordinates.lat, s.coordinates.lon]) <= 30)) {
        found = s;
        break;
      }
    }
    if (found) p.wiki_url = found.content_urls?.desktop?.page ?? null;
    const orig = found?.originalimage?.source?.split('?')[0];
    // originalimage je buď plný súbor (…/commons/8/8c/FILE) alebo už náhľad (…/commons/thumb/8/8c/FILE/3840px-FILE)
    const m = orig?.match(/\/commons\/(?:thumb\/)?([0-9a-f])\/([0-9a-f]{2})\/([^/]+)/);
    if (m && !/\.svg$/i.test(m[3])) {
      const file = decodeURIComponent(m[3]);
      p.photo_url = `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${m[3]}/960px-${m[3]}`;
      p.photo_credit = await credit(file);
    }
    if (!p.photo_url) {
      const c = await commonsSearch(String(p.commons_query ?? parts[0] ?? p.name));
      if (c) {
        p.photo_url = c.url;
        p.photo_credit = c.credit;
        console.log(p.slug, '→ commons:', c.file);
      }
    }
    if (!found && !p.photo_url) {
      misses.push(p.slug);
      continue;
    }
    hit++;
    console.log(p.slug, '→', found?.title ?? '(bez článku)', p.photo_url ? '📷' : '—');
  }
  writeFileSync(FILE, JSON.stringify(pois, null, 2) + '\n');
  console.log(`\nhotovo: ${hit}/${pois.length} s článkom; bez zhody: ${misses.join(', ') || '–'}`);
}
main();
