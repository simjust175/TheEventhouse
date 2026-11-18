// Interaction + keyboard test for all four pages. Usage: node tools/interaction-test.mjs [--mobile]
// Prints PASS/FAIL per check and writes qa/interaction/*.png evidence frames.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:4600/';
const mobile = process.argv.includes('--mobile');
const OUT = 'qa/interaction' + (mobile ? '-mobile' : '');
mkdirSync(OUT, { recursive: true });
const VP = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: VP, isMobile: mobile, hasTouch: mobile });
const results = [];
const errors = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + detail : '')); };
const wait = (p, ms) => p.waitForTimeout(ms);
const goTo = (p, sel) => p.evaluate((s) => { const el = document.querySelector(s); const y = el.getBoundingClientRect().top + window.scrollY - 120; TEH.lenis ? TEH.lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y); }, sel);
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` });
const open = async (page) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(page + ': ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push(page + ': ' + m.text()); }); await p.goto(BASE + page, { waitUntil: 'load' }); await wait(p, 1200); return p; };
const count = (p) => p.evaluate(() => TEH.basket.count());

/* ---------------- HOME ---------------- */
{
  const p = await open('index.html');
  await p.evaluate(() => TEH.basket.clear());

  // keyboard: first Tab lands on skip link, which is visible when focused
  await p.keyboard.press('Tab');
  const skip = await p.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { cls: a.className, vis: r.top >= 0 && r.height > 0 }; });
  check('home: first Tab = visible skip link', /skip/.test(skip.cls) && skip.vis, JSON.stringify(skip));

  // focus order + visible focus indicator for the first 10 stops
  const stops = [];
  for (let i = 0; i < 10; i++) {
    await p.keyboard.press('Tab');
    stops.push(await p.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); const r = a.getBoundingClientRect();
      return { t: (a.getAttribute('aria-label') || a.textContent || a.tagName).trim().replace(/\s+/g, ' ').slice(0, 28), ring: (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none', onscreen: r.width > 0 && r.bottom > 0 && r.top < innerHeight }; }));
  }
  check('home: Tab stops have a visible focus ring', stops.every((s) => s.ring), stops.map((s) => s.t + (s.ring ? '' : '[NO RING]') + (s.onscreen ? '' : '[OFFSCREEN]')).join(' | '));
  await shot(p, 'home-focus');
  await p.keyboard.press('Escape');

  // menu
  await p.evaluate(() => (TEH.lenis ? TEH.lenis.scrollTo(0, { immediate: true }) : scrollTo(0, 0)));
  await p.click('[data-menu-open]'); await wait(p, 1100);
  const menuOpen = await p.evaluate(() => ({ open: document.querySelector('[data-menu]').classList.contains('is-open'), focusIn: !!document.activeElement.closest('[data-menu]'), exp: document.querySelector('[data-menu-open]').getAttribute('aria-expanded') }));
  check('home: menu opens, focus moves inside, aria-expanded', menuOpen.open && menuOpen.focusIn && menuOpen.exp === 'true', JSON.stringify(menuOpen));
  await shot(p, 'home-menu');
  for (let i = 0; i < 14; i++) await p.keyboard.press('Tab');
  check('home: focus trapped in menu after 14 Tabs', await p.evaluate(() => !!document.activeElement.closest('[data-menu]')));
  await p.keyboard.press('Escape'); await wait(p, 1000);
  const menuClosed = await p.evaluate(() => ({ open: document.querySelector('[data-menu]').classList.contains('is-open'), back: document.activeElement.matches('[data-menu-open]') }));
  check('home: Esc closes menu and returns focus to burger', !menuClosed.open && menuClosed.back, JSON.stringify(menuClosed));

  // hero enquiry bar → enquiry.html with params
  if (!mobile) {
    const action = await p.evaluate(() => { const f = document.querySelector('[data-hero-bar] form') || document.querySelector('[data-hero-bar]'); return f && (f.getAttribute('action') || f.querySelector('form')?.getAttribute('action')); });
    check('home: hero enquiry bar posts to enquiry.html', /enquiry\.html/.test(action || ''), action);
  }

  // carousel
  await goTo(p, '[data-carousel]'); await wait(p, 900);
  const cur0 = await p.evaluate(() => document.querySelector('[data-current]')?.textContent.trim());
  // after each click the pointer moves off the NEXT / PREV zone: resting there for 2s is hover navigation (another step)
  const park = async () => { const v = p.viewportSize(); await p.mouse.move(v.width / 2, v.height / 2); };
  await p.locator('[data-next]').locator('visible=true').first().click({ force: true }); await park(); await wait(p, 1500);
  const cur1 = await p.evaluate(() => ({ n: document.querySelector('[data-current]')?.textContent.trim(), title: document.querySelector('[data-copy].is-active h3, [data-copy].is-active h2, [data-copy].is-active .h-title')?.textContent.trim() }));
  check('home: carousel Next advances slide + copy', cur1.n !== cur0, `${cur0} → ${cur1.n} (${cur1.title || ''})`);
  await shot(p, 'home-carousel-next');
  await p.locator('[data-prev]').locator('visible=true').first().click({ force: true }); await park(); await wait(p, 1500);
  check('home: carousel Prev returns', (await p.evaluate(() => document.querySelector('[data-current]')?.textContent.trim())) === cur0);

  // anatomy hotspot → card → add
  await goTo(p, '[data-anatomy]'); await wait(p, 900);
  await p.click('[data-spot]', { force: true }); await wait(p, 700);
  const card = await p.evaluate(() => { const c = document.querySelector('[data-spot-card]'); const r = c.getBoundingClientRect(); return { open: c.classList.contains('is-open'), inView: r.left >= 0 && r.right <= innerWidth + 1, name: c.querySelector('h3')?.textContent }; });
  check('home: hotspot opens product card within viewport', card.open && card.inView, JSON.stringify(card));
  await shot(p, 'home-hotspot');
  const before = await count(p);
  await p.click('[data-spot-card] [data-add]', { force: true }); await wait(p, 600);
  check('home: add from hotspot card increments basket', (await count(p)) === before + 1, `${before} → ${await count(p)}`);
  const toast = await p.evaluate(() => ({ vis: document.querySelector('[data-toast]').classList.contains('is-visible'), txt: document.querySelector('[data-toast-text]').textContent, badge: document.querySelector('[data-basket-count]')?.textContent.trim() }));
  check('home: toast + header badge update', toast.vis && toast.badge === String(before + 1), JSON.stringify(toast));
  await p.keyboard.press('Escape');

  // drawer
  await p.click('.header [data-basket-open]'); await wait(p, 900);
  const dr = await p.evaluate(() => ({ open: document.querySelector('[data-drawer]').classList.contains('is-open'), items: document.querySelectorAll('[data-drawer-list] [data-remove]').length, focusIn: !!document.activeElement.closest('[data-drawer]') }));
  check('home: basket drawer opens with item + focus inside', dr.open && dr.items === 1 && dr.focusIn, JSON.stringify(dr));
  await shot(p, 'home-drawer');
  await p.focus('[data-drawer] [data-inc]'); await p.keyboard.press('Enter'); await wait(p, 250);
  check('home: drawer + increments qty and keeps keyboard focus on +', (await count(p)) === 2 && (await p.evaluate(() => document.activeElement.hasAttribute('data-inc'))), 'count=' + (await count(p)));
  await p.click('[data-drawer] [data-remove]'); await wait(p, 400);
  check('home: drawer remove empties basket', (await count(p)) === 0);
  await p.keyboard.press('Escape'); await wait(p, 800);
  check('home: Esc closes drawer', await p.evaluate(() => !document.querySelector('[data-drawer]').classList.contains('is-open')));

  // services slider
  await goTo(p, '[data-slide-next]'); await wait(p, 600);
  const sl0 = await p.evaluate(() => document.querySelector('[data-track]').scrollLeft);
  await p.click('[data-slide-next]', { force: true }).catch(() => {}); await wait(p, 1000);
  const sl1 = await p.evaluate(() => document.querySelector('[data-track]').scrollLeft);
  check('home: services slider Next scrolls track', sl1 > sl0, `${sl0} → ${sl1}`);

  // FAQ
  await goTo(p, '[data-faq]'); await wait(p, 600);
  const faqBtn = '[data-faq] button[aria-expanded]';
  await p.click(faqBtn, { force: true }); await wait(p, 700);
  const faq = await p.evaluate((s) => { const b = document.querySelector(s); const panel = document.getElementById(b.getAttribute('aria-controls')); return { exp: b.getAttribute('aria-expanded'), h: panel ? panel.getBoundingClientRect().height : -1 }; }, faqBtn);
  check('home: FAQ toggles aria-expanded and opens panel', faq.exp === 'true' && faq.h > 10, JSON.stringify(faq));
  await shot(p, 'home-faq');

  // in-page nav from header (desktop) / menu (mobile)
  await p.evaluate(() => (TEH.lenis ? TEH.lenis.scrollTo(0, { immediate: true }) : scrollTo(0, 0))); await wait(p, 400);
  if (!mobile) { await p.click('.nav a[href$="#services"]'); }
  else { await p.click('[data-menu-open]'); await wait(p, 1000); await p.click('[data-menu] a[href$="#services"]'); }
  await wait(p, 2600);
  const svcTop = await p.evaluate(() => document.getElementById('services').getBoundingClientRect().top);
  check('home: Services nav link scrolls to #services', Math.abs(svcTop) < 200, 'top=' + Math.round(svcTop));
  await p.close();
}

/* ---------------- COLLECTION ---------------- */
{
  const p = await open('collection.html');
  await p.evaluate(() => TEH.basket.clear());
  const cards = await p.evaluate(() => document.querySelectorAll('[data-cgrid] > *').length);
  check('collection: catalogue renders 18 cards', cards === 18, 'cards=' + cards);
  await goTo(p, '.c-tabs'); await wait(p, 500);
  await p.click('.tab[data-filter="candles"]', { force: true }); await wait(p, 900);
  const f = await p.evaluate(() => ({ filtered: document.body.classList.contains('is-filtered'), vis: [...document.querySelectorAll('[data-cgrid] > *')].filter((c) => !c.classList.contains('is-hidden') && c.offsetParent).length, title: document.querySelector('[data-cat-title]').textContent, pressed: document.querySelector('.tab[data-filter="candles"]').getAttribute('aria-pressed'), status: document.querySelector('[data-filter-status]').textContent }));
  check('collection: Candles tab filters grid + updates title/aria/live region', f.filtered && f.vis > 0 && f.vis < 18 && f.pressed === 'true' && f.status, JSON.stringify(f));
  await shot(p, 'collection-filter');
  await p.click('.tab[data-filter="all"]', { force: true }); await wait(p, 700);
  check('collection: All restores editorial', await p.evaluate(() => !document.body.classList.contains('is-filtered')));

  await goTo(p, '.feature'); await wait(p, 500);
  await p.click('.feature [data-add]', { force: true }); await wait(p, 400);
  check('collection: featured Add to enquiry', (await count(p)) === 1);

  await p.click('.feature__img[data-qv]', { force: true }); await wait(p, 800);
  const qv = await p.evaluate(() => ({ open: !document.querySelector('[data-qv-dialog]').hidden, name: document.querySelector('[data-qv-name]').textContent, focusIn: !!document.activeElement.closest('[data-qv-dialog]') }));
  check('collection: quick view opens with focus inside', qv.open && qv.name && qv.focusIn, JSON.stringify(qv));
  await p.click('[data-qv-inc]'); await p.click('[data-qv-inc]'); await wait(p, 100);
  await p.click('[data-qv-add]'); await wait(p, 500);
  check('collection: quick view qty 3 adds to existing line (1+3=4)', (await count(p)) === 4, 'count=' + (await count(p)));
  await shot(p, 'collection-quickview');
  await p.keyboard.press('Escape'); await wait(p, 700);
  check('collection: Esc closes quick view', await p.evaluate(() => document.querySelector('[data-qv-dialog]').hidden || !document.querySelector('[data-qv-dialog]').classList.contains('is-open')));

  await p.click('.edit [data-goto]', { force: true }); await wait(p, 1800);
  const g = await p.evaluate(() => ({ filtered: document.body.classList.contains('is-filtered'), pressed: document.querySelector('.tab[data-filter="decor"]').getAttribute('aria-pressed') }));
  check('collection: "Explore décor" jumps to Décor filter', g.filtered && g.pressed === 'true', JSON.stringify(g));
  await p.close();

  const p2 = await open('collection.html#p-glass-votive'); await wait(p2, 800);
  check('collection: #p-<id> deep link opens quick view', await p2.evaluate(() => !document.querySelector('[data-qv-dialog]').hidden && /votive/i.test(document.querySelector('[data-qv-name]').textContent)));
  await p2.close();
}

/* ---------------- GALLERY ---------------- */
{
  const p = await open('gallery.html');
  await goTo(p, '[data-filter="weddings"]'); await wait(p, 600);
  const total = await p.evaluate(() => document.querySelectorAll('[data-mosaic] .tile').length);
  await p.click('[data-filter="weddings"]', { force: true }); await wait(p, 900);
  const vis = await p.evaluate(() => [...document.querySelectorAll('[data-mosaic] .tile')].filter((t) => !t.classList.contains('is-hidden') && t.offsetParent).length);
  check('gallery: Weddings chip filters tiles', vis > 0 && vis < total, `${vis}/${total}`);
  await shot(p, 'gallery-filter');
  await p.click('[data-filter="all"]', { force: true }); await wait(p, 900);
  await p.click('[data-mosaic] .tile button', { force: true }); await wait(p, 900);
  const lb = await p.evaluate(() => ({ open: document.querySelector('[data-lightbox]').classList.contains('is-open'), count: document.querySelector('[data-lb-count]')?.textContent, src: document.querySelector('[data-lb-img]').getAttribute('src'), focusIn: !!document.activeElement.closest('[data-lightbox]') }));
  check('gallery: lightbox opens with focus inside', lb.open && lb.focusIn, JSON.stringify(lb));
  await p.keyboard.press('ArrowRight'); await wait(p, 900);
  const lb2 = await p.evaluate(() => ({ count: document.querySelector('[data-lb-count]')?.textContent, src: document.querySelector('[data-lb-img]').getAttribute('src') }));
  check('gallery: ArrowRight goes to next image', lb2.src !== lb.src, `${lb.count} → ${lb2.count}`);
  await shot(p, 'gallery-lightbox');
  await p.keyboard.press('Escape'); await wait(p, 800);
  check('gallery: Esc closes lightbox and restores focus to tile', await p.evaluate(() => !document.querySelector('[data-lightbox]').classList.contains('is-open') && !!document.activeElement.closest('.tile')));
  await p.close();
  const p2 = await open('gallery.html?filter=corporate'); await wait(p2, 600);
  check('gallery: ?filter=corporate preselects chip', await p2.evaluate(() => document.querySelector('[data-filter="corporate"]').getAttribute('aria-pressed') === 'true'));
  await p2.close();
}

/* ---------------- ENQUIRY ---------------- */
{
  const p = await open('enquiry.html?type=corporate&guests=80-150');
  const pre = await p.evaluate(() => ({ type: document.getElementById('f-type').value, guests: document.getElementById('f-guests').value, items: document.querySelectorAll('[data-sel-list] [data-remove]').length }));
  check('enquiry: URL params prefill + basket carried over from collection (persisted)', pre.type === 'corporate' && pre.guests === '80-150' && pre.items >= 1, JSON.stringify(pre));
  await p.click('[data-enq-form] button[type="submit"]'); await wait(p, 400);
  const errs = await p.evaluate(() => ({ name: document.getElementById('e-name').textContent, email: document.getElementById('e-email').textContent, consent: document.getElementById('e-consent').textContent, focus: document.activeElement.id, inv: document.getElementById('f-name').getAttribute('aria-invalid') }));
  check('enquiry: empty submit shows errors, focuses first invalid field', errs.name && errs.email && errs.consent && errs.focus === 'f-name' && errs.inv === 'true', JSON.stringify(errs));
  await shot(p, 'enquiry-errors');
  await p.fill('#f-name', 'Test Person'); await p.fill('#f-email', 'not-an-email');
  await p.click('[data-enq-form] button[type="submit"]'); await wait(p, 300);
  check('enquiry: invalid email rejected', await p.evaluate(() => !!document.getElementById('e-email').textContent));
  await p.fill('#f-email', 'test@example.com'); await p.check('input[name="consent"]'); await p.check('input[value="florals"]');
  await p.click('[data-enq-form] button[type="submit"]'); await wait(p, 900);
  const ok = await p.evaluate(() => { const w = document.querySelector('[data-enq-form-wrap]'); return { text: w.textContent.replace(/\s+/g, ' ').slice(0, 160), focus: document.activeElement.tagName + '#' + document.activeElement.id }; });
  check('enquiry: valid submit shows confirmation (no network)', /thank|received|DEMO/i.test(ok.text), JSON.stringify(ok));
  await shot(p, 'enquiry-success');
  await p.click('[data-new]').catch(() => {}); await wait(p, 600);
  check('enquiry: "Start a new enquiry" clears basket', (await count(p)) === 0);
  await p.close();
}

console.log('\nJS errors:', errors.length ? errors : 'none');
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed` + (mobile ? ' (mobile 390)' : ' (desktop 1440)'));
await browser.close();
process.exit(failed.length ? 1 : 0);
