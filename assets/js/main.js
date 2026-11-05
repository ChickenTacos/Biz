/* Start-up. Each part is isolated so one failure can't take the page down.
   The panel goes last: a link like /#backups opens one straight away, and it
   needs the prices and the form to be ready. */
(function () {
  'use strict';
  const LY = window.LY;
  const safe = (name, fn) => {
    try { fn(); } catch (err) { console.warn('[lanyard] ' + name + ' failed:', err); }
  };
  safe('ui', () => LY.ui.init());
  safe('plans', () => LY.plans.init());
  safe('contact', () => LY.contact.init());
  safe('modal', () => LY.modal.init());
})();
