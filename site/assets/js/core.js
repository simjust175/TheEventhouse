/* The Event House — shared runtime (independently written; GSAP + Lenis are third-party libraries). */
(function () {
  'use strict';
  var doc = document.documentElement;
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var TEH = (window.TEH = window.TEH || {});
  TEH.RM = RM;
  TEH.isDesktop = function () { return window.matchMedia('(min-width: 1100px)').matches; };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  TEH.$ = $; TEH.$$ = $$;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  TEH.esc = esc;

  /* ---------- smooth scroll ---------- */
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText && hasGsap) gsap.registerPlugin(SplitText);
  if (!RM && window.Lenis) {
    var lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    TEH.lenis = lenis;
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    }
  }
  TEH.scrollTo = function (target, opts) {
    if (TEH.lenis) TEH.lenis.scrollTo(target, Object.assign({ offset: -60, duration: 1.4 }, opts || {}));
    else { var el = typeof target === 'string' ? $(target) : target; if (el && el.scrollIntoView) el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); else window.scrollTo(0, target || 0); }
  };
  TEH.lock = function (on) { if (TEH.lenis) { on ? TEH.lenis.stop() : TEH.lenis.start(); } document.body.style.overflow = on ? 'hidden' : ''; };

  /* in-page anchors go through Lenis */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="#"]');
    if (!a) return;
    var url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
    var t = document.getElementById(url.hash.slice(1));
    if (!t) return;
    e.preventDefault();
    closeMenu();
    TEH.scrollTo(t);
    history.replaceState(null, '', url.hash);
  });

  /* ---------- header ---------- */
  var header = $('header[data-header]');
  var page = document.body.getAttribute('data-page');
  if (header) {
    if (document.body.getAttribute('data-header') === 'solid') header.classList.add('is-solid');
    else header.setAttribute('data-tone', 'light');
    var cur = $('[data-nav="' + page + '"]', header);
    if (cur) cur.setAttribute('aria-current', 'page');
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 40); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* per-page CTA band copy (Collection mockup: "Build Your Collection") */
  ['title', 'text', 'btn'].forEach(function (k) {
    var v = document.body.getAttribute('data-cta-' + k), el = $('.cta-band [data-cta-' + k + ']');
    if (!v || !el) return;
    if (k === 'btn') { var tn = Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); })[0]; if (tn) tn.textContent = v + ' '; }
    else el.textContent = v;
  });

  /* footer link groups collapse into accordions below the desktop breakpoint */
  if (!TEH.isDesktop()) $$('.footer__acc[open]').forEach(function (d) { d.removeAttribute('open'); });

  /* ---------- button label swap ---------- */
  $$('.btn').forEach(function (b) {
    if (b.querySelector('.btn-label')) return;
    var label = Array.prototype.filter.call(b.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); })[0];
    if (!label) return;
    var t = label.textContent.trim();
    var wrap = document.createElement('span');
    wrap.className = 'btn-label';
    wrap.innerHTML = '<span>' + esc(t) + '</span><span aria-hidden="true">' + esc(t) + '</span>';
    b.replaceChild(wrap, label);
  });
  TEH.setBtnText = function (b, t) {
    var l = b.querySelector('.btn-label');
    if (l) l.innerHTML = '<span>' + esc(t) + '</span><span aria-hidden="true">' + esc(t) + '</span>';
    else { var tn = Array.prototype.filter.call(b.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); })[0]; if (tn) tn.textContent = t + ' '; }
  };

  /* ---------- focus trap ---------- */
  TEH.trap = function (root, onEsc) {
    var prev = document.activeElement;
    var sel = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
    function key(e) {
      if (e.key === 'Escape') { e.preventDefault(); onEsc && onEsc(); return; }
      if (e.key !== 'Tab') return;
      var f = $$(sel, root).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
      if (!f.length) return;
      // focus can fall back to <body> when the focused control is re-rendered (e.g. removing a basket line)
      if (!root.contains(document.activeElement)) { e.preventDefault(); f[0].focus(); return; }
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
    document.addEventListener('keydown', key);
    return function release() { document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus({ preventScroll: true }); };
  };

  /* ---------- menu ---------- */
  var menu = $('[data-menu]'), menuRelease = null;
  if (menu) menu.removeAttribute('hidden');
  function openMenu() {
    if (!menu) return;
    menu.classList.add('is-open');
    $$('[data-menu-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    TEH.lock(true);
    menuRelease = TEH.trap(menu, closeMenu);
    setTimeout(function () { var c = $('[data-menu-close]', menu); c && c.focus(); }, 60);
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    $$('[data-menu-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    TEH.lock(false);
    if (menuRelease) { menuRelease(); menuRelease = null; }
  }
  $$('[data-menu-open]').forEach(function (b) { b.addEventListener('click', openMenu); });
  $$('[data-menu-close]').forEach(function (b) { b.addEventListener('click', closeMenu); });
  if (menu) $$('.menu__links a', menu).forEach(function (a) { a.addEventListener('click', function () { if (!a.hash || new URL(a.href).pathname !== location.pathname) closeMenu(); }); });

  /* ---------- enquiry basket (front-end demonstration; localStorage) ---------- */
  var KEY = 'teh-enquiry-v1';
  var mem = [];
  var read = function () { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return mem; } };
  var write = function (items) { mem = items; try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* storage unavailable: keep in memory */ } emit(); };
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { fn(Basket.items()); }); }
  var Basket = TEH.basket = {
    items: function () { return read().filter(function (i) { return window.TEH_FIND && TEH_FIND(i.id); }); },
    count: function () { return Basket.items().reduce(function (n, i) { return n + i.qty; }, 0); },
    add: function (id, qty, note) {
      var items = read(); var it = items.find(function (i) { return i.id === id; });
      if (it) it.qty = Math.min(999, it.qty + (qty || 1)); else items.push({ id: id, qty: qty || 1, note: note || '' });
      write(items);
    },
    set: function (id, qty) { var items = read(); var it = items.find(function (i) { return i.id === id; }); if (!it) return; it.qty = Math.max(1, Math.min(999, qty | 0 || 1)); write(items); },
    remove: function (id) { write(read().filter(function (i) { return i.id !== id; })); },
    clear: function () { write([]); },
    on: function (fn) { listeners.push(fn); }
  };

  TEH.thumb = function (p, size, cls) {
    var src = TEH_IMG(p.img, size);
    if (src) return '<img class="' + (cls || '') + '" src="' + src + '" alt="' + esc(p.name) + '" loading="lazy">';
    return '<div class="paper-art ' + (cls || '') + '" role="img" aria-label="' + esc(p.name) + '"><span>The Event House</span></div>';
  };

  var drawer = $('[data-drawer]'), drawerRelease = null;
  if (drawer) drawer.removeAttribute('hidden');
  /* Re-render a basket list without losing keyboard focus: qty +/- and Remove rebuild the markup,
     so refocus the same control afterwards, or `fallback` when the line itself was removed. */
  TEH.rerender = function (list, render, fallback) {
    var a = document.activeElement, had = a && list.contains(a), keep = null;
    if (had) ['data-inc', 'data-dec', 'data-remove'].some(function (k) { if (a.hasAttribute(k)) { keep = '[' + k + '="' + a.getAttribute(k) + '"]'; return true; } });
    render(list);
    if (had) { var t = (keep && $(keep, list)) || fallback || $('a,button', list); if (t) t.focus({ preventScroll: true }); }
  };
  function renderDrawer() {
    var list = $('[data-drawer-list]'); if (!list) return;
    TEH.rerender(list, renderDrawerList, $('.drawer__close', drawer));
  }
  function renderDrawerList(list) {
    var items = Basket.items();
    var cta = $('[data-drawer-cta]');
    if (!items.length) {
      list.innerHTML = '<div class="drawer__empty"><p class="title title--xs">Your enquiry is empty</p><p>Add pieces from the collection, or simply tell us about your event.</p><p style="margin-top:2.4rem"><a class="link-arrow" href="collection.html">Browse the collection <svg class="arrow" viewBox="0 0 24 12" aria-hidden="true"><use href="#i-arrow"/></svg></a></p></div>';
      if (cta) TEH.setBtnText(cta, 'Start an enquiry without pieces');
      return;
    }
    if (cta) TEH.setBtnText(cta, 'Review & send enquiry');
    list.innerHTML = items.map(function (i) {
      var p = TEH_FIND(i.id);
      return '<div class="line-item">' + TEH.thumb(p, 'sm') +
        '<div><span class="line-item__cat">' + esc(catLabel(p.cat)) + '</span><p class="line-item__name">' + esc(p.name) + '</p>' +
        '<button type="button" class="line-item__remove" data-remove="' + p.id + '">Remove<span class="sr-only"> ' + esc(p.name) + '</span></button></div>' +
        '<div class="qty" role="group" aria-label="Quantity for ' + esc(p.name) + '"><button type="button" data-dec="' + p.id + '" aria-label="Decrease">−</button><output aria-live="polite">' + i.qty + '</output><button type="button" data-inc="' + p.id + '" aria-label="Increase">+</button></div></div>';
    }).join('');
  }
  function catLabel(id) { var c = (window.TEH_CATEGORIES || []).find(function (c) { return c.id === id; }); return c ? c.label : id; }
  TEH.catLabel = catLabel;
  function renderCount(bump) {
    var n = Basket.count();
    $$('[data-basket-count]').forEach(function (el) { el.textContent = n; if (bump) { var p = el.parentNode; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); } });
    $$('[data-basket-sr]').forEach(function (el) { el.textContent = 'Enquiry basket, ' + n + (n === 1 ? ' item' : ' items'); });
  }
  function openDrawer() {
    if (!drawer) return;
    renderDrawer();
    drawer.classList.add('is-open');
    $$('[data-basket-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    TEH.lock(true);
    drawerRelease = TEH.trap(drawer, closeDrawer);
    hideToast();
    setTimeout(function () { var c = $('.drawer__close', drawer); c && c.focus(); }, 60);
  }
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    $$('[data-basket-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    TEH.lock(false);
    if (drawerRelease) { drawerRelease(); drawerRelease = null; }
  }
  TEH.openDrawer = openDrawer;
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-basket-open]')) { e.preventDefault(); openDrawer(); return; }
    if (t.closest('[data-drawer-close]')) { closeDrawer(); return; }
    var r = t.closest('[data-remove]'); if (r) { Basket.remove(r.getAttribute('data-remove')); return; }
    var inc = t.closest('[data-inc]'); if (inc) { var id = inc.getAttribute('data-inc'); var it = Basket.items().find(function (i) { return i.id === id; }); Basket.set(id, it.qty + 1); return; }
    var dec = t.closest('[data-dec]'); if (dec) { var id2 = dec.getAttribute('data-dec'); var it2 = Basket.items().find(function (i) { return i.id === id2; }); if (it2.qty <= 1) Basket.remove(id2); else Basket.set(id2, it2.qty - 1); return; }
    var add = t.closest('[data-add]');
    if (add) {
      e.preventDefault();
      var pid = add.getAttribute('data-add'); var p = TEH_FIND(pid); if (!p) return;
      var qtyEl = add.getAttribute('data-qty-from') ? $(add.getAttribute('data-qty-from')) : null;
      Basket.add(pid, qtyEl ? Math.max(1, parseInt(qtyEl.value, 10) || 1) : 1, add.getAttribute('data-note') || '');
      added(add, p);
    }
  });
  function added(btn, p) {
    var isRequest = /request/i.test(btn.textContent);
    var orig = btn.getAttribute('data-orig') || btn.textContent.trim();
    btn.setAttribute('data-orig', orig);
    btn.classList.add('is-added');
    var label = isRequest ? 'Requested' : 'Added to enquiry';
    if (btn.classList.contains('btn')) TEH.setBtnText(btn, label); else setPlain(btn, label);
    setTimeout(function () { btn.classList.remove('is-added'); if (btn.classList.contains('btn')) TEH.setBtnText(btn, orig); else setPlain(btn, orig); }, 2200);
    showToast(p.name + ' added to your enquiry');
    renderCount(true);
  }
  function setPlain(btn, t) { var tn = Array.prototype.filter.call(btn.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); })[0]; if (tn) tn.textContent = t + ' '; }
  var toast = $('[data-toast]'), toastTimer;
  function showToast(msg) { if (!toast) return; $('[data-toast-text]', toast).textContent = msg; toast.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, 3800); }
  function hideToast() { if (toast) toast.classList.remove('is-visible'); }
  TEH.toast = showToast;
  Basket.on(function () { renderCount(false); if (drawer && drawer.classList.contains('is-open')) renderDrawer(); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) emit(); });
  renderCount(false);

  /* ---------- reveals ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  TEH.observe = function (el) { if (io && !RM) io.observe(el); else el.classList.add('is-in'); };
  $$('[data-reveal], .img-reveal').forEach(TEH.observe);

  /* split-line headings: lines rise from a mask (expo-out, staggered) */
  TEH.split = function (el, opts) {
    if (RM || !window.SplitText || !hasGsap) return null;
    var s = new SplitText(el, { type: 'lines', linesClass: 'split-line-inner', mask: 'lines' });
    gsap.set(s.lines, { yPercent: 110 });
    var play = function () { gsap.to(s.lines, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, delay: (opts && opts.delay) || 0 }); };
    if (opts && opts.manual) return { play: play, split: s };
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: play });
    return s;
  };
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fontsReady.then(function () {
    $$('[data-split]').forEach(function (el) { TEH.split(el); });
    if (hasGsap) ScrollTrigger.refresh();
  });

  /* ---------- scroll parallax ----------
     <frame (clips)> <img|video data-parallax="0.15"> </frame>
     The photo moves inside its frame at `rate` × the scroll speed (0.15 ≈ the reference's category
     slides, 0.06–0.10 its editorial images). It is made taller than the frame by exactly the distance
     it travels (`--px-t`) and offset by half of that, so no edge can ever show. Movement uses the CSS
     `translate` property via `--px-y`, independent of `transform`, so it composes with reveal scales
     and GSAP tweens on the same element. Optional: data-parallax-trigger="<selector>" to share a
     scroll range (e.g. all carousel slides). Optional: data-parallax-end="bottom bottom" for an image
     that ends the page (the footer band can never reach "bottom top", so with the default range only
     ~40% of its movement ever played and it looked static). Travel = rate × the real scroll range.
     Mobile uses 60% of the rate; reduced motion disables it. */
  TEH.parallax = function (el) {
    var rate = parseFloat(el.getAttribute('data-parallax')) || 0.1;
    var frame = el.parentElement;
    var trig = el.getAttribute('data-parallax-trigger'); trig = (trig && el.closest(trig)) || frame;
    var end = el.getAttribute('data-parallax-end') || 'bottom top';
    if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
    frame.classList.add('px-frame'); el.classList.add('px-media');
    var travel = 0, prog = 0.5;
    var apply = function (p) { prog = p; el.style.setProperty('--px-y', ((p - 0.5) * travel).toFixed(1) + 'px'); };
    var measure = function (range) {
      var k = TEH.isDesktop() ? 1 : 0.6;
      if (!range) range = end === 'bottom bottom' ? trig.offsetHeight : window.innerHeight + trig.offsetHeight;
      travel = Math.ceil(rate * k * range) + 2;
      el.style.setProperty('--px-t', travel + 'px');
      apply(prog);
    };
    measure();
    ScrollTrigger.addEventListener('refreshInit', function () { measure(); });
    // refreshPriority -1: computed after page pins (the hero pin is created later, in home.js)
    ScrollTrigger.create({ trigger: trig, start: 'top bottom', end: end, refreshPriority: -1, onUpdate: function (st) { apply(st.progress); }, onRefresh: function (st) { if (end !== 'bottom top' && st.end > st.start) measure(st.end - st.start); apply(st.progress); } });
  };
  if (hasGsap && !RM) $$('[data-parallax]').forEach(TEH.parallax);

  /* deep-link scroll after load (e.g. index.html#services from another page) */
  window.addEventListener('load', function () {
    if (hasGsap) ScrollTrigger.refresh();
    if (location.hash && location.hash.length > 1) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) setTimeout(function () { TEH.scrollTo(t, { immediate: true }); }, 120);
    }
  });
})();
