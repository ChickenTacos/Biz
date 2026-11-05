/* "The day": scrolling moves the clock from 07:30 to 18:00. The sun crosses
   the sky, the sky changes colour, and each scene plays when it scrolls into
   view (and resets once it's off-screen, so it plays again next time). */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  const START = 7 * 60 + 30;   // 07:30
  const END = 18 * 60;         // 18:00
  const SUNRISE = 7 * 60, SUNSET = 18 * 60 + 30;
  // [minute, top colour, bottom colour]
  const SKY = [
    [450, '#0a0f3d', '#2b2a86'],
    [520, '#1626c9', '#3f6bff'],
    [660, '#1f2bff', '#4f94ff'],
    [840, '#1f2bff', '#5aa8ff'],
    [960, '#2430e6', '#7a6dff'],
    [1020, '#2a1f9a', '#ff8e5e'],
    [1080, '#0b0f2a', '#3d2275'],
  ];

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => {
    const x = hex(a), y = hex(b);
    return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',') + ')';
  };
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

  LY.day = (function () {
    let panel, clock, sun, glow, items, scenes = [], centers = [], ticking = false, active = -1;

    function skyAt(m) {
      if (m <= SKY[0][0]) return [SKY[0][1], SKY[0][2]];
      for (let i = 0; i < SKY.length - 1; i++) {
        const a = SKY[i], b = SKY[i + 1];
        if (m <= b[0]) {
          const t = (m - a[0]) / (b[0] - a[0]);
          return [mix(a[1], b[1], t), mix(a[2], b[2], t)];
        }
      }
      const z = SKY[SKY.length - 1];
      return [z[1], z[2]];
    }

    function measure() {
      centers = scenes.map((s) => {
        const r = s.el.getBoundingClientRect();
        return r.top + window.scrollY + r.height / 2;
      });
    }

    function minuteAt(y) {
      const n = centers.length;
      if (!n) return START;
      if (y <= centers[0]) {
        const t = LY.clamp((y - (centers[0] - window.innerHeight)) / window.innerHeight, 0, 1);
        return LY.lerp(START, scenes[0].min, t);
      }
      if (y >= centers[n - 1]) return scenes[n - 1].min;
      for (let i = 0; i < n - 1; i++) {
        if (y < centers[i + 1]) {
          const t = (y - centers[i]) / (centers[i + 1] - centers[i]);
          return LY.lerp(scenes[i].min, scenes[i + 1].min, t);
        }
      }
      return END;
    }

    function update() {
      ticking = false;
      const y = window.scrollY + window.innerHeight * 0.5;
      const m = Math.round(minuteAt(y));
      clock.textContent = LY.pad(Math.floor(m / 60)) + ':' + LY.pad(m % 60);
      // sun on a half-circle: centre (160,152), radius 136
      const f = (m - SUNRISE) / (SUNSET - SUNRISE);
      const a = Math.PI * (1 - f);
      const sx = (160 + 136 * Math.cos(a)).toFixed(1);
      const sy = (152 - 136 * Math.sin(a)).toFixed(1);
      [sun, glow].forEach((c) => { if (c) { c.setAttribute('cx', sx); c.setAttribute('cy', sy); } });
      const [c1, c2] = skyAt(m);
      panel.style.setProperty('--sky-1', c1);
      panel.style.setProperty('--sky-2', c2);
      let best = -1, dist = Infinity;
      centers.forEach((c, i) => { const d = Math.abs(c - y); if (d < dist) { dist = d; best = i; } });
      if (best !== active) {
        active = best;
        items.forEach((it) => it.classList.toggle('is-active', it.getAttribute('data-sky-item') === (scenes[best] && scenes[best].name)));
      }
    }

    function init() {
      panel = LY.$('[data-sky-panel]');
      if (!panel) return;
      clock = LY.$('[data-sky-clock]');
      sun = LY.$('[data-sky-sun]');
      glow = LY.$('[data-sky-glow]');
      items = LY.$$('[data-sky-item]');
      scenes = LY.$$('.scene[data-scene]').map((el) => ({
        el,
        name: el.getAttribute('data-scene'),
        min: toMin(el.getAttribute('data-time')),
        viz: el.querySelector('.viz'),
      }));

      const reduced = LY.reduced();
      const ctl = LY.scenes || {};
      // pause each scene's looping animations while it's off screen
      if ('IntersectionObserver' in window) {
        const live = new IntersectionObserver((entries) => {
          entries.forEach((e) => e.target.classList.toggle('is-live', e.isIntersecting));
        });
        scenes.forEach((s) => live.observe(s.el));
      } else {
        scenes.forEach((s) => s.el.classList.add('is-live'));
      }
      scenes.forEach((s) => {
        const sc = ctl[s.name];
        if (!s.viz || !sc) return;
        if (reduced) { if (ctl.prepare) ctl.prepare(s.name, s.viz); return; }
        sc.reset(s.viz);
        let playing = false;
        if (!('IntersectionObserver' in window)) { sc.play(s.viz); return; }
        new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.intersectionRatio >= 0.35 && !playing) { playing = true; sc.play(s.viz); }
            else if (!e.isIntersecting && playing) {
              playing = false;
              if (ctl.stop) ctl.stop(s.name);
              sc.reset(s.viz);
            }
          });
        }, { threshold: [0, 0.35] }).observe(s.viz);
      });

      measure();
      update();
      window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
      let rt = 0;
      window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); update(); }, 120); });
      window.addEventListener('load', () => { measure(); update(); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); update(); });
    }

    return { init };
  })();
})();
