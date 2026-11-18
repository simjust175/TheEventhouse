// Motion + shape verification for the homepage refinement pass.
// Usage: node tools/verify-motion.mjs [--only hero|parallax|carousel|oval|perf]
// Writes qa/motion/results.json and evidence crops in qa/motion/<viewport>/.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:4600/index.html';
const only = (() => { const i = process.argv.indexOf('--only'); return i > -1 ? process.argv[i + 1] : null; })();
const want = (k) => !only || only === k;
const VPS = {
  d1440: { width: 1440, height: 900 },
  d1920: { width: 1920, height: 1080 },
  t768: { width: 768, height: 1024, isMobile: true, hasTouch: true },
  m390: { width: 390, height: 844, isMobile: true, hasTouch: true },
};
const results = { checks: [], parallax: {}, oval: {}, hero: {}, perf: {} };
const check = (name, ok, detail = '') => { results.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); };
const browser = await chromium.launch({ executablePath: CHROME });

async function open(vpKey, init, opts = {}) {
  const vp = VPS[vpKey];
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const scrollTo = (page, y) => page.evaluate((y) => new Promise((res) => { if (window.TEH && TEH.lenis) TEH.lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 90))); }), y);

/* ---------------------------------------------------------------- HERO */
if (want('hero')) {
  const cfg = (items, extra = {}) => `window.TEH_CONFIG = { heroMedia: ${JSON.stringify(Object.assign({ breakpoint: 768, duration: 1600, fade: 700, items }, extra))} };`;
  const V1 = { type: 'video', src: { desktop: 'assets/video/hero-venue.mp4', mobile: 'assets/video/hero-venue-m.mp4' }, poster: 'assets/img/hero-venue.webp', alt: 'Barn' };
  const V2 = { type: 'video', src: { desktop: 'assets/video/aisle-florals.mp4', mobile: 'assets/video/aisle-florals-m.mp4' }, poster: 'assets/img/aisle-florals.webp', alt: 'Aisle' };
  const P1 = { type: 'image', src: 'assets/img/hero-table.webp', position: { desktop: '50% 55%', mobile: '20% 50%' }, alt: 'Table' };
  const P2 = { type: 'image', src: 'assets/img/pink-flowers.webp', alt: 'Flowers' };
  const P3 = { type: 'image', src: 'assets/img/aisle-florals.webp', alt: 'Aisle photo' };
  const state = (page) => page.evaluate(() => ({
    idx: TEH.heroMedia ? TEH.heroMedia.index() : -1,
    n: document.querySelectorAll('.hero__media').length,
    label: document.querySelector('[data-hero-media]').getAttribute('aria-label'),
    toggle: !document.querySelector('[data-hero-toggle]').hidden,
    layers: [...document.querySelectorAll('.hero__media')].map((l) => { const m = l.firstElementChild; return { tag: m.tagName, op: +getComputedStyle(l).opacity, active: l.classList.contains('is-active'), front: l.classList.contains('is-front'), src: (m.currentSrc || m.src || '').split('/').pop(), paused: m.tagName === 'VIDEO' ? m.paused : null, muted: m.muted, loop: m.loop, pi: m.playsInline, poster: m.poster ? m.poster.split('/').pop() : null, pos: m.style.objectPosition }; }),
  }));
  const heroShot = async (page, name) => { mkdirSync('qa/motion/hero', { recursive: true }); await page.screenshot({ path: `qa/motion/hero/${name}.png` }); };

  // 1 single photograph
  { const { ctx, page } = await open('d1440', cfg([P1])); const s0 = await state(page); await page.waitForTimeout(2600); const s1 = await state(page);
    check('hero: single photograph → 1 static layer, no toggle, no rotation', s0.n === 1 && s0.layers[0].tag === 'IMG' && !s0.toggle && s1.idx === 0 && s1.layers[0].op === 1, { n: s0.n, toggle: s0.toggle }); await heroShot(page, 'single-photo'); results.hero.singlePhoto = s1; await ctx.close(); }
  // 2 single video
  { const { ctx, page } = await open('d1440', cfg([V1])); await page.waitForTimeout(800); const s0 = await state(page); const v = s0.layers[0];
    check('hero: single video → muted, loop, playsinline, autoplaying, poster set', s0.n === 1 && v.tag === 'VIDEO' && v.muted && v.loop && v.pi && v.paused === false && v.poster === 'hero-venue.webp', v);
    await page.click('[data-hero-toggle]'); await page.waitForTimeout(300); const s1 = await state(page);
    await page.click('[data-hero-toggle]'); await page.waitForTimeout(500); const s2 = await state(page);
    check('hero: pause toggle pauses and resumes the video', s1.layers[0].paused === true && s2.layers[0].paused === false, { afterPause: s1.layers[0].paused, afterPlay: s2.layers[0].paused });
    await heroShot(page, 'single-video'); await ctx.close(); }
  // 3 multiple photographs
  { const { ctx, page } = await open('d1440', cfg([P1, P2, P3])); const seen = new Set(); let midFade = null;
    for (let t = 0; t < 26; t++) { const s = await state(page); seen.add(s.idx); const f = s.layers.find((l) => l.front); const under = s.layers.filter((l) => l.active && !l.front);
      if (!midFade && f && f.op > 0.05 && f.op < 0.95 && under.length) { midFade = { frontOpacity: f.op, underActiveOpacity: under[0].op }; await heroShot(page, 'photos-midfade'); }
      await page.waitForTimeout(250); }
    check('hero: multiple photographs rotate through every item', seen.size === 3, [...seen]);
    check('hero: crossfade layers over a fully opaque previous image (never blank)', midFade && midFade.underActiveOpacity === 1, midFade);
    await ctx.close(); }
  // 4 multiple videos
  { const { ctx, page } = await open('d1440', cfg([V1, V2], { duration: 2200 })); let s = null, hit = null;
    for (let t = 0; t < 30 && !hit; t++) { s = await state(page); const act = s.layers[s.idx]; if (s.idx === 1 && act.op > 0.99 && act.tag === 'VIDEO' && act.paused === false) hit = s; else await page.waitForTimeout(200); }
    check('hero: multiple videos → second clip fades in and plays', !!hit, { idx: s.idx, layers: s.layers.map((l) => [l.src, l.paused, l.active]) });
    await page.waitForTimeout(1200); const s2 = await state(page);
    check('hero: video that has faded out is paused (saves decode/battery)', s2.idx !== 0 ? s2.layers[0].paused === true : true, s2.layers.map((l) => [l.src, l.paused]));
    await heroShot(page, 'videos'); await ctx.close(); }
  // 5 mixed (production config)
  { const { ctx, page } = await open('d1440', null); const s0 = await state(page);
    check('hero: production config is a mixed video/photo sequence', s0.n === 4 && s0.layers.some((l) => l.tag === 'VIDEO') && s0.layers.some((l) => l.tag === 'IMG'), s0.layers.map((l) => l.tag));
    await page.waitForTimeout(8600); const s1 = await state(page);
    check('hero: mixed sequence advances from the video to the photo, label follows', s1.idx === 1 && /table/i.test(s1.label), { idx: s1.idx, label: s1.label });
    await heroShot(page, 'mixed-desktop'); await ctx.close(); }
  // 6 broken video → poster
  { const { ctx, page } = await open('d1440', cfg([{ type: 'video', src: 'assets/video/missing.mp4', poster: 'assets/img/hero-venue.webp', alt: 'x' }, P1])); await page.waitForTimeout(1500); const s = await state(page);
    check('hero: missing video file falls back to its poster image', s.layers[0].tag === 'IMG' && /hero-venue/.test(s.layers[0].src), s.layers[0]); await ctx.close(); }
  // 7 mobile sources + crops
  { const { ctx, page } = await open('m390', cfg([V1, P1])); await page.waitForTimeout(800); const s = await state(page);
    check('hero: mobile uses the portrait video encode and the mobile crop', s.layers[0].src === 'hero-venue-m.mp4' && s.layers[1].pos === '20% 50%', { video: s.layers[0].src, crop: s.layers[1].pos });
    await heroShot(page, 'mobile'); await ctx.close(); }
  // 8 reduced motion
  { const { ctx, page } = await open('d1440', null, { reduced: true }); await page.waitForTimeout(800); const s = await state(page);
    check('hero: reduced motion → first item only, poster still instead of video, no toggle', s.n === 1 && s.layers[0].tag === 'IMG' && !s.toggle, { n: s.n, tag: s.layers[0] && s.layers[0].tag }); await ctx.close(); }
}

