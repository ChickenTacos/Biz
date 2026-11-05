/* Header, mobile menu, the live "your business today" card in the hero,
   the little "?" explanations on the plans, and small touches like the
   light that follows the pointer across the service cards. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  LY.ui = (function () {
    const root = document.documentElement;

    function header() {
      const head = LY.$('[data-head]');
      const hero = LY.$('.hero');
      if (!head) return;
      const update = () => head.classList.toggle('is-top', !!hero && window.scrollY < 12 && !root.classList.contains('menu-open'));
      window.addEventListener('scroll', update, { passive: true });
      update();

      const btn = LY.$('[data-menu-btn]');
      const menu = LY.$('[data-menu]');
      if (!btn || !menu) return;
      const set = (open) => {
        menu.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? 'Close' : 'Menu';
        root.classList.toggle('menu-open', open);
        update();
      };
      btn.addEventListener('click', () => set(menu.hidden));
      menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
      window.addEventListener('resize', () => { if (window.innerWidth > 900 && !menu.hidden) set(false); });
    }

    // Current day and time in Victoria, e.g. "Tue 9:41 AM"
    function now() {
      const tz = (LY.config && LY.config.timeZone) || 'America/Vancouver';
      try {
        return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date()).replace(',', '');
      } catch (e) {
        return '';
      }
    }

    // Small events that pop up above the card, so it feels alive
    function board() {
      const time = LY.$('[data-board-time]');
      const blocked = LY.$('[data-blocked]');
      const toast = LY.$('[data-board-toast]');
      const set = () => { const t = now(); if (time && t) time.textContent = t; };
      set();
      setInterval(set, 30000);
      if (LY.reduced() || !toast) return;

      const events = [
        ['Scam email blocked', true],
        ['Updates installed on 6 computers'],
        ['Backup checked and working'],
        ['Suspicious sign-in stopped'],
        ['Printer fixed for reception'],
      ];
      let i = 0;
      let count = 3;
      let visible = true;
      LY.watchVisible(LY.$('.hero'), (v) => { visible = v; });
      const show = () => {
        if (visible && !document.hidden && !root.classList.contains('sheet-open')) {
          const [msg, scam] = events[i % events.length];
          i += 1;
          if (scam && blocked) { count += 1; blocked.textContent = count + ' scam emails'; }
          toast.hidden = true;
          requestAnimationFrame(() => {
            toast.textContent = msg + ' · just now';
            toast.hidden = false;
          });
        }
        setTimeout(show, 5200);
      };
      setTimeout(show, 3600);
    }

    // The "?" buttons next to plan features. One small explanation at a time,
    // shown next to its button. Uses the Popover API where available, so it
    // closes on Escape or a tap anywhere else.
    function tips() {
      const pop = LY.$('[data-tip-pop]');
      const btns = LY.$$('[data-tip]');
      if (!pop || !btns.length) return;
      const native = typeof pop.showPopover === 'function';
      if (!native) pop.removeAttribute('popover');
      pop.id = pop.id || 'tip-pop';
      let cur = null;
      let closedBtn = null;
      let closedAt = 0;
      let wait = 0;
      const isOpen = () => (native ? pop.matches(':popover-open') : pop.classList.contains('is-open'));

      function place() {
        if (!cur) return;
        const r = cur.getBoundingClientRect();
        const w = pop.offsetWidth;
        const h = pop.offsetHeight;
        const m = 12;
        const x = Math.max(m, Math.min(window.innerWidth - w - m, r.left + r.width / 2 - w / 2));
        let y = r.top - h - 12;
        const below = y < m + 64;
        if (below) y = r.bottom + 12;
        pop.style.left = Math.round(x) + 'px';
        pop.style.top = Math.round(y) + 'px';
        pop.style.setProperty('--ax', Math.round(r.left + r.width / 2 - x) + 'px');
        pop.classList.toggle('is-below', below);
      }
      function hidden() {
        if (isOpen()) return;
        if (cur) { cur.setAttribute('aria-expanded', 'false'); closedBtn = cur; closedAt = performance.now(); }
        cur = null;
        pop.classList.remove('is-on');
      }
      function hide() {
        if (native) { if (isOpen()) pop.hidePopover(); } else { pop.classList.remove('is-open'); }
        hidden();
      }
      function show(btn) {
        if (cur && cur !== btn) cur.setAttribute('aria-expanded', 'false');
        cur = btn;
        btn.setAttribute('aria-expanded', 'true');
        if (btn.nextElementSibling !== pop) btn.after(pop);   // reading order: the explanation follows its button
        pop.classList.remove('is-on');
        pop.textContent = '';
        if (native) { if (!isOpen()) pop.showPopover(); } else pop.classList.add('is-open');
        // fill it a moment later, so screen readers announce the new text
        clearTimeout(wait);
        wait = setTimeout(() => {
          if (cur !== btn) return;
          pop.textContent = btn.getAttribute('data-tip');
          place();
          pop.classList.add('is-on');
        }, 40);
      }

      if (native) {
        // light dismiss closes the tip on pointerup, before the click lands on a "?":
        // remember which one was open, so tapping it again closes it instead of reopening
        pop.addEventListener('beforetoggle', (e) => { if (e.newState === 'closed' && cur) { closedBtn = cur; closedAt = performance.now(); } });
        pop.addEventListener('toggle', (e) => { if (e.newState === 'closed') hidden(); });
      }
      btns.forEach((b) => {
        b.setAttribute('aria-expanded', 'false');
        b.setAttribute('aria-controls', pop.id);
        b.addEventListener('click', (e) => {
          e.preventDefault();
          if (cur === b && isOpen()) { hide(); return; }
          if (closedBtn === b && performance.now() - closedAt < 300) return; // this tap just closed it
          show(b);
        });
      });
      if (!native) {
        document.addEventListener('click', (e) => { if (cur && !e.target.closest('[data-tip], [data-tip-pop]')) hide(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cur) { const b = cur; hide(); b.focus(); } });
      }
      const follow = () => { if (cur) place(); };
      window.addEventListener('scroll', follow, { passive: true });
      window.addEventListener('resize', follow);
    }

    // A soft light that follows the pointer over the service cards
    function spotlight() {
      if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      LY.$$('.service').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--mx', Math.round(e.clientX - r.left) + 'px');
          el.style.setProperty('--my', Math.round(e.clientY - r.top) + 'px');
        });
      });
    }

    // The gauge on the 1-minute check band only moves while it's on screen
    function band() {
      const el = LY.$('.quizband');
      if (el && !LY.reduced()) LY.watchVisible(el, (v) => el.classList.toggle('is-live', v));
    }

    function details() {
      const email = LY.config && LY.config.email;
      if (email) LY.$$('[data-email]').forEach((a) => { a.href = 'mailto:' + email; a.textContent = email; });
      LY.$$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
    }

    function init() {
      header();
      board();
      tips();
      spotlight();
      band();
      details();
    }

    return { init };
  })();
})();
