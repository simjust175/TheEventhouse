// Category carousel QA: autoplay, manual reset, pausing, reduced motion, layout stability and
// overlap/clipping across all four slides, parallax coexistence. Viewports 1440, 1920, 768, 390.
// Usage: node tools/verify-carousel.mjs [--only=1440]   (preview server on :4600)
// Output: qa/motion/carousel-results.json, slide screenshots in qa/compare/carousel/<w>-slide<n>.png
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const VPS = [[1440, 900], [1920, 1080], [768, 1024], [390, 844]];
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
mkdirSync('qa/compare/carousel', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const out = []; let pass = 0, fail = 0;
const check = (name, ok, info) => { out.push({ name, ok, info }); ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? '  — ' + JSON.stringify(info) : ''}`); };

async function open(W, H, opts = {}) {
  const mob = W < 800;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: mob, hasTouch: mob, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:4600/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  await p.evaluate(() => {
    window.__cz = [];
    new MutationObserver(() => window.__cz.push({ t: performance.now(), v: +document.querySelector('[data-current]').textContent })).observe(document.querySelector('[data-current]'), { childList: true, characterData: true, subtree: true });
  });
  return { p, ctx, errs };
}
const toCarousel = (p) => p.evaluate(() => { if (!TEH.lenis) TEH.lenis = { scrollTo: (y) => window.scrollTo(0, y) }; const s = document.querySelector('[data-carousel]'); const T = s.getBoundingClientRect().top + scrollY; for (let y = 0; y < T; y += 400) TEH.lenis.scrollTo(y, { immediate: true, force: true }); TEH.lenis.scrollTo(T, { immediate: true, force: true }); });
const changes = (p) => p.evaluate(() => window.__cz.slice());
const now = (p) => p.evaluate(() => performance.now());
const state = (p) => p.evaluate(() => {
  const s = document.querySelector('[data-carousel]'), i = +s.querySelector('[data-current]').textContent - 1;
  return { i, copy: [...s.querySelectorAll('[data-copy]')].findIndex((c) => c.classList.contains('is-active')), bar: [...s.querySelectorAll('[data-goto]')].findIndex((b) => b.getAttribute('aria-current') === 'true'), slide: [...s.querySelectorAll('[data-slide]')].findIndex((c) => c.classList.contains('is-active')), timing: s.classList.contains('is-timing'), running: TEH.carousel.running() };
});

for (const [W, H] of VPS) {
  if (only && String(W) !== only) continue;
  const tag = `${W}`;
  // ---------- autoplay through all four, timing, sync ----------
  {
    const { p, ctx, errs } = await open(W, H);
    await toCarousel(p);
    const t0 = await now(p);
    await p.waitForTimeout(18500);
    const ch = (await changes(p)).filter((c) => c.t > t0);
    const seq = ch.map((c) => c.v);
    const gaps = ch.slice(1).map((c, k) => Math.round(c.t - ch[k].t));
    check(`${tag} autoplay cycles through all four slides`, seq.slice(0, 4).join() === '2,3,4,1', { seq, firstAfterMs: ch[0] && Math.round(ch[0].t - t0) });
    check(`${tag} interval per slide ≈ 4s (3.85–4.3s; 2.9s hold + unchanged 1.1s transition)`, gaps.length >= 3 && gaps.every((g) => g >= 3850 && g <= 4300), gaps);
    const st = await state(p);
    check(`${tag} counter, indicator, copy and image in sync`, st.i === st.copy && st.i === st.bar && st.i === st.slide, st);
    // screenshots of each slide while paused (settled)
    await p.evaluate(() => TEH.carousel.pause());
    const geo = [];
    for (let k = 0; k < 4; k++) {
      await p.evaluate((k) => TEH.carousel.goTo(k), k); await p.waitForTimeout(2200);
      geo.push(await p.evaluate(() => {
        const s = document.querySelector('[data-carousel]'), sr = s.getBoundingClientRect(), i = +s.querySelector('[data-current]').textContent - 1;
        const R = (el) => { const r = el.getBoundingClientRect(); return { t: Math.round(r.top - sr.top), b: Math.round(r.bottom - sr.top), l: Math.round(r.left), r: Math.round(r.right) }; };
        const c = s.querySelectorAll('[data-copy]')[i], ar = s.querySelector('.carousel__arrows button');
        const arrows = ar && ar.offsetWidth ? [...s.querySelectorAll('.carousel__arrows button')].map(R) : [];
        return { i, title: R(s.querySelectorAll('[data-title]')[i]), tagline: R(c.querySelector('.carousel__tagline')), text: R(c.querySelector('.carousel__text')), ctas: R(c.querySelector('.carousel__ctas').firstElementChild), ctasEnd: R(c.querySelector('.carousel__ctas').lastElementChild), bars: R(s.querySelector('.carousel__bars')), arrows, vw: innerWidth, ovf: document.documentElement.scrollWidth > innerWidth };
      }));
      await p.screenshot({ path: `qa/compare/carousel/${W}-slide${k + 1}.png` });
    }
    const same = (k) => new Set(geo.map((g) => g[k].t)).size === 1;
    check(`${tag} title and tagline do not move between slides`, same('tagline') && new Set(geo.map((g) => g.title.b)).size === 1, geo.map((g) => [g.title.b, g.tagline.t]));
    check(`${tag} CTAs sit at the same height on every slide (no jumping)`, same('ctas'), geo.map((g) => g.ctas.t));
    check(`${tag} no overlap: text above CTAs, CTAs above indicators`, geo.every((g) => g.tagline.b <= g.text.t && g.text.b < g.ctas.t && g.ctasEnd.b < g.bars.t), geo.map((g) => [g.text.b, g.ctas.t, g.ctasEnd.b, g.bars.t]));
    check(`${tag} titles fully on screen and clear of the arrows`, geo.every((g) => g.title.l >= 0 && g.title.r <= g.vw && g.arrows.every((a) => a.r <= g.title.l || a.l >= g.title.r || a.b <= g.title.t || a.t >= g.title.b)), geo.map((g) => [g.title.l, g.title.r]));
    check(`${tag} title centred`, geo.every((g) => Math.abs((g.title.l + g.title.r) / 2 - g.vw / 2) <= 2), geo.map((g) => Math.round((g.title.l + g.title.r) / 2 - g.vw / 2)));
    check(`${tag} no horizontal overflow, no console errors`, geo.every((g) => !g.ovf) && errs.length === 0, errs);
    await ctx.close();
  }
  // ---------- manual selection resets timer; rapid clicks never stack timers ----------
  {
    const { p, ctx } = await open(W, H);
    await toCarousel(p);
    await p.waitForTimeout(1800); // most of the first 2.9s hold has elapsed
    const tClick = await now(p);
    await p.click('[data-goto="2"]');
    await p.waitForTimeout(5500);
    const ch = (await changes(p)).filter((c) => c.t >= tClick);
    const st = await state(p);
    check(`${tag} indicator click selects slide 3 immediately`, ch[0] && ch[0].v === 3 && ch[0].t - tClick < 300, ch.map((c) => [c.v, Math.round(c.t - tClick)]));
    check(`${tag} after a manual pick the slide gets a full hold (next auto ≥ 3.85s later)`, ch[1] && ch[1].v === 4 && ch[1].t - ch[0].t >= 3850, ch[1] && Math.round(ch[1].t - ch[0].t));
    // rapid: click next three times inside one transition
    const mob = W < 800;
    const sel = mob ? '.carousel__arrows [data-next]' : '[data-goto="0"]';
    const tR = await now(p);
    for (let k = 0; k < 3; k++) await p.click(sel, { force: true });
    await p.waitForTimeout(9500);
    const chR = (await changes(p)).filter((c) => c.t >= tR);
    const gapsR = chR.slice(1).map((c, k) => Math.round(c.t - chR[k].t));
    check(`${tag} rapid clicks: one change, then one timer (gaps ≥ 3.85s)`, chR.length >= 2 && gapsR.every((g) => g >= 3850), { seq: chR.map((c) => c.v), gapsR, sync: await state(p) });
    await ctx.close();
  }
  // ---------- pausing: off screen, hidden tab, pause button ----------
  {
    const { p, ctx } = await open(W, H);
    await toCarousel(p);
    await p.waitForTimeout(800);
    await p.evaluate(() => TEH.lenis.scrollTo(0, { immediate: true, force: true }));
    const t1 = await now(p); await p.waitForTimeout(6000);
    check(`${tag} pauses while the carousel is off screen`, (await changes(p)).filter((c) => c.t > t1).length === 0);
    await toCarousel(p);
    const t2 = await now(p); await p.waitForTimeout(5000);
    check(`${tag} resumes when scrolled back into view`, (await changes(p)).filter((c) => c.t > t2).length === 1);
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    const t3 = await now(p); await p.waitForTimeout(6000);
    check(`${tag} pauses while the tab is hidden`, (await changes(p)).filter((c) => c.t > t3).length === 0);
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await p.click('[data-cz-toggle]');
    const t4 = await now(p); await p.waitForTimeout(6000);
    const tg = await p.evaluate(() => { const b = document.querySelector('[data-cz-toggle]'); return [b.getAttribute('aria-pressed'), b.getAttribute('aria-label')]; });
    check(`${tag} pause button stops autoplay`, (await changes(p)).filter((c) => c.t > t4).length === 0 && tg[0] === 'true', tg);
    await p.click('[data-cz-toggle]');
    const t5 = await now(p); await p.waitForTimeout(5000);
    check(`${tag} play button resumes autoplay`, (await changes(p)).filter((c) => c.t > t5).length === 1);
    // parallax still running on the active slide
    const px = [];
    const T = await p.evaluate(() => document.querySelector('[data-carousel]').getBoundingClientRect().top + scrollY);
    for (const d of [-300, 0, 300]) { await p.evaluate((y) => TEH.lenis.scrollTo(y, { immediate: true, force: true }), T + d); await p.waitForTimeout(250); px.push(await p.evaluate(() => parseFloat(document.querySelector('[data-slide].is-active img').style.getPropertyValue('--px-y')))); }
    check(`${tag} scroll parallax still moves the active photo`, px[0] < px[1] && px[1] < px[2], px);
    await ctx.close();
  }
  // ---------- reduced motion ----------
  {
    const { p, ctx } = await open(W, H, { reduced: true });
    await toCarousel(p);
    const t0 = await now(p); await p.waitForTimeout(8000);
    const hidden = await p.evaluate(() => document.querySelector('[data-cz-toggle]').hidden);
    check(`${tag} reduced motion: no autoplay, no pause button`, (await changes(p)).filter((c) => c.t > t0).length === 0 && hidden);
    await p.click('[data-goto="1"]'); await p.waitForTimeout(300);
    check(`${tag} reduced motion: indicators still select slides`, (await state(p)).i === 1);
    await ctx.close();
  }
}
console.log(`\n${pass}/${pass + fail} passed`);
writeFileSync('qa/motion/carousel-results.json', JSON.stringify(out, null, 2));
await browser.close();
