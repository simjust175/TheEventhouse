// Full-page capture for non-pinned pages (Gallery / Collection). Scrolls through first so every
// reveal has fired, then captures. Usage: node tools/fullpage.mjs <page> <out.png> [width]
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [pageName, out, w = '1440'] = process.argv.slice(2);
const width = parseInt(w, 10);
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 }, isMobile: width < 600, hasTouch: width < 600 });
await page.goto('http://localhost:4600/' + pageName, { waitUntil: 'load' });
await page.waitForTimeout(1200);
const h = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 400) { await page.evaluate((yy) => (window.TEH && TEH.lenis ? TEH.lenis.scrollTo(yy, { immediate: true }) : window.scrollTo(0, yy)), y); await page.waitForTimeout(120); }
await page.waitForTimeout(1500);
await page.evaluate(() => (window.TEH && TEH.lenis ? TEH.lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0)));
await page.waitForTimeout(900);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('saved', out);
