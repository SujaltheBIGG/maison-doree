import createGlobe from 'https://esm.sh/cobe@0.6.3';

(function () {
  var canvas = document.getElementById('markets-globe');
  if (!canvas) return;

  var HUBS = [
    { id: 'paris',   lat: 48.8566, lng:  2.3522, phi:  0.0,   theta: 0.28, city: 'city-paris'   },
    { id: 'dubai',   lat: 25.2048, lng: 55.2708, phi: -0.965, theta: 0.18, city: 'city-dubai'   },
    { id: 'newyork', lat: 40.7128, lng: -74.006, phi:  1.292, theta: 0.26, city: 'city-newyork' },
  ];

  /* ── Rotation state ── */
  var phi          = 0.0;
  var currentTheta = 0.28;
  var targetPhi    = null;
  var targetTheta  = null;
  var autoRotate   = true;
  /* Shared between onRender and the label RAF so both see the same position */
  var displayPhi   = 0.0;
  var displayTheta = 0.28;

  /* ── Drag state (translated from React component) ── */
  var isDragging      = false;
  var savedAutoRotate = true;
  var dragStartX      = 0;
  var dragStartY      = 0;
  var dragPhiOff      = 0;
  var dragThetaOff    = 0;
  var velPhi          = 0;
  var velTheta        = 0;
  var prevDragX       = 0;
  var prevDragY       = 0;
  var prevDragT       = 0;

  /* ── Hover / city state ── */
  var activeCityEl   = null;
  var activeCityId   = null;
  var currentHoverId = null;
  var mouseX         = -1;
  var mouseY         = -1;
  var cooldownHub    = null;
  var cooldownEnd    = 0;
  var firstRender    = true;

  var visual = document.getElementById('markets-visual');
  var wrap   = document.getElementById('markets-globe-wrap');
  var size   = (visual && visual.offsetWidth > 0) ? visual.offsetWidth : 480;
  var dpr    = Math.min(window.devicePixelRatio || 1, 2);

  /* ── 3-D projection ── */
  function project(lat, lng, gPhi, gTheta, sz) {
    var latR = lat * Math.PI / 180;
    var lngR = lng * Math.PI / 180;
    var x  = Math.cos(latR) * Math.sin(lngR);
    var y  = Math.sin(latR);
    var z  = Math.cos(latR) * Math.cos(lngR);
    var cp = Math.cos(gPhi), sp = Math.sin(gPhi);
    var x1 = x * cp + z * sp;
    var z1 = -x * sp + z * cp;
    var ct = Math.cos(gTheta), st = Math.sin(gTheta);
    var y2 = y * ct - z1 * st;
    var z2 = y * st + z1 * ct;
    return { cx: (x1 + 1) * 0.5 * sz, cy: (1 - y2) * 0.5 * sz, visible: z2 > 0.05 };
  }

  /* ── COBE globe ── */
  createGlobe(canvas, {
    devicePixelRatio: dpr,
    width:  size * dpr,
    height: size * dpr,
    phi:    0,
    theta:  currentTheta,
    dark:          1,
    diffuse:       1.2,
    mapSamples:    16000,
    mapBrightness: 6,
    baseColor:     [0.22, 0.22, 0.22],
    markerColor:   [0.92, 0.76, 0.44],
    glowColor:     [0.28, 0.22, 0.08],
    markers: [
      { location: [48.8566,  2.3522], size: 0.07 },
      { location: [25.2048, 55.2708], size: 0.07 },
      { location: [40.7128, -74.006], size: 0.07 },
    ],
    onRender: function (state) {
      if (firstRender) { firstRender = false; canvas.style.opacity = '1'; }

      if (isDragging) {
        displayPhi   = phi + dragPhiOff;
        displayTheta = Math.max(-0.4, Math.min(0.4, currentTheta + dragThetaOff));
      } else {
        if (autoRotate) phi += 0.0025;

        /* Smooth hub-centering */
        if (targetPhi !== null) {
          var d = targetPhi - phi;
          if (d >  Math.PI) d -= 2 * Math.PI;
          if (d < -Math.PI) d += 2 * Math.PI;
          phi += d * 0.06;
          if (Math.abs(d) < 0.001) { phi = targetPhi; targetPhi = null; }
        }
        if (targetTheta !== null) {
          currentTheta += (targetTheta - currentTheta) * 0.06;
          if (Math.abs(targetTheta - currentTheta) < 0.001) { currentTheta = targetTheta; targetTheta = null; }
        }

        /* Momentum decay */
        if (Math.abs(velPhi) > 0.00005) { phi += velPhi; velPhi *= 0.95; }
        if (Math.abs(velTheta) > 0.00005) {
          currentTheta = Math.max(-0.4, Math.min(0.4, currentTheta + velTheta));
          velTheta *= 0.95;
        }

        displayPhi   = phi;
        displayTheta = currentTheta;
      }

      state.phi   = displayPhi;
      state.theta = displayTheta;
    },
  });

  /* ── City image transitions ── */
  function showCity(hubId) {
    if (activeCityId === hubId) return;
    var hub = null;
    for (var i = 0; i < HUBS.length; i++) { if (HUBS[i].id === hubId) { hub = HUBS[i]; break; } }
    var gsap = window.gsap;
    if (!hub || !gsap) return;

    autoRotate  = false;
    targetPhi   = null;
    targetTheta = null;

    if (activeCityEl) {
      var prev = activeCityEl;
      gsap.to(prev.querySelector('img'), { scale: 1.1, duration: 0.4, ease: 'power2.in' });
      gsap.to(prev.querySelector('.markets__city-info'), { y: 8, opacity: 0, duration: 0.3, ease: 'power2.in' });
      gsap.to(prev, { opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: function () { prev.style.pointerEvents = 'none'; } });
    }

    gsap.to(wrap, { opacity: 0, duration: 0.5, ease: 'power2.out', delay: 0.08 });

    var cityEl = document.getElementById(hub.city);
    if (cityEl) {
      activeCityEl = cityEl;
      activeCityId = hubId;
      cityEl.style.pointerEvents = 'auto';
      gsap.set(cityEl.querySelector('img'), { scale: 1.1 });
      gsap.set(cityEl.querySelector('.markets__city-info'), { y: 16, opacity: 0 });
      gsap.to(cityEl, { opacity: 1, duration: 0.65, ease: 'power3.out', delay: 0.26 });
      gsap.to(cityEl.querySelector('img'), { scale: 1, duration: 1.4, ease: 'power3.out', delay: 0.26 });
      gsap.to(cityEl.querySelector('.markets__city-info'), { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.6 });
    }

    document.querySelectorAll('.hub-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.hub === hubId); });
  }

  function hideCity() {
    if (!activeCityEl) return;
    var gsap = window.gsap;
    if (!gsap) return;

    autoRotate  = true;
    targetPhi   = null;
    targetTheta = null;
    cooldownHub = activeCityId;
    cooldownEnd = Date.now() + 750;
    gsap.to(wrap, { opacity: 1, duration: 0.75, ease: 'power3.out', delay: 0.1 });

    var cityEl = activeCityEl;
    gsap.to(cityEl.querySelector('.markets__city-info'), { y: 10, opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to(cityEl.querySelector('img'), { scale: 1.1, duration: 0.5, ease: 'power2.in' });
    gsap.to(cityEl, { opacity: 0, duration: 0.45, ease: 'power2.in', onComplete: function () { cityEl.style.pointerEvents = 'none'; } });

    activeCityEl = null;
    activeCityId = null;
    document.querySelectorAll('.hub-btn').forEach(function (b) { b.classList.remove('active'); });
  }

  /* ── Label loop + hover detection ── */
  var HOVER_RADIUS = 40;

  function loop() {
    requestAnimationFrame(loop);
    var cssSz     = canvas.offsetWidth || size;
    var hoveredId = null;

    HUBS.forEach(function (hub) {
      var p   = project(hub.lat, hub.lng, displayPhi, displayTheta, cssSz);
      var lbl = document.getElementById('glabel-' + hub.id);

      if (lbl) {
        if (p.visible && !activeCityId) {
          lbl.style.left    = p.cx + 'px';
          lbl.style.top     = p.cy + 'px';
          lbl.style.opacity = '1';
        } else {
          lbl.style.opacity = '0';
        }
      }

      /* Only hit-test when not dragging */
      if (!isDragging && mouseX >= 0 && p.visible) {
        var dx = mouseX - p.cx, dy = mouseY - p.cy;
        if (Math.sqrt(dx * dx + dy * dy) < HOVER_RADIUS) hoveredId = hub.id;
      }
    });

    canvas.style.cursor = isDragging ? 'grabbing' : (hoveredId ? 'pointer' : 'grab');

    if (!isDragging && hoveredId !== currentHoverId) {
      if (hoveredId && hoveredId === cooldownHub && Date.now() < cooldownEnd) return;
      currentHoverId = hoveredId;
      if (hoveredId) showCity(hoveredId);
      else hideCity();
    }
  }

  /* ── Pointer drag (velocity + momentum) ── */
  canvas.addEventListener('pointerdown', function (e) {
    isDragging      = true;
    savedAutoRotate = autoRotate;
    dragStartX      = e.clientX;
    dragStartY      = e.clientY;
    prevDragX       = e.clientX;
    prevDragY       = e.clientY;
    prevDragT       = Date.now();
    dragPhiOff      = 0;
    dragThetaOff    = 0;
    velPhi          = 0;
    velTheta        = 0;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    if (!isDragging) return;

    var now = Date.now();
    var dt  = Math.max(now - prevDragT, 1);
    dragPhiOff   = (e.clientX - dragStartX) / 300;
    dragThetaOff = (e.clientY - dragStartY) / 1000;
    velPhi   = Math.max(-0.15, Math.min(0.15, ((e.clientX - prevDragX) / dt) * 0.3));
    velTheta = Math.max(-0.08, Math.min(0.08, ((e.clientY - prevDragY) / dt) * 0.08));
    prevDragX = e.clientX;
    prevDragY = e.clientY;
    prevDragT = now;
  });

  canvas.addEventListener('pointerup', function (e) {
    if (!isDragging) return;
    phi          += dragPhiOff;
    currentTheta  = Math.max(-0.4, Math.min(0.4, currentTheta + dragThetaOff));
    dragPhiOff    = 0;
    dragThetaOff  = 0;
    isDragging    = false;
    if (!activeCityId) autoRotate = savedAutoRotate;
    canvas.releasePointerCapture(e.pointerId);
  });

  /* ── Pointer leave + touch ── */
  if (visual) {
    visual.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    visual.addEventListener('mouseleave', function () { mouseX = -1; mouseY = -1; });
    visual.addEventListener('touchmove', function (e) {
      if (!e.touches.length) return;
      var rect = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - rect.left;
      mouseY = e.touches[0].clientY - rect.top;
    }, { passive: true });
    visual.addEventListener('touchend', function () { mouseX = -1; mouseY = -1; }, { passive: true });
  }

  loop();
}());
