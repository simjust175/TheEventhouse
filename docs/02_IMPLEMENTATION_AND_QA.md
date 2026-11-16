# Phase 2–3: implementation summary, visual QA, limitations

Prepared 16 Nov 2026. Preview: `npm start` → **http://localhost:4600/** (see README).

## 1. What was built

| Page | Basis | Contents |
|---|---|---|
| **Home** (`/`) | Vineyard layout hierarchy and motion (see `01_REFERENCE_ANALYSIS.md`) | Pinned hero: a full-bleed venue image shrinks into a portrait frame and then a square while images crossfade, with an enquiry bar (occasion / date / guests) in place of the booking bar. Intro with six service icons. "One enquiry" strip. Full-height **Events carousel** (Weddings / Private celebrations / Corporate / Florals) with ghosted neighbouring titles, a circular "Next/Prev" cursor and a clip-path circle reveal. **Collection teaser** feeding the Collection page. Staggered image trio. **How we work** process section (replaces reviews). Oval-reveal **Florals** feature. **Explore a styled table** hotspots (replaces the resort map); each hotspot opens a piece card with "Add to enquiry". **Services slider** (replaces offers). **Inspiration** cards (replaces diaries). FAQ. Gallery strip. Dark footer closing on an image band. |
| **Gallery** | `references/gallery_APPROVED_first_design.png` | Left-aligned image hero, "Explore the collection" chips, 12-column mosaic reproducing the mockup's tile rhythm. Filters work, including via `?filter=` deep links. Lightbox with keyboard and swipe navigation and a "Plan something similar" link. CTA band and the mockup's four-column dark footer. |
| **Collection** | `references/collection_APPROVED_first_design.png` | Centred hero, intro, category tabs, then the mockup's editorial sequence (featured piece with two minis, "The edit" band, Florals spotlight, curated essentials). Below it, a filterable **full catalogue** of 18 placeholder pieces. Quick view supports quantity and "Add to enquiry", and `#p-<id>` deep links open it directly. "Build Your Collection" CTA band and compact footer. |
| **Enquiry** | Shell styling | Selection review with editable quantities, plus the event form (occasion, date, guests, venue, services, contact details, language, message, consent). Validation runs in the browser and ends with a confirmation screen. **Nothing is transmitted**, and the page says so. |

**Shared shell**
- Header: transparent over the hero, turning solid on scroll, with a label-swap hover.
- Full-screen menu overlay: a 66% cream panel beside a 34% image.
- Basket drawer and toast. The basket is stored in `localStorage`, with an in-memory fallback.
- Smooth scrolling via Lenis, and line-by-line SplitText reveals.

**Separation**
- This is a new standalone project with no PartyPack code or assets.
- No Vineyard logo, photography, copy or source code is used. The behaviours were re-implemented from measurements.
- Photography is placeholder imagery from images.unsplash.com.
- The fonts are open-licence and self-hosted.

## 2. Side-by-side comparisons

All comparison images are in `qa/compare/`.

| Comparison | File(s) | Result |
|---|---|---|
| Home vs live reference, **desktop 1440×900**, matched scroll positions (every ~450px) | `home-desktop_01…05.jpg` | The section order and rhythm match frame for frame: hero pin, intro and icons, strip, 100vh carousel, two-column editorial, trio, quiet band, oval, wide interactive image, slider, three cards, FAQ, strip, dark footer and image band. Page height is 11,003px against the reference's 11,182px. |
| Home vs live reference, **mobile 390×844** | `home-mobile_01…04.jpg` | The same sequence. The mobile carousel uses arrow buttons and swipe; the services slider and gallery strip use native horizontal scroll. |
| Gallery vs approved mockup (full page, 1440) | `gallery_vs_mockup.jpg` | Matches the mockup's hero, chip row, mosaic rhythm, CTA band and footer. Differences are listed in §4. |
| Collection vs approved mockup (full page, 1440) | `collection_vs_mockup.jpg` | The hero, intro, tabs and all four editorial blocks match in order and proportion, followed by the added catalogue. |
| Tablet 820 / mobile sheets for every page | `sheet-*-tablet.jpg`, `sheet-*-mobile.jpg` | Reviewed. No overflow and no clipped controls. |
| Reduced motion (desktop and mobile) | `sheet-index-*-reduced.jpg` | Hero is static, with no pinning or parallax. All content is visible straight away and the carousel switches instantly. |
| Hover states | `qa/interaction/hover-sheet.jpg` | Nav label swap, pill hover, "Quick view" chip, the gallery's "View image" overlay and the carousel's circular cursor. |

## 3. Functional QA results