/* ---------------------------------------------------------------- PARALLAX */
const SECTIONS = [
  ['carousel', '[data-carousel] .carousel__slide.is-active img'],
  ['teaser', '.pcard__media img'],
  ['trio-left', '.trio__item--l img'],
  ['trio-centre', '.trio__item--c img'],
  ['trio-right', '.trio__item--r img'],
  ['florals', '[data-oval-img]'],
  ['gallery-strip', '.sg__img img'],
  ['footer-band', '.footer__band img'],
];
const measure = (page, sel) => page.evaluate((sel) => {
  const m = document.querySelector(sel); if (!m || !m.offsetParent && getComputedStyle(m).position !== 'fixed' && m.getClientRects().length === 0) return null;
  const f = m.parentElement, r = m.getBoundingClientRect(), fr = f.getBoundingClientRect();
  return { y: Math.round(scrollY), dy: +(r.top - fr.top).toFixed(1), top: +(fr.top - r.top).toFixed(1), bottom: +(r.bottom - fr.bottom).toFixed(1), left: +(fr.left - r.left).toFixed(1), right: +(r.right - fr.right).toFixed(1), fTop: fr.top, fH: fr.height, fL: fr.left, fW: fr.width, vh: innerHeight };
}, sel);
if (want('parallax') || want('carousel')) {
  for (const vpKey of Object.keys(VPS)) {
    const { ctx, page } = await open(vpKey);
    const dir = `qa/motion/${vpKey}`; mkdirSync(dir, { recursive: true });
    // walk the whole page once so lazy images load and reveals have fired
    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < docH; y += 500) await scrollTo(page, y);
    await page.waitForTimeout(600);
    results.parallax[vpKey] = {};
    if (want('parallax')) for (const [name, sel] of SECTIONS) {
      const abs = await page.evaluate((sel) => { const m = document.querySelector(sel); if (!m || !m.getClientRects().length) return null; const fr = m.parentElement.getBoundingClientRect(); return { T: fr.top + scrollY, H: fr.height }; }, sel);
      if (!abs) { results.parallax[vpKey][name] = 'not displayed at this width'; continue; }
      const vh = VPS[vpKey].height; const samples = [];
      const maxY = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      for (const fr of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const y = Math.max(0, Math.round(abs.T - vh + fr * (vh + abs.H)));
        if (y > maxY && fr !== 0.1) continue; // the last section cannot scroll fully past the viewport
        await scrollTo(page, y); await page.waitForTimeout(140);
        const s = await measure(page, sel); if (!s) continue; samples.push(s);
        if ([0.1, 0.5, 0.9].includes(fr)) {
          const top = Math.max(0, s.fTop), bot = Math.min(s.vh, s.fTop + s.fH);
          if (bot - top > 40) await page.screenshot({ path: `${dir}/${name}_${String(fr).replace('.', '')}.png`, clip: { x: Math.max(0, s.fL), y: top, width: Math.min(VPS[vpKey].width, s.fW), height: bot - top } });
        }
      }
      const minGap = Math.min(...samples.flatMap((s) => [s.top, s.bottom, s.left, s.right]));
      const span = samples[samples.length - 1].y - samples[0].y || 1;
      const rate = +((samples[samples.length - 1].dy - samples[0].dy) / span).toFixed(3);
      results.parallax[vpKey][name] = { rate, minOverscanPx: +minGap.toFixed(1), dy: samples.map((s) => s.dy), y: samples.map((s) => s.y) };
      check(`parallax ${vpKey} ${name}: photo moves inside frame (rate ${rate}), no blank edge (min overscan ${minGap.toFixed(1)}px)`, rate > 0.015 && minGap >= -0.5, { dy: samples.map((s) => s.dy) });
    }
    // category switching + parallax coexist
    if (want('carousel')) {
      const abs = await page.evaluate(() => { const r = document.querySelector('[data-carousel]').getBoundingClientRect(); return { T: r.top + scrollY, H: r.height }; });
      await scrollTo(page, Math.round(abs.T - VPS[vpKey].height * 0.25)); await page.waitForTimeout(250);
      await page.evaluate(() => TEH.carousel && TEH.carousel.pause()); // autoplay off: this check isolates the click
      const busyAtPause = await page.evaluate(() => TEH.carousel && TEH.carousel.busy());
      await page.waitForFunction(() => !TEH.carousel || !TEH.carousel.busy(), null, { timeout: 3000 }); // let an in-flight automatic change finish
      if (busyAtPause) console.log('  (an automatic change was in flight at pause; waited for it)');
      const before = await measure(page, '[data-carousel] .carousel__slide.is-active img');
      // click where a visitor would (Playwright's element click scrolls the tall zone into view first)
      const nb = await page.locator('[data-carousel] [data-next]').locator('visible=true').first().boundingBox();
      const vh0 = VPS[vpKey].height;
      const cx = nb.x + nb.width / 2, cy = Math.min(Math.max(nb.y + nb.height / 2, nb.y + 10), Math.min(nb.y + nb.height - 10, vh0 - 20));
      const hitInfo = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return { el: e && e.tagName + '.' + e.className, cur: document.querySelector('[data-current]').textContent, sy: scrollY, ih: innerHeight }; }, [cx, cy]);
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(520);
      const mid = await page.evaluate(() => { const e = document.querySelector('.carousel__slide.is-entering img'); if (!e) return null; const r = e.getBoundingClientRect(), f = e.parentElement.getBoundingClientRect(); return { dy: +(r.top - f.top).toFixed(1), top: f.top - r.top, bottom: r.bottom - f.bottom }; });
      await page.screenshot({ path: `${dir}/carousel_switch_mid.png` });  // after measuring: a 1920px screenshot can outlast the 1.1s transition
      await page.waitForTimeout(1300);
      const after = await measure(page, '[data-carousel] .carousel__slide.is-active img');
      await scrollTo(page, Math.round(abs.T - VPS[vpKey].height * 0.25) + 300); await page.waitForTimeout(200);
      const moved = await measure(page, '[data-carousel] .carousel__slide.is-active img');
      const ok = mid && mid.top >= -0.5 && mid.bottom >= -0.5 && Math.abs(after.dy - before.dy) < 2 && moved.dy - after.dy > 10 && after.top >= -0.5 && after.bottom >= -0.5;
      check(`carousel ${vpKey}: new category keeps the same parallax offset and keeps moving with scroll`, ok, { hit: hitInfo, nb, beforeDy: before.dy, enteringDy: mid && mid.dy, afterDy: after.dy, after300pxDy: moved.dy });
      results.parallax[vpKey].carouselSwitch = { before, mid, after, moved };
    }
    // overflow / layout stability
    const ov = await page.evaluate(() => ({ innerW: innerWidth, clientW: document.documentElement.clientWidth, scrollW: document.documentElement.scrollWidth }));
    check(`layout ${vpKey}: no horizontal overflow`, ov.innerW === ov.clientW && ov.scrollW <= ov.clientW, ov);
    check(`console ${vpKey}: no errors`, page.errors.length === 0, page.errors.slice(0, 3));
    await ctx.close();
  }
}

