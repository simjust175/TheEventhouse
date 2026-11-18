# Motion refinement pass: hero media, parallax, rounded feature

Prepared 16 Nov 2026. This was a targeted pass: the layout, type, spacing, Gallery and Collection are unchanged. Preview: `npm start` → http://localhost:4600/

## 1. Hero: configurable photos and videos

| | |
|---|---|
| **Configuration** | `site/assets/js/config/hero-media.js` (schema documented at the top of the file). This is the only file to edit when changing the hero. |
| **Component** | `site/assets/js/hero-media.js` (`TEH.HeroMedia(container, config, { toggle })`), mounted by the existing pinned hero in `home.js` |
| **Supports** | one photo · one video · several photos · several videos · any mixed order |
| **Per item** | `type`, `src` (string or `{desktop, mobile}`), `poster`, `position` (crop per breakpoint), `alt`, optional `duration`, optional `show: 'desktop' \| 'mobile'` |
| **Global** | `breakpoint` (768px), default `duration`, `fade` (crossfade length) |

**Crossfades and loading**
- Each new item fades in over the previous one, which stays fully opaque until the fade ends, so the frame is never blank.
- The next item is loaded and decoded before its fade starts.
- Photos drift very slightly (7% → 0) while they are on screen.

**Video**
- Videos are muted, looped, inline, and autoplay with a poster.
- If autoplay is refused, the poster stays up.
- A missing or broken file is replaced by its poster image.
- Clips that have faded out are paused.

**Behaviour**
- The sequence pauses when the hero is off screen or the tab is hidden.
- A small pause/play button covers WCAG 2.2.2 (moving content). It is hidden when there is nothing moving.
- Under reduced motion only the first item shows, as a still.
- The pinned contraction (full-bleed → portrait → square) still runs as before. It now scales the whole media layer, and the sequence itself is timed rather than scroll-linked.

**Admin-ready.** A future CMS only needs to output the same object (or JSON of the same shape) before `hero-media.js` loads. No component changes are needed.

**Placeholder footage.** No licensed event footage was available, so `site/assets/video/*.mp4` are slow camera-move clips rendered from our own placeholder stills by `tools/make-hero-clips.sh`.
- Desktop: 1920×1080, 1.9–3.4 MB.
- Mobile: 720×1280 portrait, 0.5–1.4 MB.
- Each plays forward then reverses, so the loop is seamless.

Replace them with real footage through the config.

## 2. Genuine scroll parallax

The photograph moves inside a fixed frame at a fraction of the scroll speed. Rates were measured on the live reference (`tools/inspect-parallax.mjs` → `qa/reference/parallax/1440.json`).

| Section | Reference rate | Ours (desktop, measured) |
|---|---|---|
| Category carousel (all four slides share one scroll range) | 0.15 | 0.151 |
| Collection teaser images | ~0.07 (rooms) | 0.072 |
| Three-image composition: sides / centre | 0.062 / 0.086 | 0.072 / 0.092, plus the existing staggered frame drift as a second depth layer |
| Florals capsule | 0.10 (pool reel) | 0.10 base, plus a 1.08 → 1 settle scale |
| Gallery-preview strip | static | 0.05 (subtle, as requested) |
| Footer image band | static | 0.12 |
| Collection Florals spotlight (existing) | — | 0.08, now using the same overscan system |

**How it works.** `TEH.parallax` in `core.js` is driven by the `data-parallax="rate"` attribute.
- The photo is made taller than its frame by exactly the distance it will travel, then offset by half of that, so no edge can show.
- Movement uses the independent CSS `translate` property, so it composes with reveal scales and the carousel's zoom-in.
- GSAP 3.13 overwrites inline `translate` when it tweens transforms on the same element. For that reason, zooms on parallax images use a `--zoom` → CSS `scale` property.
- Parallax triggers are computed after the hero pin (`refreshPriority: -1`). Without this, every later section's range was offset by the pin.
- On mobile and tablet the rate is 60% of desktop, and the trio's frame drift is halved.
- Reduced motion turns parallax off.
- Services and Inspiration cards stay static, matching the reference.

## 3. Rounded feature: capsule and circle

