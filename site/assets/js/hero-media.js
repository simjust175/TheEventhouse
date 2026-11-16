/* The Event House — hero media sequencer (original implementation).
 * Renders the photos/videos described in window.TEH_CONFIG.heroMedia into a container and
 * crossfades between them. Knows nothing about page layout: the homepage hero mounts it.
 *
 *   var media = TEH.HeroMedia(containerEl, config, { toggle: buttonEl });
 *   media.pause(); media.play(); media.go(i); media.items(); media.index();
 *
 * Behaviour
 *  - 1 item: shown statically (a video still loops). 2+ items: timed crossfades, the next item is
 *    loaded and decoded first so a fade never reveals an empty frame.
 *  - Videos: muted, loop, playsinline, autoplay, poster fallback. If autoplay is refused or the file
 *    fails, the poster stays up and the sequence carries on.
 *  - Desktop/mobile sources, crops and item lists switch at `breakpoint` (rebuilds on change).
 *  - Pauses when off screen or in a background tab; a toggle button (WCAG 2.2.2) pauses everything.
 *  - prefers-reduced-motion: first item only, posters instead of video, no rotation.
 */
(function () {
  'use strict';
  var TEH = window.TEH = window.TEH || {};

  TEH.HeroMedia = function (root, cfg, opts) {
    opts = opts || {};
    cfg = cfg || {};
    var RM = !!TEH.RM;
    var FADE = cfg.fade || 1600, DUR = cfg.duration || 6000;
    var mq = window.matchMedia('(max-width: ' + ((cfg.breakpoint || 768) - 0.02) + 'px)');
    var toggle = opts.toggle || null;
    var list = [], layers = [], idx = 0, timer = null, userPaused = false, onScreen = true, built = false;

    var pick = function (v) { if (v == null) return null; if (typeof v === 'string') return v; return mq.matches ? (v.mobile || v.desktop) : (v.desktop || v.mobile); };
    var bp = function () { return mq.matches ? 'mobile' : 'desktop'; };
    var running = function () { return !RM && !userPaused && onScreen && !document.hidden; };

    function makeImg(src, pos, eager) {
      var im = new Image();
      im.alt = ''; im.decoding = 'async'; im.draggable = false;
      if (eager) { im.setAttribute('fetchpriority', 'high'); im.src = src; } else im.dataset.src = src;
      if (pos) im.style.objectPosition = pos;
      return im;
    }
    function makeVideo(it, pos, first) {
      var v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
      v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
      v.setAttribute('disablepictureinpicture', ''); v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
      var poster = pick(it.poster); if (poster) v.poster = poster;
      if (pos) v.style.objectPosition = pos;
      v.preload = first ? 'auto' : 'none';
      v.dataset.src = pick(it.src);
      if (first) v.src = v.dataset.src;
      v.addEventListener('error', function () { posterFallback(v); });
      return v;
    }
    // A failed or missing video becomes its poster image, so the layer is never blank.
    function posterFallback(v) {
      if (!v.parentNode || v.dataset.failed) return;
      v.dataset.failed = '1';
      if (v.poster) { var im = makeImg(v.poster, v.style.objectPosition, true); v.parentNode.replaceChild(im, v); }
    }

    function build() {
      clearTimeout(timer);
      var keep = root.querySelector('[data-hero-fallback]');
      layers.forEach(function (l) { l.remove(); });
      layers = []; idx = 0;
      list = (cfg.items || []).filter(function (it) { return !it.show || it.show === 'both' || it.show === bp(); });
      if (RM && list.length) list = [list[0]];
      list.forEach(function (it, i) {
        var layer = document.createElement('div');
        layer.className = 'hero__media hero__media--' + (it.type === 'video' && !RM ? 'video' : 'image');
        layer.setAttribute('aria-hidden', 'true');
        layer.style.setProperty('--fade', FADE + 'ms');
        var pos = pick(it.position);
        if (it.type === 'video' && !RM) layer.appendChild(makeVideo(it, pos, i === 0));
        else layer.appendChild(makeImg(it.type === 'video' ? pick(it.poster) : pick(it.src), pos, i === 0));
        root.appendChild(layer);
        layers.push(layer);
      });
      if (!layers.length) return;
      // first layer replaces the static markup image once it can paint (no flash, keeps LCP)
      ready(0).then(function () {
        layers[0].classList.add('is-active', 'is-front');
        if (keep) setTimeout(function () { keep.remove(); }, 50);
        label(0); startMedia(0); schedule();
      });
      built = true;
      if (toggle) toggle.hidden = RM || (list.length < 2 && !list.some(function (it) { return it.type === 'video'; }));
    }

    // Resolve once a layer's media can be shown (image decoded / video can play), max ~2.5s.
    function ready(i) {
      var el = layers[i] && layers[i].firstChild; if (!el) return Promise.resolve();
      if (el.dataset.src && !el.getAttribute('src')) { el.src = el.dataset.src; if (el.tagName === 'VIDEO') { el.preload = 'auto'; el.load(); } }
      var p = el.tagName === 'VIDEO'
        ? new Promise(function (res) { if (el.readyState >= 3) return res(); el.addEventListener('canplay', res, { once: true }); el.addEventListener('error', res, { once: true }); })
        : (el.decode ? el.decode().catch(function () {}) : Promise.resolve());
      return Promise.race([p, new Promise(function (res) { setTimeout(res, 2500); })]);
    }
    function startMedia(i) {
      var v = layers[i] && layers[i].querySelector('video'); if (!v) return;
      if (!running()) return;
      var pr = v.play(); if (pr && pr.catch) pr.catch(function () { /* autoplay refused: poster stays visible */ });
    }
    function stopMedia(i) { var v = layers[i] && layers[i].querySelector('video'); if (v) v.pause(); }
    function label(i) { if (list[i] && list[i].alt) root.setAttribute('aria-label', list[i].alt); }

    function schedule() {
      clearTimeout(timer);
      if (list.length < 2 || !running()) return;
      var it = list[idx];
      timer = setTimeout(function () { go(idx + 1); }, it.duration || DUR);
      ready((idx + 1) % list.length); // warm up the next item while this one is showing
    }

    function go(n) {
      if (!built || list.length < 2) return;
      n = (n + list.length) % list.length; if (n === idx) return;
      clearTimeout(timer);
      var from = idx, to = n; idx = n;
      ready(to).then(function () {
        var a = layers[from], b = layers[to];
        layers.forEach(function (l) { l.classList.remove('is-front'); });
        b.classList.add('is-front');
        var v = b.querySelector('video'); if (v) { try { v.currentTime = 0; } catch (e) {} }
        startMedia(to);
        // force a style flush so the opacity transition always runs
        void b.offsetWidth; b.classList.add('is-active');
        label(to);
        setTimeout(function () { if (idx !== from) { a.classList.remove('is-active'); stopMedia(from); } }, FADE + 60);
        schedule();
      });
    }

    function sync() { if (running()) { startMedia(idx); schedule(); } else { clearTimeout(timer); stopMedia(idx); } }
    function setPaused(p) {
      userPaused = p;
      if (toggle) { toggle.setAttribute('aria-pressed', p ? 'true' : 'false'); toggle.setAttribute('aria-label', p ? 'Play hero motion' : 'Pause hero motion'); toggle.classList.toggle('is-paused', p); }
      sync();
    }
    if (toggle) toggle.addEventListener('click', function () { setPaused(!userPaused); });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; sync(); }, { threshold: 0.01 }).observe(root);
    var onBp = function () { build(); };
    if (mq.addEventListener) mq.addEventListener('change', onBp); else mq.addListener(onBp);

    root.setAttribute('role', 'img');
    build();
    return {
      go: go,
      pause: function () { setPaused(true); },
      play: function () { setPaused(false); },
      index: function () { return idx; },
      items: function () { return list.slice(); },
      layers: function () { return layers.slice(); },
      rebuild: build
    };
  };
})();
