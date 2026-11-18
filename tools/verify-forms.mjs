// Enquiry controls QA: the bespoke Occasion / Date / Guests pickers (assets/js/picker.js) on the homepage
// enquiry bar and the enquiry page. Covers selection, keyboard, dismissal, calendar rules (past dates, month
// boundaries, leap years, local dates across time zones), the GET hand-off and prefill, phone sheets,
// reduced motion, the no-JS fallback, clipping, overflow and the hero animation.
// Usage: node tools/verify-forms.mjs [--only=home|flow|tz|enquiry|mobile|misc]   (preview server on :4600)
// Output: qa/forms/results.json and screenshots in qa/forms/.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:4600/';
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const want = (k) => !only || only === k;
mkdirSync('qa/forms/after', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const out = { checks: [] }; let pass = 0, fail = 0;
const check = (name, ok, info) => { out.checks.push({ name, ok: !!ok, info }); ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? '  — ' + JSON.stringify(info) : ''}`); };
const wait = (p, ms) => p.waitForTimeout(ms);
const BEFORE = { 1920: 856.7, 1440: 644.9, 1280: 575.8 }; // closed bar widths measured on the native controls

async function open(path, W, H, o = {}) {
  const mob = W < 800;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: mob, hasTouch: mob, deviceScaleFactor: o.dsf || 1, reducedMotion: o.reduced ? 'reduce' : 'no-preference', timezoneId: o.tz, javaScriptEnabled: o.js !== false });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  if (o.clock) await p.clock.setFixedTime(o.clock);
  await p.goto(BASE + path, { waitUntil: 'load' }); await wait(p, o.js === false ? 300 : 1000);
  return { p, ctx, errs };
}
// the open panel: geometry, whether it is inside the viewport, and whether anything covers it (clipping / z-index)
const panel = (p) => p.evaluate(() => {
  const el = document.querySelector('.pick-pop.is-open'); if (!el) return null;
  const r = el.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = innerHeight;
  const pts = [[.5, .5], [.15, .15], [.85, .15], [.15, .85], [.85, .85]];
  const covered = pts.filter(([a, b]) => { const t = document.elementFromPoint(r.left + r.width * a, r.top + r.height * b); return !t || !el.contains(t); }).length;
  return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, vw, vh, inView: r.left >= -0.5 && r.top >= -0.5 && r.right <= vw + 0.5 && r.bottom <= vh + 0.5, covered, sheet: el.classList.contains('is-sheet'), side: el.getAttribute('data-side'), id: el.id, openCount: document.querySelectorAll('.pick-pop.is-open').length };
});
const state = (p, scope) => p.evaluate((scope) => {
  const root = document.querySelector(scope);
  return [...root.querySelectorAll('.pick')].map((t) => {
    const n = t.parentNode.querySelector('[data-picked]');
    return { text: t.querySelector('.pick__text').textContent, value: n.value, exp: t.getAttribute('aria-expanded') };
  });
}, scope);
// smooth scrolling (Lenis) owns the scroll position: jump through it, not window.scrollTo
const jump = (p, fn) => p.evaluate((src) => new Promise((r) => { const y = Math.max(0, Math.round(new Function('return ' + src)()())); if (window.TEH && TEH.lenis) TEH.lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 80))); }), fn.toString());
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const focusInfo = (p) => p.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, cls: a.className && a.className.baseVal === undefined ? a.className : '', role: a.getAttribute('role'), d: a.getAttribute('data-d'), id: a.id }; });
const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const barClip = async (p, extraTop = 40) => {
  const v = p.viewportSize();
  const r = await p.evaluate(() => { const b = document.querySelector('[data-hero-bar]').getBoundingClientRect(); const o = document.querySelector('.pick-pop.is-open'); const pr = o && o.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, top: pr ? Math.min(pr.top, b.y) : b.y }; });
  const y = Math.max(0, r.top - extraTop);
  return { x: 0, y, width: v.width, height: Math.min(v.height - y, r.y + r.h + 40 - y) };
};
// choose a date through the UI: month/year view → month → day
async function pickDate(p, scope, isoDate) {
  const [y, m] = isoDate.split('-').map(Number);
  await p.locator(`${scope} .pick--date`).click(); await wait(p, 300);
  await p.locator('.pick-pop.is-open [data-cal-mode]').click(); await wait(p, 120);
  for (let i = 0; i < 6; i++) {
    const yr = Number(await p.locator('.pick-pop.is-open .cal__year').textContent());
    if (yr === y) break;
    await p.locator(`.pick-pop.is-open [data-cal-step="${yr < y ? 1 : -1}"]`).click(); await wait(p, 60);
  }
  await p.locator(`.pick-pop.is-open [data-m="${m - 1}"]`).click(); await wait(p, 120);
  await p.locator(`.pick-pop.is-open [data-d="${isoDate}"]`).click(); await wait(p, 300);
}

/* ------------------------------------------------------------ 1. HOMEPAGE BAR (desktop) */
if (want('home')) for (const [W, H] of [[1920, 1080], [1440, 900], [1280, 720]]) {
  const tag = `${W}x${H}`, big = W === 1440;
  const { p, ctx, errs } = await open('index.html', W, H, { dsf: big ? 2 : 1 });
  const url0 = p.url();
  const st = await p.evaluate(() => {
    const bar = document.querySelector('[data-hero-bar]'), r = bar.getBoundingClientRect();
    return { w: r.width, natives: [...bar.querySelectorAll('select,input[type=date]')].every((n) => n.hidden && getComputedStyle(n).display === 'none' && n.getAttribute('aria-hidden') === 'true'),
      trig: [...bar.querySelectorAll('.pick')].map((t) => ({ type: t.type, exp: t.getAttribute('aria-expanded'), pop: t.getAttribute('aria-haspopup'), ctl: !!document.getElementById(t.getAttribute('aria-controls')) })),
      layerOnBody: document.querySelector('.pick-layer').parentNode === document.body, z: getComputedStyle(document.querySelector('.pick-layer')).zIndex };
  });
  check(`${tag} home: three button triggers replace the hidden native controls`, st.trig.length === 3 && st.natives && st.trig.every((t) => t.type === 'button' && t.exp === 'false' && t.ctl), st.trig.map((t) => t.pop));
  check(`${tag} home: panels render in a body-level layer (z ${st.z}, above header 40, below menu 60)`, st.layerOnBody && +st.z > 40 && +st.z < 60);
  check(`${tag} home: closed bar width unchanged vs native (±1.5%)`, Math.abs(st.w - BEFORE[W]) / BEFORE[W] < 0.015, { before: BEFORE[W], after: Math.round(st.w * 10) / 10 });
  const names = await Promise.all(['Occasion Wedding', 'Date not chosen', 'Guests 30 to 80'].map((n) => p.getByRole('button', { name: n, exact: true }).count()));
  check(`${tag} home: accessible names (label + value), each control exposed once`, names.every((n) => n === 1), names);
  check(`${tag} home: no horizontal overflow`, (await overflow(p)) <= 0);
  await p.screenshot({ path: `qa/forms/after/bar-${tag}.png`, clip: await p.evaluate(() => { const r = document.querySelector('[data-hero-bar]').getBoundingClientRect(); return { x: Math.max(0, r.x - 40), y: r.y - 40, width: Math.min(innerWidth, r.width + 80), height: r.height + 80 }; }) });

  // Occasion: open, geometry, every option
  const tType = p.locator('[data-hero-bar] .pick--select').first(), tGuests = p.locator('[data-hero-bar] .pick--select').nth(1), tDate = p.locator('[data-hero-bar] .pick--date');
  await tType.click(); await wait(p, 320);
  let g = await panel(p);
  const geo = await p.evaluate(() => { const b = document.querySelector('[data-hero-bar]').getBoundingClientRect(), o = document.querySelector('.pick-pop.is-open'); const tl = o.querySelector('.pick-opt__label').getBoundingClientRect().left; const vl = document.querySelector('[data-hero-bar] .pick__text').getBoundingClientRect().left; return { barTop: b.top, align: Math.round((tl - vl) * 10) / 10, rows: [...o.querySelectorAll('.pick-opt')].map((x) => Math.round(x.getBoundingClientRect().height)), listFocused: document.activeElement.getAttribute('role') === 'listbox' }; });
  check(`${tag} home: Occasion panel opens fully visible, uncovered, above the bar`, g && g.inView && g.covered === 0 && g.side === 'top' && g.b <= geo.barTop - 8, { ...g, barTop: geo.barTop });
  check(`${tag} home: option text aligns with the trigger value (±1px)`, Math.abs(geo.align) <= 1, geo.align);
  check(`${tag} home: option rows ≥ 40px, focus moves into the listbox`, geo.rows.every((h) => h >= 40) && geo.listFocused, geo.rows);
  await p.screenshot({ path: `qa/forms/after/home-occasion-${tag}.png`, clip: await barClip(p) });
  await p.keyboard.press('Escape'); await wait(p, 250);
  const expect = [['wedding', 'Wedding'], ['private', 'Private celebration'], ['corporate', 'Corporate or gala'], ['other', 'Something else']];
  let allOk = true; const widths = [];
  for (let i = 0; i < 4; i++) {
    await tType.click(); await wait(p, 260);
    await p.locator('.pick-pop.is-open [role=option]').nth(i).click(); await wait(p, 260);
    const s = (await state(p, '[data-hero-bar]'))[0];
    widths.push(await p.evaluate(() => Math.round(document.querySelector('[data-hero-bar]').getBoundingClientRect().width * 10) / 10));
    if (s.value !== expect[i][0] || s.text !== expect[i][1] || s.exp !== 'false' || (await panel(p))) allOk = false;
  }
  check(`${tag} home: every Occasion option selects (field + form value), panel closes, no navigation`, allOk && p.url() === url0);
  check(`${tag} home: bar width constant across selections (no layout jump)`, new Set(widths).size === 1, widths);
  const ex = [['under-30', 'Up to 30'], ['30-80', '30 to 80'], ['80-150', '80 to 150'], ['150-plus', '150+']];
  allOk = true;
  for (let i = 0; i < 4; i++) {
    await tGuests.click(); await wait(p, 260);
    await p.locator('.pick-pop.is-open [role=option]').nth(i).click(); await wait(p, 260);
    const s = (await state(p, '[data-hero-bar]'))[2];
    if (s.value !== ex[i][0] || s.text !== ex[i][1]) allOk = false;
  }
  check(`${tag} home: every Guests option selects`, allOk && p.url() === url0);
  await tGuests.click(); await wait(p, 320);
  g = await panel(p);
  check(`${tag} home: Guests panel visible and uncovered`, g && g.inView && g.covered === 0, g);
  await p.locator('.pick-pop.is-open [role=option]').nth(1).click(); await wait(p, 250); // back to the default 30 to 80
  await tGuests.click(); await wait(p, 320);
  await p.screenshot({ path: `qa/forms/after/home-guests-${tag}.png`, clip: await barClip(p) });

  // only one open at a time; outside click; Escape + focus restore
  await tType.click(); await wait(p, 320);
  const one = await p.evaluate(() => ({ n: document.querySelectorAll('.pick-pop.is-open').length, exp: [...document.querySelectorAll('[data-hero-bar] .pick')].map((t) => t.getAttribute('aria-expanded')) }));
  check(`${tag} home: opening another control closes the first (one panel at a time)`, one.n === 1 && one.exp.join() === 'true,false,false', one);
  await p.mouse.click(W / 2, 120); await wait(p, 300);
  check(`${tag} home: outside click dismisses`, !(await panel(p)));
  await tType.click(); await wait(p, 300); await p.keyboard.press('Escape'); await wait(p, 250);
  const esc = await p.evaluate(() => ({ open: !!document.querySelector('.pick-pop.is-open'), back: document.activeElement === document.querySelector('[data-hero-bar] .pick') }));
  check(`${tag} home: Escape dismisses and returns focus to the trigger`, !esc.open && esc.back, esc);

  // keyboard: Enter/Space/Arrow open, arrows + Home move, Enter commits, Escape cancels, type-ahead, Tab commits + moves on
  await p.evaluate(() => document.querySelector('[data-hero-bar] .pick').focus());
  await p.keyboard.press('Enter'); await wait(p, 250);
  const ad = await p.evaluate(() => { const l = document.querySelector('.pick-pop.is-open [role=listbox]'); return { focused: document.activeElement === l, ad: l.getAttribute('aria-activedescendant'), sel: l.querySelector('[aria-selected=true]').id, kbd: l.classList.contains('is-kbd') }; });
  check(`${tag} home: Enter opens; active option = selected option (aria-activedescendant)`, ad.focused && ad.ad === ad.sel && ad.kbd, ad);
  await p.keyboard.press('Home'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await wait(p, 250);
  let k = (await state(p, '[data-hero-bar]'))[0], f = await focusInfo(p);
  check(`${tag} home: Home + ArrowDown×2 + Enter selects "Corporate or gala", focus back on trigger`, k.value === 'corporate' && k.exp === 'false' && /pick/.test(f.cls), { ...k, f });
  await p.keyboard.press(' '); await wait(p, 220); await p.keyboard.press('p'); await p.keyboard.press('Escape'); await wait(p, 220);
  k = (await state(p, '[data-hero-bar]'))[0];
  check(`${tag} home: Space opens; Escape cancels without changing the value`, k.value === 'corporate' && k.exp === 'false', k);
  await p.keyboard.press('ArrowDown'); await wait(p, 220); await p.keyboard.press('w'); await p.keyboard.press('Tab'); await wait(p, 250);
  k = (await state(p, '[data-hero-bar]'))[0]; f = await focusInfo(p);
  check(`${tag} home: ArrowDown opens, type-ahead "w" + Tab commits Wedding and moves to Date`, k.value === 'wedding' && /pick--date/.test(f.cls), { k, f });
  const ring = await p.evaluate(() => getComputedStyle(document.querySelector('[data-hero-bar] .pick--date').closest('.pick-zone'), '::before').boxShadow);
  check(`${tag} home: keyboard focus shows the bronze field capsule`, /inset/.test(ring), ring);

  // date picker
  await p.keyboard.press('Enter'); await wait(p, 320);
  const today = await p.evaluate(() => { const d = new Date(); return { iso: TEH.pick.iso(TEH.pick.today()), day: d.getDate() }; });
  let c = await p.evaluate(() => { const o = document.querySelector('.pick-pop.is-open'); return { role: o.getAttribute('role'), modal: o.getAttribute('aria-modal'), label: o.getAttribute('aria-label'), focus: document.activeElement.getAttribute('data-d'), past: o.querySelectorAll('.cal__day:disabled').length, prevDis: o.querySelector('[data-cal-step="-1"]').disabled, rows: o.querySelectorAll('tbody tr').length, live: o.querySelector('[aria-live]').textContent }; });
  check(`${tag} date: Enter opens a dialog with focus on today`, c.role === 'dialog' && c.modal === 'false' && c.focus === today.iso, c);
  check(`${tag} date: the ${today.day - 1} earlier days this month are disabled; previous month unavailable`, c.past === today.day - 1 && c.prevDis, c);
  check(`${tag} date: six-row grid (panel height never changes between months)`, c.rows === 6);
  g = await panel(p);
  check(`${tag} date: calendar fully visible and uncovered`, g && g.inView && g.covered === 0, g);
  await p.screenshot({ path: `qa/forms/after/home-date-${tag}.png`, clip: await barClip(p) });
  await p.keyboard.press('ArrowLeft'); await wait(p, 60);
  check(`${tag} date: keyboard cannot move before today`, (await focusInfo(p)).d === today.iso);
  await p.keyboard.press('PageDown'); await wait(p, 80);
  const pd = await p.evaluate(() => ({ d: document.activeElement.getAttribute('data-d'), live: document.querySelector('.pick-pop.is-open [aria-live]').textContent }));
  check(`${tag} date: PageDown moves to next month and announces it`, pd.d && pd.d.slice(0, 7) !== today.iso.slice(0, 7) && pd.live !== c.live, pd);
  await p.keyboard.press('Escape'); await wait(p, 250);
  f = await focusInfo(p);
  check(`${tag} date: Escape closes and restores focus; nothing selected`, /pick--date/.test(f.cls) && (await state(p, '[data-hero-bar]'))[1].value === '', f);

  // leap years and month lengths through the month/year view
  const monthLen = async (y, m) => {
    await tDate.click(); await wait(p, 280);
    await p.locator('.pick-pop.is-open [data-cal-mode]').click(); await wait(p, 100);
    for (let i = 0; i < 5; i++) { const yr = Number(await p.locator('.pick-pop.is-open .cal__year').textContent()); if (yr === y) break; await p.locator(`.pick-pop.is-open [data-cal-step="${yr < y ? 1 : -1}"]`).click(); await wait(p, 40); }
    await p.locator(`.pick-pop.is-open [data-m="${m}"]`).click(); await wait(p, 100);
    const n = await p.evaluate(() => ({ n: document.querySelectorAll('.pick-pop.is-open .cal__day').length, title: document.querySelector('.pick-pop.is-open [aria-live]').textContent, first: document.querySelector('.pick-pop.is-open tbody tr').children.length }));
    await p.keyboard.press('Escape'); await wait(p, 220);
    return n;
  };
  const feb27 = await monthLen(2027, 1), feb28 = await monthLen(2028, 1), apr27 = await monthLen(2027, 3), dec27 = await monthLen(2027, 11);
  check(`${tag} date: month lengths — Feb 2027 28, Feb 2028 29 (leap), Apr 30, Dec 31`, feb27.n === 28 && feb28.n === 29 && apr27.n === 30 && dec27.n === 31, [feb27, feb28, apr27, dec27].map((x) => x.title + ':' + x.n));
  const lp = await p.evaluate(() => [TEH.pick.parse('2028-02-29') !== null, TEH.pick.parse('2027-02-29') === null, TEH.pick.parse('2100-02-29') === null, TEH.pick.parse('2000-02-29') !== null, TEH.pick.parse('2027-13-01') === null]);
  check(`${tag} date: leap-year rules (2028, 2000 leap; 2027, 2100 not) and invalid dates rejected`, lp.every(Boolean), lp);
  // month boundary by keyboard: 31 Jan 2027 → ArrowRight → 1 Feb 2027; End → Sunday 7 Feb
  await tDate.click(); await wait(p, 280);
  await p.locator('.pick-pop.is-open [data-cal-mode]').click(); await wait(p, 80);
  while (Number(await p.locator('.pick-pop.is-open .cal__year').textContent()) < 2027) { await p.locator('.pick-pop.is-open [data-cal-step="1"]').click(); await wait(p, 40); }
  await p.locator('.pick-pop.is-open [data-m="0"]').click(); await wait(p, 100);
  await p.locator('.pick-pop.is-open [data-d="2027-01-31"]').focus();
  await p.keyboard.press('ArrowRight'); await wait(p, 80);
  const mb = await p.evaluate(() => ({ d: document.activeElement.getAttribute('data-d'), title: document.querySelector('.pick-pop.is-open [aria-live]').textContent }));
  await p.keyboard.press('End'); await wait(p, 40);
  const end = await p.evaluate(() => document.activeElement.getAttribute('data-d'));
  check(`${tag} date: month boundary (31 Jan → 1 Feb 2027) and End → Sunday`, mb.d === '2027-02-01' && mb.title === 'February 2027' && end === '2027-02-07', { mb, end });
  await p.keyboard.press('Escape'); await wait(p, 220);

  // choose 15 June 2027, reopen, clear, today
  const w0 = await p.evaluate(() => document.querySelector('[data-hero-bar]').getBoundingClientRect().width);
  await pickDate(p, '[data-hero-bar]', '2027-06-15');
  let d = (await state(p, '[data-hero-bar]'))[1];
  const nm = await p.getByRole('button', { name: 'Date Tuesday 15 June 2027', exact: true }).count();
  const w1 = await p.evaluate(() => document.querySelector('[data-hero-bar]').getBoundingClientRect().width);
  check(`${tag} date: clicking 15 June 2027 shows 15/06/2027, form value 2027-06-15, closes`, d.text === '15/06/2027' && d.value === '2027-06-15' && d.exp === 'false' && nm === 1, d);
  check(`${tag} date: bar width unchanged after choosing a date`, Math.abs(w1 - w0) < 0.5, [w0, w1]);
  await tDate.click(); await wait(p, 320);
  c = await p.evaluate(() => { const o = document.querySelector('.pick-pop.is-open'); return { live: o.querySelector('[aria-live]').textContent, sel: o.querySelector('.cal__day.is-sel')?.getAttribute('data-d'), cellSel: o.querySelector('td[aria-selected=true] [data-d]')?.getAttribute('data-d'), focus: document.activeElement.getAttribute('data-d') }; });
  check(`${tag} date: reopening restores June 2027 with the 15th selected and focused`, c.live === 'June 2027' && c.sel === '2027-06-15' && c.cellSel === '2027-06-15' && c.focus === '2027-06-15', c);
  await p.screenshot({ path: `qa/forms/after/home-date-selected-${tag}.png`, clip: await barClip(p) });
  await p.locator('.pick-pop.is-open [data-cal-clear]').click(); await wait(p, 250);
  d = (await state(p, '[data-hero-bar]'))[1];
  check(`${tag} date: Clear empties the field and the form value`, d.value === '' && d.text === 'Choose a date', d);
  await tDate.click(); await wait(p, 280); await p.locator('.pick-pop.is-open [data-cal-today]').click(); await wait(p, 250);
  d = (await state(p, '[data-hero-bar]'))[1];
  check(`${tag} date: Today selects today's local date`, d.value === today.iso, d);
  if (big) {
    // hover state of the bar, closed with a value
    await pickDate(p, '[data-hero-bar]', '2027-06-15');
    await p.mouse.move(0, 0); await wait(p, 300);
    await p.screenshot({ path: `qa/forms/after/home-bar-filled-${tag}.png`, clip: await barClip(p, 40) });
  }
  check(`${tag} home: no JavaScript errors`, errs.length === 0, errs);
  await ctx.close();
}

