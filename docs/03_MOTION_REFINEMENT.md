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
