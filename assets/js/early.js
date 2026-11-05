/* Runs before first paint (loaded without defer, keep it tiny).
   Sets the JS flag, restores a saved theme, and decides whether to play the
   boot screen: once per browser session, never with reduced motion, and
   never when the URL has ?noboot. */
(function (d) {
  var r = d.documentElement;
  r.classList.add('js');
  try {
    var t = localStorage.getItem('ly-theme');
    if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t);
  } catch (e) {}
  var boot = true;
  try { if (sessionStorage.getItem('ly-booted')) boot = false; } catch (e) {}
  try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) boot = false; } catch (e) {}
  if (/[?&]noboot\b/.test(location.search)) boot = false;
  if (boot) r.classList.add('is-booting');
})(document);
