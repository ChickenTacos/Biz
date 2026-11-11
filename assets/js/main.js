/* Start-up. Each part is isolated so one failure can't take the page down.
   ui goes first so it hears which page is showing; the panel goes last,
   because a link like /#backups opens one straight away and it needs the
   prices, the form and the pages to be ready. */
(function () {
  'use strict';
  const LY = window.LY;
  const safe = (name, fn) => {
    try { fn(); } catch (err) { console.warn('[lanyard] ' + name + ' failed:', err); }
  };
  safe('ui', () => LY.ui.init());
  safe('plans', () => LY.plans.init());
  safe('contact', () => LY.contact.init());
  safe('pages', () => LY.pages.init());
  safe('intro', () => LY.intro.init());
  safe('modal', () => LY.modal.init());
})();
