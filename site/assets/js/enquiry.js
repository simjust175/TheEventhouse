/* The Event House — enquiry review + front-end-only form (demonstration; nothing is transmitted). */
(function () {
  'use strict';
  var TEH = window.TEH, $ = TEH.$, $$ = TEH.$$, esc = TEH.esc;
  var list = $('[data-sel-list]'), countEl = $('[data-sel-count]'), form = $('[data-enq-form]'), wrap = $('[data-enq-form-wrap]');

  function render() { TEH.rerender(list, renderList, $('#sel-title')); }
  function renderList() {
    var items = TEH.basket.items(), n = TEH.basket.count();
    countEl.textContent = items.length ? n + (n === 1 ? ' piece' : ' pieces') + ' in your enquiry. Adjust quantities as needed.' : '';
    if (!items.length) {
      list.innerHTML = '<div class="enq__empty"><p>No pieces added yet. You can still send an enquiry about your event, or browse the collection first.</p><a class="link-arrow" href="collection.html">Browse the collection <svg class="arrow" viewBox="0 0 24 12" aria-hidden="true"><use href="#i-arrow"/></svg></a></div>';
      return;
    }
    list.innerHTML = items.map(function (i) {
      var p = TEH_FIND(i.id);
      return '<div class="line-item">' + TEH.thumb(p, 'sm') +
        '<div><span class="line-item__cat">' + esc(TEH.catLabel(p.cat)) + (i.note ? ' · ' + esc(i.note) : '') + '</span><p class="line-item__name">' + esc(p.name) + '</p>' +
        '<button type="button" class="line-item__remove" data-remove="' + p.id + '">Remove<span class="sr-only"> ' + esc(p.name) + '</span></button></div>' +
        '<div class="qty" role="group" aria-label="Quantity for ' + esc(p.name) + '"><button type="button" data-dec="' + p.id + '" aria-label="Decrease">−</button><output aria-live="polite">' + i.qty + '</output><button type="button" data-inc="' + p.id + '" aria-label="Increase">+</button></div></div>';
    }).join('');
  }
  TEH.basket.on(render);
  render();

  // prefill from the homepage bar / carousel / services links
  var q = new URL(location.href).searchParams;
  var date = $('#f-date'); date.min = new Date().toISOString().slice(0, 10);
  if (q.get('type') && $('#f-type option[value="' + q.get('type') + '"]')) $('#f-type').value = q.get('type');
  if (q.get('date')) date.value = q.get('date');
  if (q.get('guests') && $('#f-guests option[value="' + q.get('guests') + '"]')) $('#f-guests').value = q.get('guests');
  if (q.get('service')) { var s = $('input[name=service][value="' + q.get('service') + '"]'); if (s) s.checked = true; }
  if (TEH.basket.items().some(function (i) { return TEH_FIND(i.id).cat === 'rentals'; })) { var r = $('input[name=service][value=rentals]'); if (r) r.checked = true; }

  function setErr(input, msg) {
    var f = input.closest('.field') || input.closest('.consent');
    var el = document.getElementById(input.getAttribute('aria-describedby'));
    if (f) f.classList.toggle('has-error', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (el) el.textContent = msg || '';
  }
  function validate() {
    var ok = true, first = null;
    var name = $('#f-name'), email = $('#f-email'), consent = form.querySelector('[name=consent]');
    var checks = [
      [name, name.value.trim().length >= 2 ? '' : 'Please tell us your name.'],
      [email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? '' : 'Please enter a valid email address.'],
      [consent, consent.checked ? '' : 'Please confirm we may reply to you.']
    ];
    checks.forEach(function (c) { setErr(c[0], c[1]); if (c[1]) { ok = false; first = first || c[0]; } });
    if (first) first.focus();
    return ok;
  }
  ['#f-name', '#f-email'].forEach(function (s) { $(s).addEventListener('blur', function () { if ($(s).getAttribute('aria-invalid') === 'true') validate(); }); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    var data = new FormData(form);
    var items = TEH.basket.items();
    var services = data.getAll('service');
    var ref = 'DEMO-' + Date.now().toString(36).toUpperCase().slice(-6);
    var label = function (sel) { var o = form.querySelector(sel); return o.options[o.selectedIndex].text; };
    wrap.innerHTML = '<div class="enq__done" tabindex="-1" role="status">' +
      '<span class="overline overline--spaced">Enquiry prepared</span>' +
      '<h2 class="ptitle">Thank you, ' + esc(String(data.get('name')).split(' ')[0]) + '</h2>' +
      '<p class="lead">In the live site, the studio would now receive your enquiry and reply personally. This prototype has not sent anything.</p>' +
      '<dl><dt>Reference</dt><dd>' + ref + ' <span class="tbc">demo</span></dd>' +
      '<dt>Occasion</dt><dd>' + esc(label('#f-type')) + '</dd>' +
      '<dt>Date</dt><dd>' + esc(data.get('date') || 'To be decided') + '</dd>' +
      '<dt>Guests</dt><dd>' + esc(label('#f-guests')) + '</dd>' +
      '<dt>Services</dt><dd>' + esc(services.length ? services.join(', ') : 'Not specified') + '</dd>' +
      '<dt>Pieces</dt><dd>' + (items.length ? items.map(function (i) { return esc(TEH_FIND(i.id).name) + ' × ' + i.qty; }).join('<br>') : 'None selected') + '</dd></dl>' +
      '<div style="display:flex;gap:1.2rem;flex-wrap:wrap"><button class="btn btn--primary" type="button" data-new>Start a new enquiry</button><a class="btn" href="index.html">Back to home</a></div></div>';
    var done = $('.enq__done', wrap);
    done.focus();
    TEH.scrollTo(done, { offset: -120 });
    $('[data-new]', wrap).addEventListener('click', function () { TEH.basket.clear(); location.href = 'enquiry.html'; });
  });
})();