| Width | Shape | Measured |
|---|---|---|
| ≥ 800px | Capsule: one radius equal to half the height, so the ends are semicircles and the top and bottom are straight | 1440: 1400×634, radius 317, 766px straight edge · 1920: 1867×778, 1,089px straight edge |
| < 800px | True circle (`aspect-ratio: 1`, radius = half the width) | 768: 718×718, radius 359 · 390: 357×357, radius 178.5 |

The radius grows from a soft rectangle to the final shape as the section scrolls in. It is a single length, so the shape can never be an "rx / ry" ellipse. Without JavaScript or with reduced motion, the CSS gives the final shape directly.

On mobile the copy is limited to the circle's inscribed area, keeping the first sentence. Live resizing across the breakpoint switches the shape cleanly in both directions.

## 4. Verification (`tools/verify-motion.mjs`, Playwright + Chrome)

Viewports tested: 1440×900, 1920×1080, 768×1024 (touch), 390×844 (touch).

- **Hero (12 checks).**
  - Each media combination: single photo, single video (muted, loop, inline, playing, poster), pause toggle, several photos (every item shown), several videos (second clip plays, faded clip paused) and mixed (production config).
  - Fallbacks and variants: a broken video falls back to its poster; mobile uses the portrait encode and mobile crop; reduced motion shows a still with no toggle.
  - Crossfade: measured mid-fade, the new layer is at 15% opacity over the previous image at 100%.
- **Parallax (8 sections × 4 viewports).**
  - Each image was sampled at five scroll positions across its pass through the viewport.
  - The photo moves inside its frame at the rates above, and the minimum remaining overscan is never below 0px, so no blank edge appears at any sample.
  - Frame-locked GIFs show the photo moving under a still frame and text (`qa/motion/parallax-<width>-<section>.gif`, with first/last stills).
- **Carousel and parallax together (4 viewports).**
  - The entering slide arrives at the same parallax offset as the one it replaces: −170 → −171.5 → −170px at 1440.
  - It keeps moving with scroll afterwards: −170 → −124.7px over 300px.
- **Shape (13 checks).** Capsule at 1440/1920 and circle at 768/390. All copy is inside the shape and centred, the radius grows on entry, and a live resize 1440 → 700 → 1440 works.
- **Stability and performance.**
  - No horizontal overflow and no console errors at any width.
  - Document height is unchanged by scrolling, and there is no unexpected layout shift. The pinned hero's deliberate resize is reported separately.
  - At 390px with 4× CPU throttling and real touch swipes, the whole page scrolls at 63–83 fps on average over two runs. In the final full run, 1 of 1,200 frames exceeded 50ms and 95% of frames finished within 17ms. Desktop 1440 averages 112–118 fps with no frames over 50ms.
  - Final full run: **69/69 checks passed** (`qa/motion/verify-log.txt`).
- **Regression.**
  - Interaction suite: 37/37 desktop and 36/36 mobile.
  - Collection and Gallery: no overflow and no errors.
  - Homepage vs reference sheets regenerated in `qa/compare/`.

**Test-harness notes.** These are not site issues.
- CDP's `synthesizeScrollGesture` does not scroll in this headless Chrome, even on a blank page, so raw touch events are used.
- Playwright's element click scrolls the 100vh carousel hover zone into view first, so the carousel check clicks by coordinates, as a visitor would.

## 5. Still open

- Real hero footage, and real photography generally (the clips are derived from placeholder stills).
- Not checked on physical iOS or Android devices. The touch, autoplay and performance figures come from Chrome emulation.

## 6. Category carousel: autoplay and vertical composition (17 Nov 2026)

These values were measured on the live reference with `tools/inspect-carousel.mjs` (output in `qa/reference/carousel/`), and compared at identical viewports with `tools/compare-carousel.mjs` (output in `qa/compare/carousel/<w>-pair.jpg`).

**Autoplay**
- **Reference:** Swiper `delay 5000` plus `speed 1400`, so one change every ~6.4s, measured at 6.4s. The timer restarts after interaction, and the active indicator line fills while the slide holds.
- **Our timing:** each slide holds for 5.3s after its 1.1s transition, giving 6.4s, measured at 6.39–6.41s.
- **One timer:** there is only ever one timer. Every change, manual or automatic, cancels it, and it restarts once the new slide has fully arrived, so a chosen slide always gets the full hold.
- **Manual selection:** the side zones and cursor, the arrows, swipe, the arrow keys, and the four indicator lines, which are now buttons.
- **Pausing:** it pauses when the carousel is off screen, when the tab is hidden, while keyboard focus is inside it, or via the small pause button beside the counter (WCAG 2.2.2). The reference keeps running off screen; we pause, as requested.
- **Reduced motion:** no autoplay and no pause button; the indicators still work.
- **Screen readers:** automatic changes are not announced; manual ones are.
- **Titles:** a title that would have wrapped around (or jumped two places) now glides off or on screen from the direction of travel instead of teleporting.

