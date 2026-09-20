// Screenshoty /dev/ui (blok 2.1) na iPad / iPhone / Mac. Spustenie: pnpm dev -p 3111 && node tests/e2e/ui-kit.mjs <adresár na PNG>
import { chromium } from '@playwright/test';
const S = process.argv[2];
const b = await chromium.launch();
for (const [name, vp] of [['ipad', { width: 820, height: 1180 }], ['iphone', { width: 390, height: 844 }], ['mac', { width: 1280, height: 900 }]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3111/sk/dev/ui');
  await p.waitForLoadState('networkidle');
  await p.screenshot({ path: `${S}/ui-${name}.png`, fullPage: true });
  if (name !== 'mac') { await p.screenshot({ path: `${S}/ui-${name}-fold.png` }); }
  // sheet
  await p.click('text=Dacia Jogger');
  await p.waitForSelector('[role=dialog]');
  await p.screenshot({ path: `${S}/ui-${name}-sheet.png` });
  await ctx.close();
}
await b.close();