/* ------------------------------------------------------------ 2. FULL FLOW: bar → enquiry.html → prefill */
if (want('flow')) {
  const { p, ctx, errs } = await open('index.html', 1440, 900, { dsf: 2 });
  await p.locator('[data-hero-bar] .pick--select').first().click(); await wait(p, 250);
  await p.locator('.pick-pop.is-open [role=option]', { hasText: 'Wedding' }).click(); await wait(p, 200);
  await pickDate(p, '[data-hero-bar]', '2027-06-15');
  await p.locator('[data-hero-bar] .pick--select').nth(1).click(); await wait(p, 250);
  await p.locator('.pick-pop.is-open [role=option]', { hasText: '80 to 150' }).click(); await wait(p, 200);
  check('flow: choosing options never navigates', /index\.html$/.test(p.url()), p.url());
  await Promise.all([p.waitForURL(/enquiry\.html/), p.locator('[data-hero-bar] button[type=submit]').click()]);
  const u = new URL(p.url());
  check('flow: submits enquiry.html?type=wedding&date=2027-06-15&guests=80-150', u.pathname.endsWith('/enquiry.html') && u.search === '?type=wedding&date=2027-06-15&guests=80-150', u.search);
  await wait(p, 900);
  const s = await state(p, '.form');
  check('flow: enquiry page shows Wedding / 15/06/2027 / 80 to 150 with matching form values', s[0].value === 'wedding' && s[0].text === 'Wedding' && s[1].value === '2027-06-15' && s[1].text === '15/06/2027' && s[2].value === '80-150' && s[2].text === '80 to 150', s);
  await jump(p, () => { const f = document.querySelector('.form fieldset'); return f.getBoundingClientRect().top + scrollY - 140; });
  await wait(p, 600);
  await p.screenshot({ path: 'qa/forms/after/enquiry-prefilled-1440.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
  // submit the demo form: summary repeats the chosen values in words
  await p.fill('#f-name', 'Test Visitor'); await p.fill('#f-email', 'visitor@example.com'); await p.check('[name=consent]');
  await p.locator('.form button[type=submit]').click(); await wait(p, 800);
  const done = await p.evaluate(() => document.querySelector('.enq__done')?.innerText || '');
  check('flow: demo summary lists Wedding, Tuesday 15 June 2027, 80 to 150 (nothing sent)', /Wedding/.test(done) && /Tuesday 15 June 2027/.test(done) && /80 to 150/.test(done) && /not sent anything/.test(done), done.slice(0, 160));
  check('flow: no JavaScript errors', errs.length === 0, errs);
  await ctx.close();
}

/* ------------------------------------------------------------ 3. LOCAL DATES ACROSS TIME ZONES */
if (want('tz')) for (const [tz, at, expectIso] of [['Pacific/Kiritimati', '2026-11-18T12:00:00Z', '2026-11-19'], ['Pacific/Pago_Pago', '2026-11-18T05:00:00Z', '2026-11-17'], ['Europe/Zurich', '2026-11-18T23:30:00Z', '2026-11-19']]) {
  const { p, ctx, errs } = await open('index.html', 1440, 900, { tz, clock: new Date(at) });
  const r = await p.evaluate(() => ({ min: document.querySelector('[data-hero-bar] input[type=date]').min, utc: new Date().toISOString().slice(0, 10) }));
  await p.locator('[data-hero-bar] .pick--date').click(); await wait(p, 300);
  const focus = await p.evaluate(() => document.activeElement.getAttribute('data-d'));
  await p.locator('.pick-pop.is-open [data-cal-today]').click(); await wait(p, 200);
  const v = (await state(p, '[data-hero-bar]'))[1];
  check(`tz ${tz} @ ${at}: min, calendar "today" and Today button use the local date ${expectIso} (UTC says ${r.utc})`, r.min === expectIso && focus === expectIso && v.value === expectIso, { ...r, focus, v: v.value });
  const e2 = await open(`enquiry.html`, 1440, 900, { tz, clock: new Date(at) });
  const m2 = await e2.p.evaluate(() => document.getElementById('f-date').min);
  check(`tz ${tz}: enquiry page minimum is the local date`, m2 === expectIso, m2);
  check(`tz ${tz}: no JavaScript errors`, errs.length === 0 && e2.errs.length === 0, [...errs, ...e2.errs]);
  await e2.ctx.close(); await ctx.close();
}

/* ------------------------------------------------------------ 4. ENQUIRY PAGE (desktop / tablet) */
if (want('enquiry')) for (const [W, H] of [[1440, 900], [768, 1024]]) {
  const tag = `${W}x${H}`;
  const { p, ctx, errs } = await open('enquiry.html?type=corporate&date=2027-09-04&guests=150-plus', W, H);
  let s = await state(p, '.form');
  check(`${tag} enquiry: URL prefill shown (Corporate or gala / 04/09/2027 / 150+)`, s[0].text === 'Corporate or gala' && s[1].text === '04/09/2027' && s[1].value === '2027-09-04' && s[2].text === '150+' && s[2].value === '150-plus', s.slice(0, 3));
  const lab = await p.evaluate(() => ['f-type', 'f-date', 'f-guests'].map((id) => { const n = document.getElementById(id), l = n.closest('.field').querySelector('label'); return document.getElementById(l.htmlFor)?.classList.contains('pick'); }));
  check(`${tag} enquiry: field labels point at (and open) the new triggers`, lab.every(Boolean), lab);
  await jump(p, () => { const f = document.getElementById('f-type').closest('.field'); return f.getBoundingClientRect().top + scrollY - 160; }); await wait(p, 500);
  await p.locator('label[for]', { hasText: 'Occasion' }).click(); await wait(p, 300);
  let g = await panel(p);
  check(`${tag} enquiry: clicking the label opens Occasion below the field, visible, uncovered`, g && g.inView && g.covered === 0 && g.side === 'bottom', g);
  await p.locator('.pick-pop.is-open [role=option]', { hasText: 'Private celebration' }).click(); await wait(p, 250);
  s = await state(p, '.form');
  check(`${tag} enquiry: Occasion selection updates field + value`, s[0].value === 'private' && s[0].text === 'Private celebration', s[0]);
  await p.locator('.form .pick--date').click(); await wait(p, 320);
  g = await panel(p);
  const sel = await p.evaluate(() => document.querySelector('.pick-pop.is-open .cal__day.is-sel')?.getAttribute('data-d'));
  check(`${tag} enquiry: calendar opens on the prefilled September 2027 with the 4th selected`, g && g.inView && g.covered === 0 && sel === '2027-09-04', { g, sel });
  await p.screenshot({ path: `qa/forms/after/enquiry-date-${tag}.png` });
  await p.keyboard.press('Escape'); await wait(p, 250);
  // flip: put Guests near the bottom edge, the panel must open upwards and stay on screen
  await jump(p, () => { const t = document.getElementById('f-guests').closest('.field').querySelector('.pick'); return t.getBoundingClientRect().bottom + scrollY - innerHeight + 30; }); await wait(p, 500);
  // when the page cannot scroll the field that low (it sits near the top), shorten the window instead
  const tb = await p.evaluate(() => document.getElementById('f-guests').closest('.field').querySelector('.pick').getBoundingClientRect().bottom);
  if (tb < H - 60) { await p.setViewportSize({ width: W, height: Math.round(tb + 40) }); await wait(p, 500); }
  await p.locator('.form .pick--select').nth(1).click(); await wait(p, 320);
  g = await panel(p);
  check(`${tag} enquiry: near the bottom edge the panel flips above the field`, g && g.inView && g.side === 'top' && g.covered === 0, g);
  await p.keyboard.press('Escape'); await wait(p, 250);
  // language (same component) and the date near the bottom edge
  await jump(p, () => { const t = document.getElementById('f-lang').closest('.field'); return t.getBoundingClientRect().top + scrollY - 200; }); await wait(p, 400);
  await p.locator('#f-lang').locator('xpath=..').locator('.pick').click(); await wait(p, 300);
  await p.locator('.pick-pop.is-open [role=option]', { hasText: 'Français' }).click(); await wait(p, 250);
  check(`${tag} enquiry: Preferred language uses the same component`, (await p.evaluate(() => document.getElementById('f-lang').value)) === 'Français');
  check(`${tag} enquiry: no horizontal overflow`, (await overflow(p)) <= 0);
  check(`${tag} enquiry: no JavaScript errors`, errs.length === 0, errs);
  await ctx.close();
}

/* ------------------------------------------------------------ 5. PHONES: bottom sheets */
if (want('mobile')) for (const [W, H] of [[390, 844], [390, 640], [360, 740]]) {
  const tag = `${W}x${H}`;
  const home = await open('index.html', W, H);
  const hb = await home.p.evaluate(() => getComputedStyle(document.querySelector('[data-hero-bar]')).display);
  check(`${tag} home: hero bar stays hidden on phones as before; no overflow`, hb === 'none' && (await overflow(home.p)) <= 0, hb);
  await home.ctx.close();
  const { p, ctx, errs } = await open('enquiry.html?type=wedding&guests=30-80', W, H);
  await jump(p, () => { const f = document.getElementById('f-type').closest('.field'); return f.getBoundingClientRect().top + scrollY - 120; }); await wait(p, 500);
  const y0 = await p.evaluate(() => scrollY);
  await p.locator('.form .pick--select').first().tap(); await wait(p, 450);
  let g = await panel(p);
  const sz = await p.evaluate(() => { const o = document.querySelector('.pick-pop.is-open'); return { rows: [...o.querySelectorAll('.pick-opt')].map((x) => Math.round(x.getBoundingClientRect().height)), close: Math.round(o.querySelector('[data-pick-close]').getBoundingClientRect().width), font: parseFloat(getComputedStyle(o.querySelector('.pick-opt')).fontSize), title: o.querySelector('.pick-pop__title').textContent, locked: getComputedStyle(document.body).overflow }; });
  check(`${tag} sheet: Occasion opens as a full-width bottom sheet`, g && g.sheet && g.inView && Math.abs(g.b - g.vh) < 1 && g.l === 0 && Math.abs(g.w - g.vw) < 1 && g.covered === 0, g);
  check(`${tag} sheet: 52px rows, 16px text, 44px close button, titled "${sz.title}"`, sz.rows.every((h) => h >= 44) && sz.font >= 16 && sz.close >= 44, sz);
  // background scroll is locked while the sheet is open
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(W / 2), y: 120, yDistance: -300, gestureSourceType: 'touch', speed: 1200 }).catch(() => {});
  await wait(p, 400);
  const y1 = await p.evaluate(() => scrollY);
  check(`${tag} sheet: page behind does not scroll (${sz.locked})`, Math.abs(y1 - y0) < 2 && sz.locked === 'hidden', { y0, y1 });
  await p.screenshot({ path: `qa/forms/after/mobile-occasion-${tag}.png` });
  await p.locator('.pick-pop.is-open [role=option]', { hasText: 'Corporate or gala' }).tap(); await wait(p, 450);
  let s = await state(p, '.form');
  check(`${tag} sheet: tapping an option selects it and closes the sheet; scroll released`, s[0].value === 'corporate' && !(await panel(p)) && (await p.evaluate(() => getComputedStyle(document.body).overflow)) !== 'hidden', s[0]);
  // dismiss by scrim and by the close button
  await p.locator('.form .pick--select').nth(1).tap(); await wait(p, 450);
  await p.touchscreen.tap(W / 2, 40); await wait(p, 450);
  const scrimClosed = !(await panel(p));
  await p.locator('.form .pick--select').nth(1).tap(); await wait(p, 450);
  await p.locator('.pick-pop.is-open [data-pick-close]').tap(); await wait(p, 450);
  check(`${tag} sheet: tapping the backdrop or the close button dismisses`, scrimClosed && !(await panel(p)));
  // calendar sheet
  await p.locator('.form .pick--date').tap(); await wait(p, 450);
  g = await panel(p);
  const cal = await p.evaluate(() => { const o = document.querySelector('.pick-pop.is-open'); const b = [...o.querySelectorAll('.cal__day')].map((x) => x.getBoundingClientRect()); return { w: Math.round(Math.min(...b.map((r) => r.width))), h: Math.round(Math.min(...b.map((r) => r.height))), arrows: [...o.querySelectorAll('.cal__arrow')].map((x) => Math.round(x.getBoundingClientRect().width)), links: [...o.querySelectorAll('.cal__link')].map((x) => Math.round(x.getBoundingClientRect().height)), modal: o.getAttribute('aria-modal'), scrollable: o.scrollHeight > o.clientHeight + 1 }; });
  check(`${tag} sheet: calendar sheet visible, modal, not clipped`, g && g.sheet && g.inView && cal.modal === 'true' && g.covered === 0, { g, scroll: cal.scrollable });
  check(`${tag} sheet: day cells, arrows and footer actions ≥ 44px`, cal.w >= 44 && cal.h >= 44 && cal.arrows.every((x) => x >= 44) && cal.links.every((x) => x >= 44), cal);
  await p.locator('.pick-pop.is-open [data-cal-step="1"]').tap(); await wait(p, 300);
  const firstDay = await p.evaluate(() => document.querySelector('.pick-pop.is-open .cal__day:not(:disabled)').getAttribute('data-d'));
  const pickIso = firstDay.slice(0, 8) + '12';
  await p.locator(`.pick-pop.is-open [data-d="${pickIso}"]`).tap(); await wait(p, 450);
  s = await state(p, '.form');
  const [yy, mm] = pickIso.split('-');
  check(`${tag} sheet: tapping a day selects it (${pickIso}) and closes`, s[1].value === pickIso && s[1].text === `12/${mm}/${yy}` && !(await panel(p)), s[1]);
  await p.locator('.form .pick--date').tap(); await wait(p, 450);
  await p.screenshot({ path: `qa/forms/after/mobile-calendar-${tag}.png` });
  await p.locator('.pick-pop.is-open [data-pick-close]').tap(); await wait(p, 400);
  check(`${tag} sheet: no horizontal overflow; no JavaScript errors`, (await overflow(p)) <= 0 && errs.length === 0, errs);
  await ctx.close();
}

