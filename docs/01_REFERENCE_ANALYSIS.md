# Phase 1: Vineyard reference analysis and interaction manifest

Captured 16 Nov 2026 with Playwright (system Chrome, headless) at **1440×900** and **390×844**,
plus the user's 49 s walkthrough (2548×1258 @30fps) and the supplied Firecrawl/Chrome captures.
Raw captures: `qa/reference/desktop/`, `qa/reference/mobile/`, `qa/reference/motion/` (analysis only;
nothing from these folders is shipped in `site/`).

## Sources used, by priority

| Source | What it gave us | Limits |
|---|---|---|
| Live site, Playwright (`tools/inspect-reference.mjs`, `tools/inspect-motion.mjs`) | Section offsets, computed type/colour/transition values, hero pin geometry per 100px, carousel transition frames, oval radius per scroll step, menu overlay | JS is bundled (`main.js`); no `gsap`/`Swiper`/`Lenis` globals exposed, so library names are inferred from DOM classes (`pin-spacer`, `swiper-*`, `split-*`) |
| `vineyard_firecrawl_LATEST_…RAW_BRANDING.json` → `data.rawHtml` | Full section/class outline (header → 12 sections → footer), copy lengths, carousel slide structure, button markup (`btn-text` + `btn-text-hover` double label) | Branding extractor's font sizes are for one viewport only; verified against live computed styles |
| `vineyard_CHROME_SAVED_PAGE…html` + critical CSS | Design tokens: fluid rem (`html{font-size:.5787vw}` ⇒ 1rem = 10px at 1728px; mobile `2.6667vw` ⇒ 10px at 375px), easing `cubic-bezier(.19,1,.22,1)`, slider ease `cubic-bezier(.6,0,.2,1)`, header 12rem → 6.4rem, container 140rem, breakpoint 1099/1100px | Critical CSS only; linked stylesheets absent. Note: a `…_files` folder **is** present beside the saved HTML in this workspace (contrary to the manifest note), but it holds third-party widget CSS/JS (Bootstrap, Dineplan, reCAPTCHA, GTM) and no theme bundle or media |
| `vineyard_walkthrough.mp4` | Real-time feel of the hero shrink, carousel circle reveal, oval video, footer reveal | Screen recording; no timing metadata |
| `vineyard_firecrawl_SEARCH_export.json` (earliest) / processed DOM | Cross-check only; same section order | Superseded |
| `vineyard_fullpage_screenshot_unreliable.png` | Not used for geometry (pin-spacer distortion confirmed) | |

## Section order and measured layout (desktop 1440 / mobile 390)

| # | Reference section | Desktop measurements | Mobile | Event House adaptation |
|---|---|---|---|---|
| 0 | **Header**: burger + 5 text links left, centred logo, filled pill "Book Now" right; booking bar floating bottom-centre over hero | 100px tall transparent → **53px** cream `rgba(255,249,243)` within ~200px scroll; `transition: 1s expo-out` on height/background | 58px; burger, logo, pill | Same structure: burger + Events/Services/Collection/Gallery, centred provisional wordmark, "Enquire" pill + basket count. Floating bar becomes an **event enquiry bar** (event type · date · guests → Begin enquiry) |
| 1 | **Hero pin** (`section-home-hero`, pin-spacer) | Full-bleed video 1440×900. Scroll 0→700px: media shrinks to ~310×415 portrait centred, crossfading through 3–4 frames; 700→1300px: shrinks to **208×208** square; then releases and scrolls up with overline, H2 (Optima 38px), 2 paragraphs, 7 line-icons | Same sequence, portrait | Same choreography with our own 4-frame image sequence (venue → table → florals → candles), intro copy and 6 original line-icons for services |
| 2 | **Trust strip** (sage `#D2DFD9`, 133px) | Google rating left, "Best Available Rate" + pill centre, TripAdvisor right | Stacked, 387px | **No invented ratings.** Strip holds three neutral service statements + "Begin an enquiry" pill |
| 3 | **Category carousel** (`section-categories`, 100vh) | Full-bleed image; centred title Optima **109px** white; ghost neighbour titles at left/right edges (clipped); tagline 17.5px serif + 13px text + two pills; `n / 4` counter; prev/next **hover zones = outer 403px, full height**, with a circular cursor labelled "Next"/"Prev"; click ⇒ **circular clip reveal** of next image from cursor (~600ms) while the title strip slides one step, copy fades in after ~450ms | Arrows as circular buttons on the title line; swipe | Weddings · Private Celebrations · Corporate & Gala · Florals & Décor, each linking to Events/Services/Collection |
| 4 | **Rooms** editorial split | Left column: overline, H2 29px, two paragraphs, outline pill; right: stacked cards (image 180×135 + title 22px + text + 2 pills) | Single column | **Collection teaser**: left editorial copy, right stacked product cards with "Add to enquiry" + "View in collection" |
| 5 | **Media trio** with logo divider | Three images; centre one taller and offset upward; side images parallax at different rates | Two-up row | Same, event imagery, monogram divider |
| 6 | **Reviews** (sage `#B6C8C0`) | Centred H2 + 4 columns of review text + stars | Stacked | **No fabricated testimonials.** Becomes "How we work" four-step process on the same tinted band |
| 7 | **Play: oval video** | 1392×860 media; `border-radius` grows from ~95px to 430px (full ellipse) as it enters; centred overline/H2/text/pill on top | Tall ellipse | **Signature florals feature** in the same expanding oval, slow scale on the image (no video supplied) |
| 8 | **Map / 3D walkthrough** | Illustrated map with pins; card pop-ups | Map + button | **"Anatomy of a table"**: top-down tablescape with hotspots; each pin opens a card that can add that piece to the enquiry basket |
| 9 | **Offers slider** | Left text column (H2 + text + outline pill), right horizontal cards (title above image, text, pill), arrows under left column | Swipe | **Services** slider: Full planning · Design & styling · Florals · Rentals only (copy provisional) |
| 10 | **Blog** (cream bg) | Line icon, centred H2, 3 cards | Swipe | **Inspiration** cards linking to Gallery filters |
| 11 | **FAQ** accordion | Centred H2, 5 rows, `+` icon rotates, 0.8s expo | Same | Enquiry-process FAQ (answers flagged where client confirmation is needed) |
| 12 | **Instagram** paired sliders | Image pairs + progress bar + counter | Same | Gallery strip linking to Gallery (no social claims) |
| 13 | **Footer** (navy `#151D25`) | Centred logo + tagline, big serif links left, 5 link columns, contacts, rating row; then **full-bleed image band with centred CTA pill** | Accordion columns | Dark espresso footer with the same structure; contact fields left as clearly marked placeholders; image band "Begin your enquiry" |
| – | **Menu overlay** | Left 66% cream panel with 6 large serif links (≈48px), address + contact pill bottom; right 34% full-height photo; close × top-left | Full screen | Same layout, our links and image |

