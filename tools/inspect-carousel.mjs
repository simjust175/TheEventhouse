// Measures the reference category carousel (section-categories): vertical composition of the active
// slide (title, tagline, text, buttons, pagination) relative to the section, swiper autoplay params,
// and observed auto-advance timing. Output: qa/reference/carousel/<w>.json + <w>.png
// Usage: node tools/inspect-carousel.mjs [width=1440] [--watch=seconds]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const W = parseInt(process.argv[2] || '1440', 10);
const WATCH = parseInt((process.argv.find((a) => a.startsWith('--watch=')) || '--watch=0').split('=')[1], 10);
const H = { 1440: 900, 1920: 1080, 768: 1024, 390: 844 }[W] || 900;
const mob = W < 800;
const OUT = 'qa/reference/carousel';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: W, height: H }, isMobile: mob, hasTouch: mob });
await page.goto('https://www.vineyard.co.za/', { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(4000);
await page.evaluate(() => { document.querySelectorAll('button').forEach((b) => { if (/accept|agree/i.test(b.textContent || '') && b.offsetParent) b.click(); }); });

// walk down to the section (lazy media + scroll-linked code need real scrolling)
const target = await page.evaluate(() => document.querySelector('.section-categories').getBoundingClientRect().top + scrollY);
for (let y = 0; y <= target; y += 300) { if (mob) await page.evaluate((yy) => window.scrollTo(0, yy), y); else await page.mouse.wheel(0, 300); await page.waitForTimeout(120); }
await page.evaluate((t) => window.scrollTo(0, t), target);
await page.waitForTimeout(2500);

const measure = () => page.evaluate(() => {
  const sec = document.querySelector('.section-categories'); const s = sec.getBoundingClientRect();
  const rel = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { top: +(r.top - s.top).toFixed(1), bottom: +(r.bottom - s.top).toFixed(1), h: +r.height.toFixed(1), left: +(r.left - s.left).toFixed(1), w: +r.width.toFixed(1), topPct: +((r.top - s.top) / s.height * 100).toFixed(2), centerPct: +(((r.top + r.bottom) / 2 - s.top) / s.height * 100).toFixed(2), fs: cs.fontSize, lh: cs.lineHeight, mt: cs.marginTop, mb: cs.marginBottom, pt: cs.paddingTop, pos: cs.position }; };
  const act = sec.querySelector('.swiper-slide-active .s-carousel-item');
  const prev = sec.querySelector('.swiper-slide-prev .s-carousel-item-title'), next = sec.querySelector('.swiper-slide-next .s-carousel-item-title');
  const sw = sec.querySelector('.swiper').swiper;
  const item = act; const ics = getComputedStyle(item);
  return {
    vp: [innerWidth, innerHeight], section: { h: s.height, top: s.top },
    item: Object.assign(rel(item), { display: ics.display, flexDir: ics.flexDirection, justify: ics.justifyContent, gridRows: ics.gridTemplateRows, height: ics.height }),
    slide: rel(act.parentElement),
    title: rel(act.querySelector('.s-carousel-item-title')), tagline: rel(act.querySelector('.s-carousel-item-tagline')), text: rel(act.querySelector('.s-carousel-item-text')), buttons: rel(act.querySelector('.s-buttons')),
    prevTitle: rel(prev), nextTitle: rel(next),
    pager: rel(sec.querySelector('.swiper-pagination-wrapper')), bullets: rel(sec.querySelector('.swiper-pagination')), numbers: rel(sec.querySelector('.swiper-numbers')),
    bullet: rel(sec.querySelector('.swiper-pagination-bullet')),
    current: (sec.querySelector('.swiper-numbers-current') || {}).textContent,
    swiper: sw ? { autoplay: sw.params.autoplay, speed: sw.params.speed, loop: sw.params.loop, effect: sw.params.effect, running: sw.autoplay && sw.autoplay.running } : null,
    overlayAnim: [...sec.querySelectorAll('.swiper-pagination-bullet-active .swiper-pagination-bullet-overlay')].map((o) => { const cs = getComputedStyle(o); return { transform: cs.transform, width: cs.width, anim: cs.animation, trans: cs.transition }; }),
  };
});

const m = await measure();
await page.screenshot({ path: `${OUT}/${W}.png` });
const res = { measured: m };

if (WATCH) {
  // observe auto-advance while in view, then whether it continues off screen
  const log = [];
  const t0 = Date.now();
  let last = m.current;
  while (Date.now() - t0 < WATCH * 1000) {
    const c = await page.evaluate(() => document.querySelector('.section-categories .swiper-numbers-current').textContent.trim());
    if (c !== last) { log.push({ t: Date.now() - t0, to: c }); last = c; }
    await page.waitForTimeout(100);
  }
  res.inView = log;
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
  const before = await page.evaluate(() => document.querySelector('.section-categories .swiper-numbers-current').textContent.trim());
  await page.waitForTimeout(15000);
  const after = await page.evaluate(() => document.querySelector('.section-categories .swiper-numbers-current').textContent.trim());
  res.offscreen = { before, after, seconds: 15 };
}
writeFileSync(`${OUT}/${W}.json`, JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 1).slice(0, 6000));
await browser.close();
