// Frame-locked parallax evidence: scrolls in 40px steps and crops the SAME rows of each frame,
// so in the resulting GIF the frame stands still and only the photo inside it moves.
// Usage: node tools/parallax-gif.mjs [width=1440]   → qa/motion/gif/<width>-<section>.png frames (+ GIF via python)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const W = parseInt(process.argv[2] || '1440', 10), H = W < 600 ? 844 : 900, mob = W < 800;
const SECTIONS = [['carousel', '[data-carousel] .carousel__slide.is-active img'], ['trio-centre', '.trio__item--c img'], ['florals', '[data-oval-img]'], ['teaser', '.pcard__media img'], ['strip', '.sg__img img']];
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: mob, hasTouch: mob });
const p = await ctx.newPage();
await p.goto('http://localhost:4600/index.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
const st = (y) => p.evaluate((y) => new Promise((r) => { TEH.lenis.scrollTo(y, { immediate: true, force: true }); requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120))); }), y);
const docH = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < docH; y += 500) await st(y);
mkdirSync('qa/motion/gif', { recursive: true });
const STEP = 40, N = 9;
for (const [name, sel] of SECTIONS) {
  const a = await p.evaluate((s) => { const m = document.querySelector(s); if (!m || !m.getClientRects().length) return null; const f = m.parentElement.getBoundingClientRect(); return { T: f.top + scrollY, L: f.left, W: f.width, H: f.height }; }, sel);
  if (!a) continue;
  const t0 = (H - a.H) / 2 + (STEP * (N - 1)) / 2; // frame centred mid-sequence
  const tops = [...Array(N)].map((_, k) => t0 - k * STEP);
  const r0 = Math.max(...tops.map((t) => Math.max(0, -t))), r1 = Math.min(...tops.map((t) => Math.min(a.H, H - t)));
  for (let k = 0; k < N; k++) {
    await st(Math.round(a.T - tops[k]));
    const top = await p.evaluate((s) => document.querySelector(s).parentElement.getBoundingClientRect().top, sel);
    await p.screenshot({ path: `qa/motion/gif/${W}-${name}-${k}.png`, clip: { x: Math.max(0, a.L), y: top + r0, width: Math.min(a.W, W - Math.max(0, a.L)), height: r1 - r0 } });
  }
  console.log(name, 'rows', Math.round(r0), '-', Math.round(r1));
}
await b.close();
