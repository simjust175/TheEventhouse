# 04 · Enquiry controls: custom dropdowns and calendar

The Occasion, Date and Guests controls in the homepage enquiry bar, and their counterparts on `enquiry.html`, now use bespoke controls in place of the browser's native select and date popups. This document covers how they work, how to maintain them and how they were tested.

## 1. What changed

| Area | Before | Now |
|---|---|---|
| Occasion / Guests | Native `<select>`: OS list with a blue selection bar, heavy black arrow | Button trigger with a thin taupe chevron; floating ivory listbox (18px radius, soft warm shadow, 42px rows, bronze check on the selected row) |
| Date | Native `<input type=date>`: `dd/mm/yyyy` mask, OS calendar | Trigger showing `Choose a date` or `15/06/2027` with a fine calendar icon; bespoke calendar dialog (Monday first, Cormorant month title, bronze selected circle, today dot, month/year view, Clear / Today) |
| Field feedback (bar) | Square focus outline | A soft capsule behind the hovered, open or focused field, the same height as the CTA; bronze inset ring for keyboard focus |
| Phones (< 600px) | OS pickers | Bottom sheets with a title, 44px close button, dimmed backdrop and page scroll locked; 52px option rows, ≥ 44px day cells |
| Enquiry page | Native Occasion, Date, Guests, Language | The same component, styled to the form's underline fields; labels open the controls |
| Local dates | `min` came from `toISOString()` (UTC, so a day out around midnight in many time zones) | Local-date helpers throughout (`TEH.pick.iso/parse/today`) |
| Demo summary | Date shown as `2027-06-15` | `Tuesday 15 June 2027` |

The closed bar keeps its layout. At 1440px it measures 648px wide, against 645px with the native controls; at 1920px and 1280px the difference is under 1.5%. Its width no longer changes with the selection. `qa/forms/bar-before-after.jpg` puts the closed bar before and after side by side.

The bar remains hidden below 1100px, as it was before this work. Phone and tablet visitors meet these controls on `enquiry.html`.

## 2. Architecture

Everything lives in `site/assets/js/picker.js` and the "Bespoke pickers" section at the end of `main.css`. The trigger styles are in `home.css` (the bar) and `pages.css` (the form).

### Progressive enhancement
- The native `<select>` and `<input type=date>` stay in the form, with `hidden` and `aria-hidden` set. They remain the single source of truth, so the GET parameters are unchanged:
  - `type` = `wedding` / `private` / `corporate` / `other`
  - `date` = `YYYY-MM-DD`
  - `guests` = `under-30` / `30-80` / `80-150` / `150-plus`
- Without JavaScript the native controls show and work as before.
- Controls opt in with `data-pick` in `src/pages/*.html`. Page scripts call `TEH.pick.enhance(root)` after any prefill. `enquiry.js` sets the values from the URL first, so the triggers show them.
- The trigger is inserted before the native control. The wrapping `<label>` on the homepage, and the `label[for]` on the form (re-pointed to the trigger), both open it.
- Each trigger stacks every possible value invisibly in one grid cell, so the field always reserves its widest value. This is why the bar never shifts.

### Overlay layer
- Panels render into one `.pick-layer` (fixed, `z-index: 50`) appended to `<body>`. That puts them above the header (40) and below the menu (60), drawer (70) and dialogs (75).
- They are positioned against the trigger every frame while open. This keeps them clear of the pinned, transformed and `overflow: hidden` hero, with no change to its rules.
- The side (above or below) is chosen when the panel opens or the window resizes, never mid-scroll. A panel flips when it doesn't fit, and clamps 12px from the viewport edges.
- The panel's first line of text is optically aligned with the trigger's value: option labels sit under "Wedding", and the month title sits under the date text.
- If the hero fades the bar out (effective opacity < 0.6), or the trigger leaves the viewport, the panel closes.
- Below 600px the panel becomes a bottom sheet. `TEH.lock` pauses Lenis and the page scroll, and the backdrop closes the sheet on a tap but not on a swipe.

### Behaviour

**Listbox (WAI-ARIA collapsible listbox)**
- **Trigger:** `button[aria-haspopup=listbox][aria-expanded][aria-controls]`. Its accessible name is label + value, for example "Occasion Wedding".
- **Panel:** `ul[role=listbox]` takes focus and tracks the active row with `aria-activedescendant`; each `li[role=option]` carries `aria-selected`.
- **Keys:**
  - Enter, Space, ↑ or ↓ open it.
  - ↑, ↓, Home, End, PgUp and PgDn move.
  - Enter or Space commits.
  - Esc cancels.
  - Tab commits and moves to the next control.
  - Typing letters jumps to an option; the buffer resets each time the list opens.
- **Row highlight:** follows the pointer, or the keyboard once it is used. A mouse-opened list shows only the check, so the selected row is never flooded with colour.

**Calendar (WAI-ARIA date picker dialog)**
- **Trigger:** `button[aria-haspopup=dialog]`. Its name is "Date, Tuesday 15 June 2027", or "Date, not chosen".
- **Dialog:** `role=dialog`, with `aria-modal` set only for the sheet. It holds a `table[role=grid]` of day buttons with a roving tabindex, `aria-current="date"` on today and `aria-selected` on the chosen cell. A polite live region announces the month.
- **Keys:**
  - ←, →, ↑ and ↓ move by day and week.
  - Home and End go to the start and end of the week.
  - PgUp and PgDn change month; with Shift they change year.
  - Enter or Space selects.
  - Esc closes (from the month view it first returns to the days).
  - Tab cycles inside the dialog.
