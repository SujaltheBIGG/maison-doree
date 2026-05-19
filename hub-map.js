(function () {
  var inner = document.getElementById('hub-map-inner');
  if (!inner) return;

  var mapImg = document.getElementById('hub-map-img');
  var grad   = inner.querySelector('.hub-map__grad');
  var zones  = inner.querySelectorAll('.hub-zone');

  var vids = {
    paris:   document.getElementById('hmv-paris'),
    dubai:   document.getElementById('hmv-dubai'),
    newyork: document.getElementById('hmv-newyork'),
  };
  var infos = {
    paris:   document.getElementById('hmi-paris'),
    dubai:   document.getElementById('hmi-dubai'),
    newyork: document.getElementById('hmi-newyork'),
  };

  var activeHub  = null;
  var leaveTimer = null;

  /* ── Show city video ── */
  function showHub(hubId) {
    if (activeHub === hubId) return;
    clearTimeout(leaveTimer);
    var gsap = window.gsap;
    if (!gsap) return;

    /* Hide previous hub if switching directly between zones */
    if (activeHub) {
      var pv = vids[activeHub], pi = infos[activeHub];
      if (pv) gsap.to(pv, { opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: function () { pv.pause(); } });
      if (pi) gsap.to(pi, { opacity: 0, duration: 0.25, ease: 'power2.in' });
    }

    activeHub = hubId;
    var vid  = vids[hubId];
    var info = infos[hubId];

    gsap.to(mapImg, { opacity: 0, duration: 0.55, ease: 'power2.out' });
    gsap.to(grad,   { opacity: 1, duration: 0.55, ease: 'power2.out' });

    if (vid) {
      vid.currentTime = 0;
      vid.play();
      gsap.fromTo(vid, { opacity: 0 }, { opacity: 1, duration: 0.65, ease: 'power3.out', delay: 0.15 });
    }

    if (info) {
      gsap.set(info, { y: 18 });
      gsap.to(info, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.4 });
    }
  }

  /* ── Hide city video ── */
  function hideHub() {
    if (!activeHub) return;
    var gsap = window.gsap;
    if (!gsap) return;

    var vid  = vids[activeHub];
    var info = infos[activeHub];

    if (vid)  gsap.to(vid,  { opacity: 0, duration: 0.5, ease: 'power2.in', onComplete: function () { vid.pause(); } });
    if (info) gsap.to(info, { opacity: 0, y: 12, duration: 0.3, ease: 'power2.in' });

    gsap.to(mapImg, { opacity: 1, duration: 0.65, ease: 'power3.out', delay: 0.1 });
    gsap.to(grad,   { opacity: 0, duration: 0.65, ease: 'power3.out', delay: 0.1 });

    activeHub = null;
  }

  /* ── Zone event listeners ── */
  zones.forEach(function (zone) {
    zone.addEventListener('mouseenter', function () {
      clearTimeout(leaveTimer);
      showHub(zone.dataset.city);
    });

    zone.addEventListener('mouseleave', function () {
      leaveTimer = setTimeout(hideHub, 220);
    });
  });

  /* Leaving the entire map container also hides */
  inner.addEventListener('mouseleave', function () {
    clearTimeout(leaveTimer);
    hideHub();
  });
}());
