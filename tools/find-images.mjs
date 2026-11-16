// Searches Unsplash (free-licence results only) for candidate event photography.
// Writes candidates JSON + thumbnail contact sheets for manual art-direction review.
// Usage: node tools/find-images.mjs <outDir> "query one" "query two" ...
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [outDir, ...queries] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const all = {};
for (const q of queries) {
  const url = `https://unsplash.com/s/photos/${encodeURIComponent(q.replace(/\s+/g, '-'))}?license=free`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3500);
  for (let k = 0; k < 4; k++) { await page.mouse.wheel(0, 1600); await page.waitForTimeout(700); }
  const items = await page.evaluate(() => {
    const res = [];
    document.querySelectorAll('figure').forEach((fig) => {
      const a = fig.querySelector('a[href^="/photos/"]');
      const img = fig.querySelector('img[src*="images.unsplash.com/photo-"]');
      if (!a || !img) return;
      const author = fig.querySelector('a[href^="/@"]');
      res.push({ page: 'https://unsplash.com' + a.getAttribute('href'), src: img.src.split('?')[0], alt: img.alt, author: author?.textContent?.trim() || '', authorUrl: author ? 'https://unsplash.com' + author.getAttribute('href') : '' });
    });
    const seen = new Set();
    return res.filter((r) => !seen.has(r.src) && seen.add(r.src));
  });
  all[q] = items.slice(0, 24);
  // contact sheet
  const html = `<html><body style="margin:0;background:#222;font:11px sans-serif;color:#fff;display:grid;grid-template-columns:repeat(6,1fr);gap:4px">${all[q].map((it, i) => `<div><img src="${it.src}?w=320&q=60" style="width:100%;height:180px;object-fit:cover;display:block"><div>${i}</div></div>`).join('')}</body></html>`;
  const p2 = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  await p2.setContent(html, { waitUntil: 'networkidle' });
  await p2.screenshot({ path: path.join(outDir, `${q.replace(/\W+/g, '_')}.jpg`), fullPage: true, quality: 70, type: 'jpeg' });
  await p2.close();
  console.log(q, all[q].length);
}
fs.writeFileSync(path.join(outDir, 'candidates.json'), JSON.stringify(all, null, 2));
await browser.close();