/* ---------------------------------------------------------------- OVAL / CAPSULE / CIRCLE */
if (want('oval')) {
  const shape = (page) => page.evaluate(() => {
    const el = document.querySelector('[data-oval]'); const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    const rad = cs.borderTopLeftRadius; // "Npx" or "Npx Mpx" if elliptical
    const parts = rad.split(' ').map(parseFloat);
    const R = Math.min(parts[0], r.width / 2, r.height / 2);
    // is each piece of copy inside the rounded shape?
    const inside = (x, y) => { const cx = r.left + r.width / 2, cy = r.top + r.height / 2; const half = Math.max(0, r.width / 2 - R); const nx = Math.max(Math.abs(x - cx) - half, 0); const ny = Math.max(Math.abs(y - cy) - (r.height / 2 - R), 0); return Math.hypot(nx, ny) <= R + 0.5; };
    const kids = [...el.querySelectorAll('.oval__content > *')].filter((k) => k.getClientRects().length).map((k) => { const b = k.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(k); const t = range.getBoundingClientRect(); const box = k.tagName === 'A' ? b : t; return { tag: k.tagName, ok: [[box.left, box.top], [box.right, box.top], [box.left, box.bottom], [box.right, box.bottom]].every(([x, y]) => inside(x, y)), cx: (box.left + box.right) / 2 }; });
    const content = el.querySelector('.oval__content').getBoundingClientRect();
    return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), radius: rad, elliptical: parts.length > 1 && Math.abs(parts[0] - parts[1]) > 0.5, R: +R.toFixed(1), ratio: +(r.width / r.height).toFixed(3), straight: +(r.width - 2 * R).toFixed(1), kids, centred: Math.abs((content.left + content.right) / 2 - (r.left + r.width / 2)) < 2 && Math.abs((content.top + content.bottom) / 2 - (r.top + r.height / 2)) < 3 };
  });
  for (const vpKey of Object.keys(VPS)) {
    const { ctx, page } = await open(vpKey);
    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < docH * 0.6; y += 600) await scrollTo(page, y);
    // the frame is sticky inside [data-oval-stage]: measure the stage, never the (possibly stuck) frame
    const T = await page.evaluate(() => { const s = document.querySelector('[data-oval-stage]'), m = document.querySelector('[data-oval]'); const r = s.getBoundingClientRect(); return { T: r.top + scrollY, H: m.offsetHeight, hold: s.offsetHeight - m.offsetHeight, top: parseFloat(getComputedStyle(m).top) || 0 }; });
    const vh = VPS[vpKey].height; const frames = [];
    const dir = `qa/motion/${vpKey}`; mkdirSync(dir, { recursive: true });
    // enter: rectangle arriving · mid: the moment the frame settles centred · settled: end of the hold (morph complete)
    for (const [k, y] of [['enter', T.T - vh * 0.75], ['mid', T.T - T.top], ['settled', T.T - T.top + T.hold]]) {
      await scrollTo(page, Math.round(y)); await page.waitForTimeout(500);
      const s = await shape(page); frames.push([k, s]);
      await page.screenshot({ path: `${dir}/shape_${k}.png` });
    }
    const fin = frames[2][1];
    const circle = VPS[vpKey].width < 800;
    results.oval[vpKey] = Object.fromEntries(frames);
    if (circle) check(`shape ${vpKey}: true circle (w=h, radius = w/2, not elliptical)`, Math.abs(fin.w - fin.h) <= 1 && Math.abs(fin.R - fin.w / 2) <= 1 && !fin.elliptical, { w: fin.w, h: fin.h, radius: fin.radius });
    else check(`shape ${vpKey}: capsule (single radius = h/2, straight top/bottom ${fin.straight}px, ratio ${fin.ratio})`, Math.abs(fin.R - fin.h / 2) <= 1 && !fin.elliptical && fin.ratio >= 1.4 && fin.straight > fin.h * 0.4, { w: fin.w, h: fin.h, radius: fin.radius });
    check(`shape ${vpKey}: text and CTA centred and inside the shape`, fin.centred && fin.kids.every((k) => k.ok), fin.kids.map((k) => k.tag + (k.ok ? '' : ' OUTSIDE')));
    check(`shape ${vpKey}: grows from soft rectangle (radius increases while entering)`, parseFloat(frames[0][1].radius) < parseFloat(fin.radius), frames.map(([k, s]) => k + ':' + s.radius));
    if (vpKey === 'd1440') {
      // live resize across the breakpoint and back
      await page.setViewportSize({ width: 700, height: 900 }); await page.waitForTimeout(900);
      await scrollTo(page, await page.evaluate(() => { const s = document.querySelector('[data-oval-stage]'), m = document.querySelector('[data-oval]'); return Math.round(s.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(m).top) || 0) + s.offsetHeight - m.offsetHeight); })); await page.waitForTimeout(500);
      const a = await shape(page);
      await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(900);
      await scrollTo(page, await page.evaluate(() => { const s = document.querySelector('[data-oval-stage]'), m = document.querySelector('[data-oval]'); return Math.round(s.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(m).top) || 0) + s.offsetHeight - m.offsetHeight); })); await page.waitForTimeout(500);
      const b = await shape(page);
      check('shape: live resize 1440→700→1440 switches capsule→circle→capsule cleanly', Math.abs(a.w - a.h) <= 1 && Math.abs(a.R - a.w / 2) <= 1 && Math.abs(b.R - b.h / 2) <= 1 && b.ratio > 1.4 && a.kids.every((k) => k.ok) && b.kids.every((k) => k.ok), { at700: [a.w, a.h, a.radius], back1440: [b.w, b.h, b.radius] });
    }
    await ctx.close();
  }
}

