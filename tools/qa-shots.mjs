// Visual QA: wheel-scrolls a page (driving Lenis/ScrollTrigger like a user) and captures viewport shots.
// Usage: node tools/qa-shots.mjs <page> <desktop|mobile> [--step 0.5] [--reduced] [--out qa/build]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:4600/';
const [pageName = 'index.html', which = 'desktop'] = process.argv.slice(2).filter((a) => !a.startsWith('--') && !/^\d/.test(a));
const flag = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const reduced = process.argv.includes('--reduced');
const stepF = parseFloat(flag('--step', '0.5'));
const maxShots = parseInt(flag('--max', '80'), 10);
const VP = which === 'mobile' ? { width: 390, height: 844 } : which === 'tablet' ? { width: 820, height: 1180 } : { width: 1440, height: 900 };
const out = path.resolve(flag('--out', 'qa/build'), pageName.replace('.html', '') + '-' + which + (reduced ? '-reduced' : ''));
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1, isMobile: which === 'mobile', hasTouch: which === 'mobile', reducedMotion: reduced ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('requestfailed', (r) => errors.push('[requestfailed] ' + r.url()));
await page.goto(BASE + pageName, { waitUntil: 'load' });
await page.waitForTimeout(1800);

const metrics = await page.evaluate(() => ({ docH: document.documentElement.scrollHeight, overflowX: Math.max(document.documentElement.scrollWidth, window.innerWidth) - document.documentElement.clientWidth, wideEls: [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > window.innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('[data-track],[data-sg],.inspo__grid,.carousel,.menu,.drawer,.toast,.filters'); }).slice(0, 8).map((e) => e.tagName + '.' + e.className.toString().slice(0, 40)) }));
let i = 0, y = 0;
await page.screenshot({ path: path.join(out, `s000_0.png`) });
while (i < maxShots) {
  await page.mouse.move(VP.width / 2, VP.height / 2);
  const dy = Math.round(VP.height * stepF);
  if (which === 'mobile') await page.evaluate((d) => { if (window.TEH && TEH.lenis) TEH.lenis.scrollTo(window.scrollY + d, { immediate: true }); else window.scrollBy(0, d); }, dy);
  else await page.mouse.wheel(0, dy);
  await page.waitForTimeout(900);
  i++;
  const prevY = y;
  y = await page.evaluate(() => Math.round(window.scrollY));
  if (y === prevY && i > 1) break;
  await page.screenshot({ path: path.join(out, `s${String(i).padStart(3, '0')}_${y}.png`) });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  if (y + VP.height >= h - 2) break;
}
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ page: pageName, viewport: VP, reduced, metrics, shots: i + 1, errors }, null, 2));
console.log(JSON.stringify({ shots: i + 1, docH: metrics.docH, overflowX: metrics.overflowX, wideEls: metrics.wideEls, errors: errors.slice(0, 15) }, null, 1));
await browser.close();
