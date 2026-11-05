/* Small shared helpers. Everything hangs off window.LY. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  LY.$ = (s, r) => (r || document).querySelector(s);
  LY.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  LY.reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  LY.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  LY.pad = (n) => String(n).padStart(2, '0');
  LY.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  LY.num = (n) => Math.round(n).toLocaleString('en-CA');

  // Seeded random numbers (mulberry32), so demos look the same every time
  LY.rng = (seed) => {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  LY.shuffle = (list, rnd) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Count a number up inside el, e.g. a score from 0 to 58
  LY.countUp = (el, to, ms) => {
    if (!el) return;
    if (LY.reduced() || !ms) { el.textContent = String(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1 && el.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Call cb(true/false) as el enters and leaves the viewport
  LY.watchVisible = (el, cb) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting))).observe(el);
  };
})();
