/* Small shared helpers. Everything hangs off window.LY. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  LY.$ = (s, r) => (r || document).querySelector(s);
  LY.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  LY.reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  LY.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Call cb(true/false) as el enters and leaves the viewport
  LY.watchVisible = (el, cb) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting))).observe(el);
  };
})();
