// Side-by-side vertical composition of the category carousel: reference (vineyard.co.za
// section-categories) vs ours ([data-carousel]) at identical viewports. For each element it records
// top/bottom relative to the section, prints the differences, and saves section-aligned screenshots.
// Usage: node tools/compare-carousel.mjs [--only=1440] [--no-ref]   (preview server on :4600)
// Output: qa/compare/carousel/<w>-ref.png, <w>-ours.png, results.json
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';

const VPS = [[1440, 900], [1920, 1080], [768, 1024], [390, 844]];
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const noRef = process.argv.includes('--no-ref');
const OUT = 'qa/compare/carousel';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const prev = existsSync(`${OUT}/results.json`) ? JSON.parse(readFileSync(`${OUT}/results.json`, 'utf8')) : {};
const results = {};

function measureIn(kind) {
  const R = kind === 'ref'
    ? { sec: '.section-categories', act: (s) => s.querySelector('.swiper-slide-active .s-carousel-item'), title: '.s-carousel-item-title', tagline: '.s-carousel-item-tagline', text: '.s-carousel-item-text', buttons: '.s-buttons', bars: '.swiper-pagination', numbers: '.swiper-numbers', prevT: (s) => s.querySelector('.swiper-slide-prev .s-carousel-item-title'), nextT: (s) => s.querySelector('.swiper-slide-next .s-carousel-item-title') }
    : null;
  const s = document.querySelector(kind === 'ref' ? '.section-categories' : '[data-carousel]');
  const sr = s.getBoundingClientRect();
  const rel = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top - sr.top), bottom: Math.round(r.bottom - sr.top), left: Math.round(r.left - sr.left), right: Math.round(r.right - sr.left) }; };
  if (kind === 'ref') {
    const a = R.act(s);
    return { secTop: Math.round(sr.top), secH: Math.round(sr.height), title: rel(a.querySelector(R.title)), tagline: rel(a.querySelector(R.tagline)), text: rel(a.querySelector(R.text)), buttons: rel([...a.querySelector(R.buttons).children][0] ? a.querySelector(R.buttons).firstElementChild : null), buttonsBox: rel(a.querySelector(R.buttons)), bars: rel(s.querySelector(R.bars)), numbers: rel(s.querySelector(R.numbers)), prevTitle: rel(R.prevT(s)), nextTitle: rel(R.nextT(s)) };
  }
  const i = parseInt(s.querySelector('[data-current]').textContent, 10) - 1, n = 4;
  const titles = s.querySelectorAll('[data-title]'), copy = s.querySelectorAll('[data-copy]')[i];
  const ctas = copy.querySelector('.carousel__ctas');
  return { secTop: Math.round(sr.top), secH: Math.round(sr.height), title: rel(titles[i]), tagline: rel(copy.querySelector('.carousel__tagline')), text: rel(copy.querySelector('.carousel__text')), buttons: rel(ctas.firstElementChild), buttonsBox: rel(ctas.lastElementChild), bars: rel(s.querySelector('.carousel__bars')), numbers: rel(s.querySelector('.carousel__count')), prevTitle: rel(titles[(i + n - 1) % n]), nextTitle: rel(titles[(i + 1) % n]), overflowX: document.documentElement.scrollWidth > innerWidth };
}

for (const [W, H] of VPS) {
  if (only && String(W) !== only) continue;
  const mob = W < 800;
  results[W] = {};
  // ---------- reference ----------
  if (!noRef) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, isMobile: mob, hasTouch: mob });
    await page.goto('https://www.vineyard.co.za/', { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(3500);
    const target = await page.evaluate(() => document.querySelector('.section-categories').getBoundingClientRect().top + scrollY);
    for (let y = 0; y <= target; y += 400) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(90); }
    for (let k = 0; k < 8; k++) {
      const top = await page.evaluate(() => document.querySelector('.section-categories').getBoundingClientRect().top);
      if (Math.abs(top) < 1) break;
      if (mob) await page.evaluate((t) => window.scrollTo(0, scrollY + t), top); else await page.mouse.wheel(0, top);
      await page.waitForTimeout(900);
    }
    // wait for an autoplay change, then for its 1.4s slide to settle
    const cur = () => page.evaluate(() => document.querySelector('.section-categories .swiper-numbers-current').textContent.trim());
    const c0 = await cur(); for (let t = 0; t < 80 && (await cur()) === c0; t++) await page.waitForTimeout(100);
    await page.waitForTimeout(1900);
    results[W].ref = await page.evaluate(measureIn, 'ref');
    await page.screenshot({ path: `${OUT}/${W}-ref.png` });
    await page.close();
  } else if (prev[W]) results[W].ref = prev[W].ref;
  // ---------- ours ----------
  const page = await browser.newPage({ viewport: { width: W, height: H }, isMobile: mob, hasTouch: mob });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:4600/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const target = await page.evaluate(() => document.querySelector('[data-carousel]').getBoundingClientRect().top + scrollY);
  for (let y = 0; y <= target; y += 400) await page.evaluate((yy) => TEH.lenis.scrollTo(yy, { immediate: true, force: true }), y);
  await page.evaluate(() => { const s = document.querySelector('[data-carousel]'); TEH.lenis.scrollTo(s.getBoundingClientRect().top + scrollY, { immediate: true, force: true }); });
  await page.waitForTimeout(1600);
  await page.evaluate(() => TEH.carousel.pause());
  results[W].ours = await page.evaluate(measureIn, 'ours');
  results[W].ours.errors = errs;
  await page.screenshot({ path: `${OUT}/${W}-ours.png` });
  await page.close();
  // ---------- report ----------
  const r = results[W].ref, o = results[W].ours;
  console.log(`\n== ${W}x${H}  (section ref ${r ? r.secH : '-'} / ours ${o.secH})  ours overflowX=${o.overflowX} errors=${errs.length}`);
  for (const k of ['title', 'tagline', 'text', 'buttons', 'bars', 'numbers']) {
    const a = r && r[k], b = o[k];
    const pct = (v, h) => (v / h * 100).toFixed(1) + '%';
    console.log(`  ${k.padEnd(8)} ref ${a ? `${a.top}-${a.bottom} (${pct(a.top, r.secH)})` : '-'}`.padEnd(40) + ` ours ${b.top}-${b.bottom} (${pct(b.top, o.secH)})` + (a ? `  Δtop ${b.top - a.top}` : ''));
  }
  if (r) {
    const gap = (x, k1, k2) => x[k2].top - x[k1].bottom;
    console.log(`  gaps title→tagline ref ${gap(r, 'title', 'tagline')} ours ${gap(o, 'title', 'tagline')} | text→button ref ${gap(r, 'text', 'buttons')} ours ${gap(o, 'text', 'buttons')} | numbers→bottom ref ${r.secH - r.numbers.bottom} ours ${o.secH - o.numbers.bottom}`);
  }
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(Object.assign(prev, results), null, 2));
await browser.close();
