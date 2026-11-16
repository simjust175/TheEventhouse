// Phase 1b: fine-grained motion capture of the reference hero pin, category carousel and oval media.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const out = path.resolve('qa/reference/motion');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://www.vineyard.co.za/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(6000);
const notes = {};

// 1. Hero: small wheel steps, record geometry of the shrinking media
const heroGeo = [];
for (let k = 0; k <= 24; k++) {
  const g = await page.evaluate(() => {
    const m = [...document.querySelectorAll('.section-home-hero .media, .s-media-first .media')]
      .map((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { cls: e.className.toString().slice(0, 40), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), o: s.opacity, clip: s.clipPath.slice(0, 50) }; })
      .filter((r) => r.w > 0 && r.o !== '0');
    const hdr = document.querySelector('header'); const hs = getComputedStyle(hdr);
    return { y: Math.round(scrollY), media: m.slice(0, 4), header: { h: hs.height, bg: hs.backgroundColor, cls: hdr.className } };
  });
  heroGeo.push(g);
  if (k % 2 === 0) await page.screenshot({ path: path.join(out, `hero_${String(k).padStart(2, '0')}_${g.y}.jpg`), type: 'jpeg', quality: 70 });
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(450);
}
notes.heroGeo = heroGeo;

// 2. Carousel: scroll it into view, then click next and sample frames
const top = await page.evaluate(() => document.querySelector('.section-categories').getBoundingClientRect().top + scrollY);
await page.evaluate((t) => window.scrollTo(0, t), top);
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(out, 'carousel_rest.jpg'), type: 'jpeg', quality: 75 });
const navInfo = await page.evaluate(() => {
  const n = document.querySelector('.section-categories .s-swiper-nav-next, .section-categories .swiper-button-next');
  const r = n?.getBoundingClientRect();
  const wrap = document.querySelector('.section-categories .swiper-wrapper');
  return { next: r ? { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height } : null, wrapperTransition: wrap ? getComputedStyle(wrap).transitionDuration + ' ' + getComputedStyle(wrap).transitionTimingFunction : null };
});
notes.carouselNav = navInfo;
if (navInfo.next) {
  await page.mouse.move(navInfo.next.x, navInfo.next.y);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, 'carousel_hover_next.jpg'), type: 'jpeg', quality: 75 });
  await page.mouse.click(navInfo.next.x, navInfo.next.y);
  for (let f = 0; f < 14; f++) {
    await page.waitForTimeout(110);
    await page.screenshot({ path: path.join(out, `carousel_t${String(f * 110 + 110).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 60 });
  }
}
// 3. Oval media (section-play): geometry across scroll
const playTop = await page.evaluate(() => document.querySelector('.section-play').getBoundingClientRect().top + scrollY);
const playGeo = [];
for (let k = -6; k <= 6; k++) {
  await page.evaluate((t) => window.scrollTo(0, t), playTop + k * 120);
  await page.waitForTimeout(500);
  const g = await page.evaluate(() => {
    const s = document.querySelector('.section-play'); const box = s.querySelector('.s-media, .media-wrapper, .media')?.parentElement || s;
    const cands = [...s.querySelectorAll('*')].filter((e) => { const c = getComputedStyle(e); return c.borderRadius !== '0px' || c.clipPath !== 'none'; }).slice(0, 3)
      .map((e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return { cls: e.className.toString().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y), radius: c.borderRadius.slice(0, 40), clip: c.clipPath.slice(0, 60), tf: c.transform.slice(0, 50) }; });
    return { y: Math.round(scrollY), cands };
  });
  playGeo.push(g);
  if (k % 3 === 0) await page.screenshot({ path: path.join(out, `play_${k + 6}.jpg`), type: 'jpeg', quality: 60 });
}
notes.playGeo = playGeo;

// 4. Button hover state
const btn = page.locator('.section-trust .btn').first();
if (await btn.isVisible().catch(() => false)) {
  await btn.scrollIntoViewIfNeeded();
  const before = await btn.evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, c: getComputedStyle(e).color }));
  await btn.hover(); await page.waitForTimeout(700);
  const after = await btn.evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, c: getComputedStyle(e).color }));
  const bb = await btn.boundingBox();
  await page.screenshot({ path: path.join(out, 'btn_hover.png'), clip: { x: bb.x - 30, y: bb.y - 20, width: bb.width + 60, height: bb.height + 40 } });
  notes.btnHover = { before, after };
}
fs.writeFileSync(path.join(out, 'motion.json'), JSON.stringify(notes, null, 2));
await browser.close();
console.log('done');
