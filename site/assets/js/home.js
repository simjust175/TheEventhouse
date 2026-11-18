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

    // Enquiry bar: today (local date, not UTC) is the earliest date; the custom pickers enhance the native fields
    var date = bar && bar.querySelector('input[type=date]');
    if (date && TEH.pick) date.min = TEH.pick.iso(TEH.pick.today());
    if (bar && TEH.pick) TEH.pick.enhance(bar);

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
    var bars = $$('[data-goto]', root), current = $('[data-current]', root), cursor = $('[data-cursor]', root);
    var live = $('.carousel__content', root), toggle = $('[data-cz-toggle]', root);
    var n = slides.length, idx = 0, busy = false, ks = titles.map(function (_, j) { return j; });
    var DUR = 1.1, arrowsShown = false; // circle reveal + title slide, seconds

    function dist(j, i) { var d = (j - i + n) % n; if (d > n / 2) d -= n; return d; }
    function layout(animate, dir) {
      var vw = root.clientWidth, w = titles.map(function (t) { return t.offsetWidth; });
      var gap = vw * (TEH.isDesktop() ? 0.1 : 0.14);
      titles.forEach(function (t, j) {
        var k = dist(j, idx);
        var off = 0;
        // desktop: neighbours sit as partial ghosts at the edges; with arrows (phones/tablets) they wait
        // just off screen, as the reference, so no sliver shows behind the arrow buttons
        if (k === 1 || k === -1) off = k * (arrowsShown ? vw / 2 + w[j] / 2 + 4 : Math.max(vw * (TEH.isDesktop() ? 0.42 : 0.62), w[idx] / 2 + w[j] / 2 + gap));
        if (Math.abs(k) >= 2) off = Math.sign(k || 1) * vw;
        var o = k === 0 ? 1 : Math.abs(k) === 1 ? 0.42 : 0;
        var was = ks[j], jump = Math.abs(k - was) > 1; // wrapping around the far side, or a two-step jump
        ks[j] = k;
        if (!animate || !hasGsap || RM) { if (hasGsap) gsap.set(t, { x: off, xPercent: -50, opacity: o }); else { t.style.transform = 'translateX(calc(-50% + ' + off + 'px))'; t.style.opacity = o; } return; }
        gsap.killTweensOf(t);
        if (!jump) { gsap.to(t, { x: off, xPercent: -50, opacity: o, duration: DUR, ease: 'power3.inOut' }); return; }
        // a jump would teleport across the screen: leave or enter from the side the strip is travelling
        var d = dir || 1;
        if (Math.abs(was) <= 1) gsap.to(t, { x: -d * vw, opacity: 0, duration: DUR, ease: 'power3.inOut', onComplete: function () { gsap.set(t, { x: off, opacity: o }); } });
        else if (Math.abs(k) <= 1) gsap.fromTo(t, { x: d * vw, xPercent: -50, opacity: 0 }, { x: off, opacity: o, duration: DUR, ease: 'power3.inOut' });
        else gsap.set(t, { x: off, xPercent: -50, opacity: o });
      });
    }
    function sync() {
      copies.forEach(function (c, j) { c.classList.toggle('is-active', j === idx); c.setAttribute('aria-hidden', j === idx ? 'false' : 'true'); $$('a,button', c).forEach(function (a) { a.tabIndex = j === idx ? 0 : -1; }); });
      bars.forEach(function (b, j) { b.classList.toggle('is-active', j === idx); if (j === idx) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      if (current) current.textContent = idx + 1;
    }
    function goTo(to, dir, cx, cy, auto) {
      to = (to + n) % n;
      if (busy || to === idx) return;
      dir = dir || (dist(to, idx) < 0 ? -1 : 1);
      stopTimer();
      // announce manual changes only; automatic ones would interrupt screen readers every few seconds
      if (live) live.setAttribute('aria-live', auto ? 'off' : 'polite');
      var from = idx; idx = to;
      var inS = slides[idx], outS = slides[from];
      layout(true, dir); sync();
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
        clipPath: 'circle(' + R + 'px at ' + cx + 'px ' + cy + 'px)', duration: DUR, ease: 'power3.inOut',
        onComplete: function () { outS.classList.remove('is-active'); inS.classList.add('is-active'); inS.classList.remove('is-entering'); gsap.set(inS, { clearProps: 'clipPath' }); busy = false; startTimer(); }
      });
    }
    function go(dir, cx, cy) { goTo(idx + dir, dir, cx, cy); }

    /* Autoplay: each slide holds for HOLD after its transition has finished, so one change every
       ~4s (2.9s hold + the unchanged 1.1s transition). Only the waiting time was shortened.
       One timer only: every change, manual or automatic, cancels it and it restarts once the new
       slide has fully arrived, so a chosen slide always gets the full hold. Pauses when the carousel
       is off screen, the tab is hidden, keyboard focus is inside it, the pointer is dwelling on a
       NEXT / PREV zone (hover navigation takes over), or via the pause button. */
    var HOLD = 2900, timer = 0, inView = false, focusHold = false, userPaused = false, hoverHold = false;
    var canAuto = hasGsap && !RM && n > 1;
    root.style.setProperty('--cz-hold', HOLD + 'ms');
    function shouldRun() { return canAuto && inView && !document.hidden && !focusHold && !userPaused && !hoverHold; }
    function stopTimer() { clearTimeout(timer); timer = 0; root.classList.remove('is-timing'); }
    function startTimer() {
      stopTimer();
      if (!shouldRun() || busy) return;
      void root.offsetWidth; // restart the progress-line animation from zero
      root.classList.add('is-timing');
      timer = setTimeout(function () { timer = 0; goTo(idx + 1, 1, null, null, true); }, HOLD);
    }
    function refresh() { if (shouldRun()) { if (!timer && !busy) startTimer(); } else stopTimer(); }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; if (!inView) dwellStop(); refresh(); }, { threshold: 0.35 }).observe(root);
    else inView = true;
    // hidden tab / scrolled away: drop any pending hover step (the next pointer move re-arms it)
    document.addEventListener('visibilitychange', function () { if (document.hidden) dwellStop(); refresh(); });
    if (canAuto) {
      root.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches(':focus-visible')) { focusHold = true; refresh(); } });
      root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) { focusHold = false; refresh(); } });
      if (toggle) {
        toggle.hidden = false;
        toggle.addEventListener('click', function () {
          userPaused = !userPaused;
          toggle.classList.toggle('is-paused', userPaused);
          toggle.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
          toggle.setAttribute('aria-label', userPaused ? 'Play automatic slides' : 'Pause automatic slides');
          if (!userPaused) focusHold = false; // the button itself holds focus; resuming is explicit
          refresh();
        });
      }
    }
    /* Hover navigation (mouse only): resting on NEXT / PREV for DWELL moves one slide, and keeps
       moving every DWELL while the pointer stays in that zone. One dwell timer only; it is restarted
       (never stacked) by every navigation, including a click, so a click is instant and is never
       followed by a surprise second advance. Leaving the zone cancels it at once. The cursor's ring
       traces the wait. Not on touch (tap and swipe stay as they were) and not under reduced motion. */
    var DWELL = 2000, dwellT = 0, dwellDir = 0, dwellX = 0, dwellY = 0;
    var canDwell = !!cursor && !RM && n > 1 && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    root.style.setProperty('--cz-dwell', DWELL + 'ms');
    function dwellStop() { clearTimeout(dwellT); dwellT = 0; if (cursor) cursor.classList.remove('is-dwell'); }
    function dwellStart() {
      dwellStop();
      if (!dwellDir || document.hidden) return;
      void cursor.offsetWidth; // restart the ring from empty
      cursor.classList.add('is-dwell');
      dwellT = setTimeout(function () {
        dwellT = 0;
        if (!dwellDir) return;
        go(dwellDir, dwellX, dwellY);
        dwellStart();
      }, DWELL);
    }

    TEH.carousel = { goTo: function (i) { goTo(i); }, index: function () { return idx; }, pause: function () { userPaused = true; refresh(); }, play: function () { userPaused = false; refresh(); }, running: function () { return !!timer; }, busy: function () { return busy; }, dwelling: function () { return !!dwellT; }, hold: HOLD, dwell: DWELL };

    bars.forEach(function (b) { b.addEventListener('click', function () { goTo(parseInt(b.getAttribute('data-goto'), 10)); }); });
    function zoneClick(dir) {
      return function (e) {
        var r = root.getBoundingClientRect();
        go(dir, e.detail ? e.clientX - r.left : null, e.detail ? e.clientY - r.top : null);
        if (dwellDir) dwellStart(); // a click resets the hover wait
      };
    }
    $$('[data-next]', root).forEach(function (b) { b.addEventListener('click', zoneClick(1)); });
    $$('[data-prev]', root).forEach(function (b) { b.addEventListener('click', zoneClick(-1)); });
    root.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });

    // custom cursor over the side zones (desktop pointer only)
    if (cursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var label = cursor.querySelector('span');
      $$('.carousel__zone', root).forEach(function (z) {
        var next = z.classList.contains('carousel__zone--next');
        z.addEventListener('pointermove', function (e) {
          var r = root.getBoundingClientRect();
          dwellX = e.clientX - r.left; dwellY = e.clientY - r.top;
          cursor.style.setProperty('--cx', dwellX + 'px'); cursor.style.setProperty('--cy', dwellY + 'px'); label.textContent = next ? 'Next' : 'Prev'; cursor.classList.add('is-on');
          // (re)arm on entering a zone, switching zones, or after a pause (tab hidden / scrolled away)
          if (canDwell && e.pointerType === 'mouse' && inView && !document.hidden && (dwellDir !== (next ? 1 : -1) || !dwellT)) {
            dwellDir = next ? 1 : -1; hoverHold = true; refresh(); dwellStart();
          }
        });
        z.addEventListener('pointerleave', function () {
          cursor.classList.remove('is-on', 'is-down');
          if (dwellDir) { dwellDir = 0; dwellStop(); hoverHold = false; refresh(); }
        });
        z.addEventListener('pointerdown', function () { cursor.classList.add('is-down'); });
        z.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });
      });
    }
    // swipe
    var sx = null, sy = null;
    root.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    root.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1); sx = null; }, { passive: true });

    // Phones/tablets: a long title ("Celebrations") must fit between the round arrows, never under
    // them or past the screen edge. Shrink only the titles that need it (bottom-anchored in CSS, so the
    // gap to the tagline is unchanged).
    function fit() {
      var arrow = $('.carousel__arrows button', root), rr = root.getBoundingClientRect();
      titles.forEach(function (t) { t.style.fontSize = ''; });
      arrowsShown = !!(arrow && arrow.offsetWidth);
      if (!arrowsShown) return;
      var avail = rr.width - 2 * (arrow.getBoundingClientRect().right - rr.left + 0.8 * rem());
      titles.forEach(function (t) { var s = avail / t.offsetWidth; if (s < 1) t.style.fontSize = 'calc(var(--fs-mega) * ' + s.toFixed(3) + ')'; });
    }
    sync();
    var ready = function () { fit(); layout(false); };
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
    var img = $('[data-oval-img]', el), stage = el.parentElement, sec = stage.parentElement;
    // One radius length only: it grows from a soft rectangle to half the frame's shorter side, which is
    // a capsule on wide frames and a circle on the square mobile frame. Never an elliptical "rx / ry".
    //
    // Why the old version went unnoticed: it ran from "top bottom" to "center 55%" with an ease-out,
    // so half the rounding happened while only the top ~200px of the frame had entered the screen,
    // and it was finished before the whole shape was ever in view. Now the morph:
    //   - starts only once 85% of the frame is visible (the rectangle is seen whole first),
    //   - continues while the frame holds centred (CSS sticky over --oval-hold of scroll),
    //   - completes at 85% of that hold, so the finished capsule / circle rests briefly before it leaves,
    //   - uses a sine in-out curve, so the start, middle and end each read as distinct states.
    // Desktop 1440×900: ~90vh of scroll from rectangle to capsule (plus the rectangle's own entry).
    var last = 1;
    var apply = function (p) {
      last = p;
      var w = el.offsetWidth, h = el.offsetHeight, end = Math.min(w, h) / 2, r0 = Math.min(4 * rem(), end * 0.1); // crisp start corners, ≈5% of the frame height at every width
      var e = 0.5 - 0.5 * Math.cos(Math.PI * p);
      el.style.setProperty('--oval-r', (r0 + (end - r0) * e).toFixed(1) + 'px');
      el.setAttribute('data-oval-p', p.toFixed(3));
      // the photo settles from a slight zoom in step with the shape; its vertical parallax is core.js
      if (img) img.style.setProperty('--zoom', (1.08 - 0.08 * e).toFixed(4));
    };
    if (RM || !hasGsap) return; // CSS fallback already gives the final capsule / circle
    sec.classList.add('oval--morph');
    var setH = function () { stage.style.setProperty('--oval-h', el.offsetHeight + 'px'); };
    setH();
    var stickTop = function () { return parseFloat(getComputedStyle(el).top) || 0; };
    var hold = function () { return stage.offsetHeight - el.offsetHeight; };
    ScrollTrigger.create({
      trigger: stage, invalidateOnRefresh: true,
      start: function () { return 'top ' + Math.round(window.innerHeight - 0.85 * el.offsetHeight) + 'px'; },
      end: function () { return 'top ' + Math.round(stickTop() - 0.85 * hold()) + 'px'; },
      onUpdate: function (st) { apply(st.progress); }, onRefresh: function (st) { apply(st.progress); }
    });
    if ('ResizeObserver' in window) new ResizeObserver(function () { setH(); apply(last); }).observe(el);
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
