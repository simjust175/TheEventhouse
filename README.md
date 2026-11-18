# The Event House — design prototype

Static front-end prototype for a Swiss luxury events studio (provisional brand). Homepage modelled on the layout hierarchy and motion principles of the Vineyard reference. Gallery and Collection pages follow the client-approved mockups in `references/`. It includes a working front-end enquiry basket (no payment, backend or data transmission).

**Not for public deployment.** All pages carry `noindex`; photography is placeholder.

## Preview

```bash
npm install          # once: dev tools + vendored libs (already installed in this folder)
npm start            # serves ./site → http://localhost:4600/
```

If you change anything in `src/`, rebuild the HTML first: `node tools/build.mjs` (or `node tools/build.mjs --watch`).

Pages: `/` (home) · `/gallery.html` · `/collection.html` · `/enquiry.html`

## Structure

| Path | What it is |
|---|---|
| `src/pages/*.html` | Page sources. `<!-- @include name -->` pulls in `src/partials/name.html` |
| `src/partials/` | Shared shell: header, menu overlay, basket drawer, footers, CTA band, icon sprite, scripts |
| `site/` | Built, servable output (HTML generated; `assets/` edited directly) |
| `site/assets/css/` | `main.css` (tokens, shell, shared components) · `home.css` · `pages.css` (gallery/collection/enquiry) |
| `site/assets/js/` | `core.js` (basket, drawer, menu, reveals, Lenis) · `products.js` (placeholder catalogue) · `picker.js` (bespoke Occasion / Date / Guests controls) · one file per page |
| `site/assets/vendor/` | GSAP 3.13 + ScrollTrigger + SplitText, Lenis 1.3 (self-hosted, pinned) |
| `site/assets/fonts/` | Cormorant Garamond + Jost (OFL, self-hosted) |
| `tools/` | Build, server, reference capture, QA and test scripts |
| `site/assets/js/config/hero-media.js` | Homepage hero photos/videos (see below) |
| `site/assets/video/` | Hero clips (placeholder, rendered from our stills by `tools/make-hero-clips.sh`) |
| `docs/` | `01_REFERENCE_ANALYSIS.md` (Phase 1) · `02_IMPLEMENTATION_AND_QA.md` (summary, QA, limitations, missing materials) · `03_MOTION_REFINEMENT.md` (hero media, parallax, capsule/circle, carousel, final refinements, motion QA) · `04_ENQUIRY_CONTROLS.md` (custom dropdowns and calendar, accessibility, form QA) |
| `qa/` | Screenshot evidence (`compare/` holds the side-by-side sheets) |

## Re-running QA

```bash
node tools/interaction-test.mjs            # 37 desktop checks (menu, carousel, hotspots, basket, filters, lightbox, quick view, form, focus)
node tools/interaction-test.mjs --mobile   # 36 checks at 390px
node tools/qa-shots.mjs index.html desktop --step 0.5     # scroll-position frames + overflow/console report
node tools/qa-shots.mjs index.html mobile --reduced       # reduced-motion pass
node tools/fullpage.mjs gallery.html qa/compare/gallery-1440-full.png
python tools/side_by_side.py references/gallery_APPROVED_first_design.png qa/compare/gallery-1440-full.png qa/compare/gallery_vs_mockup.jpg
python tools/pair_sheets.py qa/reference/desktop qa/build/index-desktop qa/compare/home-desktop
node tools/verify-motion.mjs               # hero media, parallax, carousel+parallax, capsule/circle, perf at 1440/1920/768/390
node tools/verify-motion.mjs --only oval   # one suite: hero | parallax | carousel | oval | perf
node tools/parallax-gif.mjs 1440 && python tools/make_gifs.py   # frame-locked parallax GIFs → qa/motion/
node tools/verify-carousel.mjs            # category carousel: autoplay, timer reset, pausing, layout stability (4 viewports)
node tools/compare-carousel.mjs           # carousel composition vs vineyard.co.za at identical viewports → qa/compare/carousel/
node tools/verify-refine.mjs              # rounded-feature morph, footer parallax, hover navigation, reduced motion (6 viewports)
python tools/oval_sheet.py               # start / halfway / final morph frames side by side → qa/motion/oval/
node tools/audit-targets.mjs              # touch targets ≥ 44px and button labels at 390–1440px
node tools/verify-forms.mjs               # enquiry pickers: selection, keyboard, calendar rules, time zones, GET hand-off, sheets, no-JS
node tools/verify-forms.mjs --only=flow   # one suite: home | flow | tz | enquiry | mobile | misc
python tools/bar_compare.py              # closed enquiry bar before / after → qa/forms/bar-before-after.jpg
```

All QA scripts expect the preview server on port 4600 and Google Chrome at its default Windows path (override with `CHROME_PATH`).

## Swapping the brand

The brand is provisional by design:
- **Name and wordmark:** `src/partials/header.html`, `menu.html` and the footers, plus the `i-emblem` symbol in `icons.html`.
- **Colours and type:** the `:root` tokens at the top of `site/assets/css/main.css`.
- **Catalogue:** `site/assets/js/products.js`.
- **Photography:** `site/assets/img/` (listed in `tools/image-manifest.json`).

## Changing the hero media

Edit only `site/assets/js/config/hero-media.js`. The hero takes any mix of photos and videos, in order:

```js
items: [
  { type: 'video', src: { desktop: 'assets/video/a.mp4', mobile: 'assets/video/a-m.mp4' }, poster: 'assets/img/a.webp', alt: '…', duration: 8000 },
  { type: 'image', src: 'assets/img/b.webp', position: { desktop: '50% 55%', mobile: '58% 50%' }, alt: '…' }
]
```

- **One item:** shows a still photo or a looping video.
- **Two or more:** they crossfade on a timer.
- **Videos:** always play muted, looped and inline, and fall back to their poster if needed.
- **Mobile:** `src`/`position` can differ per breakpoint, and `show: 'desktop' | 'mobile'` limits an item to one breakpoint.
- **Text:** the headline and enquiry button are unaffected.