**Vertical composition**

The reference's 5rem equals our 8rem, because our rem is 1.6× smaller at every width.

| | Reference | Ours |
|---|---|---|
| Desktop (≥1100px) | Content block centred on the section: the tagline starts at exactly 50%; the title sits 5rem above it, the CTAs 5rem below the text, and the pager 5rem from the bottom | Same anchors via `--cz-top` / `--cz-copy` / `--cz-gap` / `--cz-bottom`; the gap is `min(8rem, 9svh)`, so it eases on short screens |
| Tablet and phone | Top-anchored: the title 10rem from the top, 2.5rem gaps, the pager 5rem from the bottom | The title at `min(16rem, 19.7svh)`, 4rem gaps, the pager at `min(8rem, 9.8svh)` |

Measured result (title top / gaps title→tagline, text→CTA, counter→bottom, in px):

| | Reference | Ours |
|---|---|---|
| 1440×900 | 274 / 67, 67, 67 | 274 / 67, 67, 67 |
| 1920×1080 | 306 / 89, 89, 89 | 306 / 89, 89, 89 |
| 768×1024 | 166 / 41, 41, 83 | 166 / 42, 41, 83 |
| 390×844 | 166 / 42, 42, 83 | 176 / 42, 42, 83 |

**Remaining differences**
- These come from our protected typography: the tablet title is 136px against the reference's 77px, and our taglines are longer.
- At 390 the title top differs by 10px. "Weddings" is reduced a little so it fits between the arrows, and the title is bottom-anchored, so the gap to the tagline stays the same.

**Stability**
- All four copies share one grid cell, so the title, tagline and CTAs sit at exactly the same height on every slide. Text length never moves anything.
- On phones and tablets, a title that is too wide is reduced just enough to clear the round arrows.
- Neighbour titles wait just off screen there (as the reference does), so no sliver shows behind the arrows. The desktop ghost titles are unchanged.

**QA**
- `tools/verify-carousel.mjs`: **80/80** at 1440, 1920, 768 and 390 (log in `qa/motion/verify-carousel-log.txt`). It covers:
  - autoplay order and interval
  - counter, indicator, copy and image staying in sync
  - an indicator click acting immediately and resetting the timer
  - rapid clicks never stacking timers
  - pausing off screen, in a hidden tab and with the button, and resuming
  - parallax still moving
  - reduced motion
  - identical positions across all four slides
  - no overlap, clipping, overflow or console errors
- Regression: interaction tests 37/37 and 36/36; motion `parallax` 38/38 and `carousel` 12/12.
- **Test fix:** the `carousel` check now measures the mid-transition state before taking its screenshot. A 1920px screenshot could outlast the 1.1s transition, which was the cause of the earlier intermittent d1920 failure.

## 7. Final motion and responsive refinements (17 Nov 2026)

Five targeted changes; the hero, Gallery and Collection are unchanged.

**1. Buttons on phones and tablets.** Below 1100px the rem scales with the viewport (about 8px at 600px wide), so the small buttons were 32–41px tall. Pixel floors now apply (`max()`, so nothing ever shrinks, and desktop is untouched):

| | Before (390 / 600px) | After |
|---|---|---|
| Small button (`.btn--s`) | 42 / 32px, 14.6 / 11.4px type | 46px, 15–15.6px type, 22px side padding |
| Standard button | 50 / 39px | 50px, 16px type, 26px side padding |
| Header Enquire pill | 35 / 29px | 44px (header 60px) |
| Round arrows, hotspots, legend rows, burger | 36–42px at 600px | ≥ 44px |

`tools/audit-targets.mjs` reports every control under 44px, plus any clipped label or overflow, at 390, 600, 768, 1024 and 1440. The only control left under 44px below 1100px is the hero's own pause toggle (42px), left alone because the hero is out of scope.

