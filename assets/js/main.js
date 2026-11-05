/* Start-up order: page chrome first, then the boot screen (if it plays),
   then the interactive pieces. Each module is isolated so one failure can't
   take the rest of the page down. */
(function () {
  'use strict';
  const LY = window.LY;
  const safe = (name, fn) => {
    try { return fn(); } catch (err) { console.warn('[lanyard] ' + name + ' failed:', err); return null; }
  };

  safe('ui', () => LY.ui.init());
  const booted = LY.boot ? LY.boot() : Promise.resolve();

  // Hero: WebGL ASCII endpoints, with a text fallback
  const heroEl = LY.$('.hero');
  const canvas = LY.$('[data-ascii]');
  const hero = safe('ascii', () => canvas && LY.ascii(canvas, {
    onObject(i, obj, total) {
      const idx = LY.$('[data-ascii-index]');
      const name = LY.$('[data-ascii-name]');
      const state = LY.$('[data-ascii-state]');
      if (idx) idx.textContent = '[ endpoint ' + (i + 1) + '/' + total + ' ]';
      if (name) name.textContent = obj.name;
      if (state) state.textContent = obj.state;
    },
  }));
  const hint = LY.$('.hero__hint');
  if (!hero && heroEl) {
    heroEl.classList.add('no-webgl');
    if (hint) hint.hidden = true;
  } else if (hint && window.matchMedia && matchMedia('(hover: none)').matches) {
    hint.textContent = 'tap the device to switch';
  }

  safe('pipeline', () => LY.pipeline.init());
  safe('fleet', () => LY.fleet.init());
  safe('badge', () => {
    LY.$$('[data-barcode]').forEach((svg) => LY.barcode(svg));
    const stage = LY.$('[data-badge-stage]');
    if (stage) LY.badge(stage);
  });
  safe('contact', () => LY.contact.init());
  safe('terminal', () => LY.terminal.init());

  LY.hero = hero;
  booted.then(() => { if (hero) hero.ready.then(() => hero.start()); });
})();