- **Interaction tests** (`tools/interaction-test.mjs`): **37/37 pass at 1440px**, **36/36 at 390px**, with 0 JavaScript errors. They cover:
  - skip link and visible focus rings;
  - menu open, focus trap, Esc and focus return;
  - hero enquiry bar → enquiry page with prefilled fields;
  - carousel next and previous;
  - hotspot card, add to basket, toast and badge;
  - drawer quantity +/− with focus retained, remove, and Esc;
  - services slider, FAQ, and in-page navigation from the header and menu;
  - collection tabs with live-region status, featured add, quick view (quantity 3 merges with the existing line), "Explore décor" jump, and `#p-` deep link;
  - gallery filter, lightbox open / ArrowRight / Esc with focus restored, and `?filter=` preselect;
  - enquiry prefill, error messages with focus on the first invalid field, email validation, success screen, and "Start a new enquiry" clearing the basket.
- **Overflow and console** (`tools/qa-shots.mjs`): every page at 1440, 820 and 390 reports 0 horizontal overflow and 0 console errors. The overflow check now also catches mobile layout-viewport widening.

### Defects found by QA and fixed

1. **Mobile homepage zoomed out to 433px.** The gallery-strip progress bar (`width: 40rem` in an auto grid track) widened the layout viewport, which cropped the header's "Enquire" pill.
2. **Hotspot "Add to enquiry" did nothing.** The card stopped click propagation before the shared basket handler.
3. **Enquiry page header was never solid.** `[data-header]` matched `<body data-header>` before the header element. This also restores `aria-current` there.
4. **Hidden toast's button was still focusable** and appeared in full-page captures. It now uses `visibility`.
5. **Drawer lost keyboard focus** after +/− or Remove, and Esc stopped working. Re-renders now keep focus, and the trap listens at document level.
6. **Collection "The edit" band overflowed** the content width, and the Florals spotlight parallax exposed a gap at the bottom of the image.
7. **Tablet carousel buttons stretched** to full-width bars.

## 4. Intentional deviations from the approved mockups

- **Header.** Gallery and Collection use the same shell as the homepage: burger, nav, centred emblem, basket and "Enquire". The mockups showed a left wordmark with a phone number. The brief asked for one consistent provisional shell, and the basket has to be reachable on every page. The mockup's four-column dark footer is kept on both pages.
- **Contact details.** The mockups show a phone number, an email and "Zurich, Switzerland, by appointment". Those were not invented, so placeholders marked **TO CONFIRM** stand in their place.
- **Gallery** has 25 tiles against the mockup's 15. More tiles were needed so every filter category has enough images; the mosaic rhythm is the same.
- **Collection** adds a filterable full catalogue below the editorial blocks. Without it the tabs and "Add to enquiry" flow would have nothing to show. The editorial blocks hide while a filter is active.
- **Photography differs.** The mockups use AI-rendered warm candlelit scenes. The prototype uses the closest available stock (see §6).

## 5. Missing client materials

1. **Final name, logo or wordmark, and brand colours and type.** "The Event House" and the double-arch emblem are placeholders.
2. **Original photography of the studio's own events**, plus product shots of real inventory. The mockups' candlelit look relies on this.
3. **Real catalogue:** item names, categories, photos, dimensions, quantities available, and lead times.
4. **Contact details:** phone, email, studio address and hours, service area or regions, and social channels.
5. **Copy sign-off:** intro, process steps, FAQ answers and service descriptions (all marked as provisional).
6. **Privacy and consent wording, and an imprint (Impressum)** for a Swiss business. Language versions (DE / FR / IT) if required.
7. **Where enquiries should go:** email inbox, CRM or form service, for the production phase.

## 6. Known limitations, blockers and unverified details

- **Photo credits unconfirmed.** unsplash.com pages are blocked by the local network filter (Techloq), so photographer names could not be retrieved; only the images CDN was reachable. The images fall under the Unsplash License, but credits should be confirmed, or the images replaced, before any public use. IDs are listed in `tools/image-manifest.json`.
- **No image generation.** No KIE / image-generation key was available, so no bespoke imagery was produced to match the mockups' lighting.
- **Enquiry is front-end only.** It shows a demo reference number and sends nothing. There is no payment, checkout, CMS or backend, as briefed.
- **Unverified reference details.**
  - Carousel reveal timing was estimated from 110ms frame sampling.
  - Mobile swipe physics could not be captured headlessly.
  - The hero video's frame list was not enumerable, so the crossfade sequence was matched by eye.
  - See `01_REFERENCE_ANALYSIS.md`.
- **Gallery on mobile.** The two-column masonry can end with one column a tile longer than the other.
- **Browser coverage.** Testing was automated in Chrome (desktop and mobile emulation). Safari/iOS and Firefox have not been checked on real devices.
- **`qa/` holds about 146 MB** of screenshots. It is evidence only, can be deleted, and can be regenerated with the commands in the README.
