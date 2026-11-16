// Phase 1: inspect the live reference site (vineyard.co.za) for layout + motion analysis only.
// Captures viewport screenshots at scroll positions, computed styles and library fingerprints.
// Output goes to qa/reference/<viewport>/ . Nothing captured here is used in the client site.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'https://www.vineyard.co.za/';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const which = process.argv[2] || 'desktop';
const VP = which === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const out = path.resolve('qa/reference', which);
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: VP,
  deviceScaleFactor: 1,
  isMobile: which === 'mobile',
  hasTouch: which === 'mobile',
  userAgent: which === 'mobile'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : undefined,
});
const page = await ctx.newPage();
const log = [];
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(6000);

// dismiss cookie banners if any
for (const sel of ['button:has-text("Accept")', 'button:has-text("Got it")', 'button:has-text("Allow")']) {
  const b = page.locator(sel).first();
  if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(500); }
}

const info = await page.evaluate(() => {
  const cs = (el) => { if (!el) return null; const s = getComputedStyle(el); return {
    font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, lh: s.lineHeight, ls: s.letterSpacing,
    color: s.color, bg: s.backgroundColor, tt: s.textTransform, transition: s.transition, radius: s.borderRadius,
    padding: s.padding, height: s.height, width: s.width } };
  const q = (s) => document.querySelector(s);
  const sections = [...document.querySelectorAll('header, section, footer')].map((el) => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls: el.className.toString().slice(0, 80), top: Math.round(r.top + scrollY), h: Math.round(r.height),
      padTop: getComputedStyle(el).paddingTop, padBottom: getComputedStyle(el).paddingBottom, bg: getComputedStyle(el).backgroundColor };
  });
  const pins = [...document.querySelectorAll('.pin-spacer')].map((p) => ({ h: p.style.height, pad: p.style.paddingBottom, child: p.firstElementChild?.className?.toString().slice(0, 60) }));
  return {
    docHeight: document.documentElement.scrollHeight,
    globals: { gsap: !!window.gsap, gsapVersion: window.gsap?.version, ScrollTrigger: !!window.ScrollTrigger, Lenis: !!window.Lenis || !!window.lenis,
      Swiper: !!window.Swiper, SplitText: !!window.SplitText, jQuery: !!window.jQuery, barba: !!window.barba },
    scripts: [...document.scripts].map((s) => s.src).filter(Boolean).map((s) => s.replace(/\?.*/, '')).slice(0, 60),
    htmlClass: document.documentElement.className,
    sections, pins,
    styles: {
      body: cs(document.body),
      header: cs(q('header')),
      navLink: cs(q('header nav a')),
      bookBtn: cs(q('header .btn')),
      heroOverline: cs(q('.section-home-hero .s-overline')),
      heroTitle: cs(q('.section-home-hero .s-title')),
      heroText: cs(q('.section-home-hero .s-text p')),
      featureText: cs(q('.s-feature-text')),
      trustTitle: cs(q('.section-trust .s-title')),
      trustSection: cs(q('.section-trust')),
      carouselTitle: cs(q('.s-carousel-item-title')),
      carouselTagline: cs(q('.s-carousel-item-tagline')),
      carouselText: cs(q('.s-carousel-item-text')),
      roomsTitle: cs(q('.section-rooms .s-title')),
      roomsOverline: cs(q('.section-rooms .s-overline')),
      roomTitle: cs(q('.s-room-title')),
      reviewsTitle: cs(q('.section-reviews .s-title')),
      reviewText: cs(q('.s-review-text')),
      playTitle: cs(q('.section-play .s-title')),
      offersTitle: cs(q('.section-offers .s-title')),
      offerTitle: cs(q('.s-offer-title')),
      faqTitle: cs(q('.accordion-title')),
      footer: cs(q('footer')),
      footerTagline: cs(q('.f-tagline')),
      footerBigLink: cs(q('footer .line')),
      container: cs(q('.container')),
    },
    containerWidth: q('.container')?.getBoundingClientRect().width,
  };
});
fs.writeFileSync(path.join(out, 'computed.json'), JSON.stringify(info, null, 2));
console.log('docHeight', info.docHeight, 'globals', JSON.stringify(info.globals));

// Step through the page by wheel and capture viewport shots
const total = info.docHeight;
const step = Math.round(VP.height * 0.5);
let y = 0, i = 0;
await page.screenshot({ path: path.join(out, `s${String(i).padStart(3, '0')}_0.png`) });
const maxShots = which === 'mobile' ? 140 : 120;
while (i < maxShots) {
  await page.mouse.move(VP.width / 2, VP.height / 2);
  await page.mouse.wheel(0, step);
  await page.waitForTimeout(700);
  i++;
  y = await page.evaluate(() => Math.round(window.scrollY));
  await page.screenshot({ path: path.join(out, `s${String(i).padStart(3, '0')}_${y}.png`) });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  if (y + VP.height >= h - 2) break;
}
log.push({ shots: i, finalY: y });

// Header state after scroll + hover states
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1500);
if (which === 'desktop') {
  const link = page.locator('header nav a').first();
  if (await link.isVisible().catch(() => false)) {
    await link.hover(); await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, 'hover_nav.png'), clip: { x: 0, y: 0, width: VP.width, height: 120 } });
  }
}
// Menu toggle
const burger = page.locator('header .menu-toggle, header .hamburger, header [class*="burger"], header [class*="toggle"]').first();
if (await burger.isVisible().catch(() => false)) {
  await burger.click().catch(() => {}); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'menu_open.png') });
  const menuInfo = await page.evaluate(() => [...document.querySelectorAll('[class*="menu"]')].filter(e => getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().height > 200).map(e => e.className.toString().slice(0, 80)).slice(0, 10));
  log.push({ menuInfo });
}
fs.writeFileSync(path.join(out, 'log.json'), JSON.stringify(log, null, 2));
await browser.close();
console.log('done', out, JSON.stringify(log));