/* ------------------------------------------------------------ 6. HERO, REDUCED MOTION, NO-JS */
if (want('misc')) {
  // the panel follows the bar while the hero pins, and closes once the bar fades; the hero still animates
  {
    const { p, ctx, errs } = await open('index.html', 1440, 900);
    const scroll = (y) => p.evaluate((y) => new Promise((r) => { (TEH.lenis || { scrollTo: (v) => scrollTo(0, v) }).scrollTo(y, { immediate: true, force: true }); requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60))); }), y);
    const fw0 = await p.evaluate(() => document.querySelector('[data-hero-frame]').getBoundingClientRect().width);
    await p.locator('[data-hero-bar] .pick--select').first().click(); await wait(p, 300);
    const gap0 = await p.evaluate(() => document.querySelector('[data-hero-bar]').getBoundingClientRect().top - document.querySelector('.pick-pop.is-open').getBoundingClientRect().bottom);
    await scroll(12); await wait(p, 120);
    const g1 = await panel(p);
    const gap1 = await p.evaluate(() => { const o = document.querySelector('.pick-pop.is-open'); return o ? document.querySelector('[data-hero-bar]').getBoundingClientRect().top - o.getBoundingClientRect().bottom : null; });
    check('hero: panel stays attached to the bar during a small scroll', g1 && Math.abs(gap1 - gap0) < 3, { gap0, gap1 });
    for (let y = 40; y <= 400; y += 40) await scroll(y);
    await wait(p, 900);
    const after = await p.evaluate(() => ({ open: !!document.querySelector('.pick-pop.is-open'), barOpacity: getComputedStyle(document.querySelector('[data-hero-bar]')).opacity, fw: document.querySelector('[data-hero-frame]').getBoundingClientRect().width }));
    check('hero: panel closes once the bar fades out with the hero; hero still contracts', !after.open && after.fw < fw0 - 50, { ...after, fw0 });
    await scroll(0); await wait(p, 900);
    const back = await p.evaluate(() => ({ fw: document.querySelector('[data-hero-frame]').getBoundingClientRect().width, op: getComputedStyle(document.querySelector('[data-hero-bar]')).opacity }));
    check('hero: back at the top the hero and bar are restored', Math.abs(back.fw - fw0) < 2 && +back.op > 0.99, back);
    check('hero: no JavaScript errors', errs.length === 0, errs);
    await ctx.close();
  }
  {
    const { p, ctx, errs } = await open('index.html', 1440, 900, { reduced: true });
    await p.locator('[data-hero-bar] .pick--select').first().click(); await wait(p, 200);
    const rm = await p.evaluate(() => { const o = document.querySelector('.pick-pop.is-open'), cs = getComputedStyle(o); return { tr: cs.translate, sc: cs.scale, tp: cs.transitionProperty, op: cs.opacity }; });
    check('reduced motion: panel fades only (only opacity transitions; no translate or scale at rest)', rm.tp === 'opacity' && /^(none|0px)$/.test(rm.tr) && /^(none|1)$/.test(rm.sc) && rm.op === '1', rm);
    await p.locator('.pick-pop.is-open [role=option]').nth(2).click(); await wait(p, 200);
    check('reduced motion: selection still works; no errors', (await state(p, '[data-hero-bar]'))[0].value === 'corporate' && errs.length === 0, errs);
    await ctx.close();
  }
  for (const page of ['index.html', 'enquiry.html']) {
    const { p, ctx } = await open(page, 1440, 900, { js: false });
    const nat = await p.evaluate(() => [...document.querySelectorAll('select[name=type], input[name=date], select[name=guests]')].map((n) => getComputedStyle(n).display !== 'none' && !n.hidden));
    check(`no-JS ${page}: native controls remain visible and usable`, nat.length === 3 && nat.every(Boolean), nat);
    await ctx.close();
  }
}

out.summary = { pass, fail };
writeFileSync('qa/forms/results.json', JSON.stringify(out, null, 2));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