**2. Footer image band parallax.** This band ends the page, so it can never scroll past the top of the viewport. With the shared range (`top bottom` → `bottom top`), only about 40% of its movement ever played (78px at 1440), and it read as static.
- It now uses its own range, `data-parallax-end="bottom bottom"` (new option in `core.js`), at rate 0.3.
- The photo travels 197px inside its frame at 1440 (236px at 1920, 88px at 390).
- Overscan is sized to the exact range, so no edge can show.
- The button stays centred.

**3. Hover to navigate (category carousel, mouse only).**
- **Dwell:** resting on NEXT or PREV moves one slide after 2s, then again every 2s while the pointer stays. A hairline ring on the cursor traces the wait.
- **Cancelling:** leaving the zone cancels at once.
- **Clicks:** a click is instant and restarts the 2s wait, so it is never followed by a surprise second step.
- **One timer:** there is only ever one dwell timer, and autoplay is held while the pointer dwells, so the two can never compete.
- **Touch:** tap and swipe as before.
- **Reduced motion:** off.

**4. Autoplay every ~4s.** The hold was cut from 5.3s to 2.9s; the 1.1s transition is unchanged, so one change every 4.0s (measured 4.00–4.01s at all four widths). Timer reset, pausing and indicator sync are as in §6.

**5. Rounded feature: a visible, scroll-linked morph.**

*Why it went unnoticed.* The old trigger ran from `top bottom` to `center 55%` with an ease-out curve. Half the rounding happened while only the top ~200px of the frame was on screen, and it finished before the shape was ever fully in view.

*How it works now.*
- The frame sits in a stage (`.oval__stage`) and is CSS-sticky, centred in the viewport, for `--oval-hold` of scroll:
  - 75svh on desktop
  - 60svh on tablet
  - 55svh on phones
- CSS sticky means no pin spacer, no reparenting and no layout shift.
- The morph:
  - starts once 85% of the rectangle is visible
  - continues while the frame holds still
  - completes at 85% of the hold, so the finished capsule or circle rests briefly before it leaves
- A sine in-out curve makes the start, middle and end read as distinct states.
- The start radius is about 5% of the frame height.
- The photo's 1.08 → 1 settle follows the same progress.
- Its parallax uses the stage as its range, so it keeps drifting inside the held frame.
- Reduced motion and no-JS get neither the hold nor the morph, just the final shape.

| Viewport | Morph distance | Halfway radius / final |
|---|---|---|
| 1920×1080 | 960px (0.89 vh) | 217 / 389px capsule |
| 1440×900 | 816px (0.91 vh) | 173 / 317px capsule |
| 768×1024 | 804px (0.79 vh) | 196 / 359px circle |
| 390×844 | 696px (0.82 vh) | 110 / 178.5px circle |
| 1440×700 | 636px (0.91 vh) | 139 / 252px capsule |
| 390×640 | 504px (0.79 vh) | 111 / 178.5px circle |

Frames: `qa/motion/oval/<vp>-1-start.png`, `-2-halfway.png` and `-3-final.png`, with side-by-side sheets in `<vp>-sheet.jpg` (built by `python tools/oval_sheet.py`).

**QA.** `tools/verify-refine.mjs` covers:
- **Morph:** sampled every 12px of scroll, at six viewports including two short heights.
  - The morph starts with at least 80% of the frame visible.
  - The halfway state shows with the whole shape on screen.
  - It finishes fully visible, at the exact final radius.
  - The radius never reverses, and the shape never jumps.
  - The photo always fills the frame, and page height stays stable.
- **Footer band:** movement, overscan and button position.
- **Hover navigation:** timing, cancelling, PREV, click reset, rapid clicks, and touch.
- **Reduced motion.**

The oval checks in `tools/verify-motion.mjs` now measure the stage rather than the sticky frame. The `tools/verify-carousel.mjs` thresholds now expect the 4s cycle.

**Results**
- verify-refine: **85/85**
- verify-carousel: **80/80**
- verify-motion: **69/69** (includes all parallax sections, carousel and parallax together, shape, and performance; no horizontal overflow or console errors)
- interaction tests: **37/37** desktop and **36/36** mobile
- audit-targets: no button labels clipped, and nothing under 44px except the hero toggle

**Test change.** The desktop interaction test now moves the pointer off the NEXT / PREV zone after clicking. Leaving it resting there for 2s is, by design, another hover step.
