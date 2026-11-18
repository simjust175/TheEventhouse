// Final refinement QA: (A) the rounded feature's scroll-linked rectangle → capsule / circle morph,
// (B) footer image-band parallax, (C) hover-to-navigate on the category carousel's NEXT / PREV zones,
// (D) reduced motion. Viewports: 1920, 1440, 768, 390 and two short heights.
// Usage: node tools/verify-refine.mjs [--only=oval|footer|hover|reduced]   (preview server on :4600)
// Output: qa/motion/refine-results.json, morph frames in qa/motion/oval/, footer frames in qa/motion/footer/
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const want = (k) => !only || only === k;
const VPS = [[1920, 1080], [1440, 900], [768, 1024], [390, 844], [1440, 700], [390, 640]];
mkdirSync('qa/motion/oval', { recursive: true }); mkdirSync('qa/motion/footer', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const out = { checks: [], oval: {}, footer: {}, hover: {} }; let pass = 0, fail = 0;
const check = (name, ok, info) => { out.checks.push({ name, ok, info }); ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? '  — ' + JSON.stringify(info) : ''}`); };

async function open(W, H, opts = {}) {
  const mob = W < 800;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: mob, hasTouch: mob, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:4600/index.html', { waitUntil: 'load' }); await p.waitForTimeout(900);
  await p.evaluate(() => { if (!TEH.lenis) TEH.lenis = { scrollTo: (y) => window.scrollTo(0, y) }; });
  return { p, ctx, errs };
}
const scrollTo = (p, y) => p.evaluate((y) => new Promise((res) => { TEH.lenis.scrollTo(y, { immediate: true, force: true }); requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 40))); }), y);
const walk = async (p, to) => { for (let y = 0; y < to; y += 500) await scrollTo(p, y); };

/* ------------------------------------------------------------ A. ROUNDED FEATURE MORPH */
if (want('oval')) for (const [W, H] of VPS) {
  const tag = `${W}x${H}`;
  const { p, ctx, errs } = await open(W, H);
  const geo0 = await p.evaluate(() => { const s = document.querySelector('[data-oval-stage]'); return { S: s.getBoundingClientRect().top + scrollY, stageH: s.offsetHeight, docH: document.documentElement.scrollHeight }; });
  await walk(p, geo0.S - H);
  const g = await p.evaluate(() => { const s = document.querySelector('[data-oval-stage]'), m = document.querySelector('[data-oval]'); return { S: s.getBoundingClientRect().top + scrollY, h: m.offsetHeight, w: m.offsetWidth, hold: s.offsetHeight - m.offsetHeight, top: parseFloat(getComputedStyle(m).top), docH: document.documentElement.scrollHeight }; });
  const samples = [];
  for (let y = Math.round(g.S - H); y <= g.S + g.hold + 40; y += 12) {
    await scrollTo(p, y);
    samples.push(await p.evaluate(() => {
      const m = document.querySelector('[data-oval]'), r = m.getBoundingClientRect(), img = m.querySelector('img').getBoundingClientRect();
      const vis = Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) / r.height;
      return { y: Math.round(scrollY), p: +m.getAttribute('data-oval-p'), R: parseFloat(getComputedStyle(m).borderTopLeftRadius), top: +r.top.toFixed(1), vis: +vis.toFixed(3), cover: img.top <= r.top + 0.5 && img.bottom >= r.bottom - 0.5 && img.left <= r.left + 0.5 && img.right >= r.right - 0.5, docH: document.documentElement.scrollHeight };
    }));
  }
  const end = Math.min(g.w, g.h) / 2;
  const first = samples.find((s) => s.p > 0.005), mid = samples.reduce((a, s) => (Math.abs(s.p - 0.5) < Math.abs(a.p - 0.5) ? s : a)), done = samples.find((s) => s.p >= 0.999);
  const yStart = (samples.filter((s) => s.p <= 0.0001).pop() || samples[0]).y;
  const dist = done ? done.y - yStart : 0;
  let mono = true, maxStepR = 0, maxStepTop = 0;
  for (let k = 1; k < samples.length; k++) {
    const a = samples[k - 1], b = samples[k], dy = b.y - a.y || 1;
    if (b.R < a.R - 0.5) mono = false;
    maxStepR = Math.max(maxStepR, (b.R - a.R) / dy); maxStepTop = Math.max(maxStepTop, Math.abs((b.top - a.top) / dy));
  }
  out.oval[tag] = { w: g.w, h: g.h, hold: g.hold, endRadius: end, morphDistancePx: dist, morphDistanceVh: +(dist / H).toFixed(2), visibleAtStart: first && first.vis, visibleAtMid: mid.vis, radiusAtMid: mid.R, maxRadiusPxPerScrollPx: +maxStepR.toFixed(3), maxTopPxPerScrollPx: +maxStepTop.toFixed(3) };
  check(`oval ${tag}: morph starts only once the rectangle is ≥80% on screen`, first && first.vis >= 0.8, { vis: first && first.vis, R: first && first.R });
  check(`oval ${tag}: halfway state seen with the whole shape on screen (p≈0.5, radius between start and end)`, mid.vis >= 0.99 && Math.abs(mid.p - 0.5) < 0.06 && mid.R > end * 0.35 && mid.R < end * 0.75, { p: mid.p, R: mid.R, end, vis: mid.vis });
  check(`oval ${tag}: completes to the final shape (radius = ${end}px) while fully visible`, done && Math.abs(done.R - end) <= 1 && done.vis >= 0.99, done && { R: done.R, vis: done.vis });
  check(`oval ${tag}: slow, scroll-linked (${dist}px = ${(dist / H).toFixed(2)} viewport heights)`, dist >= 0.75 * H, { dist });
  check(`oval ${tag}: smooth, never reverses or jumps (radius ≤ ${maxStepR.toFixed(2)}px and position ≤ ${maxStepTop.toFixed(2)}px per px scrolled)`, mono && maxStepR < 1.2 && maxStepTop <= 1.05, { mono });
  check(`oval ${tag}: photo always fills the frame, page height stable`, samples.every((s) => s.cover) && new Set(samples.map((s) => s.docH)).size === 1, { uncovered: samples.filter((s) => !s.cover).length });
  // frames: start (whole rectangle in view, before rounding), halfway, finished
  const startFrame = samples.filter((s) => s.vis >= 0.999 && s.p < 0.2).sort((a, b) => a.p - b.p)[0] || samples.find((s) => s.vis >= 0.999);
  for (const [k, s] of [['1-start', startFrame], ['2-halfway', mid], ['3-final', done]]) {
    if (!s) continue;
    await scrollTo(p, s.y); await p.waitForTimeout(450);
    const st = await p.evaluate(() => { const m = document.querySelector('[data-oval]'); return { p: +m.getAttribute('data-oval-p'), R: getComputedStyle(m).borderTopLeftRadius }; });
    await p.screenshot({ path: `qa/motion/oval/${tag}-${k}.png` });
    out.oval[tag][k] = st;
  }
  check(`oval ${tag}: no console errors`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

/* ------------------------------------------------------------ B. FOOTER BAND PARALLAX */
if (want('footer')) for (const [W, H] of VPS) {
  const tag = `${W}x${H}`;
  const { p, ctx, errs } = await open(W, H);
  const maxY = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await walk(p, maxY);
  const T = await p.evaluate(() => { const b = document.querySelector('.footer__band'); return b.getBoundingClientRect().top + scrollY; });
  const s = [];
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const y = Math.round(Math.max(T - H, 0) + f * (maxY - Math.max(T - H, 0)));
    await scrollTo(p, y); await p.waitForTimeout(120);
    s.push(await p.evaluate(() => { const b = document.querySelector('.footer__band'), i = b.querySelector('img'), btn = b.querySelector('.btn'); const br = b.getBoundingClientRect(), ir = i.getBoundingClientRect(), cr = btn.getBoundingClientRect(); return { y: Math.round(scrollY), frameTop: +br.top.toFixed(1), imgOff: +(ir.top - br.top).toFixed(1), gapTop: +(br.top - ir.top).toFixed(1), gapBot: +(ir.bottom - br.bottom).toFixed(1), btnOff: +((cr.top + cr.bottom) / 2 - (br.top + br.bottom) / 2).toFixed(1), vis: Math.max(0, Math.min(innerHeight, br.bottom) - Math.max(0, br.top)) }; }));
    if (f === 0.5 || f === 1 || f === 0.25) { const L = s[s.length - 1]; const top = Math.max(0, L.frameTop); await p.screenshot({ path: `qa/motion/footer/${tag}-${String(f).replace('.', '')}.png`, clip: { x: 0, y: top, width: W, height: Math.min(H - top, L.vis) } }); }
  }
  const moved = s[s.length - 1].imgOff - s[0].imgOff, span = s[s.length - 1].y - s[0].y;
  out.footer[tag] = { samples: s, movedPx: +moved.toFixed(1), scrollPx: span, rate: +(moved / span).toFixed(3) };
  check(`footer ${tag}: photo moves inside its frame across the whole range (${moved.toFixed(0)}px over ${span}px, rate ${(moved / span).toFixed(2)})`, moved > 0.12 * span && s.every((x, k) => k === 0 || x.imgOff > s[k - 1].imgOff), s.map((x) => x.imgOff));
  check(`footer ${tag}: no blank edge at any position (min overscan ${Math.min(...s.flatMap((x) => [x.gapTop, x.gapBot]))}px)`, s.every((x) => x.gapTop >= -0.5 && x.gapBot >= -0.5));
  check(`footer ${tag}: button stays centred in the band`, s.every((x) => Math.abs(x.btnOff) < 2), s.map((x) => x.btnOff));
  check(`footer ${tag}: no console errors`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

/* ------------------------------------------------------------ C. HOVER NAVIGATION */
if (want('hover')) for (const [W, H] of [[1440, 900], [1920, 1080], [390, 844]]) {
  const tag = `${W}x${H}`, mob = W < 800;
  const { p, ctx, errs } = await open(W, H);
  await p.evaluate(() => { window.__cz = []; new MutationObserver(() => window.__cz.push({ t: performance.now(), v: +document.querySelector('[data-current]').textContent })).observe(document.querySelector('[data-current]'), { childList: true, characterData: true, subtree: true }); });
  const T = await p.evaluate(() => document.querySelector('[data-carousel]').getBoundingClientRect().top + scrollY);
  await walk(p, T); await scrollTo(p, T); await p.waitForTimeout(300);
  const now = () => p.evaluate(() => performance.now());
  const since = async (t) => (await p.evaluate(() => window.__cz.slice())).filter((c) => c.t > t);
  if (mob) {
    const d = await p.evaluate(() => ({ hoverNone: !matchMedia('(hover: hover) and (pointer: fine)').matches, zones: getComputedStyle(document.querySelector('.carousel__zone')).display }));
    await p.evaluate(() => TEH.carousel.pause());
    const t0 = await now(); await p.tap('.carousel__arrows [data-next]'); await p.waitForTimeout(400);
    const ch = await since(t0);
    check(`hover ${tag}: touch keeps tap navigation, no hover behaviour (zones ${d.zones})`, d.hoverNone && d.zones === 'none' && ch.length === 1 && !(await p.evaluate(() => TEH.carousel.dwelling())), { ch: ch.map((c) => c.v) });
    await ctx.close(); continue;
  }
  const nextPt = { x: Math.round(W * 0.9), y: Math.round(H * 0.42) }, prevPt = { x: Math.round(W * 0.08), y: Math.round(H * 0.42) }, away = { x: Math.round(W / 2), y: Math.round(H * 0.1) };
  await p.mouse.move(away.x, away.y);
  await p.evaluate(() => TEH.carousel.pause()); // isolate hover from autoplay for the timing checks…
  await p.waitForFunction(() => !TEH.carousel.busy());
  await p.evaluate(() => TEH.carousel.play());  // …then resume so the "hover holds autoplay" part is real
  // 1. sustained hover on NEXT → advance after ~2s, then every ~2s
  const i0 = await p.evaluate(() => TEH.carousel.index());
  let t0 = await now(); await p.mouse.move(nextPt.x, nextPt.y, { steps: 4 });
  const ringOn = await p.evaluate(() => document.querySelector('[data-cursor]').classList.contains('is-dwell'));
  await p.waitForTimeout(6600);
  let ch = await since(t0);
  const at = ch.map((c) => Math.round(c.t - t0)), gaps = at.slice(1).map((v, k) => v - at[k]);
  out.hover[tag] = { nextSeq: ch.map((c) => c.v), nextAtMs: at };
  check(`hover ${tag}: resting on NEXT advances after ~2s (${at[0]}ms), cursor ring shows the wait`, ringOn && ch.length >= 1 && at[0] >= 1850 && at[0] <= 2400 && ch[0].v === ((i0 + 1) % 4) + 1, at);
  check(`hover ${tag}: keeps advancing every ~2s while the pointer stays (no autoplay in between, no doubles)`, ch.length === 3 && gaps.every((g) => g >= 1850 && g <= 2300) && ch.every((c, k) => c.v === ((i0 + 1 + k) % 4) + 1), { seq: ch.map((c) => c.v), gaps });
  // 2. moving away cancels at once (no step at 2s); autoplay resumes with its full hold
  await p.mouse.move(away.x, away.y); await p.waitForFunction(() => !TEH.carousel.busy());
  await p.mouse.move(nextPt.x, nextPt.y, { steps: 3 }); await p.waitForTimeout(1500);
  t0 = await now(); await p.mouse.move(away.x, away.y, { steps: 2 });
  const ringOff = await p.evaluate(() => !document.querySelector('[data-cursor]').classList.contains('is-dwell') && !TEH.carousel.dwelling());
  await p.waitForTimeout(4600);
  ch = await since(t0);
  check(`hover ${tag}: leaving before 2s cancels the pending step; autoplay then resumes after its full 2.9s hold`, ringOff && ch.length === 1 && ch[0].t - t0 >= 2800, ch.map((c) => Math.round(c.t - t0)));
  // 3. PREVIOUS
  await p.waitForFunction(() => !TEH.carousel.busy());
  const i1 = await p.evaluate(() => TEH.carousel.index());
  t0 = await now(); await p.mouse.move(prevPt.x, prevPt.y, { steps: 4 }); await p.waitForTimeout(2500);
  ch = await since(t0);
  check(`hover ${tag}: resting on PREV goes back one after ~2s`, ch.length === 1 && ch[0].v === ((i1 + 3) % 4) + 1 && ch[0].t - t0 >= 1850, ch.map((c) => [c.v, Math.round(c.t - t0)]));
  // 4. a click is instant and resets the wait (no surprise second step)
  await p.waitForTimeout(800); // 1.3s into the next 2s wait
  const tc = await now(); await p.mouse.down(); await p.mouse.up();
  await p.waitForTimeout(3400);
  ch = await since(tc);
  const ct = ch.map((c) => Math.round(c.t - tc));
  check(`hover ${tag}: click acts instantly and restarts the 2s wait (next hover step ~2s after the click, not 0.7s)`, ch.length === 2 && ct[0] < 150 && ct[1] >= 1900 && ct[1] <= 2400, ct);
  // 5. rapid clicks while hovering: one step, never stacked timers
  await p.waitForFunction(() => !TEH.carousel.busy());
  const tr = await now();
  for (let k = 0; k < 3; k++) { await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(90); }
  await p.waitForTimeout(4700);
  ch = await since(tr);
  const rt = ch.map((c) => Math.round(c.t - tr)), rg = rt.slice(1).map((v, k) => v - rt[k]);
  check(`hover ${tag}: rapid clicks → one change, then hover steps resume ~2s apart (no overlapping transitions)`, ch.length >= 2 && ch.length <= 3 && rt[0] < 150 && rg.every((g) => g >= 1850), { rt, rg });
  await p.mouse.move(away.x, away.y);
  check(`hover ${tag}: no console errors`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

/* ------------------------------------------------------------ D. REDUCED MOTION */
if (want('reduced')) for (const [W, H] of [[1440, 900], [390, 844]]) {
  const tag = `${W}x${H}`;
  const { p, ctx, errs } = await open(W, H, { reduced: true });
  const r = await p.evaluate(() => { const m = document.querySelector('[data-oval]'), s = document.querySelector('[data-oval-stage]'); const fb = document.querySelector('.footer__band img'); return { morph: document.querySelector('.oval').classList.contains('oval--morph'), extra: s.offsetHeight - m.offsetHeight, R: ((v) => v.endsWith('%') ? parseFloat(v) / 100 * Math.min(m.offsetWidth, m.offsetHeight) : parseFloat(v))(getComputedStyle(m).borderTopLeftRadius), w: m.offsetWidth, h: m.offsetHeight, footerPx: fb.classList.contains('px-media') }; });
  check(`reduced ${tag}: no morph hold, final shape shown directly, no footer parallax`, !r.morph && r.extra === 0 && Math.abs(Math.min(r.R, r.h / 2, r.w / 2) - Math.min(r.w, r.h) / 2) <= 1 && !r.footerPx, r);
  check(`reduced ${tag}: no console errors`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

console.log(`\n${pass}/${pass + fail} passed`);
writeFileSync('qa/motion/refine-results.json', JSON.stringify(out, null, 2));
await browser.close();