## Type, colour and motion tokens (measured → adapted)

| Token | Reference (computed) | Event House (independent choice) |
|---|---|---|
| Fluid root | 1rem = 10px @1728 (`.5787vw`), 10px @375 mobile | Same technique: `html{font-size:calc(100vw/172.8)}` desktop, `calc(100vw/37.5)` ≤1099px, clamped |
| Display face | Optima (licensed), 400 | **Cormorant Garamond** 400/500 + italic (OFL, self-hosted). Matches the italic serif of the approved mockups |
| Text face | Mori (licensed) | **Jost** 300/400/500 (OFL, self-hosted) |
| Sizes @1440 | carousel title 109px; H2 38px; section title 29px; card title 22.5px; tagline 17.5px; body 13.3px; overline 11.7px caps +0.04em | Same scale in rem, via `--fs-*` tokens |
| Colours | cream `#FFF9F3`, satin `#FFFEFD`, navy `#151D25`, terracotta `#B6522E`, sage `#D2DFD9`/`#B6C8C0` | ivory `#F6F1EA`, paper `#FBF8F4`, espresso `#221B16`, bronze `#8C5E3C`, sand `#E6DCCF`/`#D9CCBC` (provisional, all in `tokens.css`) |
| Ease | `cubic-bezier(.19,1,.22,1)` (expo-out) 0.6–1s; slider `cubic-bezier(.6,0,.2,1)` | Same curve family (standard expo-out / in-out curves, not proprietary) |
| Buttons | 40px pill, label swaps on hover (`btn-text` slides up, `btn-text-hover` slides in) | Pill on home, rectangular line buttons on Gallery/Collection per mockups; independent label-swap hover |
| Text reveals | `split-title`/`split-text`: lines rise + fade on enter | GSAP SplitText (free since 3.13) lines mask-reveal, 1s expo-out, 0.08s stagger |

## Libraries (inferred)
Pinning uses a ScrollTrigger-style `pin-spacer`; sliders use Swiper class names; text uses split-line classes;
`html{overflow:hidden}` on desktop indicates a custom smooth-scroll wrapper. We use our own code with
GSAP + ScrollTrigger + SplitText (GSAP standard licence, free) and Lenis (MIT). No Vineyard JS, CSS, fonts,
logos, icons, copy or media are reused.

## Unverified details
- Exact durations of the carousel circle reveal are estimated from 110ms frame sampling (~550–650ms).
- Mobile carousel swipe physics were not captured (headless touch); behaviour inferred from DOM and video.
- The hero video's frame list could not be enumerated (blob URL); the image crossfade sequence was observed visually.
