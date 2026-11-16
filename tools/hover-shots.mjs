// Hover-state evidence (desktop): nav label swap, primary pill, carousel cursor, collection card, gallery tile.
// Usage: node tools/hover-shots.mjs  → qa/interaction/hover-*.png
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const go = async (u) => { await p.goto('http://localhost:4600/' + u, { waitUntil: 'load' }); await p.waitForTimeout(1300); };
const to = (s) => p.evaluate((s) => { const el = document.querySelector(s); TEH.lenis.scrollTo(el.getBoundingClientRect().top + scrollY - 200, { immediate: true }); }, s);
const clip = async (s, name, pad = 30) => { const r = await p.locator(s).first().boundingBox(); await p.screenshot({ path: `qa/interaction/hover-${name}.png`, clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: Math.min(1440, r.width + pad * 2), height: Math.min(900, r.height + pad * 2) } }); };
await go('index.html');
await p.evaluate(() => TEH.lenis.scrollTo(600, { immediate: true })); await p.waitForTimeout(600);
await p.hover('.nav a >> nth=1'); await p.waitForTimeout(700); await clip('.header', 'nav', 0);
await p.hover('.header .btn--primary'); await p.waitForTimeout(700); await clip('.header__right', 'pill', 12);
await to('[data-carousel]'); await p.waitForTimeout(800);
await p.mouse.move(1300, 450); await p.waitForTimeout(900); await p.screenshot({ path: 'qa/interaction/hover-carousel-cursor.png' });
await go('collection.html'); await to('[data-cgrid]'); await p.waitForTimeout(900);
await p.hover('[data-cgrid] > * >> nth=1'); await p.waitForTimeout(800); await clip('[data-cgrid] > * >> nth=1', 'card', 20);
await go('gallery.html'); await to('[data-mosaic]'); await p.waitForTimeout(900);
await p.hover('[data-mosaic] .tile >> nth=2'); await p.waitForTimeout(800); await clip('[data-mosaic] .tile >> nth=2', 'tile', 10);
await b.close(); console.log('hover shots saved');
