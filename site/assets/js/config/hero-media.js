/*
 * HOMEPAGE HERO MEDIA — configuration only. Edit this file to change what plays in the hero;
 * no component logic lives here. A future admin / CMS only has to output this same object
 * (or the same shape as JSON) and load it before `hero-media.js`.
 *
 * items[]            One entry per photo or video, shown in order. One item = no rotation.
 *   type             'image' | 'video'
 *   src              'path' or { desktop: 'path', mobile: 'path' } (mobile falls back to desktop)
 *   poster           video only: still shown before playback, when autoplay is blocked,
 *                    if the file fails, and under prefers-reduced-motion. Same shape as src.
 *   position         CSS object-position, string or { desktop, mobile } (art-directed crop)
 *   alt              Description announced for the hero while this item is showing
 *   duration         Optional ms on screen for this item (overrides the default below)
 *   show             Optional 'desktop' | 'mobile' to use an item on one breakpoint only
 *
 * breakpoint         Viewport width (px) below which the `mobile` sources/crops/items are used
 * duration           Default ms each item stays on screen before crossfading to the next
 * fade               Crossfade length in ms
 */
window.TEH_CONFIG = window.TEH_CONFIG || {};
window.TEH_CONFIG.heroMedia = window.TEH_CONFIG.heroMedia || {
  breakpoint: 768,
  duration: 6500,
  fade: 1800,
  items: [
    {
      type: 'image',
      src: 'assets/img/hero-table.webp',
      position: { desktop: '50% 55%', mobile: '58% 50%' },
      alt: 'A set banquet table with glassware and blush roses'
    },
    {
      type: 'video',
      src: { desktop: 'assets/video/aisle-florals.mp4', mobile: 'assets/video/aisle-florals-m.mp4' },
      poster: 'assets/img/aisle-florals.webp',
      position: { desktop: '50% 50%', mobile: '50% 50%' },
      alt: 'A ceremony aisle lined with rose arrangements',
      duration: 7000
    },
    {
      type: 'image',
      src: 'assets/img/pink-flowers.webp',
      position: { desktop: '50% 45%', mobile: '50% 50%' },
      alt: 'A lush garden bouquet of roses and seasonal stems'
    },
    {
      type: 'video',
      src: { desktop: 'assets/video/hero-venue.mp4', mobile: 'assets/video/hero-venue-m.mp4' },
      poster: { desktop: 'assets/img/hero-venue.webp', mobile: 'assets/img/hero-venue.webp' },
      position: { desktop: '50% 40%', mobile: '50% 50%' },
      alt: 'A draped event barn lit by a crystal chandelier and festoon lights',
      duration: 8000
    }
  ]
};
