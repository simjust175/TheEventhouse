# THE EVENT HOUSE — REFERENCE HANDOFF V2 (16 NOV 2026)

## What to do now
1. Create/open a **separate** VS Code project folder for The Event House; this is NOT PartyPack.
2. Unzip this folder into that project so `CLAUDE_TASK.md` and `references/` are visible.
3. In Claude Code, paste `CLAUDE_TASK.md` (or say "Read CLAUDE_TASK.md and carry it out end-to-end").
4. Let Claude inspect the Vineyard reference and build the prototype, then use its preview URL to review the visual quality.

## Frozen design decisions
- Homepage: vineyard.co.za inspired page STRUCTURE and SCROLL INTERACTIONS, adapted to events. No generic template.
- Gallery: keep the FIRST approved Gallery mockup exactly as a visual direction: `references/gallery_APPROVED_first_design.png`.
- Collection: keep the FIRST approved Collection mockup exactly as a visual direction: `references/collection_APPROVED_first_design.png`.
- Brand pending external branding expert. Name is provisional: The Event House. ORDOO is the developer, not the client's brand.
- Audience: mainstream luxury events in Switzerland. Products are added to an ENQUIRY BASKET rather than purchased online.

## IMPORTANT: UPDATED REFERENCE PRIORITY (V2)
This package supersedes the first handoff ZIP. The first handoff was created BEFORE the user supplied four additional HTML/JSON files. They have all been added here, unchanged, under `references/`:

1. **Highest priority:** `vineyard_firecrawl_LATEST_2026-11-16_14-06_RAW_BRANDING.json` — Firecrawl SCRAPE export with `data.rawHtml` (~648k characters), `data.branding`, markdown, links, images and a screenshot URL. The screenshot URL may expire and is not an image file. IMPORTANT: the Firecrawl branding extractor's inferred sizes/framework may be imprecise; verify with live browser computed styles.
2. `vineyard_CHROME_SAVED_PAGE_full_head_and_css.html` — full Chrome-saved homepage HTML with `<head>`, embedded critical CSS, and references to linked JS/CSS. Its accompanying `..._files` directory was NOT uploaded, so it is NOT a complete offline website copy. Do not invent missing assets.
3. `vineyard_firecrawl_2026-11-16_14-01_SCRAPE.json` — earlier SCRAPE export with processed `html` and images.
4. `vineyard_processed_DOM_user_reupload.html` — user-reuploaded processed HTML (byte-identical to `vineyard_homepage_processed_DOM.html` in previous package). Preserved separately to prove every upload was included.

For easier analysis, I've also extracted these DERIVATIVE reference files (they do not replace the originals):
- `vineyard_LATEST_rawHtml_extracted.html` — the `data.rawHtml` string from the latest Firecrawl JSON.
- `vineyard_LATEST_branding_readable.json` — readable subset of the extracted brand data; original branding and SVG URIs remain inside the full latest JSON.
- `vineyard_CHROME_critical_css_reference.css` — the embedded critical CSS from the user-saved HTML; research reference only, not a license to reuse proprietary CSS.

Read `PACKAGE_MANIFEST.md` for the exact inventory and checksums. These references make detailed analysis easier, but they do NOT include Vineyard's complete original JS animations, standalone linked stylesheets, saved `_files` asset folder, or raw source project. Inspect the live site in Playwright and recreate the design system independently.

## Reference materials and their limitations
- `references/vineyard_walkthrough.mp4` — user's 49-second recorded walkthrough, useful for transitions.
- `references/vineyard_firecrawl_SEARCH_export.json` — EARLIEST exported Firecrawl SEARCH results (superseded for detailed homepage styling by latest SCRAPE export).
- `references/vineyard_homepage_processed_DOM.html` — 351KB string extracted from the first Firecrawl result; not the original HTML/CSS/JS source.
- `references/vineyard_fullpage_screenshot_unreliable.png` — screenshot affected by pinned scrolling and lazy loading; use as rough section reference only.
- `references/vineyard_asset_urls.txt` — list of public image URLs that appeared in the capture, for design study only; do not use the reference company's assets on the client site.
- `references/vineyard_capture_notes.md` — explanation of data gaps and selectors.
- `references/gallery_APPROVED_first_design.png` — the ORIGINAL approved gallery page mockup. Some text/phone/locations in the generated image are fictional placeholder content and must not be treated as factual.
- `references/collection_APPROVED_first_design.png` — the ORIGINAL approved shop / collection design, no ecommerce payment.

The mockups may contain invented customer phone numbers, Switzerland locations, products, business claims and example photography. They are **layout references only**. Replace with verified, licensed client materials before production.

## Real client constraints
- Approximate fee: CHF 3,500, no written confirmation of precise scope yet.
- Business functions: event design, decoration and rentals; exact inventory and service list must be validated with client.
- This handoff is for a PREMIUM VISUAL PROTOTYPE, NOT an implicit request for an unbounded production SaaS or store build.
- Respect copyright and licence requirements. Follow design patterns; do not deploy someone else's brand photos or source code in the client website.
