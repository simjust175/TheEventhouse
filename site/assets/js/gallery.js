/* The Event House — gallery filters + lightbox (original implementation). */
(function () {
  'use strict';
  var TEH = window.TEH, $ = TEH.$, $$ = TEH.$$, RM = TEH.RM;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var LABELS = { weddings: 'Weddings', private: 'Private celebrations', corporate: 'Corporate', editorial: 'Editorial' };
  var TYPES = { weddings: 'wedding', private: 'private', corporate: 'corporate' };
  var mosaic = $('[data-mosaic]'), tiles = $$('.tile', mosaic), chips = $$('[data-filter]'), status = $('[data-filter-status]');
  var visible = tiles.slice();

  /* ---------- filters ---------- */
  function apply(f, animate) {
    chips.forEach(function (c) { var on = c.getAttribute('data-filter') === f; c.classList.toggle('is-active', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    var run = function () {
      tiles.forEach(function (t) { t.classList.toggle('is-hidden', f !== 'all' && t.getAttribute('data-cat') !== f); });
      mosaic.classList.toggle('is-filtered', f !== 'all');
      visible = tiles.filter(function (t) { return !t.classList.contains('is-hidden'); });
      if (status) status.textContent = 'Showing ' + visible.length + ' images' + (f === 'all' ? '' : ' in ' + LABELS[f]);
      if (hasGsap) ScrollTrigger.refresh();
      if (animate && hasGsap && !RM) gsap.fromTo(visible, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.035 });
    };
    if (animate && hasGsap && !RM) gsap.to(visible, { opacity: 0, duration: 0.25, onComplete: run }); else run();
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var f = c.getAttribute('data-filter');
      apply(f, true);
      var url = new URL(location.href);
      if (f === 'all') url.searchParams.delete('filter'); else url.searchParams.set('filter', f);
      history.replaceState(null, '', url);
    });
  });
  var initial = new URL(location.href).searchParams.get('filter');
  apply(LABELS[initial] ? initial : 'all', false);

  // entrance reveal for the first screen of tiles
  if (hasGsap && !RM) {
    gsap.set(tiles, { opacity: 0 });
    ScrollTrigger.batch(tiles, { start: 'top 92%', once: true, onEnter: function (b) { gsap.fromTo(b, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06 }); } });
  }

  /* ---------- lightbox ---------- */
  var lb = $('[data-lightbox]'); if (!lb) return;
  lb.removeAttribute('hidden');
  var img = $('[data-lb-img]', lb), cat = $('[data-lb-cat]', lb), alt = $('[data-lb-alt]', lb), count = $('[data-lb-count]', lb), cta = $('[data-lb-cta]', lb);
  var idx = 0, release = null;
  function show(i) {
    idx = (i + visible.length) % visible.length;
    var t = visible[idx], b = t.querySelector('button'), thumb = t.querySelector('img');
    var src = b.getAttribute('data-full'), c = t.getAttribute('data-cat');
    img.classList.add('is-swapping');
    var pre = new Image();
    pre.onload = pre.onerror = function () { img.src = src; img.alt = thumb.alt; img.classList.remove('is-swapping'); };
    pre.src = src;
    cat.textContent = LABELS[c] || '';
    alt.textContent = thumb.alt;
    count.textContent = (idx + 1) + ' / ' + visible.length;
    cta.href = 'enquiry.html' + (TYPES[c] ? '?type=' + TYPES[c] : '');
    // warm neighbours
    [1, -1].forEach(function (d) { var n = visible[(idx + d + visible.length) % visible.length]; if (n) { var im = new Image(); im.src = n.querySelector('button').getAttribute('data-full'); } });
  }
  function open(i) {
    show(i);
    lb.classList.add('is-open');
    TEH.lock(true);
    release = TEH.trap(lb, close);
    setTimeout(function () { $('.lightbox__btn--close', lb).focus(); }, 50);
  }
  function close() {
    if (!lb.classList.contains('is-open')) return;
    lb.classList.remove('is-open');
    TEH.lock(false);
    if (release) { release(); release = null; }
  }
  tiles.forEach(function (t) { t.querySelector('button').addEventListener('click', function () { open(visible.indexOf(t)); }); });
  $$('[data-lb-close]', lb).forEach(function (b) { b.addEventListener('click', close); });
  $('[data-lb-prev]', lb).addEventListener('click', function () { show(idx - 1); });
  $('[data-lb-next]', lb).addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
  });
  var sx = null;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null; }, { passive: true });
})();
