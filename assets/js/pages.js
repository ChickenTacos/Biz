/* Pages. Every section of the site is a full-screen page. As you scroll, the
   next page slides up over the current one, which sinks back and dims.
   A short scroll is enough to change page: when scrolling stops halfway
   through a change, it finishes it (or goes back, if you were heading up).
   Pages taller than the screen scroll normally to their end first.
   The dots on the right show where you are, and menu links change page
   behind a curtain when the jump is long.
   With reduced motion, none of this moves: the site scrolls like a normal
   page and links jump straight to their section. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  LY.pages = (function () {
    const root = document.documentElement;
    let list = [];
    let H = 0;
    let motion = false;
    let ticking = false;
    let active = -1;
    let dir = 1;
    let lastY = 0;
    let anim = 0;
    let busy = false;
    let settleT = 0;
    let touching = false;
    let dots = null;
    let curtain = null;

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const scrollY = () => window.scrollY || window.pageYOffset || 0;

    // Where each page sits in the document, ignoring the sticking
    function measure() {
      H = window.innerHeight;
      if (!list.length) return;
      const main = list[0].el.parentElement;
      let y = main.getBoundingClientRect().top + scrollY();
      const heights = list.map((p) => p.el.offsetHeight);
      list.forEach((p, i) => {
        p.h = heights[i];
        p.top = y;
        y += p.h;
        p.vis = Math.max(1, Math.min(p.h, H));
      });
      if (!motion) return;
      list.forEach((p, i) => {
        // tall pages scroll to their end, then stay put while the next one covers them
        p.el.style.top = i === list.length - 1 ? '' : Math.min(0, H - p.h) + 'px';
        p.el.style.setProperty('--oy', Math.round(Math.max(p.h - H / 2, p.h / 2)) + 'px');
      });
    }

    function paint(p, c, e, near) {
      // entering: next up, just below the screen; rising: sliding up over the page before it
      const st = c >= 0.999 ? 'gone' : c > 0.001 ? 'leaving' : e > 0.02 && e < 0.999 ? 'rising' : e < 0.999 && near ? 'entering' : '';
      if (Math.abs(c - p.c) > 0.0004) { p.el.style.setProperty('--p', c.toFixed(4)); p.c = c; }
      if (Math.abs(e - p.e) > 0.0004) { p.el.style.setProperty('--e', e.toFixed(4)); p.e = e; }
      if (st !== p.st) {
        p.el.classList.toggle('is-leaving', st === 'leaving');
        p.el.classList.toggle('is-gone', st === 'gone');
        p.el.classList.toggle('is-entering', st === 'entering' || st === 'rising');
        p.el.classList.toggle('is-rising', st === 'rising');
        p.st = st;
      }
    }

    function frame() {
      ticking = false;
      const y = scrollY();
      if (y !== lastY) { dir = y > lastY ? 1 : -1; lastY = y; }
      let act = 0;
      list.forEach((p, i) => {
        const n = list[i + 1];
        if (p.top - y <= H * 0.5) act = i;
        if (!motion) return;
        const c = n ? clamp(1 - (n.top - y) / p.vis, 0, 1) : 0;    // covered by the next page
        const e = i === 0 ? 1 : clamp(1 - (p.top - y) / H, 0, 1);   // slid in over the last one
        paint(p, c, e, p.top - y < H * 1.5);
      });
      if (act !== active) setActive(act);
    }

    function setActive(i) {
      active = i;
      const p = list[i];
      if (dots) {
        LY.$$('a', dots).forEach((a, k) => {
          if (k === i) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
        dots.classList.toggle('is-dark', p.tone === 'dark');
      }
      LY.$$('.nav a').forEach((a) => {
        if (a.getAttribute('href') === '#' + p.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      document.dispatchEvent(new CustomEvent('ly:page', { detail: { index: i, id: p.id } }));
    }

    // Smooth scroll with our own easing, so page changes feel the same everywhere
    function stop() {
      if (anim) cancelAnimationFrame(anim);
      anim = 0;
      busy = false;
    }
    function to(y, ms, done) {
      stop();
      const y0 = scrollY();
      const max = Math.max(0, document.documentElement.scrollHeight - H);
      const y1 = clamp(Math.round(y), 0, max);
      if (Math.abs(y1 - y0) < 2) { if (done) done(); return; }
      busy = true;
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        const q = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        window.scrollTo(0, y0 + (y1 - y0) * q);
        if (k < 1) { anim = requestAnimationFrame(step); return; }
        anim = 0;
        busy = false;
        if (done) done();
      };
      anim = requestAnimationFrame(step);
    }

    // When scrolling stops partway through a page change, finish it (or undo it)
    function settle() {
      if (!motion || busy || touching) return;
      if (root.classList.contains('sheet-open') || root.classList.contains('menu-open')) return;
      if (LY.intro && LY.intro.running) return;
      const y = scrollY();
      for (let i = 0; i < list.length - 1; i++) {
        const p = list[i];
        const n = list[i + 1];
        const top = n.top - y;
        if (top > 2 && top < p.vis - 2) {
          const covered = 1 - top / p.vis;
          const forward = dir > 0 ? covered > 0.08 : covered > 0.92;
          to(forward ? n.top : n.top - p.vis, 720);
          return;
        }
      }
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
      clearTimeout(settleT);
      settleT = setTimeout(settle, 170);
    }

    // A full-screen curtain for long jumps, so you don't fly past every page
    function cover(i, done) {
      const p = list[i];
      stop();
      busy = true;
      curtain.querySelector('[data-curtain-n]').textContent = LY.pad(i + 1);
      curtain.querySelector('[data-curtain-t]').textContent = p.label;
      curtain.className = 'curtain';
      void curtain.offsetWidth;
      curtain.classList.add('is-in');
      setTimeout(() => {
        window.scrollTo(0, p.top);
        lastY = scrollY();
        frame();
        curtain.classList.remove('is-in');
        curtain.classList.add('is-out');
        setTimeout(() => {
          curtain.className = 'curtain';
          busy = false;
          if (done) done();
        }, 640);
      }, 560);
    }

    // Go to a page by id or number
    function go(target, opts) {
      opts = opts || {};
      const i = typeof target === 'number' ? target : list.findIndex((p) => p.id === target);
      const p = list[i];
      if (!p) return false;
      const after = () => {
        const f = opts.focus || p.el;
        if (f === p.el) p.el.setAttribute('tabindex', '-1');
        try { f.focus({ preventScroll: true }); } catch (e) { /* old browser */ }
        if (opts.after) opts.after();
      };
      if (!motion) {
        window.scrollTo(0, p.top);
        after();
        return true;
      }
      measure();
      const dist = Math.abs(p.top - scrollY());
      if (dist <= H * 1.6 || !curtain) to(p.top, 900, after);
      else cover(i, after);
      return true;
    }

    function onClick(e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.closest('dialog') || a.hasAttribute('data-open')) return;
      let id = '';
      try { id = decodeURIComponent(a.getAttribute('href').slice(1)); } catch (x) { return; }
      const i = list.findIndex((p) => p.id === id);
      if (i < 0) return;
      e.preventDefault();
      if (location.hash !== '#' + id) {
        try { history.pushState(null, '', '#' + id); } catch (x) { /* sandboxed frame */ }
      }
      go(i);
    }

    // Keyboard users can Tab into a page that is covered: bring it back into view
    function onFocus(e) {
      if (!motion || busy) return;
      const pg = e.target.closest && e.target.closest('main > [data-page]');
      const p = pg && list.find((x) => x.el === pg);
      if (!p || p.c < 0.02) return;
      const off = e.target.getBoundingClientRect().top - pg.getBoundingClientRect().top;
      window.scrollTo(0, Math.max(0, p.top + off - H * 0.35));
    }

    function buildDots() {
      dots = document.createElement('nav');
      dots.className = 'dots';
      dots.setAttribute('aria-label', 'Pages');
      dots.innerHTML = list.map((p, i) =>
        '<a href="#' + p.id + '"><span><b>' + LY.pad(i + 1) + '</b> ' + p.label + '</span><i aria-hidden="true"></i></a>').join('');
      document.body.appendChild(dots);
    }

    function init() {
      list = LY.$$('main > [data-page]').map((el) => ({
        el,
        id: el.id,
        label: el.getAttribute('data-page'),
        tone: el.getAttribute('data-tone') || 'light',
        top: 0, h: 0, vis: 1, c: -1, e: -1, st: null,
      }));
      if (!list.length) return;
      motion = !LY.reduced() && typeof window.requestAnimationFrame === 'function';
      curtain = LY.$('[data-curtain]');
      if (motion) root.classList.add('pages-on');
      buildDots();
      measure();
      lastY = scrollY();
      frame();

      document.addEventListener('click', onClick);
      document.addEventListener('focusin', onFocus);
      window.addEventListener('scroll', onScroll, { passive: true });
      let rt = 0;
      window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); frame(); }, 120); });
      if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(() => { measure(); frame(); });
        list.forEach((p) => ro.observe(p.el));
      }
      // any real input takes over from an automatic scroll
      ['wheel', 'touchstart', 'mousedown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { if (anim) stop(); }, { passive: true }));
      window.addEventListener('touchstart', () => { touching = true; }, { passive: true });
      const up = () => { touching = false; clearTimeout(settleT); settleT = setTimeout(settle, 170); };
      window.addEventListener('touchend', up, { passive: true });
      window.addEventListener('touchcancel', up, { passive: true });
    }

    return { init, go, get active() { return active; } };
  })();
})();
