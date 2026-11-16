/* The Event House — collection catalogue, filters and quick view (original implementation). */
(function () {
  'use strict';
  var TEH = window.TEH, $ = TEH.$, $$ = TEH.$$, RM = TEH.RM, esc = TEH.esc;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var grid = $('[data-cgrid]'), tabs = $$('[data-filter]'), status = $('[data-filter-status]');
  var titleEl = $('[data-cat-title]'), countEl = $('[data-cat-count]');
  var arrow = '<svg class="arrow" viewBox="0 0 24 12" aria-hidden="true"><use href="#i-arrow"/></svg>';

  /* ---------- catalogue ---------- */
  grid.innerHTML = TEH_PRODUCTS.map(function (p) {
    return '<article class="ccard" id="p-' + p.id + '" data-cat="' + p.cat + '">' +
      '<button class="ccard__img" type="button" data-qv="' + p.id + '" aria-label="Quick view: ' + esc(p.name) + '">' + TEH.thumb(p, 'sm') + '</button>' +
      '<span class="ccard__cat">' + esc(TEH.catLabel(p.cat)) + '</span>' +
      '<h3 class="ccard__name">' + esc(p.name) + '</h3>' +
      '<button class="link-arrow" type="button" data-add="' + p.id + '">Add to enquiry ' + arrow + '</button></article>';
  }).join('');
  var cards = $$('.ccard', grid);

  function apply(f, animate) {
    var label = f === 'all' ? null : TEH.catLabel(f);
    tabs.forEach(function (t) { var on = t.getAttribute('data-filter') === f; t.classList.toggle('is-active', on); t.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    document.body.classList.toggle('is-filtered', f !== 'all');
    cards.forEach(function (c) { c.classList.toggle('is-hidden', f !== 'all' && c.getAttribute('data-cat') !== f); });
    var shown = cards.filter(function (c) { return !c.classList.contains('is-hidden'); });
    titleEl.textContent = label || 'The full collection';
    countEl.textContent = shown.length + (shown.length === 1 ? ' piece' : ' pieces');
    if (status) status.textContent = 'Showing ' + shown.length + ' pieces' + (label ? ' in ' + label : '');
    if (hasGsap) ScrollTrigger.refresh();
    if (animate && hasGsap && !RM) gsap.fromTo(shown, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.04 });
  }
  function choose(f, scroll) {
    apply(f, true);
    var url = new URL(location.href);
    if (f === 'all') url.searchParams.delete('filter'); else url.searchParams.set('filter', f);
    history.replaceState(null, '', url);
    if (scroll) TEH.scrollTo($('.c-tabs'), { offset: -90 });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { var tabsTop = $('.c-tabs').getBoundingClientRect().top; choose(t.getAttribute('data-filter'), tabsTop < 0); }); });
  $$('[data-goto]').forEach(function (b) { b.addEventListener('click', function () { choose(b.getAttribute('data-goto'), true); }); });
  var initial = new URL(location.href).searchParams.get('filter');
  apply(TEH_CATEGORIES.some(function (c) { return c.id === initial; }) ? initial : 'all', false);

  if (hasGsap && !RM) {
    gsap.set(cards, { opacity: 0 });
    ScrollTrigger.batch(cards, { start: 'top 92%', once: true, onEnter: function (b) { gsap.fromTo(b, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06 }); } });
  }

  /* ---------- quick view ---------- */
  var dlg = $('[data-qv-dialog]'), release = null;
  dlg.removeAttribute('hidden');
  var qty = $('#qv-qty'), addBtn = $('[data-qv-add]');
  function openQV(id) {
    var p = TEH_FIND(id); if (!p) return;
    $('[data-qv-media]', dlg).innerHTML = TEH.thumb(p, null);
    $('[data-qv-cat]', dlg).textContent = TEH.catLabel(p.cat);
    $('[data-qv-name]', dlg).textContent = p.name;
    $('[data-qv-blurb]', dlg).textContent = p.blurb;
    $('[data-qv-details]', dlg).innerHTML = (p.details || []).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('');
    qty.value = 1;
    addBtn.setAttribute('data-add', p.id);
    dlg.classList.add('is-open');
    TEH.lock(true);
    release = TEH.trap(dlg, closeQV);
    setTimeout(function () { $('.qv__close', dlg).focus(); }, 50);
  }
  function closeQV() {
    if (!dlg.classList.contains('is-open')) return;
    dlg.classList.remove('is-open');
    TEH.lock(false);
    if (release) { release(); release = null; }
  }
  document.addEventListener('click', function (e) { var t = e.target.closest('[data-qv]'); if (t) { e.preventDefault(); openQV(t.getAttribute('data-qv')); } });
  $$('[data-qv-close]', dlg).forEach(function (b) { b.addEventListener('click', closeQV); });
  $('[data-qv-inc]', dlg).addEventListener('click', function () { qty.value = Math.min(999, (parseInt(qty.value, 10) || 1) + 1); });
  $('[data-qv-dec]', dlg).addEventListener('click', function () { qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) - 1); });
  qty.addEventListener('change', function () { qty.value = Math.max(1, Math.min(999, parseInt(qty.value, 10) || 1)); });

  // deep link from the homepage, e.g. collection.html#p-limestone-urn
  if (/^#p-/.test(location.hash)) { var pid = location.hash.slice(3); if (TEH_FIND(pid)) setTimeout(function () { openQV(pid); }, 400); }
})();