- **Rules:**
  - Days before today are disabled, and keyboard movement stops at today.
  - The previous-month arrow is disabled on the current month.
  - The grid always has six rows, so the panel never changes height.
  - Reopening shows the selected month with the chosen day focused.
- **Selecting:** clicking a day selects it and closes the dialog. Clear empties the date, and Today selects today's local date.
- **Not required:** the date is optional on both forms, as before.

Only one panel is open at a time. A click outside closes it, and focus returns to the trigger after a keyboard close or a sheet close.

### Motion
- **Open:** fades over 180ms with an 8px rise and a scale from 0.985 to 1, over 220ms.
- **Other effects:**
  - The chevron rotates.
  - A newly chosen value settles in over 0.5s.
  - Changing month slides the grid 10px.
  - Sheets slide up over 340ms.
- **Reduced motion:** a 120ms fade only.

## 3. Maintenance
- **Add a control:** put `data-pick` on any `<select>` or `<input type=date>` inside a root that gets `TEH.pick.enhance(root)`. The label comes from the wrapping `<label>`'s `<span>` or from `label[for]`.
- **Change options:** edit the native `<option>`s in `src/pages/*.html`, then run `node tools/build.mjs`. The custom list is built from them.
- **Set values from script:** set the native control's `.value`, then call `TEH.pick.sync()`. Dispatching `change` on the control also works.

## 4. QA

`node tools/verify-forms.mjs` runs in real Chrome via Playwright. It writes `qa/forms/results.json` and saves its screenshots to `qa/forms/after/`.

| Suite | What it checks |
|---|---|
| home (1920, 1440, 1280×720) | Triggers replace the natives; body-level layer; bar width vs before; accessible names; every option of both lists; one panel at a time; outside click; Esc + focus return; full keyboard path including type-ahead and Tab; focus capsule; calendar opens on today; past days disabled; six rows; PgDn; month lengths (Feb 2027 = 28, Feb 2028 = 29, Apr = 30, Dec = 31); leap rules (2000, 2028 yes; 2027, 2100 no); 31 Jan → 1 Feb by keyboard; select / reopen / Clear / Today; no layout jump; panels fully visible and uncovered |
| flow | Wedding + 15 June 2027 + 80 to 150 → `enquiry.html?type=wedding&date=2027-06-15&guests=80-150`; the next page shows and holds those values; the demo summary repeats them and says nothing was sent |
| tz | Kiritimati (UTC+14), Pago Pago (UTC−11) and Zurich near midnight: `min`, the calendar's "today" and the Today button all use the local date while UTC says otherwise |
| enquiry (1440, 768) | URL prefill; labels open the triggers; selection; calendar opens on the prefilled month; flips above near the bottom edge; Language uses the same component; no overflow |
| mobile (390×844, 390×640, 360×740) | Full-width sheets; 52px rows and 16px text; 44px close button; page behind does not scroll; tap to select; backdrop and close dismiss; calendar cells, arrows and footer actions ≥ 44px; homepage bar still hidden; no overflow |
| misc | Panel follows the bar during a small scroll and closes as the hero fades it, while the hero still contracts and restores; reduced motion fades only; no-JS keeps the native controls on both pages |

Screenshots: `qa/forms/after/`.
- **Closed bar:** `bar-*.png` and `home-bar-filled-1440x900.png`.
- **Occasion:** `home-occasion-*.png`.
- **Guests:** `home-guests-*.png`.
- **Calendar:** `home-date-*.png`.
- **Selected date:** `home-date-selected-*.png`.
- **Phones:** `mobile-occasion-*.png` and `mobile-calendar-*.png`.
- **Enquiry page:** `enquiry-date-*.png` and `enquiry-prefilled-1440.png`.
- **Before:** `qa/forms/before/`.

Final run: **178 / 178** checks passed. Regressions after the change:
- interaction tests: 37 / 37 desktop, 36 / 36 mobile
- `verify-motion`: 69 / 69
- `verify-carousel`: 80 / 80
- `verify-refine`: 85 / 85
- `audit-targets`: no clipped labels

Two older tests were updated:
- The interaction test's focus-ring check now recognises the field capsule.
- The hero sequence check in `verify-motion` now reads the expected label from the hero config, which had been reordered.

### Issues found and fixed during testing
- The type-ahead buffer survived from the previous opening, so "p" then "w" matched nothing. It now resets each time a list opens.
- A swipe starting on the sheet backdrop counted as an outside press and closed the sheet. The backdrop now closes on a tap only and blocks touch scrolling.
- The calendar's roving focus now follows focus wherever it lands, not only arrow-key moves.
- On a 360px phone the day buttons fell to 42.8px. They now take the full cell width, 46.8px.

## 5. Limitations
- The homepage bar is still hidden below 1100px, an earlier design decision left unchanged. Phone and tablet visitors use these controls on the enquiry page.
- There is no latest selectable date; the calendar allows any future date, as the native field did.
- The enquiry form remains a front-end demonstration. Submitting it prepares a summary, and nothing is sent.
- Screen-reader behaviour follows the WAI-ARIA patterns and was checked through the accessibility tree in automated tests. It was not tested by hand with VoiceOver or NVDA.
