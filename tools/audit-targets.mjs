// Touch-target audit: every visible button / button-like link on the homepage (and optionally other
// pages) at phone and tablet widths. Reports controls under 44px and button-text wrapping/overflow.
// Usage: node tools/audit-targets.mjs [page.html]   (preview server on :4600)
import { chromium } from 'playwright-core';
const page = process.argv[2] || 'index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const [W, H] of [[390, 844], [600, 900], [768, 1024], [1024, 768], [1440, 900]]) {
  const mob = W < 800;
  const p = await browser.newPage({ viewport: { width: W, height: H }, isMobile: mob, hasTouch: mob });
  await p.goto(`http://localhost:4600/${page}`, { waitUntil: 'load' }); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const out = { small: [], wrap: [], sizes: {}, overflow: document.documentElement.scrollWidth > innerWidth };
    for (const el of document.querySelectorAll('.btn, .btn-line, button, .carousel__arrows button')) {
      const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (!b.width || cs.visibility === 'hidden' || el.closest('[hidden], .menu, .drawer, [aria-hidden="true"]')) continue;
      if (el.closest('.carousel__copy:not(.is-active)')) continue;
      const name = (el.className || el.tagName).toString().split(' ').slice(0, 2).join('.') + ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 22) + '"';
      if (el.matches('.btn, .btn-line')) {
        const k = el.matches('.btn--s') ? 'btn--s' : el.matches('.btn-line') ? 'btn-line' : el.closest('.header') ? 'header btn' : 'btn';
        out.sizes[k] = `${Math.round(b.height)}px / ${cs.fontSize} / pad ${cs.paddingLeft}`;
        // buttons parked off screen inside a horizontal scroller (services track) are not overflowing the page
        const inScroller = (() => { for (let a = el.parentElement; a; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if ((o === 'auto' || o === 'scroll') && a.scrollWidth > a.clientWidth) return true; } return false; })();
        if (el.scrollWidth > el.clientWidth + 1 || (!inScroller && (b.right > innerWidth + 0.5 || b.left < -0.5))) out.wrap.push(name);
      }
      if ((b.height < 44 || b.width < 44) && !el.matches('.carousel__bar, .carousel__toggle')) out.small.push(`${name} ${Math.round(b.width)}×${Math.round(b.height)}`);
    }
    return out;
  });
  console.log(`\n== ${W}x${H} overflowX=${r.overflow}`); console.log(' sizes', r.sizes);
  console.log(' under 44px:', r.small.length ? '\n   ' + [...new Set(r.small)].join('\n   ') : 'none');
  console.log(' clipped/overflowing labels:', r.wrap.length ? r.wrap.join(', ') : 'none');
  await p.close();
}
await browser.close();
