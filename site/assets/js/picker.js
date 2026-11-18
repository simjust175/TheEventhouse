/* The Event House — bespoke select + date picker.
   Progressive enhancement: the native <select> / <input type="date"> stay in the form (hidden) and remain the
   single source of truth for submitted values, so the GET parameters and the no-JS fallback are unchanged.
   Panels render in one fixed overlay layer on <body>, positioned against their trigger, so the pinned,
   transformed and clipped hero cannot hide them. Phones (< 600px) get a bottom sheet instead of a popover.
   Patterns: WAI-ARIA collapsible listbox (button + listbox, aria-activedescendant) and date picker dialog (grid). */
(function () {
  'use strict';
  var TEH = window.TEH || (window.TEH = {});
  var doc = document, uid = 0, layer = null, scrim = null, current = null;
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SHEET = window.matchMedia('(max-width: 599.98px)');
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var GAP = 12, EDGE = 12, OUT = RM ? 120 : 200, OUT_SHEET = RM ? 120 : 320;

  /* ---------- local-date helpers (never toISOString: that is UTC and shifts the day around midnight) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
  }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function short(d) { return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function long(d) { return DAYS[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function same(a, b) { return !!a && !!b && a.getTime() === b.getTime(); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function addMonths(d, n) {
    var y = d.getFullYear(), m = d.getMonth() + n, last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(d.getDate(), last));
  }
  function mIndex(d) { return d.getFullYear() * 12 + d.getMonth(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var CHEV = '<svg class="pick__chev" viewBox="0 0 12 8" aria-hidden="true" focusable="false"><path d="M1.5 1.75 6 6.25l4.5-4.5"/></svg>';
  var CAL = '<svg class="pick__cal" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="1.75" y="2.75" width="12.5" height="11.5" rx="2.25"/><path d="M1.75 6.5h12.5M5 1.25v3M11 1.25v3"/></svg>';
  var CHECK = '<svg class="pick-opt__check" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.25 8.5 6.6 11.75 12.75 4.5"/></svg>';
  var ARROW = function (d) { return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="' + (d < 0 ? 'M10 3.5 5.5 8l4.5 4.5' : 'M6 3.5 10.5 8 6 12.5') + '"/></svg>'; };
  var CLOSE = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';

  /* ---------- overlay layer ---------- */
  function getLayer() {
    if (layer) return layer;
    layer = doc.createElement('div'); layer.className = 'pick-layer';
    scrim = doc.createElement('div'); scrim.className = 'pick-scrim'; scrim.setAttribute('aria-hidden', 'true');
    // a tap on the backdrop closes a sheet; a swipe that starts there does not (and cannot scroll the page)
    scrim.addEventListener('click', function () { if (current) close(current, { restore: true }); });
    layer.appendChild(scrim); doc.body.appendChild(layer);
    return layer;
  }

  function tabbables() {
    return Array.prototype.filter.call(doc.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'), function (el) {
      return !(layer && layer.contains(el)) && !el.hidden && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    });
  }
  // Tab out of an open listbox: commit, close and continue to the control after (or before) the trigger
  function tabFrom(el, back) {
    var all = tabbables(), i = all.indexOf(el), n = all[i + (back ? -1 : 1)];
    (n || el).focus();
  }
  // effective opacity / visibility of the anchor (the hero fades the bar out as the page scrolls)
  function shown(el) {
    var r = el.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > window.innerHeight) return false;
    var o = 1;
    for (var n = el; n && n !== doc.body; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none') return false;
      o *= parseFloat(cs.opacity);
    }
    return o > 0.6;
  }

  /* ---------- shared open / close / positioning ---------- */
  function open(c) {
    if (current === c) return;
    if (current) close(current, { restore: false });
    current = c;
    getLayer();
    clearTimeout(c.hideT);
    c.sheet = SHEET.matches;
    var p = c.panel;
    p.hidden = false;
    p.classList.toggle('is-sheet', c.sheet);
    if (c.kind === 'date') p.setAttribute('aria-modal', c.sheet ? 'true' : 'false');
    c.trigger.setAttribute('aria-expanded', 'true');
    c.zone.classList.add('is-open');
    c.prepare();
    if (c.sheet) {
      p.style.left = p.style.top = p.style.maxHeight = '';
      scrim.classList.add('is-on');
      if (TEH.lock) TEH.lock(true);
    } else {
      c.side = null;
      place(c);
      follow(c);
    }
    void p.offsetWidth; // commit the closed state so the opening transition runs
    p.classList.add('is-open');
    doc.addEventListener('pointerdown', c.outside, true);
    window.addEventListener('resize', c.resize);
    c.focusIn();
  }
  function close(c, o) {
    if (current !== c) return;
    o = o || {};
    current = null;
    var p = c.panel;
    p.classList.remove('is-open');
    c.trigger.setAttribute('aria-expanded', 'false');
    c.zone.classList.remove('is-open');
    cancelAnimationFrame(c.raf);
    doc.removeEventListener('pointerdown', c.outside, true);
    window.removeEventListener('resize', c.resize);
    if (c.sheet) { scrim.classList.remove('is-on'); if (TEH.lock) TEH.lock(false); }
    var hadFocus = p.contains(doc.activeElement);
    c.hideT = setTimeout(function () { if (current !== c) p.hidden = true; }, c.sheet ? OUT_SHEET : OUT);
    if (o.restore !== false && (hadFocus || o.restore === true)) c.trigger.focus({ preventScroll: true });
    if (c.onClose) c.onClose();
  }
  function place(c) {
    var p = c.panel, vw = doc.documentElement.clientWidth, vh = window.innerHeight;
    var box = (c.anchor || c.zone).getBoundingClientRect(), trig = (c.anchor || c.trigger).getBoundingClientRect();
    var text = c.text.getBoundingClientRect();
    p.style.maxHeight = '';
    var pw = p.offsetWidth, ph = p.offsetHeight;
    var below = vh - trig.bottom - GAP - EDGE, above = box.top - GAP - EDGE;
    // the side is chosen when the panel opens (or the window resizes), so it never flips mid-scroll
    if (!c.side) c.side = ph <= below || below >= above ? 'bottom' : 'top';
    var room = c.side === 'bottom' ? below : above;
    if (ph > room) { p.style.maxHeight = Math.max(160, room) + 'px'; ph = Math.min(ph, Math.max(160, room)); }
    var top = c.side === 'bottom' ? trig.bottom + GAP : box.top - GAP - ph;
    // optical alignment: the panel's first line of text sits exactly under the trigger's value
    var left = Math.round(text.left - c.inset());
    left = Math.max(EDGE, Math.min(left, vw - pw - EDGE));
    p.style.left = left + 'px';
    p.style.top = Math.round(top) + 'px';
    p.setAttribute('data-side', c.side);
  }
  // follow the trigger while open: smooth scrolling, the pinned hero and its fade all move it
  function follow(c) {
    var last = '';
    (function tick() {
      if (current !== c || c.sheet) return;
      var a = c.anchor || c.trigger;
      if (!shown(a)) { close(c, { restore: 'auto' }); return; }
      var r = a.getBoundingClientRect(), key = Math.round(r.left) + ',' + Math.round(r.top);
      if (key !== last) { last = key; place(c); }
      c.raf = requestAnimationFrame(tick);
    })();
  }
  function base(c) {
    c.outside = function (e) {
      var t = e.target;
      if (c.panel.contains(t) || c.zone.contains(t) || t === scrim) return;
      var focusable = t.closest && t.closest('a[href],button,input,select,textarea,[tabindex]');
      close(c, { restore: c.sheet || !focusable ? true : false });
    };
    c.resize = function () {
      if (current !== c) return;
      if (SHEET.matches !== c.sheet) { close(c, { restore: true }); return; }
      if (!c.sheet) { c.side = null; place(c); }
    };
  }
  function sheetHead(title, id) {
    return '<div class="pick-pop__head"><span class="pick-pop__title" id="' + id + '">' + esc(title) + '</span>' +
      '<button type="button" class="pick-pop__close" data-pick-close aria-label="Close">' + CLOSE + '</button></div>';
  }
  function labelFor(ctrl, zone) {
    if (zone.tagName === 'LABEL') return zone.querySelector('span') || zone;
    return (ctrl.id && zone.querySelector('label[for="' + ctrl.id + '"]')) || zone.querySelector('label, .label');
  }
  function setup(ctrl, kind) {
    var id = 'pk' + (++uid);
    var zone = ctrl.closest('[data-pick-zone], label, .field') || ctrl.parentNode;
    var label = labelFor(ctrl, zone);
    if (!label.id) label.id = id + '-l';
    var trig = doc.createElement('button');
    trig.type = 'button';
    trig.className = 'pick pick--' + kind;
    trig.id = id + '-t';
    trig.setAttribute('aria-expanded', 'false');
    trig.setAttribute('aria-controls', id + '-p');
    trig.setAttribute('aria-labelledby', label.id + ' ' + id + '-v');
    ctrl.parentNode.insertBefore(trig, ctrl); // before the native control, so a wrapping <label> activates it
    if (label.tagName === 'LABEL' && label.htmlFor) label.htmlFor = trig.id;
    ctrl.hidden = true; ctrl.tabIndex = -1; ctrl.setAttribute('aria-hidden', 'true');
    ctrl.setAttribute('data-picked', '');
    zone.classList.add('pick-zone');
    var panel = doc.createElement('div');
    panel.className = 'pick-pop pick-pop--' + kind;
    panel.id = id + '-p';
    panel.hidden = true;
    panel.setAttribute('data-lenis-prevent', '');
    getLayer().appendChild(panel);
    return { id: id, kind: kind, ctrl: ctrl, zone: zone, label: label, trigger: trig, panel: panel, title: label.textContent.trim(), anchor: ctrl.closest('[data-pick-anchor]') };
  }

  /* ======================= SELECT → LISTBOX ======================= */
  function enhanceSelect(sel) {
    var c = setup(sel, 'select'), id = c.id, opts = Array.prototype.slice.call(sel.options);
    var active = 0, buf = '', bufT = 0;
    base(c);
    c.trigger.setAttribute('aria-haspopup', 'listbox');
    c.trigger.innerHTML = '<span class="pick__value"><span class="pick__text" id="' + id + '-v"></span>' +
      opts.map(function (o) { return '<span class="pick__sz" aria-hidden="true">' + esc(o.text) + '</span>'; }).join('') + '</span>' + CHEV;
    c.text = c.trigger.querySelector('.pick__text');
    c.panel.innerHTML = sheetHead(c.title, id + '-h') +
      '<ul class="pick-list" role="listbox" id="' + id + '-lb" tabindex="-1" aria-labelledby="' + c.label.id + '">' +
      opts.map(function (o, i) { return '<li class="pick-opt" role="option" id="' + id + '-o' + i + '" data-i="' + i + '" aria-selected="false"><span class="pick-opt__label">' + esc(o.text) + '</span>' + CHECK + '</li>'; }).join('') +
      '</ul>';
    var list = c.panel.querySelector('[role=listbox]'), items = Array.prototype.slice.call(list.children);
    c.inset = function () { return items[0].querySelector('.pick-opt__label').offsetLeft + c.panel.clientLeft; };

    function sync(flash) {
      var i = Math.max(0, sel.selectedIndex);
      c.text.textContent = opts[i].text;
      items.forEach(function (li, j) { li.setAttribute('aria-selected', j === i ? 'true' : 'false'); li.classList.toggle('is-selected', j === i); });
      if (flash && !RM) { c.text.classList.remove('is-new'); void c.text.offsetWidth; c.text.classList.add('is-new'); }
    }
    function setActive(i, scroll) {
      active = Math.max(0, Math.min(items.length - 1, i));
      items.forEach(function (li, j) { li.classList.toggle('is-active', j === active); });
      list.setAttribute('aria-activedescendant', items[active].id);
      if (scroll) items[active].scrollIntoView({ block: 'nearest' });
    }
    function choose(i) {
      var changed = sel.selectedIndex !== i;
      sel.selectedIndex = i;
      sync(true);
      if (changed) { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    c.prepare = function () { buf = ''; clearTimeout(bufT); setActive(Math.max(0, sel.selectedIndex), false); };
    c.focusIn = function () { list.focus({ preventScroll: true }); };
    c.sync = function () { sync(false); };

    // the row highlight follows the pointer, or the keyboard once it is used; a mouse-opened list shows only the check
    function kbd(on) { list.classList.toggle('is-kbd', on); }
    c.trigger.addEventListener('click', function (e) { if (current === c) { close(c, { restore: true }); return; } kbd(e.detail === 0); open(c); });
    c.trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); kbd(true); open(c); }
    });
    list.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k !== 'Tab' && k !== 'Escape') kbd(true);
      if (k === 'ArrowDown') { e.preventDefault(); setActive(active + 1, true); }
      else if (k === 'ArrowUp') { e.preventDefault(); if (e.altKey) { choose(active); close(c); } else setActive(active - 1, true); }
      else if (k === 'Home' || k === 'PageUp') { e.preventDefault(); setActive(0, true); }
      else if (k === 'End' || k === 'PageDown') { e.preventDefault(); setActive(items.length - 1, true); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(active); close(c); }
      else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(c); }
      else if (k === 'Tab') { e.preventDefault(); choose(active); close(c); tabFrom(c.trigger, e.shiftKey); }
      else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // type-ahead: "p" jumps to Private celebration, repeated letters cycle
        clearTimeout(bufT); buf = (buf + k).toLowerCase(); bufT = setTimeout(function () { buf = ''; }, 600);
        var all = buf.split('').every(function (ch) { return ch === buf[0]; }), q = all ? buf[0] : buf;
        for (var n = 1; n <= items.length; n++) {
          var j = (active + (all || buf.length === 1 ? n : n - 1)) % items.length;
          if (opts[j].text.toLowerCase().indexOf(q) === 0) { setActive(j, true); break; }
        }
      }
    });
    items.forEach(function (li, i) {
      li.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') kbd(false); if (active !== i) setActive(i, false); });
      li.addEventListener('click', function () { choose(i); close(c, { restore: true }); });
    });
    c.panel.querySelector('[data-pick-close]').addEventListener('click', function () { close(c, { restore: true }); });
    sel.addEventListener('change', function () { sync(false); });
    sync(false);
    return c;
  }

  /* ======================= DATE → CALENDAR DIALOG ======================= */
  function enhanceDate(inp) {
    var c = setup(inp, 'date'), id = c.id;
    var view = null, focusD = null, mode = 'days';
    base(c);
    c.trigger.setAttribute('aria-haspopup', 'dialog');
    c.trigger.innerHTML = '<span class="pick__value"><span class="pick__text" aria-hidden="true"></span>' +
      '<span class="pick__sz" aria-hidden="true">Choose a date</span><span class="pick__sz" aria-hidden="true">00/00/0000</span></span>' +
      '<span class="sr-only" id="' + id + '-v"></span>' + CAL;
    c.text = c.trigger.querySelector('.pick__text');
    var srv = c.trigger.querySelector('#' + id + '-v');
    var p = c.panel;
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', 'Choose ' + c.title.toLowerCase().replace(/^event /, 'an event ').replace(/^date$/, 'an event date'));
    var wk = DAYS.map(function (d) { return '<th scope="col" abbr="' + d + '"><span aria-hidden="true">' + d.slice(0, 2) + '</span><span class="sr-only">' + d + '</span></th>'; }).join('');
    p.innerHTML = sheetHead(c.title, id + '-h') +
      '<div class="cal" data-view="days">' +
        '<div class="cal__nav">' +
          '<button type="button" class="cal__title" data-cal-mode><span class="cal__month"></span> <span class="cal__year"></span>' + CHEV + '</button>' +
          '<span class="cal__arrows"><button type="button" class="cal__arrow" data-cal-step="-1">' + ARROW(-1) + '</button><button type="button" class="cal__arrow" data-cal-step="1">' + ARROW(1) + '</button></span>' +
        '</div>' +
        '<div class="sr-only" aria-live="polite" id="' + id + '-mo"></div>' +
        '<table class="cal__grid" role="grid" aria-labelledby="' + id + '-mo"><thead><tr>' + wk + '</tr></thead><tbody></tbody></table>' +
        '<div class="cal__months" role="group" aria-labelledby="' + id + '-mo" hidden></div>' +
        '<div class="cal__foot"><button type="button" class="cal__link" data-cal-clear>Clear</button><button type="button" class="cal__link cal__link--today" data-cal-today>Today</button></div>' +
      '</div>';
    var cal = p.querySelector('.cal'), tbody = p.querySelector('tbody'), grid = p.querySelector('.cal__grid');
    var monthsEl = p.querySelector('.cal__months'), titleBtn = p.querySelector('[data-cal-mode]'), live = p.querySelector('#' + id + '-mo');
    var prevB = p.querySelector('[data-cal-step="-1"]'), nextB = p.querySelector('[data-cal-step="1"]'), clearB = p.querySelector('[data-cal-clear]');
    c.inset = function () { return titleBtn.offsetLeft + p.clientLeft; };

    function min() { var m = parse(inp.min), t = today(); return m && m > t ? m : t; }
    function value() { return parse(inp.value); }
    function sync(flash) {
      var v = value();
      c.text.textContent = v ? short(v) : 'Choose a date';
      c.trigger.classList.toggle('is-empty', !v);
      srv.textContent = v ? long(v) : 'not chosen';
      if (flash && !RM) { c.text.classList.remove('is-new'); void c.text.offsetWidth; c.text.classList.add('is-new'); }
    }
    function set(v) {
      var before = inp.value;
      inp.value = v ? iso(v) : '';
      sync(true);
      if (before !== inp.value) { inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    function header() {
      var mn = min();
      p.querySelector('.cal__month').textContent = mode === 'days' ? MONTHS[view.getMonth()] : '';
      p.querySelector('.cal__year').textContent = view.getFullYear();
      titleBtn.setAttribute('aria-label', mode === 'days' ? MONTHS[view.getMonth()] + ' ' + view.getFullYear() + ', choose month and year' : view.getFullYear() + ', back to days');
      live.textContent = mode === 'days' ? MONTHS[view.getMonth()] + ' ' + view.getFullYear() : String(view.getFullYear());
      prevB.setAttribute('aria-label', mode === 'days' ? 'Previous month' : 'Previous year');
      nextB.setAttribute('aria-label', mode === 'days' ? 'Next month' : 'Next year');
      prevB.disabled = mode === 'days' ? mIndex(view) <= mIndex(mn) : view.getFullYear() <= mn.getFullYear();
      clearB.disabled = !inp.value;
      cal.setAttribute('data-view', mode);
      grid.hidden = mode !== 'days';
      monthsEl.hidden = mode !== 'months';
    }
    function renderDays(dir) {
      var y = view.getFullYear(), m = view.getMonth(), mn = min(), T = today(), v = value();
      var off = (new Date(y, m, 1).getDay() + 6) % 7, len = new Date(y, m + 1, 0).getDate(), day = 1 - off, html = '';
      // always six rows, so the panel never changes height between months
      for (var r = 0; r < 6; r++) {
        html += '<tr>';
        for (var col = 0; col < 7; col++, day++) {
          if (day < 1 || day > len) { html += '<td></td>'; continue; }
          var d = new Date(y, m, day), past = d < mn, sel = same(d, v), tod = same(d, T);
          html += '<td' + (sel ? ' aria-selected="true"' : '') + '><button type="button" class="cal__day' + (sel ? ' is-sel' : '') + (tod ? ' is-today' : '') + '"' +
            ' data-d="' + iso(d) + '" tabindex="' + (same(d, focusD) ? 0 : -1) + '"' + (past ? ' disabled' : '') + (tod ? ' aria-current="date"' : '') +
            ' aria-label="' + long(d) + (tod ? ', today' : '') + (sel ? ', selected' : '') + '">' + day + '</button></td>';
        }
        html += '</tr>';
      }
      tbody.innerHTML = html;
      if (dir && !RM) { tbody.classList.remove('is-in-l', 'is-in-r'); void tbody.offsetWidth; tbody.classList.add(dir < 0 ? 'is-in-l' : 'is-in-r'); }
      header();
    }
    function renderMonths() {
      var y = view.getFullYear(), mn = min(), v = value(), html = '';
      for (var m = 0; m < 12; m++) {
        var d = new Date(y, m, 1), dis = mIndex(d) < mIndex(mn), on = m === view.getMonth(), sel = v && v.getFullYear() === y && v.getMonth() === m;
        html += '<button type="button" class="cal__mon' + (sel ? ' is-sel' : '') + '" data-m="' + m + '" tabindex="' + (on ? 0 : -1) + '"' + (dis ? ' disabled' : '') +
          ' aria-label="' + MONTHS[m] + ' ' + y + '"' + (sel ? ' aria-current="true"' : '') + '>' + MONTHS[m].slice(0, 3) + '</button>';
      }
      monthsEl.innerHTML = html;
      header();
    }
    function focusDay() { var b = tbody.querySelector('[data-d="' + iso(focusD) + '"]'); if (b) b.focus({ preventScroll: true }); }
    function moveTo(d) {
      var mn = min(); if (d < mn) d = mn;
      var dir = mIndex(d) - mIndex(view);
      focusD = d;
      if (dir) { view = new Date(d.getFullYear(), d.getMonth(), 1); }
      renderDays(dir);
      focusDay();
    }
    function step(n) {
      if (mode === 'days') {
        view = new Date(view.getFullYear(), view.getMonth() + n, 1);
        var f = addMonths(focusD, n), mn = min();
        focusD = f < mn ? mn : f;
        renderDays(n);
      } else {
        var y = view.getFullYear() + n, mn2 = min();
        view = new Date(y, view.getMonth(), 1);
        if (mIndex(view) < mIndex(mn2)) view = new Date(mn2.getFullYear(), mn2.getMonth(), 1);
        renderMonths();
      }
      // a disabled button cannot hold focus: hand it to its sibling
      if (doc.activeElement === prevB && prevB.disabled) nextB.focus();
    }
    function setMode(m, focusIt) {
      mode = m;
      if (m === 'months') { renderMonths(); if (focusIt) monthsEl.querySelector('[tabindex="0"]').focus(); }
      else { renderDays(0); if (focusIt) focusDay(); }
    }

    c.prepare = function () {
      var v = value(), mn = min(), T = today();
      focusD = v && v >= mn ? v : (T >= mn ? T : mn);
      view = new Date((v || focusD).getFullYear(), (v || focusD).getMonth(), 1);
      mode = 'days';
      renderDays(0);
    };
    c.focusIn = function () { focusDay(); };
    c.sync = function () { sync(false); };

    c.trigger.addEventListener('click', function () { current === c ? close(c, { restore: true }) : open(c); });
    c.trigger.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(c); } });
    titleBtn.addEventListener('click', function () { setMode(mode === 'days' ? 'months' : 'days', false); });
    prevB.addEventListener('click', function () { step(-1); });
    nextB.addEventListener('click', function () { step(1); });
    clearB.addEventListener('click', function () { set(null); close(c, { restore: true }); });
    p.querySelector('[data-cal-today]').addEventListener('click', function () { set(today()); close(c, { restore: true }); });
    p.querySelector('[data-pick-close]').addEventListener('click', function () { close(c, { restore: true }); });
    tbody.addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]'); if (!b || b.disabled) return;
      set(parse(b.getAttribute('data-d'))); close(c, { restore: true });
    });
    // keep the roving focus date in step with wherever focus actually is
    tbody.addEventListener('focusin', function (e) {
      var b = e.target.closest('[data-d]'); if (!b) return;
      focusD = parse(b.getAttribute('data-d'));
      Array.prototype.forEach.call(tbody.querySelectorAll('[data-d]'), function (x) { x.tabIndex = x === b ? 0 : -1; });
    });
    tbody.addEventListener('keydown', function (e) {
      var k = e.key, d = null;
      if (k === 'ArrowLeft') d = addDays(focusD, -1);
      else if (k === 'ArrowRight') d = addDays(focusD, 1);
      else if (k === 'ArrowUp') d = addDays(focusD, -7);
      else if (k === 'ArrowDown') d = addDays(focusD, 7);
      else if (k === 'Home') d = addDays(focusD, -((focusD.getDay() + 6) % 7));
      else if (k === 'End') d = addDays(focusD, 6 - (focusD.getDay() + 6) % 7);
      else if (k === 'PageUp') d = addMonths(focusD, e.shiftKey ? -12 : -1);
      else if (k === 'PageDown') d = addMonths(focusD, e.shiftKey ? 12 : 1);
      if (d) { e.preventDefault(); moveTo(d); }
    });
    monthsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b || b.disabled) return;
      var m = +b.getAttribute('data-m'), y = view.getFullYear(), mn = min();
      view = new Date(y, m, 1);
      var f = new Date(y, m, Math.min(focusD.getDate(), new Date(y, m + 1, 0).getDate()));
      focusD = f < mn ? mn : f;
      setMode('days', true);
    });
    monthsEl.addEventListener('keydown', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      var all = Array.prototype.slice.call(monthsEl.children), i = all.indexOf(b);
      var d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[e.key]; if (!d) return;
      e.preventDefault();
      for (var j = i + d; j >= 0 && j < 12; j += d) if (!all[j].disabled) { b.tabIndex = -1; all[j].tabIndex = 0; all[j].focus(); break; }
    });
    // dialog keyboard: Escape closes, Tab cycles inside the dialog
    p.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (mode === 'months') setMode('days', true); else close(c); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(p.querySelectorAll('button:not([disabled])'), function (b) { return b.tabIndex !== -1 && b.getClientRects().length; });
      if (!f.length) return;
      var i = f.indexOf(doc.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    inp.addEventListener('change', function () { sync(false); });
    sync(false);
    return c;
  }

  // Escape anywhere (e.g. focus left on the trigger) closes the open panel
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && current) close(current, { restore: true }); });

  var all = [];
  TEH.pick = {
    enhance: function (root) {
      Array.prototype.forEach.call((root || doc).querySelectorAll('select[data-pick], input[type=date][data-pick]'), function (el) {
        if (el.hasAttribute('data-picked')) return;
        all.push(el.tagName === 'SELECT' ? enhanceSelect(el) : enhanceDate(el));
      });
      return all;
    },
    sync: function () { all.forEach(function (c) { c.sync(); }); },
    close: function () { if (current) close(current, { restore: false }); },
    current: function () { return current ? current.ctrl.name : null; },
    iso: iso, parse: parse, today: today, short: short, long: long
  };
})();