/* ---------------------------------------------------------------- PERF + STABILITY (mobile, 4× CPU throttle) */
if (want('perf')) {
  for (const vpKey of ['m390', 'd1440']) {
    const { ctx, page } = await open(vpKey);
    const cdp = await ctx.newCDPSession(page);
    if (vpKey === 'm390') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    // Layout shifts are summed EXCEPT the pinned hero frame, whose box is deliberately resized
    // (full-bleed → portrait → square, as measured on the reference); everything else must stay still.
    await page.evaluate(() => { window.__cls = 0; window.__heroResize = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; const hero = e.sources.length && e.sources.every((s) => s.node && s.node.nodeType === 1 && s.node.matches('.hero__frame, .hero__frame *')); if (hero) window.__heroResize += e.value; else window.__cls += e.value; } }).observe({ type: 'layout-shift', buffered: false }); window.__frames = []; let last = performance.now(); const tick = (t) => { window.__frames.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    const h0 = await page.evaluate(() => document.documentElement.scrollHeight);
    if (vpKey === 'm390') {
      // real touch swipes (CDP's synthesizeScrollGesture does not scroll in this headless build, even on a blank page)
      for (let i = 0; i < 40; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 720 }] });
        for (let k = 1; k <= 12; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 720 - k * 45 }] }); await page.waitForTimeout(16); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(220);
        if (await page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 4)) break;
      }
      await page.waitForTimeout(800);
    } else {
      for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, 180); await page.waitForTimeout(40); }
      await page.waitForTimeout(800);
    }
    const r = await page.evaluate(() => { const f = window.__frames.slice(5); const avg = f.reduce((a, b) => a + b, 0) / f.length; return { frames: f.length, avgMs: +avg.toFixed(1), fps: +(1000 / avg).toFixed(0), over50ms: f.filter((x) => x > 50).length, p95: +f.sort((a, b) => a - b)[Math.floor(f.length * 0.95)].toFixed(1), cls: +window.__cls.toFixed(4), heroResizeShift: +window.__heroResize.toFixed(3), y: Math.round(scrollY), maxY: document.documentElement.scrollHeight - innerHeight }; });
    const h1 = await page.evaluate(() => document.documentElement.scrollHeight);
    r.docHBefore = h0; r.docHAfter = h1;
    results.perf[vpKey] = r;
    check(`perf ${vpKey}${vpKey === "m390" ? " (4× CPU throttle, real touch swipes)" : ""}: scrolled to ${r.y}/${r.maxY}, ${r.fps} fps avg, p95 ${r.p95}ms, unexpected layout shift ${r.cls}`, r.y > r.maxY * 0.9 && r.cls < 0.1 && r.p95 < (vpKey === 'm390' ? 60 : 34) && Math.abs(h1 - h0) < 4, r);
    await ctx.close();
  }
}

mkdirSync('qa/motion', { recursive: true });
writeFileSync('qa/motion/results' + (only ? '-' + only : '') + '.json', JSON.stringify(results, null, 1));
const failed = results.checks.filter((c) => !c.ok);
console.log(`\n${results.checks.length - failed.length}/${results.checks.length} passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
