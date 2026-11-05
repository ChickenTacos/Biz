/* Small shared helpers. Everything hangs off window.LY. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  LY.$ = (s, r) => (r || document).querySelector(s);
  LY.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  LY.reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  LY.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  LY.pad = (n, w = 2) => String(n).padStart(w, '0');
  LY.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  LY.lerp = (a, b, t) => a + (b - a) * t;
  LY.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  LY.t0 = performance.now();

  // Storage that never throws (private windows, blocked site data, sandboxes)
  LY.store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
    sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
  };

  // Deterministic PRNG for the demo fleet
  LY.rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Hex digest via Web Crypto (needs a secure context: https or localhost)
  LY.digest = async (algo, text) => {
    if (!(window.crypto && crypto.subtle)) return null;
    const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  };

  // Local time in the company's time zone
  LY.timeIn = (opts) => {
    const c = LY.config || {};
    try {
      return new Intl.DateTimeFormat('en-CA', Object.assign({ timeZone: c.timeZone || 'America/Vancouver', hour: '2-digit', minute: '2-digit', hour12: false }, opts || {})).format(new Date());
    } catch (e) {
      const d = new Date();
      return LY.pad(d.getHours()) + ':' + LY.pad(d.getMinutes());
    }
  };

  LY.uptime = () => {
    const s = Math.floor((performance.now() - LY.t0) / 1000);
    return LY.pad(Math.floor(s / 3600)) + ':' + LY.pad(Math.floor(s / 60) % 60) + ':' + LY.pad(s % 60);
  };

  // Run cb once, the first time el is at least `ratio` visible
  LY.onceVisible = (el, cb, ratio = 0.25) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { io.disconnect(); cb(); }
      });
    }, { threshold: ratio });
    io.observe(el);
  };

  // Toggle a callback as el enters and leaves the viewport
  LY.watchVisible = (el, cb, margin = '0px') => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting)), { rootMargin: margin }).observe(el);
  };

  let toastTimer = 0;
  LY.toast = (msg) => {
    const el = LY.$('[data-toast]');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  };

  // Clipboard with a selection fallback for frames that refuse the API
  LY.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.className = 'sr-only';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand && document.execCommand('copy');
        ta.remove();
        return !!ok;
      } catch (e2) { return false; }
    }
  };
})();
