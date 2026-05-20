(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     LENIS — buttery smooth scroll
     ───────────────────────────────────────────── */
  var lenis; /* disabled — all browsers use native compositor-thread scroll */

  /* ─────────────────────────────────────────────
     SMOOTH ANCHOR SCROLL — all #href links
     ───────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    var href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    var target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    var navHeight = (document.querySelector('.site-nav') || {}).offsetHeight || 64;
    if (lenis) {
      lenis.scrollTo(target, {
        offset: -navHeight,
        duration: 1.6,
        easing: function (t) { return 1 - Math.pow(1 - t, 4); },
      });
    } else {
      var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
    // Close mobile menu if open
    var siteNav = document.getElementById('site-nav');
    if (siteNav && siteNav.classList.contains('site-nav--open')) {
      siteNav.classList.remove('site-nav--open');
      var iconOpen  = document.querySelector('.site-nav__icon-open');
      var iconClose = document.querySelector('.site-nav__icon-close');
      if (iconOpen)  iconOpen.style.display  = '';
      if (iconClose) iconClose.style.display = 'none';
      var toggle = document.getElementById('site-nav-toggle');
      if (toggle) toggle.setAttribute('aria-label', 'Open Menu');
      clearTimeout(siteNav._shapeTimer);
      siteNav._shapeTimer = setTimeout(function () {
        if (!siteNav.classList.contains('site-nav--open')) {
          siteNav.style.borderRadius = '';
        }
      }, 300);
    }
  });

  /* ─────────────────────────────────────────────
     GSAP INIT
     ───────────────────────────────────────────── */
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Global defaults — everything feels the same
  var EASE = 'power3.out';
  var DUR  = 1;

  /* ─────────────────────────────────────────────
     HERO — entrance timeline + parallax
     ───────────────────────────────────────────── */
  var heroTl = gsap.timeline({ delay: 0.2 });
  heroTl
    .to('.hero__eyebrow', { opacity: 1, y: 0, duration: 0.8, ease: EASE })
    .to('.hero__title', { opacity: 1, y: 0, duration: DUR, ease: EASE }, '-=0.5')
    .to('.hero__sub', { opacity: 1, y: 0, duration: 0.8, ease: EASE }, '-=0.5')
    .to('.hero__actions', { opacity: 1, y: 0, duration: 0.8, ease: EASE }, '-=0.4')
    .to('.hero__scroll', { opacity: 1, duration: 0.6, ease: EASE }, '-=0.2');

  // Frame-sequence scroll animation
  var heroCanvas = document.getElementById('hero-canvas');
  var heroCtx = heroCanvas ? heroCanvas.getContext('2d', { alpha: false }) : null;
  var heroDpr = window.devicePixelRatio || 1;

  function padFrame(n) {
    return n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n;
  }

  // Build ordered path list: animation1 (75) → animation2 (120) → animation3 (120)
  var frameFiles = [];
  for (var a1 = 1; a1 <= 75; a1++)  frameFiles.push('frames/animation1-frame-' + padFrame(a1) + '.jpg');
  for (var a2 = 1; a2 <= 120; a2++) frameFiles.push('frames/animation2-frame-' + padFrame(a2) + '.jpg');
  for (var a3 = 1; a3 <= 120; a3++) frameFiles.push('frames/animation3-frame-' + padFrame(a3) + '.jpg');
  var TOTAL_FRAMES = frameFiles.length; // 315
  var frameImgs = new Array(TOTAL_FRAMES).fill(null);

  function resizeHeroCanvas() {
    if (!heroCanvas) return;
    heroDpr = window.devicePixelRatio || 1;
    var w = heroCanvas.offsetWidth;
    var h = heroCanvas.offsetHeight;
    heroCanvas.width  = Math.round(w * heroDpr);
    heroCanvas.height = Math.round(h * heroDpr);
    heroCtx.setTransform(heroDpr, 0, 0, heroDpr, 0, 0);
    if (frameImgs[0]) drawHeroFrame(frameImgs[0]);
  }

  function drawHeroFrame(img) {
    if (!img || !img.complete || !img.naturalWidth || !heroCtx) return;
    var cw = Math.round(heroCanvas.width / heroDpr), ch = Math.round(heroCanvas.height / heroDpr);
    var ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    var sx, sy, sw, sh;
    if (ir > cr) {
      sh = img.naturalHeight; sw = sh * cr; sx = (img.naturalWidth - sw) / 2; sy = 0;
    } else {
      sw = img.naturalWidth; sh = sw / cr; sx = 0; sy = (img.naturalHeight - sh) / 2;
    }
    heroCtx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  }

  resizeHeroCanvas();
  window.addEventListener('resize', resizeHeroCanvas, { passive: true });

  // Load frame 1 immediately so above-the-fold isn't blank
  var firstFrame = new Image();
  firstFrame.onload = function () { frameImgs[0] = firstFrame; drawHeroFrame(firstFrame); };
  firstFrame.src = frameFiles[0];

  // Preload remaining frames in background
  for (var fi = 1; fi < TOTAL_FRAMES; fi++) {
    (function (idx) {
      var img = new Image();
      img.onload = function () { frameImgs[idx] = img; };
      img.src = frameFiles[idx];
    }(fi));
  }

  // Pin hero and scrub through frames on scroll
  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: '+=' + (TOTAL_FRAMES * 10),
    pin: true,
    scrub: 0.6,
    onUpdate: function (self) {
      var idx = Math.min(TOTAL_FRAMES - 1, Math.floor(self.progress * TOTAL_FRAMES));
      if (frameImgs[idx]) drawHeroFrame(frameImgs[idx]);
      var p = self.progress;
      // Panel 1: fade out immediately on scroll, gone by 25%
      var textOp = Math.max(0, 1 - p / 0.25);
      gsap.set('#hero-content-1, .hero__scroll', { opacity: textOp });
      // Panel 3 (Artistry): fade in at 55%, full at 65%, fade out at 85%, gone at 100%
      var thirdOp = p < 0.55 ? 0 : p < 0.65 ? (p - 0.55) / 0.1 : p < 0.85 ? 1 : Math.max(0, 1 - (p - 0.85) / 0.15);
      gsap.set('#hero-content-3', { opacity: thirdOp });
      // Cream gradient: fades in at end to transition into next section
      var bottomOp = p > 0.85 ? (p - 0.85) / 0.15 : 0;
      gsap.set('#hero-overlay-bottom', { opacity: bottomOp });
    },
  });

  /* ─────────────────────────────────────────────
     PHILOSOPHY — slow fade up, feels weighty
     ───────────────────────────────────────────── */
  gsap.from('.philosophy__text', {
    y: 80,
    opacity: 0,
    duration: 1.3,
    ease: EASE,
    scrollTrigger: {
      trigger: '#philosophy',
      start: 'top 80%',
    },
  });

  /* ─────────────────────────────────────────────
     ABOUT — label slides from left, statement from right
     ───────────────────────────────────────────── */
  gsap.from('.about__label', {
    x: -40,
    opacity: 0,
    duration: DUR,
    ease: EASE,
    scrollTrigger: { trigger: '#about', start: 'top 80%' },
  });
  gsap.from('.about__statement', {
    x: 40,
    opacity: 0,
    duration: DUR,
    ease: EASE,
    scrollTrigger: { trigger: '#about', start: 'top 80%' },
  });

  /* ─────────────────────────────────────────────
     ZOOM PARALLAX GALLERY
     Mirrors Framer Motion ZoomParallax component:
       - Section is pinned via GSAP (Lenis-safe, no CSS sticky)
       - Each layer scales from 1 → its end value as
         the section scrolls through the pinned distance
     ───────────────────────────────────────────── */
  (function initZoomParallax() {
    var section = document.getElementById('zoom-parallax');
    if (!section) return;

    var scaleEnds = [4, 5, 6, 5, 6, 8, 9];
    var layers = Array.from(section.querySelectorAll('.zoom-parallax__layer'));
    var textEl = document.getElementById('zoom-parallax-text');
    var isMobile = window.innerWidth <= 768;
    // Pin the section and create extra scroll distance so the zoom plays out
    // over 2× the viewport height (mobile) or 3× (desktop), matching the
    // original 300 vh container from the Framer Motion component.
    var extraScroll = window.innerHeight * (isMobile ? 1 : 2);

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=' + extraScroll,
      pin: true,
      scrub: true,
      onUpdate: function (self) {
        var p = self.progress;
        layers.forEach(function (layer, i) {
          var end = scaleEnds[i] !== undefined ? scaleEnds[i] : 4;
          gsap.set(layer, { scale: 1 + (end - 1) * p });
        });
        if (textEl) {
          var textOp = p < 0.75 ? 0 : (p - 0.75) / 0.25;
          gsap.set(textEl, { opacity: textOp });
        }
      },
    });
  }());

  /* ─────────────────────────────────────────────
     FLOW STORY SCROLL — FlowArt rotation + pin stack
     Ported from the React FlowArt component:
       - Sections 2+ rotate in from 30° (bottom-left origin)
       - All sections except last are pinned until scrolled past
     ───────────────────────────────────────────── */
  var flowSections = Array.from(document.querySelectorAll('[data-flow-section]'));

  if (flowSections.length > 0) {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isDesktop = window.innerWidth > 768;

    flowSections.forEach(function (section, i) {
      // Stack sections by z-index so later ones sit on top
      gsap.set(section, { zIndex: i + 1 });

      var inner = section.querySelector('.flow-inner');
      if (!inner) return;

      if (!prefersReducedMotion) {
        // Sections after the first: start rotated, scrub to 0°
        if (i > 0) {
          gsap.set(inner, { rotation: isDesktop ? 30 : 15, transformOrigin: 'bottom left' });
          gsap.to(inner, {
            rotation: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: isDesktop ? 'top 25%' : 'top 45%',
              scrub: true,
            },
          });
        }

        // All sections except the last: pin until scrolled past (desktop only)
        if (isDesktop && i < flowSections.length - 1) {
          ScrollTrigger.create({
            trigger: section,
            start: 'bottom bottom',
            end: 'bottom top',
            pin: true,
            pinSpacing: false,
          });
        }
      }
    });

    ScrollTrigger.refresh();
  }

  /* ─────────────────────────────────────────────
     RESIDENCES — PARALLAX LISTING
     Ported from framer-motion component → GSAP:
       - Text slides up (y: -50 → 0) as row enters viewport
       - Image wipes in from right + fades (clip-path + opacity)
     ───────────────────────────────────────────── */
  gsap.from('.residences__header', {
    y: 40,
    opacity: 0,
    duration: DUR,
    ease: EASE,
    scrollTrigger: { trigger: '#residences', start: 'top 82%' },
  });

  gsap.utils.toArray('.res-row').forEach(function (row) {
    var text   = row.querySelector('.res-row__text');
    var imgWrap = row.querySelector('.res-row__img');

    // Text slides up as row enters — y: -50 → 0, scrubbed
    gsap.fromTo(text,
      { y: -50 },
      {
        y: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: row,
          start: 'top bottom',
          end: 'center 40%',
          scrub: true,
        },
      }
    );

    // Image wipes in from right + fades — clip-path + opacity, scrubbed
    gsap.fromTo(imgWrap,
      { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
      {
        opacity: 1,
        clipPath: 'inset(0 0% 0 0)',
        ease: 'none',
        scrollTrigger: {
          trigger: row,
          start: 'top bottom',
          end: '70% center',
          scrub: true,
        },
      }
    );
  });

  ScrollTrigger.refresh();

  /* ─────────────────────────────────────────────
     SERVICES — premium layered reveal
     ───────────────────────────────────────────── */
  (function () {
    var svcSection = document.getElementById('services');
    if (!svcSection) return;

    gsap.timeline({ scrollTrigger: { trigger: svcSection, start: 'top 72%' } })
      .from('.services__heading', { y: 48, opacity: 0, duration: 1.1, ease: EASE })
      .from('.services__left .btn--dark', { y: 18, opacity: 0, duration: 0.75, ease: EASE }, '-=0.5');

    gsap.from('.services__label', {
      y: 18, opacity: 0, duration: 0.7, ease: EASE,
      scrollTrigger: { trigger: svcSection, start: 'top 72%' },
    });

    gsap.utils.toArray('.services__step').forEach(function (step, i) {
      var num     = step.querySelector('.services__num');
      var content = step.querySelector('div');
      var delay   = i * 0.13;

      if (num) {
        gsap.from(num, {
          scale: 0.6, opacity: 0, duration: 0.55, ease: EASE, delay: delay,
          scrollTrigger: { trigger: step, start: 'top 89%' },
        });
      }
      if (content) {
        gsap.from(content, {
          y: 22, opacity: 0, duration: 0.8, ease: EASE, delay: delay + 0.1,
          scrollTrigger: { trigger: step, start: 'top 89%' },
        });
      }
    });
  }());

  /* ─────────────────────────────────────────────
     TESTIMONIALS — reveal
     ───────────────────────────────────────────── */
  gsap.from('.testimonials__inner', {
    y: 50,
    opacity: 0,
    duration: DUR,
    ease: EASE,
    scrollTrigger: { trigger: '#testimonials', start: 'top 80%' },
  });

  /* ─────────────────────────────────────────────
     CTA — title scales up slightly, feels monumental
     ───────────────────────────────────────────── */
  gsap.from('.cta__title', {
    scale: 0.92,
    opacity: 0,
    duration: 1.2,
    ease: EASE,
    scrollTrigger: { trigger: '#cta', start: 'top 80%' },
  });
  gsap.from('.cta__sub', {
    y: 20,
    opacity: 0,
    duration: 0.8,
    ease: EASE,
    scrollTrigger: { trigger: '#cta', start: 'top 75%' },
  });

  /* ─────────────────────────────────────────────
     CONTACT — editorial staggered reveal
     ───────────────────────────────────────────── */
  (function () {
    var contactSection = document.getElementById('contact');
    if (!contactSection) return;

    gsap.timeline({ scrollTrigger: { trigger: contactSection, start: 'top 75%' } })
      .from('.contact__info .label', { y: 16, opacity: 0, duration: 0.65, ease: EASE })
      .from('.contact__title',       { y: 36, opacity: 0, duration: 1.0,  ease: EASE }, '-=0.3')
      .from('.contact__text',        { y: 20, opacity: 0, duration: 0.8,  ease: EASE }, '-=0.45')
      .from('.contact__detail',      { y: 16, opacity: 0, duration: 0.65, ease: EASE, stagger: 0.12 }, '-=0.4');

    var formEls = contactSection.querySelectorAll('.contact__row, .contact__form > input, .contact__form textarea, .contact__form > .btn--full');
    gsap.from(formEls, {
      y: 28, opacity: 0, duration: 0.7, ease: EASE, stagger: 0.12,
      scrollTrigger: { trigger: contactSection, start: 'top 72%' },
    });
  }());

  /* ─────────────────────────────────────────────
     MARKETS — section reveal
     ───────────────────────────────────────────── */
  gsap.from('.markets__left', {
    x: -60,
    opacity: 0,
    duration: DUR,
    ease: EASE,
    scrollTrigger: { trigger: '#markets', start: 'top 80%' },
  });
  gsap.from('.markets__right', {
    x: 60,
    opacity: 0,
    duration: DUR,
    ease: EASE,
    scrollTrigger: { trigger: '#markets', start: 'top 80%' },
  });

  /* ─────────────────────────────────────────────
     FOOTER — quiet stagger
     ───────────────────────────────────────────── */
  gsap.from('.footer__top > *', {
    y: 25,
    opacity: 0,
    stagger: 0.12,
    duration: 0.8,
    ease: EASE,
    scrollTrigger: { trigger: '.footer', start: 'top 90%' },
  });

  /* ─────────────────────────────────────────────
     SMOOTH ANCHOR LINKS (via Lenis)
     ───────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        var navH = parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue('--nav-h')) || 80;
        if (lenis) {
          lenis.scrollTo(target, { offset: -navH });
        } else {
          window.scrollTo({
            top: target.getBoundingClientRect().top + window.scrollY - navH,
            behavior: 'smooth',
          });
        }
      }
    });
  });


  /* ─────────────────────────────────────────────
     CAROUSEL
     ───────────────────────────────────────────── */
  var track = document.getElementById('carousel-track');
  var slides = track ? track.querySelectorAll('.carousel__slide') : [];
  var prevBtn = document.getElementById('carousel-prev');
  var nextBtn = document.getElementById('carousel-next');
  var dotsWrap = document.getElementById('carousel-dots');
  var dots = dotsWrap ? dotsWrap.querySelectorAll('.carousel__dot') : [];
  var current = 0;
  var total = slides.length;
  var autoTimer;

  function goTo(idx) {
    if (idx < 0) idx = total - 1;
    if (idx >= total) idx = 0;
    current = idx;
    gsap.to(track, { xPercent: -(current * 100), duration: 0.7, ease: 'power3.inOut' });
    dots.forEach(function (d, i) { d.classList.toggle('active', i === current); });
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); resetAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); resetAuto(); });
  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () { goTo(i); resetAuto(); });
  });
  function startAuto() { autoTimer = setInterval(function () { goTo(current + 1); }, 5500); }
  function resetAuto() { clearInterval(autoTimer); startAuto(); }
  if (total > 0) startAuto();

  /* ─────────────────────────────────────────────
     FOOTER FLICKERING GRID
     ───────────────────────────────────────────── */
  (function initFlickeringGrid() {
    var canvas = document.getElementById('footer-flicker-canvas');
    var container = document.getElementById('footer-flicker-wrap');
    if (!canvas || !container) return;

    var ctx = canvas.getContext('2d');
    var cfg = {
      squareSize: 2,
      gridGap: 3,
      flickerChance: 0.08,
      r: 184, g: 155, b: 94,
      maxOpacity: 0.28,
      text: 'Maison Dor\u00e9e',
      fontSize: 88,
      fontWeight: 400,
    };

    var cols, rows, squares, dpr;
    var animId = null;
    var isInView = false;
    var maskCache = null;

    function setup() {
      dpr = window.devicePixelRatio || 1;
      var w = container.clientWidth;
      var h = container.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      cols = Math.ceil(w / (cfg.squareSize + cfg.gridGap));
      rows = Math.ceil(h / (cfg.squareSize + cfg.gridGap));
      squares = new Float32Array(cols * rows);
      for (var i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * cfg.maxOpacity;
      }
      maskCache = null;
      buildMaskCache();
    }

    function buildMaskCache() {
      var mc = document.createElement('canvas');
      mc.width = canvas.width;
      mc.height = canvas.height;
      var mctx = mc.getContext('2d', { willReadFrequently: true });
      mctx.save();
      mctx.scale(dpr, dpr);
      mctx.fillStyle = 'white';
      mctx.font = cfg.fontWeight + ' ' + cfg.fontSize + 'px "Cormorant Garamond", Georgia, serif';
      mctx.textAlign = 'center';
      mctx.textBaseline = 'middle';
      mctx.fillText(cfg.text, canvas.width / (2 * dpr), canvas.height / (2 * dpr));
      mctx.restore();
      maskCache = new Uint8Array(cols * rows);
      var sqPx = Math.max(1, Math.round(cfg.squareSize * dpr));
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          var x = Math.round(i * (cfg.squareSize + cfg.gridGap) * dpr);
          var y = Math.round(j * (cfg.squareSize + cfg.gridGap) * dpr);
          var md = mctx.getImageData(x, y, sqPx, sqPx).data;
          for (var k = 0; k < md.length; k += 4) {
            if (md[k] > 0) { maskCache[i * rows + j] = 1; break; }
          }
        }
      }
    }

    function draw() {
      if (!maskCache) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var sqPx = Math.max(1, Math.round(cfg.squareSize * dpr));
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          var x = Math.round(i * (cfg.squareSize + cfg.gridGap) * dpr);
          var y = Math.round(j * (cfg.squareSize + cfg.gridGap) * dpr);
          var op = squares[i * rows + j];
          var finalOp = maskCache[i * rows + j] ? Math.min(1, op * 3 + 0.45) : op;
          ctx.fillStyle = 'rgba(' + cfg.r + ',' + cfg.g + ',' + cfg.b + ',' + finalOp.toFixed(3) + ')';
          ctx.fillRect(x, y, sqPx, sqPx);
        }
      }
    }

    var lastTime = 0;
    function animate(time) {
      if (!isInView) return;
      var delta = (time - lastTime) / 1000;
      lastTime = time;
      for (var i = 0; i < squares.length; i++) {
        if (Math.random() < cfg.flickerChance * delta) {
          squares[i] = Math.random() * cfg.maxOpacity;
        }
      }
      draw();
      animId = requestAnimationFrame(animate);
    }

    document.fonts.ready.then(function () {
      setup();
      draw();

      var resizeObs = new ResizeObserver(function () {
        setup();
        if (!isInView) draw();
      });
      resizeObs.observe(container);

      var intersectObs = new IntersectionObserver(function (entries) {
        isInView = entries[0].isIntersecting;
        if (isInView) {
          animId = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(animId);
        }
      }, { threshold: 0 });
      intersectObs.observe(canvas);
    });
  }());

  /* ─────────────────────────────────────────────
     CONTACT FORM
     ───────────────────────────────────────────── */
  var form = document.getElementById('contact-form');
  var success = document.getElementById('form-success');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      success.classList.add('show');
      setTimeout(function () { success.classList.remove('show'); form.reset(); }, 3000);
    });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });

  /* ─────────────────────────────────────────────
     SITE NAVBAR — mobile toggle
     ───────────────────────────────────────────── */
  (function () {
    var nav    = document.getElementById('site-nav');
    var toggle = document.getElementById('site-nav-toggle');
    if (!nav || !toggle) return;

    var iconOpen  = toggle.querySelector('.site-nav__icon-open');
    var iconClose = toggle.querySelector('.site-nav__icon-close');
    var shapeTimer = null;

    window.addEventListener('scroll', function () {
      if (nav) {
        if (window.scrollY > 60) {
          nav.classList.add('navbar--scrolled');
        } else {
          nav.classList.remove('navbar--scrolled');
        }
      }
    }, { passive: true });

    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.contains('site-nav--open');

      if (isOpen) {
        nav.classList.remove('site-nav--open');
        iconOpen.style.display  = '';
        iconClose.style.display = 'none';
        toggle.setAttribute('aria-label', 'Open Menu');
        clearTimeout(shapeTimer);
        shapeTimer = setTimeout(function () {
          if (!nav.classList.contains('site-nav--open')) {
            nav.style.borderRadius = '';
          }
        }, 300);
      } else {
        clearTimeout(shapeTimer);
        nav.style.borderRadius = '12px';
        nav.classList.add('site-nav--open');
        iconOpen.style.display  = 'none';
        iconClose.style.display = '';
        toggle.setAttribute('aria-label', 'Close Menu');
      }
    });
  }());

})();
