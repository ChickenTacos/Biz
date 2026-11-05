/* Boot screen: a POST-style log built from the visitor's own device, then the
   blue screen rolls up to reveal the hero. Plays once per session; Esc, Enter,
   Space or a click skips it. Resolves when the page is usable. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  function lines() {
    const d = LY.device.sync();
    const e = LY.esc;
    const gpu = LY.device.gpu();
    const mem = d.memory ? (d.memory >= 8 ? '8 GB or more' : d.memory + ' GB') + ' <span class="d">(as reported by your browser)</span>' : '<span class="d">not reported by this browser</span>';
    const net = (d.online ? 'online' : 'offline') + (d.conn && d.conn.type ? ' · ' + e(d.conn.type) : '');
    const os = e(LY.device.osLabel(d));
    return [
      'LANYARD SYSTEMS  Setup Utility  v26.11',
      'Copyright (C) 2026 Lanyard Systems, Victoria BC',
      ' ',
      'CPU ............ ' + (d.cores ? d.cores + ' logical cores' : '<span class="d">not reported</span>'),
      'Memory ......... ' + mem,
      'Display ........ ' + d.screen.w + 'x' + d.screen.h + ' @' + d.screen.dpr + 'x · ' + d.screen.depth + '-bit colour',
      'Graphics ....... ' + (gpu ? e(gpu) : '<span class="d">hidden by browser</span>'),
      'System ......... ' + os + ' · ' + e(LY.device.browserLabel(d)),
      'Locale ......... ' + e(d.lang || '?') + ' · ' + e(d.tz || '?'),
      'Network ........ ' + net,
      ' ',
      'Detecting endpoints ............ <span class="c">1 found (this one)</span>',
      'Disk encryption ................ <span class="y">UNKNOWN</span> <span class="d">(no management agent)</span>',
      'Patch level .................... <span class="y">UNKNOWN</span> <span class="d">(no management agent)</span>',
      ' ',
      '[  <span class="c">OK</span>  ] Started identity service',
      '[  <span class="c">OK</span>  ] Started onboarding pipeline',
      '[  <span class="c">OK</span>  ] Started offboarding pipeline',
      '[  <span class="c">OK</span>  ] Reached target <span class="y">business as usual</span>',
      ' ',
      'Booting lanyard_',
    ];
  }

  LY.boot = function () {
    return new Promise((resolve) => {
      const root = document.documentElement;
      const el = document.getElementById('boot');
      if (!el || !root.classList.contains('is-booting')) { resolve(); return; }
      root.classList.add('boot-lock');
      const log = el.querySelector('[data-boot-log]');
      const pct = el.querySelector('[data-boot-pct]');
      let L;
      try { L = lines(); } catch (err) { L = ['LANYARD SYSTEMS  Setup Utility', 'Booting lanyard_']; }
      let i = 0;
      let done = false;
      let timer = 0;

      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        window.removeEventListener('keydown', onKey, true);
        el.removeEventListener('click', finish);
        LY.store.sset('ly-booted', '1');
        if (pct) pct.textContent = '100';
        el.classList.add('is-leaving');
        root.classList.remove('boot-lock');
        setTimeout(resolve, 140);
        setTimeout(() => {
          root.classList.remove('is-booting');
          el.classList.remove('is-leaving');
        }, 650);
      };
      const onKey = (ev) => {
        if (ev.key === 'Escape' || ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); finish(); }
      };
      window.addEventListener('keydown', onKey, true);
      el.addEventListener('click', finish);

      const step = () => {
        if (done) return;
        if (i < L.length) {
          log.insertAdjacentHTML('beforeend', L[i] + '\n');
          i += 1;
          if (pct) pct.textContent = LY.pad(Math.round((i / L.length) * 100), 3);
          timer = setTimeout(step, L[i - 1] === ' ' ? 70 : 38 + Math.random() * 30);
        } else {
          timer = setTimeout(finish, 420);
        }
      };
      timer = setTimeout(step, 120);
    });
  };
})();
