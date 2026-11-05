/* Page chrome: tmux status bar, Vim-style scroll ruler, clocks, theme, menu,
   log ticker, heading scramble, footer stats and the console banner. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  LY.ui = (function () {
    const root = document.documentElement;

    /* ---------- theme ---------- */
    function systemDark() { return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
    function current() {
      const t = root.getAttribute('data-theme');
      return t === 'light' || t === 'dark' ? t : (systemDark() ? 'dark' : 'light');
    }
    function labelTheme() {
      const b = LY.$('[data-theme-toggle]');
      if (b) b.setAttribute('aria-label', 'Switch to ' + (current() === 'dark' ? 'light' : 'dark') + ' theme');
    }
    function setTheme(v) {
      if (v === 'system') { root.removeAttribute('data-theme'); LY.store.del('ly-theme'); }
      else { root.setAttribute('data-theme', v); LY.store.set('ly-theme', v); }
      labelTheme();
    }

    /* ---------- tmux windows + ruler ---------- */
    function initNav() {
      const links = LY.$$('.tmux__wins a');
      const map = { process: 'fleet', faq: 'about' };
      const sections = LY.$$('[data-section]');
      const ruler = LY.$('[data-ruler]');
      let ticking = false;
      const update = () => {
        ticking = false;
        const y = window.scrollY;
        const mark = window.innerHeight * 0.35;
        let cur = 'home';
        sections.forEach((s) => { if (s.getBoundingClientRect().top <= mark) cur = s.getAttribute('data-section'); });
        cur = map[cur] || cur;
        links.forEach((a) => { if (a.getAttribute('data-win') === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
        if (ruler) {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          ruler.textContent = y < 8 ? 'Top' : y >= max - 8 ? 'Bot' : Math.round((y / max) * 100) + '%';
        }
      };
      window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
      window.addEventListener('resize', update);
      update();
    }

    /* ---------- clocks ---------- */
    function initClocks() {
      const short = LY.$$('[data-clock]');
      const long = LY.$$('[data-clock-long]');
      const up = LY.$$('[data-uptime]');
      const tz = (LY.config && LY.config.tzLabel) || 'PT';
      let lastMin = '';
      const tick = () => {
        const t = LY.timeIn();
        if (t !== lastMin) {
          lastMin = t;
          short.forEach((el) => { el.textContent = t + ' ' + tz; });
          long.forEach((el) => { el.textContent = t; });
        }
        const u = LY.uptime();
        up.forEach((el) => { el.textContent = u; });
      };
      tick();
      setInterval(tick, 1000);
      LY.$$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
    }

    /* ---------- mobile menu ---------- */
    function initMenu() {
      const btn = LY.$('[data-menu-toggle]');
      const menu = LY.$('[data-menu]');
      if (!btn || !menu) return;
      const set = (open) => {
        menu.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? 'close' : 'menu';
        root.classList.toggle('boot-lock', open);
        if (open) { const a = menu.querySelector('a'); if (a) a.focus(); }
      };
      btn.addEventListener('click', () => set(menu.hidden));
      menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
    }

    /* ---------- ticker ---------- */
    function initTicker() {
      const t = LY.$('[data-ticker]');
      if (!t) return;
      const list = t.querySelector('.ticker__list');
      const clone = list.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      Array.from(clone.children).forEach((li) => list.appendChild(li));
      const ticker = t.closest('.ticker');
      requestAnimationFrame(() => {
        const half = list.scrollWidth / 2;
        ticker.style.setProperty('--tick-dur', Math.max(30, half / 55) + 's');
        if (!LY.reduced()) ticker.classList.add('is-running');
      });
    }

    /* ---------- heading scramble (text stays readable at rest) ---------- */
    function initScramble() {
      if (LY.reduced()) return;
      const glyphs = '!<>-_\\/[]{}=+*^?#01';
      LY.$$('[data-scramble]').forEach((h) => {
        const node = Array.from(h.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim());
        if (!node) return;
        const final = node.textContent;
        LY.onceVisible(h, () => {
          const start = performance.now();
          const dur = 650;
          const run = (now) => {
            const p = Math.min(1, (now - start) / dur);
            const fixed = Math.floor(final.length * p);
            let s = final.slice(0, fixed);
            for (let i = fixed; i < final.length; i++) {
              s += final[i] === ' ' ? ' ' : glyphs[Math.floor(Math.random() * glyphs.length)];
            }
            node.textContent = s;
            if (p < 1) requestAnimationFrame(run);
            else node.textContent = final;
          };
          requestAnimationFrame(run);
        }, 0.6);
      });
    }

    /* ---------- footer: what this page weighed ---------- */
    function initWeight() {
      const el = LY.$('[data-weight]');
      if (!el || !window.performance || !performance.getEntriesByType) return;
      const measure = () => {
        const nav = performance.getEntriesByType('navigation')[0];
        const res = performance.getEntriesByType('resource');
        let bytes = 0;
        let sized = 0;
        [nav].concat(res).forEach((r) => {
          if (!r) return;
          const b = r.transferSize || r.encodedBodySize || 0;
          if (b) sized += 1;
          bytes += b;
        });
        const ms = nav ? Math.round(nav.loadEventEnd || nav.domContentLoadedEventEnd || 0) : 0;
        if (!sized) { el.textContent = 'served from cache or disk'; return; }
        el.textContent = Math.round(bytes / 1024) + ' KB over ' + (res.length + 1) + ' requests' + (ms ? ' · loaded in ' + ms + ' ms' : '');
      };
      if (document.readyState === 'complete') setTimeout(measure, 50);
      else window.addEventListener('load', () => setTimeout(measure, 50));
    }

    /* ---------- git log: verify the hashes are real ---------- */
    async function initHashes() {
      const out = LY.$('[data-hash-check]');
      if (!out) return;
      const items = LY.$$('.gitlog__list li');
      if (!(window.crypto && crypto.subtle)) { out.textContent = 'open the site over https to check'; return; }
      let ok = 0;
      for (const li of items) {
        const msg = li.querySelector('.gitlog__msg').cloneNode(true);
        const head = msg.querySelector('.head');
        if (head) head.remove();
        const hex = await LY.digest('SHA-1', msg.textContent.trim());
        if (hex && hex.slice(0, 7) === li.querySelector('code').textContent.trim()) ok += 1;
      }
      out.textContent = ok + '/' + items.length + ' match';
      out.classList.toggle('is-ok', ok === items.length);
    }

    /* ---------- misc ---------- */
    function initCopy() {
      LY.$$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
        const ok = await LY.copy(b.getAttribute('data-copy'));
        LY.toast(ok ? 'Copied ' + b.getAttribute('data-copy') : 'Copy blocked here. Select the address and copy it.');
      }));
    }

    function initEmail() {
      const email = LY.config && LY.config.email;
      if (!email) return;
      LY.$$('[data-email]').forEach((a) => { a.href = 'mailto:' + email; a.textContent = email; });
      LY.$$('[data-copy]').forEach((b) => { if (/@/.test(b.getAttribute('data-copy'))) b.setAttribute('data-copy', email); });
    }

    function initDemoLink() {
      LY.$$('[data-run-demo]').forEach((a) => a.addEventListener('click', () => {
        setTimeout(() => { if (LY.pipeline) LY.pipeline.run('joiner'); }, LY.reduced() ? 0 : 700);
      }));
    }

    function banner() {
      try {
        console.log('%c lanyard_ %c managed IT for companies without an IT department',
          'background:#1f2bff;color:#fff;font:700 14px monospace;padding:4px 6px',
          'color:#1f2bff;font:12px monospace');
        console.log('%cReading the console? Press ` on the page for a terminal. Or just say hi: ' + (LY.config.email || ''), 'font:12px monospace');
      } catch (e) { /* no console */ }
    }

    function init() {
      labelTheme();
      const tb = LY.$('[data-theme-toggle]');
      if (tb) tb.addEventListener('click', () => setTheme(current() === 'dark' ? 'light' : 'dark'));
      if (window.matchMedia) {
        const mq = matchMedia('(prefers-color-scheme: dark)');
        if (mq.addEventListener) mq.addEventListener('change', labelTheme);
      }
      initEmail();
      initNav();
      initClocks();
      initMenu();
      initTicker();
      initScramble();
      initWeight();
      initCopy();
      initDemoLink();
      initHashes();
      banner();
    }

    return { init, setTheme };
  })();
})();
