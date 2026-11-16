/* The Event House — homepage interactions (original implementation). */
(function () {
  'use strict';
  var TEH = window.TEH, $ = TEH.$, $$ = TEH.$$, RM = TEH.RM;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var rem = function () { return parseFloat(getComputedStyle(document.documentElement).fontSize); };

  /* ======================= 1. HERO PIN ======================= */
  (function hero() {
    var stage = $('[data-hero-stage]'), frame = $('[data-hero-frame]');
    if (!stage || !frame) return;
    var layers = $('[data-hero-media]', frame), bar = $('[data-hero-bar]'), intro = $('.hero__intro');
    var toggle = $('[data-hero-toggle]', stage);
    var hero = stage.parentElement;

    // Photos / videos come from assets/js/config/hero-media.js (schema documented in that file).
    var cfg = (window.TEH_CONFIG && window.TEH_CONFIG.heroMedia) || null;
    if (layers && cfg && TEH.HeroMedia) TEH.heroMedia = TEH.HeroMedia(layers, cfg, { toggle: toggle });

    // Prefill the enquiry bar date with a sensible minimum (today)
    var date = bar && bar.querySelector('input[type=date]');
    if (date) date.min = new Date().toISOString().slice(0, 10);

    if (RM || !hasGsap) {
      hero.classList.add('no-hero-motion');
      // Reduced motion: still image, intro flows below; gently crossfade is skipped.
      return;
    }

    function geo() {
      var vw = window.innerWidth, vh = stage.offsetHeight, desk = TEH.isDesktop();
      var pw = desk ? vw * 0.215 : vw * 0.64, ph = desk ? vh * 0.46 : vh * 0.5;
      var s = desk ? Math.max(vw * 0.144, 160) : vw * 0.46;
      var sTop = desk ? vh * 0.3 : vh * 0.2;
      return { vw: vw, vh: vh, pw: pw, ph: ph, s: s, sTop: sTop };
    }
    function setIntroOffset() {
      var g = geo();
      var gap = 4.8 * rem();
      intro.style.marginTop = -(g.vh - (g.sTop + g.s) - gap) + 'px';
    }
    setIntroOffset();
    ScrollTrigger.addEventListener('refreshInit', setIntroOffset);

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: stage, start: 'top top', end: function () { return '+=' + Math.round(geo().vh * 1.45); }, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    tl.to(frame, { left: function () { var g = geo(); return (g.vw - g.pw) / 2; }, top: function () { var g = geo(); return (g.vh - g.ph) / 2; }, width: function () { return geo().pw; }, height: function () { return geo().ph; }, ease: 'power2.inOut', duration: 0.5 }, 0)
      .to(frame, { '--shade': 0, duration: 0.3 }, 0)
      .to(frame, { left: function () { var g = geo(); return (g.vw - g.s) / 2; }, top: function () { return geo().sTop; }, width: function () { return geo().s; }, height: function () { return geo().s; }, ease: 'power2.inOut', duration: 0.35 }, 0.5)
      .to({}, { duration: 0.15 }, 0.85);
    if (bar) tl.to(bar, { autoAlpha: 0, y: 30, duration: 0.12, ease: 'power1.in' }, 0);
    if (toggle) tl.to(toggle, { autoAlpha: 0, duration: 0.1 }, 0);
    // The media eases out of a slight zoom while the frame contracts; the photo/video sequence itself is timed.
    if (layers) tl.fromTo(layers, { scale: 1.12 }, { scale: 1, duration: 1 }, 0);
  })();

  /* ======================= 3. CAROUSEL ======================= */
  (function carousel() {
    var root = $('[data-carousel]'); if (!root) return;
    var slides = $$('[data-slide]', root), titles = $$('[data-title]', root), copies = $$('[data-copy]', root);
    var bars = $$('.carousel__bars i', root), current = $('[data-current]', root), cursor = $('[data-cursor]', root);
    var n = slides.length, idx = 0, busy = false, ks = titles.map(function (_, j) { return j; });

    function dist(j, i) { var d = (j - i + n) % n; if (d > n / 2) d -= n; return d; }
    function layout(animate) {
      var vw = root.clientWidth, w = titles.map(function (t) { return t.offsetWidth; });
      var gap = vw * (TEH.isDesktop() ? 0.1 : 0.14);
      titles.forEach(function (t, j) {
        var k = dist(j, idx);
        var off = 0;
        if (k === 1 || k === -1) off = k * Math.max(vw * (TEH.isDesktop() ? 0.42 : 0.62), w[idx] / 2 + w[j] / 2 + gap);
        if (Math.abs(k) >= 2) off = Math.sign(k || 1) * vw;
        var o = k === 0 ? 1 : Math.abs(k) === 1 ? 0.42 : 0;
        var jump = Math.abs(k - ks[j]) > 1; // wrapping around the far side
        ks[j] = k;
        if (!animate || !hasGsap || RM || jump) { if (hasGsap) gsap.set(t, { x: off, xPercent: -50, opacity: o }); else { t.style.transform = 'translateX(calc(-50% + ' + off + 'px))'; t.style.opacity = o; } }
        else gsap.to(t, { x: off, xPercent: -50, opacity: o, duration: 1.1, ease: 'power3.inOut' });
      });
    }
    function sync() {
      copies.forEach(function (c, j) { c.classList.toggle('is-active', j === idx); c.setAttribute('aria-hidden', j === idx ? 'false' : 'true'); $$('a,button', c).forEach(function (a) { a.tabIndex = j === idx ? 0 : -1; }); });
      bars.forEach(function (b, j) { b.classList.toggle('is-active', j === idx); });
      if (current) current.textContent = idx + 1;
    }
    function go(dir, cx, cy) {
      if (busy) return;
      var from = idx; idx = (idx + dir + n) % n;
      var inS = slides[idx], outS = slides[from];
      layout(true); sync();
      if (RM || !hasGsap) { outS.classList.remove('is-active'); inS.classList.add('is-active'); return; }
      busy = true;
      var r = root.getBoundingClientRect();
      if (cx == null) { cx = dir > 0 ? r.width * 0.86 : r.width * 0.14; cy = r.height * 0.5; }
      var R = Math.hypot(Math.max(cx, r.width - cx), Math.max(cy, r.height - cy)) + 20;
      inS.classList.add('is-entering');
      var img = inS.querySelector('img');
      // zoom via --zoom (CSS `scale`), not GSAP transforms, so the image's scroll parallax keeps running
      gsap.fromTo(img, { '--zoom': 1.18 }, { '--zoom': 1, duration: 1.6, ease: 'expo.out' });
      gsap.fromTo(inS, { clipPath: 'circle(0px at ' + cx + 'px ' + cy + 'px)' }, {
        clipPath: 'circle(' + R + 'px at ' + cx + 'px ' + cy + 'px)', duration: 1.1, ease: 'power3.inOut',
        onComplete: function () { outS.classList.remove('is-active'); inS.classList.add('is-active'); inS.classList.remove('is-entering'); gsap.set(inS, { clearProps: 'clipPath' }); busy = false; }
      });
    }
    $$('[data-next]', root).forEach(function (b) { b.addEventListener('click', function (e) { var r = root.getBoundingClientRect(); go(1, e.detail ? e.clientX - r.left : null, e.detail ? e.clientY - r.top : null); }); });
    $$('[data-prev]', root).forEach(function (b) { b.addEventListener('click', function (e) { var r = root.getBoundingClientRect(); go(-1, e.detail ? e.clientX - r.left : null, e.detail ? e.clientY - r.top : null); }); });
    root.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });

    // custom cursor over the side zones (desktop pointer only)
    if (cursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var label = cursor.querySelector('span');
      $$('.carousel__zone', root).forEach(function (z) {
        var next = z.classList.contains('carousel__zone--next');
        z.addEventListener('pointermove', function (e) { var r = root.getBoundingClientRect(); cursor.style.setProperty('--cx', (e.clientX - r.left) + 'px'); cursor.style.setProperty('--cy', (e.clientY - r.top) + 'px'); label.textContent = next ? 'Next' : 'Prev'; cursor.classList.add('is-on'); });
        z.addEventListener('pointerleave', function () { cursor.classList.remove('is-on', 'is-down'); });
        z.addEventListener('pointerdown', function () { cursor.classList.add('is-down'); });
        z.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });
      });
    }
    // swipe
    var sx = null, sy = null;
    root.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    root.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1); sx = null; }, { passive: true });

    sync();
    var ready = function () { layout(false); };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(ready);
    window.addEventListener('resize', ready);
    ready();
  })();

  /* ======================= 5. TRIO: layered depth =======================
     Two layers move independently: each frame drifts at its own offset (data-trio), and the photo
     inside each frame has its own slower parallax (data-parallax, handled in core.js). */
  if (hasGsap && !RM) {
    $$('[data-trio]').forEach(function (el) {
      var f = parseFloat(el.getAttribute('data-trio')) * (TEH.isDesktop() ? 1 : 0.5);
      gsap.fromTo(el, { y: function () { return -f * 6 * rem(); } }, { y: function () { return f * 6 * rem(); }, ease: 'none', scrollTrigger: { trigger: '.trio__grid', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
    });
  }

  /* ======================= 7. OVAL ======================= */
  (function oval() {
    var el = $('[data-oval]'); if (!el) return;
    var img = $('[data-oval-img]', el);
    // One radius length only: it grows from a soft rectangle to half the frame's shorter side, which is
    // a capsule on wide frames and a circle on the square mobile frame. Never an elliptical "rx / ry".
    var last = 1;
    var apply = function (p) {
      last = p;
      var w = el.offsetWidth, h = el.offsetHeight, end = Math.min(w, h) / 2, r0 = Math.min(4 * rem(), end);
      var e = 1 - Math.pow(1 - p, 2);
      el.style.setProperty('--oval-r', (r0 + (end - r0) * e).toFixed(1) + 'px');
    };
    if (RM || !hasGsap) return; // CSS fallback already gives the final capsule / circle
    ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'center 55%', onUpdate: function (st) { apply(st.progress); }, onRefresh: function (st) { apply(st.progress); } });
    if ('ResizeObserver' in window) new ResizeObserver(function () { apply(last); }).observe(el);
    // gentle settle of the photo as it arrives; its vertical parallax comes from data-parallax (core.js)
    gsap.fromTo(img, { '--zoom': 1.08 }, { '--zoom': 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'center center', scrub: true } });
  })();

  /* ======================= 8. ANATOMY HOTSPOTS ======================= */
  (function anatomy() {
    var map = $('[data-anatomy]'); if (!map) return;
    var card = $('[data-spot-card]', map), spots = $$('[data-spot]', map), links = $$('[data-spot-link]');
    var open = -1;
    card.removeAttribute('hidden');
    function show(i) {
      var spot = spots[i], p = TEH_FIND(spot.getAttribute('data-spot'));
      if (!p) return;
      open = i;
      spots.forEach(function (s, j) { s.classList.toggle('is-active', j === i); s.setAttribute('aria-expanded', j === i ? 'true' : 'false'); });
      links.forEach(function (l, j) { l.classList.toggle('is-active', j === i); });
      card.innerHTML = TEH.thumb(p, 'sm') + '<h3>' + TEH.esc(p.name) + '</h3><p>' + TEH.esc(p.blurb) + '</p>' +
        '<button class="btn btn--primary btn--s" type="button" data-add="' + p.id + '"><span class="btn-label"><span>Add to enquiry</span><span aria-hidden="true">Add to enquiry</span></span></button>' +
        '<button class="spot-card__close" type="button" aria-label="Close"><svg aria-hidden="true"><use href="#i-close"/></svg></button>';
      if (TEH.isDesktop()) {
        var mw = map.offsetWidth, mh = map.offsetHeight, x = spot.offsetLeft, y = spot.offsetTop, cw = card.offsetWidth || 300, ch = card.offsetHeight || 340;
        var left = x / mw < 0.6 ? x + 32 : x - cw - 32;
        var top = Math.max(-40, Math.min(y - ch / 2, mh - ch + 40));
        card.style.left = left + 'px'; card.style.top = top + 'px';
      }
      card.classList.add('is-open');
      card.querySelector('.spot-card__close').addEventListener('click', hide);
    }
    function hide() {
      if (open < 0) return;
      var s = spots[open]; open = -1;
      card.classList.remove('is-open');
      spots.forEach(function (sp) { sp.classList.remove('is-active'); sp.setAttribute('aria-expanded', 'false'); });
      links.forEach(function (l) { l.classList.remove('is-active'); });
      if (s && card.contains(document.activeElement)) s.focus();
    }
    spots.forEach(function (s, i) { s.setAttribute('aria-expanded', 'false'); s.addEventListener('click', function (e) { e.stopPropagation(); open === i ? hide() : show(i); }); });
    links.forEach(function (l) { l.addEventListener('click', function (e) { e.stopPropagation(); var i = +l.getAttribute('data-spot-link'); open === i ? hide() : show(i); }); });
    // clicks inside the card must still reach the shared [data-add] handler, so ignore them here instead of stopping propagation
    document.addEventListener('click', function (e) { if (!card.contains(e.target)) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  })();

  /* ======================= horizontal tracks (services + gallery strip) ======================= */
  function dragScroll(track) {
    var down = false, startX = 0, startL = 0, moved = false;
    track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; startX = e.clientX; startL = track.scrollLeft; track.style.scrollSnapType = 'none'; });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - startX; if (Math.abs(dx) > 4) moved = true; track.scrollLeft = startL - dx; });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; track.style.scrollSnapType = ''; });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }
  (function services() {
    var track = $('[data-track]'); if (!track) return;
    var prev = $('[data-slide-prev]'), next = $('[data-slide-next]');
    var step = function () { var c = track.firstElementChild; return c.offsetWidth + parseFloat(getComputedStyle(track).columnGap || 24); };
    var upd = function () { prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4; };
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: RM ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: RM ? 'auto' : 'smooth' }); });
    track.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
    dragScroll(track);
  })();
  (function galleryStrip() {
    var track = $('[data-sg]'); if (!track) return;
    var bar = $('[data-sg-bar]'), count = $('[data-sg-count]'), pairs = track.children;
    var upd = function () {
      var max = track.scrollWidth - track.clientWidth, p = max > 0 ? track.scrollLeft / max : 1;
      bar.style.transform = 'scaleX(' + (0.2 + 0.8 * p).toFixed(3) + ')';
      count.textContent = Math.min(pairs.length, Math.round(p * (pairs.length - 1)) + 1);
    };
    track.addEventListener('scroll', upd, { passive: true }); upd();
    dragScroll(track);
  })();

  /* ======================= 11. FAQ ======================= */
  (function faq() {
    var root = $('[data-faq]'); if (!root) return;
    var btns = $$('button[aria-controls]', root);
    function set(b, open) {
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (RM || !hasGsap) { panel.hidden = !open; return; }
      if (open) { panel.hidden = false; gsap.fromTo(panel, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.8, ease: 'expo.out', onComplete: function () { ScrollTrigger.refresh(); } }); }
      else gsap.to(panel, { height: 0, opacity: 0, duration: 0.6, ease: 'expo.out', onComplete: function () { panel.hidden = true; gsap.set(panel, { clearProps: 'height,opacity' }); ScrollTrigger.refresh(); } });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { var open = b.getAttribute('aria-expanded') !== 'true'; btns.forEach(function (o) { if (o !== b && o.getAttribute('aria-expanded') === 'true') set(o, false); }); set(b, open); }); });
  })();
})();
