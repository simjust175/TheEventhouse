// Measures genuine scroll parallax on the live reference: for every visible <img>/<video>, record its
// offset inside the nearest clipping ancestor at successive scroll positions. If the offset changes
// with scroll, the photo moves at a different speed from its frame. Output: qa/reference/parallax/<w>.json
// Usage: node tools/inspect-parallax.mjs [width=1440] [url]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const W = parseInt(process.argv[2] || '1440', 10);
const URL = process.argv[3] || 'https://www.vineyard.co.za/';
const H = W < 600 ? 844 : 900;
const OUT = 'qa/reference/parallax';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: W, height: H }, isMobile: W < 600, hasTouch: W < 600 });
await page.goto(URL, { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(4000);
// dismiss cookie banners if any
await page.evaluate(() => { document.querySelectorAll('button').forEach((b) => { if (/accept|agree|ok/i.test(b.textContent || '') && b.offsetParent) b.click(); }); });

const docH = await page.evaluate(() => document.documentElement.scrollHeight);
const samples = [];
const STEP = 60;
let y = 0;
for (let i = 0; i < 400 && y < docH; i++) {
  if (W < 600) await page.evaluate((yy) => window.scrollTo(0, yy), y); else await page.mouse.wheel(0, i ? STEP : 0);
  await page.waitForTimeout(W < 600 ? 140 : 110);
  const s = await page.evaluate(() => {
    const out = [];
    const clipOf = (el) => { let a = el.parentElement; while (a && a !== document.body) { const cs = getComputedStyle(a); if (/(hidden|clip)/.test(cs.overflow + cs.overflowY) || cs.clipPath !== 'none' || (cs.borderRadius !== '0px' && cs.overflow !== 'visible')) return a; a = a.parentElement; } return null; };
    const path = (el) => { const p = []; let a = el; for (let k = 0; k < 4 && a && a !== document.body; k++) { p.unshift(a.tagName.toLowerCase() + (a.classList.length ? '.' + [...a.classList].slice(0, 2).join('.') : '')); a = a.parentElement; } return p.join('>'); };
    document.querySelectorAll('img,video').forEach((m) => {
      const r = m.getBoundingClientRect();
      if (r.width < 80 || r.bottom < 0 || r.top > innerHeight) return;
      const c = clipOf(m); const cr = c ? c.getBoundingClientRect() : { top: 0, left: 0, width: innerWidth, height: innerHeight };
      const cs = getComputedStyle(m), ccs = c ? getComputedStyle(c) : null;
      out.push({ key: path(m), src: (m.currentSrc || m.src || '').split('/').pop().slice(0, 40), mt: Math.round(r.top), mh: Math.round(r.height), ct: Math.round(cr.top), ch: Math.round(cr.height), cw: Math.round(cr.width), dy: Math.round(r.top - cr.top), tf: cs.transform, ctf: ccs ? ccs.transform : '', rad: ccs ? ccs.borderRadius : '' });
    });
    return { y: Math.round(scrollY), media: out };
  });
  samples.push(s);
  y = s.y + (W < 600 ? STEP * 2 : 0);
  if (W >= 600 && i > 3 && samples[i - 1].y === s.y && samples[i - 2].y === s.y) break;
}
// summarise: per media key, how dy changes vs scroll (parallax rate) and overscan
const by = {};
for (const s of samples) for (const m of s.media) (by[m.key + '|' + m.src] ||= []).push({ y: s.y, ...m });
const summary = Object.entries(by).filter(([, v]) => v.length > 4).map(([k, v]) => {
  const a = v[0], b = v[v.length - 1];
  const dScroll = b.y - a.y || 1;
  return { key: k, n: v.length, yRange: [a.y, b.y], dyRange: [a.dy, b.dy], rate: +((b.dy - a.dy) / dScroll).toFixed(3), overscan: +((a.mh / a.ch) || 0).toFixed(3), mh: a.mh, ch: a.ch, cw: a.cw, tfFirst: a.tf.slice(0, 60), tfLast: b.tf.slice(0, 60), radFirst: a.rad, radLast: b.rad };
});
writeFileSync(`${OUT}/${W}.json`, JSON.stringify({ url: URL, width: W, docH, summary, samples }, null, 1));
console.log(JSON.stringify(summary, null, 1));
await browser.close();
