/* Header, mobile menu and the live "your business today" card in the hero. */
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
        if (visible && !document.hidden) {
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

    function details() {
      const email = LY.config && LY.config.email;
      if (email) LY.$$('[data-email]').forEach((a) => { a.href = 'mailto:' + email; a.textContent = email; });
      LY.$$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
    }

    function init() {
      header();
      board();
      details();
    }

    return { init };
  })();
})();
