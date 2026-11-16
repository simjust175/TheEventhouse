/* Provisional catalogue for the prototype.
   Names, descriptions and categories are PLACEHOLDERS for layout; the client's real inventory,
   quantities and availability must replace them. No prices: items are requested by enquiry. */
window.TEH_CATEGORIES = [
  { id: 'decor', label: 'Décor' },
  { id: 'florals', label: 'Florals' },
  { id: 'tableware', label: 'Tableware' },
  { id: 'candles', label: 'Candles' },
  { id: 'rentals', label: 'Rentals' },
  { id: 'paper', label: 'Paper goods' }
];

window.TEH_PRODUCTS = [
  { id: 'limestone-urn', name: 'Limestone Urn Vase', cat: 'decor', img: 'vase-plinth', featured: true,
    blurb: 'A timeless foundation for floral arrangements, sculptural branches, or standalone styling.',
    details: ['Hand-finished stone-effect surface', 'Suits tablescapes, entrances and altars', 'Dimensions and quantities to be confirmed'] },
  { id: 'amber-candle', name: 'Amber Glass Candle', cat: 'candles', img: 'candles-trio',
    blurb: 'A low, warm-toned glass candle that glows along tables, mantels and bars.',
    details: ['Long-burning wax', 'Quantities to be confirmed'] },
  { id: 'crystal-stemware', name: 'Crystal Stemware', cat: 'tableware', img: 'rose-pour',
    blurb: 'Fine-stemmed glasses for wine service, toasts and signature cocktails.',
    details: ['Rental per piece, minimums to be confirmed', 'Delivered clean and polished'] },
  { id: 'speckled-vessels', name: 'Speckled Ceramic Vessels', cat: 'decor', img: 'ceramic-bowls',
    blurb: 'Hand-thrown vessels for styled settings, bud stems and welcome tables.',
    details: ['Set of mixed forms', 'Matte speckled glaze'] },
  { id: 'linen-tablecloth', name: 'Linen Tablecloth', cat: 'rentals', img: 'table-white',
    blurb: 'Premium linens that bring depth, texture and a sense of occasion to the table.',
    details: ['Round and banquet sizes', 'Colourways to be confirmed with the studio'] },
  { id: 'brass-pendant', name: 'Brass Pendant Light', cat: 'rentals', img: 'brass-pendants',
    blurb: 'Warm metallic pendants to hang over long tables and lounges.',
    details: ['Rigging feasibility depends on venue', 'Installation by the studio team'] },
  { id: 'garden-posy', name: 'Garden Rose Posy', cat: 'florals', img: 'cake',
    blurb: 'Loose, just-gathered roses in blush and ivory for cakes, place settings and aisles.',
    details: ['Seasonal stems vary', 'Made to order'] },
  { id: 'statement-arrangement', name: 'Statement Arrangement', cat: 'florals', img: 'dark-florals',
    blurb: 'A dramatic, sculptural arrangement for entrances, bars and stages.',
    details: ['Designed per brief', 'Palette agreed during consultation'] },
  { id: 'blush-bouquet', name: 'Garden Bouquet', cat: 'florals', img: 'pink-flowers',
    blurb: 'Lush, layered seasonal blooms for centrepieces, bridal parties and gifting.',
    details: ['Seasonal availability', 'Ribbon colour on request'] },
  { id: 'glass-votive', name: 'Smoked Glass Votive', cat: 'candles', img: 'candle-single',
    blurb: 'A softly smoked votive that brings an intimate glow to every surface.',
    details: ['Consumable candle, quoted per event', 'Quantities to be confirmed'] },
  { id: 'jar-candle-pair', name: 'Jar Candle Pair', cat: 'candles', img: 'hero-candles',
    blurb: 'A matched pair of jar candles for side tables, bathrooms and lounges.',
    details: ['Sold as a pair', 'Scent options to be confirmed'] },
  { id: 'stoneware-plate', name: 'Stoneware Dinner Plate', cat: 'tableware', img: 'stone-plates',
    blurb: 'Reactive-glaze stoneware with a quiet, handmade character.',
    details: ['Dinner and side plates', 'Rental per piece'] },
  { id: 'table-setting', name: 'Banquet Table Setting', cat: 'tableware', img: 'hero-table',
    blurb: 'A complete place setting: charger, china, cutlery and glassware, styled as one.',
    details: ['Configured per guest count', 'Components to be confirmed'] },
  { id: 'lounge-chair', name: 'Sculpted Lounge Chair', cat: 'rentals', img: 'dark-lounge',
    blurb: 'A soft, sculpted lounge chair for receptions, brand events and quiet corners.',
    details: ['Composition varies by event', 'Availability to be confirmed'] },
  { id: 'table-garland', name: 'Eucalyptus Table Garland', cat: 'florals', img: 'cat-celebrations',
    blurb: 'A loose, trailing runner of eucalyptus and seasonal greenery for long tables.',
    details: ['Priced per running metre on enquiry', 'Seasonal greenery varies'] },
  { id: 'linen-napkin', name: 'Washed Linen Napkin', cat: 'rentals', img: 'hero-table',
    blurb: 'Soft, washed linen napkins that drape beautifully beside every setting.',
    details: ['Colourways to be confirmed', 'Rental per piece'] },
  { id: 'place-card', name: 'Letterpress Place Card', cat: 'paper', img: null,
    blurb: 'Cotton-paper place cards with names set in a classic serif.',
    details: ['Calligraphy or print options', 'Lead time to be confirmed'] },
  { id: 'menu-card', name: 'Deckle-Edge Menu Card', cat: 'paper', img: null,
    blurb: 'Hand-torn edges and soft ivory stock for each place setting.',
    details: ['Printed per event', 'Lead time to be confirmed'] }
];

window.TEH_IMG = function (key, size) {
  return key ? 'assets/img/' + key + (size === 'sm' ? '-sm' : '') + '.webp' : null;
};
window.TEH_FIND = function (id) {
  return window.TEH_PRODUCTS.find(function (p) { return p.id === id; });
};
