/* The opening animation: the badge drops in on its lanyard and swings, a
   quick "setting up" check runs, then the screen lifts away to show the page.
   The motion itself is CSS, so it still plays and ends if this file fails.
   This adds the live status text, and lets a click, a key or a scroll skip
   straight to the page. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  const STEPS = ['Checking computers', 'Testing backups', 'Filtering email', 'All good'];
  const BAR_START = 650;   // keep in step with .intro__bar in main.css
  const BAR_TIME = 1000;
  const LIFT_AT = 1600;    // after this the lift has begun and skipping is pointless
  const END = 2900;        // everything has lifted away

  LY.intro = {
    running: false,
    init() {
      const el = LY.$('[data-intro-screen]');
      if (!el) return;
      if (document.documentElement.classList.contains('no-intro')) { el.remove(); return; }
      const msg = LY.$('[data-intro-msg]', el);
      const pct = LY.$('[data-intro-pct]', el);
      const intro = this;
      intro.running = true;
      let skipped = false;
      const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

      const show = (v) => {
        pct.textContent = v + '%';
        msg.textContent = STEPS[v >= 100 ? 3 : Math.min(2, Math.floor(v / 34))];
      };
      const tick = () => {
        if (skipped) return;
        const k = LY.clamp((performance.now() - BAR_START) / BAR_TIME, 0, 1);
        show(Math.round(ease(k) * 100));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      const finish = (ms) => setTimeout(() => {
        intro.running = false;
        el.remove();
        teardown();
      }, ms);
      let timer = finish(Math.max(0, END - performance.now()));

      // Skip: lift now, and bring the page's entrance forward to follow it
      const skip = (e) => {
        if (skipped || performance.now() > LIFT_AT) return;
        if (e && e.cancelable && e.type !== 'click') e.preventDefault();
        skipped = true;
        show(100);
        el.classList.add('is-skip');
        if (document.getAnimations) {
          const at = LY.introMs - 380;
          document.getAnimations().forEach((a) => {
            const t = a.effect && a.effect.target;
            if (!t || el.contains(t) || !a.effect.getTiming) return;
            const delay = Number(a.effect.getTiming().delay) || 0;
            // the page's entrance animations all wait for the intro (delay >= introMs);
            // moving their clocks to introMs - 380 starts each one 380ms from now,
            // keeping their order and spacing
            if (delay >= LY.introMs - 60 && typeof a.currentTime === 'number' && a.currentTime < at) a.currentTime = at;
          });
        }
        clearTimeout(timer);
        timer = finish(1000);
      };
      el.addEventListener('click', skip);
      const keys = (e) => { if ([' ', 'Enter', 'Escape', 'ArrowDown', 'PageDown'].indexOf(e.key) >= 0) skip(e); };
      const wheel = (e) => skip(e);
      document.addEventListener('keydown', keys);
      window.addEventListener('wheel', wheel, { passive: false });
      window.addEventListener('touchmove', wheel, { passive: false });
      function teardown() {
        document.removeEventListener('keydown', keys);
        window.removeEventListener('wheel', wheel);
        window.removeEventListener('touchmove', wheel);
      }
    },
  };
})();
