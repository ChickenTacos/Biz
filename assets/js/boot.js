/* The one script that runs before the page is drawn (it isn't deferred).
   It sets classes on <html> that the stylesheet relies on:
     js        scripts are running
     rm        the visitor prefers reduced motion
     no-intro  skip the opening animation
   The opening animation plays once per browser tab. Set data-intro on the
   <html> tag to "always" to play it on every visit, or "off" to remove it.
   It is also skipped for links straight to a section or panel (/#pricing). */
(function () {
  var root = document.documentElement;
  var LY = window.LY = window.LY || {};
  var add = ['js'];
  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }
  if (reduced) add.push('rm');
  var mode = root.getAttribute('data-intro') || 'once';
  var seen = false;
  try {
    seen = window.sessionStorage.getItem('ly-intro') === '1';
    window.sessionStorage.setItem('ly-intro', '1');
  } catch (e) { /* storage blocked: treat it as a first visit */ }
  var skip = reduced || mode === 'off' || (mode === 'once' && seen) || location.hash.length > 1;
  if (skip) add.push('no-intro');
  LY.introMs = skip ? 0 : 2050; // keep in step with --intro-t in main.css
  root.className += (root.className ? ' ' : '') + add.join(' ');
})();
