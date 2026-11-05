/* Live demos in the service panels.
   Each one shows a service working, in a small app window, instead of
   describing it, and has one thing to try: a toggle, a button, a key to press.
   A demo starts when its panel opens. When the panel closes or changes, every
   timer, animation frame and observer it started is stopped.
   With reduced motion, demos show their finished state and the controls
   still work, without the animation. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- helpers ---------- */

  // Timers and animation loops for one demo, cleared together
  function clock() {
    const timers = new Set();
    const loops = new Set();
    const ends = new Set();
    return {
      at(ms, fn) {
        const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
        timers.add(id);
      },
      loop(fn) {
        const L = { id: 0 };
        const step = (t) => {
          if (!loops.has(L)) return;
          if (fn(t) === false) { loops.delete(L); return; }
          L.id = requestAnimationFrame(step);
        };
        loops.add(L);
        L.id = requestAnimationFrame(step);
      },
      clear() {
        timers.forEach(clearTimeout);
        timers.clear();
        loops.forEach((L) => cancelAnimationFrame(L.id));
        loops.clear();
      },
      // Something to undo when the demo is stopped for good (observers, listeners)
      onEnd(fn) { ends.add(fn); },
      end() { this.clear(); ends.forEach((fn) => fn()); ends.clear(); },
    };
  }

  const svg = (vb, d) => '<svg viewBox="' + vb + '" aria-hidden="true" focusable="false">' + d + '</svg>';
  const ICON = {
    replay: svg('0 0 20 20', '<path d="M4.6 10.2a5.4 5.4 0 1 0 1.6-4.1"/><path d="M5.6 2.9v3.5h3.5"/>'),
    back: svg('0 0 20 20', '<path d="M12 5l-5 5 5 5"/>'),
    bolt: svg('0 0 20 20', '<path d="M11 2.5 4.5 11H10l-1 6.5L15.5 9H10z"/>'),
    check: svg('0 0 20 20', '<path d="M5 10.5l3.2 3.2L15 7"/>'),
    phone: svg('0 0 32 32', '<path d="M10.2 5H7.5A2.5 2.5 0 0 0 5 7.7C5.6 18 14 26.4 24.3 27a2.5 2.5 0 0 0 2.7-2.5v-2.7l-5-2.2-2.6 2.6a14 14 0 0 1-7.6-7.6l2.6-2.6z"/>'),
    desk: svg('0 0 20 20', '<path d="M3 8.6c0-3.2 14-3.2 14 0V10h-3.4V8.8H6.4V10H3z"/><rect x="4" y="11.2" width="12" height="5.8" rx="1.5"/>'),
    laptop: svg('0 0 20 20', '<rect x="4" y="4.5" width="12" height="8" rx="1"/><path d="M2.5 15.2h15"/>'),
    mobile: svg('0 0 20 20', '<rect x="6" y="2.5" width="8" height="15" rx="2"/><path d="M9 14.8h2"/>'),
    sheet: svg('0 0 32 38', '<path d="M5 2.5h16l7 7v26H5z"/><path d="M21 2.5v7h7"/><path d="M10 18h13M10 24h13M10 30h13M16 14v19"/>'),
    mail: svg('0 0 20 20', '<rect x="2.5" y="4.5" width="15" height="11" rx="1.5"/><path d="M3 5.5l7 5.5 7-5.5"/>'),
    files: svg('0 0 20 20', '<path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h4l2 2h6a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5z"/>'),
    cal: svg('0 0 20 20', '<rect x="3" y="4.5" width="14" height="12" rx="1.5"/><path d="M3 8.5h14M7 2.5v4M13 2.5v4"/>'),
    inbox: svg('0 0 20 20', '<path d="M2.5 11.5 5 4.5h10l2.5 7v4h-15z"/><path d="M2.5 11.5H7l1 2h4l1-2h4.5"/>'),
  };

  // The app window every demo sits in
  function frame(root, o) {
    const app = document.createElement('div');
    app.className = 'app app--' + o.kind;
    app.innerHTML =
      '<div class="app__bar">' +
        '<span class="app__dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<span class="app__title">' + o.title + '</span>' +
        '<span class="app__st" data-st></span>' +
      '</div>' +
      '<div class="app__body">' + o.body + '</div>' +
      '<div class="app__foot">' + (o.foot || '') +
        '<button class="app__btn" type="button" data-replay>' + ICON.replay + (o.replay || 'Replay') + '</button>' +
      '</div>';
    root.appendChild(app);
    const st = app.querySelector('[data-st]');
    return {
      app,
      q: (s) => app.querySelector(s),
      qa: (s) => Array.from(app.querySelectorAll(s)),
      status(text, kind) {
        if (st.textContent !== text) st.textContent = text;
        st.className = 'app__st' + (kind ? ' is-' + kind : '');
      },
      on(sel, fn) {
        app.addEventListener('click', (e) => {
          const b = e.target.closest(sel);
          if (b && app.contains(b)) fn(b, e);
        });
      },
    };
  }

  // A row of buttons where one is pressed at a time
  function seg(f, fn) {
    f.on('[data-mode]', (b) => {
      if (b.getAttribute('aria-pressed') === 'true') return;
      f.qa('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      fn(b.getAttribute('data-mode'));
    });
  }

  const restart = (el, cls) => { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); };

  /* ---------- computers: a security update, rolled out in rings ---------- */
  function computers(root, c, still) {
    const N = 63;
    const COLS = 9;
    const YOU = 40;
    const f = frame(root, {
      kind: 'upd',
      title: 'Security update · 63 computers',
      body:
        '<div class="seg" role="group" aria-label="Show the update">' +
          '<button class="seg__b" type="button" data-mode="us" aria-pressed="true">Managed by us</button>' +
          '<button class="seg__b" type="button" data-mode="diy" aria-pressed="false">Left on their own</button>' +
        '</div>' +
        '<div class="upd">' +
          '<div class="upd__grid" aria-hidden="true">' + '<i></i>'.repeat(N) + '</div>' +
          '<ul class="upd__rows">' + '<li class="upd__row"><span class="upd__lbl"></span><b class="upd__n"></b><span class="upd__bar"><i></i></span></li>'.repeat(3) + '</ul>' +
        '</div>' +
        '<p class="upd__key" aria-hidden="true"><i></i>Your computer</p>',
    });
    const tiles = f.qa('.upd__grid i');
    const rows = f.qa('.upd__row');
    const all = tiles.map((t, i) => i);
    const others = LY.shuffle(all.filter((i) => i !== YOU), LY.rng(2026));
    const pilot = others.slice(0, 4);
    const early = others.slice(4, 16);
    // everyone else rolls out as a wave, left to right
    const rest = all.filter((i) => pilot.indexOf(i) < 0 && early.indexOf(i) < 0).sort((a, b) => (a % COLS) - (b % COLS) || a - b);
    const rings = [pilot, early, rest];
    let mode = 'us';

    const mark = (i, cls) => { tiles[i].className = (i === YOU ? 'you ' : '') + cls; };
    const row = (i, label, n, total, cls) => {
      const r = rows[i];
      r.className = 'upd__row' + (cls ? ' is-' + cls : '');
      r.querySelector('.upd__lbl').textContent = label;
      r.querySelector('.upd__n').textContent = n + '/' + total;
      r.querySelector('.upd__bar i').style.width = (total ? (n / total) * 100 : 0) + '%';
    };

    function managed() {
      const names = ['Test group', 'Early group', 'Everyone else'];
      rings.forEach((r, i) => row(i, names[i], 0, r.length, 'ok'));
      if (still) {
        rings.forEach((r, i) => { r.forEach((k) => mark(k, 'ok')); row(i, names[i], r.length, r.length, 'ok'); });
        f.status('All 63 up to date', 'ok');
        return;
      }
      f.status('Update released', 'busy');
      const gap = [170, 70, 22];
      const dur = [800, 600, 480];
      const say = ['Testing on 4 first', 'Early group', 'Everyone else'];
      let t = 350;
      rings.forEach((r, ri) => {
        let done = 0;
        c.at(t, () => f.status(say[ri], 'busy'));
        r.forEach((k, j) => {
          c.at(t + j * gap[ri], () => mark(k, 'run'));
          c.at(t + j * gap[ri] + dur[ri], () => { mark(k, 'ok'); done += 1; row(ri, names[ri], done, r.length, 'ok'); });
        });
        t += (r.length - 1) * gap[ri] + dur[ri] + 380;
      });
      c.at(t, () => f.status('All 63 up to date', 'ok'));
    }

    function alone() {
      const names = ['Updated', 'Updated late', 'Still at risk'];
      const rnd = LY.rng(77);
      const order = LY.shuffle(all.filter((i) => i !== YOU), rnd);
      const risk = [YOU].concat(order.slice(0, 8));
      const fine = order.slice(8);
      const when = fine.map(() => 300 + rnd() * 4400);
      let ok = 0;
      let late = 0;
      const counts = () => { row(0, names[0], ok, N, 'ok'); row(1, names[1], late, N, 'late'); };
      const finish = () => { risk.forEach((k) => mark(k, 'bad')); row(2, names[2], risk.length, N, 'bad'); f.status(risk.length + ' still at risk', 'bad'); };
      const land = (k, j) => { const l = when[j] > 3000; mark(k, l ? 'late' : 'ok'); if (l) late += 1; else ok += 1; };
      row(2, names[2], 0, N, 'bad');
      counts();
      if (still) { fine.forEach(land); counts(); finish(); return; }
      f.status('Waiting for restarts', 'busy');
      fine.forEach((k, j) => {
        c.at(when[j], () => mark(k, 'run'));
        c.at(when[j] + 520, () => { land(k, j); counts(); });
      });
      c.at(5400, finish);
    }

    function play() {
      c.clear();
      tiles.forEach((t, i) => mark(i, ''));
      (mode === 'us' ? managed : alone)();
    }
    seg(f, (m) => { mode = m; play(); });
    f.on('[data-replay]', play);
    play();
  }

  /* ---------- email: a scam caught before anyone sees it ---------- */
  function email(root, c, still) {
    const row = (cls, av, from, subj, time, extra) =>
      '<li class="mail__row ' + cls + '"><span class="mail__av" aria-hidden="true">' + av + '</span>' +
      '<span class="mail__txt"><b>' + from + '</b><span>' + subj + '</span></span>' +
      '<span class="mail__time">' + time + '</span>' + (extra || '') + '</li>';
    const f = frame(root, {
      kind: 'mail',
      title: 'Inbox · Front desk',
      body:
        '<div class="mail">' +
          '<div class="mail__tabs" aria-hidden="true"><span class="is-on">Inbox</span><span>Held aside <b data-held>0</b></span></div>' +
          '<ul class="mail__list">' +
            row('mail__row--tom is-new', 'T', 'Tom, Reception', 'The printer is working again, thanks!', '9:44') +
            row('mail__row--scam is-new', 'M', 'Microsoft 365', 'Your password expires today', '9:41',
              '<span class="mail__tag">Scam, held aside</span><button class="mail__why" type="button" data-why>See why</button>') +
            row('', 'H', 'Harbour Supply', 'Invoice #2291 for October', '9:30') +
            row('', 'S', 'Sarah Chen', 'Lunch order for Friday?', '9:12') +
          '</ul>' +
          '<div class="mail__open" data-pane hidden>' +
            '<button class="mail__back" type="button" data-back>' + ICON.back + 'Back to inbox</button>' +
            '<div class="mo">' +
              '<p class="mo__from"><b>Microsoft 365</b> <span>&lt;alerts@<mark>m1crosoft</mark>-security.example&gt;</span><i class="mo__flag">1</i></p>' +
              '<p class="mo__subj">Your password expires <mark>today</mark><i class="mo__flag">2</i></p>' +
              '<p class="mo__body">Your password expires in 2 hours. Keep your current password to avoid losing access to your email.</p>' +
              '<p class="mo__cta"><span>Keep my password</span><i class="mo__flag">3</i></p>' +
            '</div>' +
            '<ol class="mo__why">' +
              '<li><i>1</i>A lookalike address. That\'s a "1", not an "i".</li>' +
              '<li><i>2</i>It rushes you. Real messages from IT don\'t.</li>' +
              '<li><i>3</i>The button opens a fake sign-in page that steals passwords.</li>' +
            '</ol>' +
          '</div>' +
        '</div>',
    });
    const scam = f.q('.mail__row--scam');
    const tom = f.q('.mail__row--tom');
    const held = f.q('[data-held]');
    const pane = f.q('[data-pane]');

    function pane1(open) {
      pane.hidden = !open;
      f.app.classList.toggle('is-reading', open);
      if (open) { restart(pane, 'is-in'); f.q('[data-back]').focus({ preventScroll: true }); }
    }
    function flag() {
      scam.classList.remove('is-new', 'is-scan');
      scam.classList.add('is-flag');
      held.textContent = '1';
    }
    function play() {
      c.clear();
      pane1(false);
      scam.classList.remove('is-scan', 'is-flag');
      tom.classList.add('is-new');
      scam.classList.add('is-new');
      held.textContent = '0';
      if (still) { flag(); tom.classList.remove('is-new'); f.status('1 scam held aside', 'ok'); return; }
      f.status('Checking new mail', 'busy');
      c.at(500, () => { scam.classList.remove('is-new'); scam.classList.add('is-scan'); });
      c.at(1800, () => { flag(); restart(held, 'pop'); f.status('Scam caught', 'bad'); });
      c.at(2800, () => { tom.classList.remove('is-new'); f.status('Inbox is safe', 'ok'); });
    }
    f.on('[data-why]', () => pane1(true));
    f.on('[data-back]', () => { pane1(false); f.q('[data-why]').focus({ preventScroll: true }); });
    f.on('[data-replay]', play);
    play();
  }

  /* ---------- network: attacks stopped at the firewall ---------- */
  function network(root, c, still) {
    const ap = (x, y, extra) =>
      '<g class="net__node net__ap' + (extra || '') + '" transform="translate(' + x + ' ' + y + ')">' +
        '<circle class="net__box" r="16"/><path class="net__wave" d="M-8 -1a11 11 0 0 1 16 0M-4.5 3a6 6 0 0 1 9 0"/><circle class="net__dot" cy="7" r="1.7"/>' +
        '<text class="net__lbl" y="32">Wi-Fi</text></g>';
    const f = frame(root, {
      kind: 'net',
      title: 'Office network',
      body:
        '<div class="net__stats"><span>Attacks blocked today <b data-net-blocked>214</b></span><span>Wi-Fi points <b data-aps>2/3</b></span></div>' +
        '<svg class="net" viewBox="0 16 440 222" aria-hidden="true" focusable="false">' +
          '<path class="net__link" d="M74 118H128"/>' +
          '<path class="net__link" d="M172 118H228"/>' +
          '<path class="net__link" d="M272 110L362 53"/>' +
          '<path class="net__link" d="M272 118H370"/>' +
          '<path class="net__link net__link--new" d="M272 126L362 183"/>' +
          '<g class="net__node" transform="translate(44 118)"><path class="net__ln" d="M-26 10a12 12 0 0 1 1-24 16 16 0 0 1 30-5 11 11 0 0 1 21 8 10 10 0 0 1-3 21z"/><text class="net__lbl" y="36">Internet</text></g>' +
          '<g class="net__node net__fw" transform="translate(150 118)"><rect class="net__box" x="-22" y="-22" width="44" height="44" rx="10"/><path class="net__brick" d="M-22 -7h44M-22 8h44M-8 -22v15M8 -7v15M-4 8v14"/><text class="net__lbl" y="40">Firewall</text></g>' +
          '<g class="net__node" transform="translate(250 118)"><rect class="net__box" x="-22" y="-12" width="44" height="24" rx="5"/><path class="net__ports" d="M-15 -3h5v6h-5zM-6 -3h5v6h-5zM3 -3h5v6h-5z"/><circle class="net__led" cx="15" r="2.2"/><text class="net__lbl" y="30">Switch</text></g>' +
          ap(376, 44) + ap(386, 118) + ap(376, 192, ' net__ap--new') +
          '<circle class="net__ring" cx="376" cy="192" r="16"/>' +
          '<g data-packets></g>' +
        '</svg>',
      foot: '<button class="app__btn app__btn--warn" type="button" data-attack>' + ICON.bolt + 'Try an attack</button>',
    });
    const paths = f.qa('.net__link');
    const lens = paths.map((p) => p.getTotalLength());
    const layer = f.q('[data-packets]');
    const fw = f.q('.net__fw');
    const blockedEl = f.q('[data-net-blocked]');
    let packets = [];
    let blocked = 214;
    let ap3 = false;
    let queue = 0;
    let hitT = 0;

    function spawn(bad) {
      const el = document.createElementNS(NS, 'circle');
      el.setAttribute('r', bad ? '4' : '3.2');
      el.setAttribute('class', bad ? 'net__pk net__pk--bad' : 'net__pk');
      el.setAttribute('cx', '-20');
      layer.appendChild(el);
      const leaf = 2 + Math.floor(Math.random() * (ap3 ? 3 : 2));
      packets.push({ el, route: bad ? [0] : [0, 1, leaf], seg: 0, d: 0, bad, v: bad ? 125 : 150 });
    }
    function burst() {
      const b = document.createElementNS(NS, 'circle');
      b.setAttribute('class', 'net__burst');
      b.setAttribute('cx', '128');
      b.setAttribute('cy', '118');
      b.setAttribute('r', '5');
      layer.appendChild(b);
      setTimeout(() => b.remove(), 650);
      blocked += 1;
      blockedEl.textContent = LY.num(blocked);
      fw.classList.add('is-hit');
      clearTimeout(hitT);
      hitT = setTimeout(() => fw.classList.remove('is-hit'), 220);
    }
    function online() {
      ap3 = true;
      f.app.classList.add('is-ap3');
      f.q('[data-aps]').textContent = '3/3';
    }
    function play() {
      c.clear();
      packets.forEach((p) => p.el.remove());
      packets = [];
      layer.textContent = '';
      ap3 = false;
      queue = 0;
      blocked = 214;
      blockedEl.textContent = '214';
      f.app.classList.remove('is-ap3');
      f.q('[data-aps]').textContent = '2/3';
      if (still) { online(); f.status('All clear', 'ok'); return; }
      f.status('Watching traffic', 'busy');
      c.at(1800, () => { online(); f.status('New Wi-Fi online', 'ok'); });
      c.at(3600, () => f.status('All clear', 'ok'));
      let last = performance.now();
      let ms = 0;
      let nextGood = 0;
      let nextBad = 900;
      let nextQ = 0;
      c.loop((now) => {
        const dt = Math.min(50, now - last);
        last = now;
        ms += dt;
        if (ms > nextGood) { spawn(false); nextGood = ms + 280; }
        if (ms > nextBad) { spawn(true); nextBad = ms + 1100 + Math.random() * 900; }
        if (queue > 0 && ms > nextQ) { spawn(true); queue -= 1; nextQ = ms + 110; }
        packets = packets.filter((p) => {
          p.d += (p.v * dt) / 1000;
          while (p.d > lens[p.route[p.seg]]) {
            p.d -= lens[p.route[p.seg]];
            p.seg += 1;
            if (p.seg >= p.route.length) {
              if (p.bad) burst();
              p.el.remove();
              return false;
            }
          }
          const pt = paths[p.route[p.seg]].getPointAtLength(p.d);
          p.el.setAttribute('cx', pt.x.toFixed(1));
          p.el.setAttribute('cy', pt.y.toFixed(1));
          return true;
        });
      });
    }
    f.on('[data-attack]', () => {
      if (still) {
        blocked += 8;
        blockedEl.textContent = LY.num(blocked);
        f.status('8 attacks stopped', 'ok');
        return;
      }
      queue += 8;
      f.status('Attack in progress', 'bad');
      c.at(2400, () => { if (!queue) f.status('Attack stopped', 'ok'); });
    });
    f.on('[data-replay]', play);
    c.onEnd(() => clearTimeout(hitT));
    play();
  }

  /* ---------- Microsoft 365: a move done over the weekend ---------- */
  function m365(root, c, still) {
    const items = [
      { name: 'Email', icon: ICON.mail, total: 48210, a: 0.04, b: 0.62 },
      { name: 'Files', icon: ICON.files, total: 12406, a: 0.1, b: 0.74 },
      { name: 'Calendars', icon: ICON.cal, total: 14, a: 0.56, b: 0.8 },
      { name: 'Shared inboxes', icon: ICON.inbox, total: 3, a: 0.7, b: 0.86 },
    ];
    const team = ['AC', 'BK', 'CL', 'DM', 'EN', 'FP', 'GR', 'HS', 'IT', 'JW', 'KY', 'LO', 'MQ', 'NR'];
    const f = frame(root, {
      kind: 'mig',
      title: 'Moving to Microsoft 365',
      body:
        '<div class="mig__when"><b data-when>Fri 6:00 pm</b><span>Mon 8:00 am</span></div>' +
        '<input class="mig__range" type="range" min="0" max="1000" step="1" value="0" aria-label="The weekend, from Friday evening to Monday morning. Drag to see the progress." data-scrub>' +
        '<ul class="mig__rows">' + items.map((it) =>
          '<li class="mig__row"><span class="mig__ic">' + it.icon + '</span><span class="mig__name">' + it.name + '</span><span class="mig__n"></span><span class="mig__bar"><i></i></span></li>').join('') +
        '</ul>' +
        '<div class="mig__team"><span class="mig__avs" aria-hidden="true">' + team.map((t) => '<i>' + t + '</i>').join('') + '</span><span data-team></span></div>',
    });
    const range = f.q('[data-scrub]');
    const whenEl = f.q('[data-when]');
    const rows = f.qa('.mig__row');
    const avs = f.qa('.mig__avs i');
    const teamEl = f.q('[data-team]');
    const DAYS = ['Fri', 'Sat', 'Sun', 'Mon'];

    function when(p) {
      const total = 18 * 60 + Math.round((p * 62 * 60) / 5) * 5;
      const day = Math.min(3, Math.floor(total / 1440));
      const m = total - day * 1440;
      const h = Math.floor(m / 60);
      return DAYS[day] + ' ' + (h % 12 || 12) + ':' + LY.pad(m % 60) + (h >= 12 ? ' pm' : ' am');
    }
    function render(p) {
      whenEl.textContent = when(p);
      items.forEach((it, i) => {
        const k = LY.clamp((p - it.a) / (it.b - it.a), 0, 1);
        rows[i].querySelector('.mig__n').textContent = LY.num(it.total * k) + ' of ' + LY.num(it.total);
        rows[i].querySelector('.mig__bar i').style.width = (k * 100).toFixed(1) + '%';
        rows[i].classList.toggle('is-done', k >= 1);
      });
      const signed = Math.round(LY.clamp((p - 0.9) / 0.1, 0, 1) * team.length);
      avs.forEach((a, i) => a.classList.toggle('is-on', i < signed));
      teamEl.textContent = signed === team.length ? 'Everyone signed in' : signed ? signed + ' of 14 signed in' : 'Your team signs in on Monday';
      if (p >= 1) f.status('Done, nothing lost', 'ok');
      else f.status('Moving · ' + Math.round(p * 100) + '%', 'busy');
    }
    function play() {
      c.clear();
      if (still) { range.value = '1000'; render(1); return; }
      const t0 = performance.now();
      const D = 7000;
      c.loop((now) => {
        const p = Math.min(1, (now - t0) / D);
        range.value = String(Math.round(p * 1000));
        render(p);
        return p < 1;
      });
    }
    range.addEventListener('input', () => { c.clear(); render(Number(range.value) / 1000); });
    f.on('[data-replay]', play);
    play();
  }

  /* ---------- backups: pick any hour, get the file back ---------- */
  function backups(root, c, still) {
    const short = ['6 am', '7 am', '8 am', '9 am', '10 am', '11 am', '12 pm', '1 pm'];
    const long = ['6:00 am', '7:00 am', '8:00 am', '9:00 am', '10:00 am', '11:00 am', '12:00 pm', '1:00 pm'];
    const rnd = LY.rng(14);
    const f = frame(root, {
      kind: 'bk',
      title: 'Backups · Shared files',
      body:
        '<div class="bk__file" data-file><span class="bk__ic">' + ICON.sheet + '</span>' +
          '<span class="bk__txt"><b>Budget 2026.xlsx</b><span data-state></span></span></div>' +
        '<p class="bk__how">Today\'s backups. Tap one to restore from it.</p>' +
        '<div class="bk__tl">' +
          '<div class="bk__bars" role="group" aria-label="Today\'s backups">' +
            short.map((h, i) => '<button class="bk__bar" type="button" data-i="' + i + '" aria-label="Restore from the ' + long[i] + ' backup"><i></i><span>' + h + '</span></button>').join('') +
          '</div>' +
          '<div class="bk__now" aria-hidden="true"><i class="bk__del"></i><span>Now</span></div>' +
          '<i class="bk__head" aria-hidden="true"></i>' +
        '</div>' +
        '<div class="bk__prog" aria-hidden="true"><span class="bk__track"><i data-prog></i></span><span class="bk__time" data-ptime>0:00</span></div>',
    });
    const file = f.q('[data-file]');
    const state = f.q('[data-state]');
    const bars = f.qa('.bk__bar');
    const head = f.q('.bk__head');
    const prog = f.q('[data-prog]');
    const ptime = f.q('[data-ptime]');
    bars.forEach((b) => b.querySelector('i').style.setProperty('--h', Math.round(38 + rnd() * 52) + '%'));

    const at = (slot) => head.style.setProperty('--at', String(slot));
    const fileState = (text, kind) => { state.textContent = text; file.className = 'bk__file' + (kind ? ' is-' + kind : ''); };
    const fill = (p) => {
      prog.style.width = (p * 100).toFixed(1) + '%';
      const s = Math.round(131 * p);
      ptime.textContent = Math.floor(s / 60) + ':' + LY.pad(s % 60);
    };

    function restore(i) {
      c.clear();
      bars.forEach((b, k) => b.classList.toggle('is-sel', k === i));
      at(i);
      fill(0);
      const done = () => {
        fill(1);
        fileState('Restored · the ' + long[i] + ' version', 'ok');
        f.status('Restored in 2 min', 'ok');
      };
      if (still) { done(); return; }
      fileState('Restoring the ' + long[i] + ' version…', '');
      f.status('Restoring', 'busy');
      c.at(900, () => {
        const t0 = performance.now();
        c.loop((now) => {
          const p = Math.min(1, (now - t0) / 1500);
          fill(p);
          if (p >= 1) { done(); restart(file, 'is-pop'); }
          return p < 1;
        });
      });
    }
    function play() {
      c.clear();
      bars.forEach((b) => b.classList.remove('is-sel'));
      at(8);
      fill(0);
      fileState('Deleted by accident · 1:58 pm', 'bad');
      f.status('File deleted', 'bad');
      if (still) { restore(7); return; }
      c.at(1100, () => restore(7));
    }
    f.on('.bk__bar', (b) => restore(Number(b.getAttribute('data-i'))));
    f.on('[data-replay]', play);
    play();
  }

  /* ---------- phones: a customer, connected in three seconds ---------- */
  function phones(root, c, still) {
    const dest = { 1: ['Sales', '201'], 2: ['Support', '202'], 0: ['Reception', '200'] };
    const f = frame(root, {
      kind: 'ph',
      title: 'Main line · 250 555 0142',
      body:
        '<div class="ph">' +
          '<div class="ph__call"><span class="ph__av" aria-hidden="true">' + ICON.phone + '</span>' +
            '<span class="ph__who"><b data-who>Incoming call</b><span>A customer, calling the main line</span></span>' +
            '<span class="ph__timer" data-timer>0:00</span></div>' +
          '<div class="ph__menu"><p class="ph__say">"Thanks for calling. Press 1 for sales, 2 for support, or 0 for reception."</p>' +
            '<div class="ph__keys" role="group" aria-label="Press a key, like the caller would">' +
              '<button class="ph__key" type="button" data-key="1"><b>1</b>Sales</button>' +
              '<button class="ph__key" type="button" data-key="2"><b>2</b>Support</button>' +
              '<button class="ph__key" type="button" data-key="0"><b>0</b>Reception</button>' +
            '</div></div>' +
          '<div class="ph__ring"><span class="ph__to"><b data-to>Waiting for a choice</b><span data-to2>Calls ring on desk phones, laptops and mobiles</span></span>' +
            '<span class="ph__devs" aria-hidden="true"><i>' + ICON.desk + '</i><i>' + ICON.laptop + '</i><i>' + ICON.mobile + '</i></span></div>' +
        '</div>',
    });
    const keys = f.qa('.ph__key');
    const devs = f.qa('.ph__devs i');
    const to = f.q('[data-to]');
    const to2 = f.q('[data-to2]');
    const timer = f.q('[data-timer]');
    const who = f.q('[data-who]');

    function connect(k) {
      const d = dest[k];
      who.textContent = 'On the line';
      to.textContent = 'Connected to ' + d[0];
      to2.textContent = 'Answered on the desk phone, ext. ' + d[1];
      timer.textContent = '0:03';
      devs.forEach((x, i) => { x.className = i === 0 ? 'is-up' : ''; });
      f.app.classList.remove('is-ringing', 'is-menu');
      f.app.classList.add('is-live');
      f.status('Connected in 3 sec', 'ok');
    }
    function press(k) {
      c.clear();
      keys.forEach((b) => b.classList.toggle('is-on', b.getAttribute('data-key') === String(k)));
      f.app.classList.remove('is-live');
      f.app.classList.add('is-menu');
      const d = dest[k];
      if (still) { connect(k); return; }
      timer.textContent = '0:02';
      to.textContent = 'Ringing ' + d[0] + ' · ext. ' + d[1];
      to2.textContent = 'On the desk phone, laptop and mobile';
      f.status('Routing', 'busy');
      devs.forEach((x, i) => { x.className = ''; c.at(i * 140, () => { x.className = 'is-ring'; }); });
      c.at(1300, () => connect(k));
    }
    function play() {
      c.clear();
      keys.forEach((b) => b.classList.remove('is-on'));
      devs.forEach((x) => { x.className = ''; });
      f.app.classList.remove('is-live', 'is-menu');
      who.textContent = 'Incoming call';
      to.textContent = 'Waiting for a choice';
      to2.textContent = 'Calls ring on desk phones, laptops and mobiles';
      timer.textContent = '0:00';
      if (still) { press(1); return; }
      f.app.classList.add('is-ringing');
      f.status('Ringing', 'busy');
      c.at(900, () => { f.app.classList.remove('is-ringing'); f.app.classList.add('is-menu'); timer.textContent = '0:01'; f.status('Menu', 'busy'); });
      c.at(2300, () => press(1));
    }
    f.on('[data-key]', (b) => press(b.getAttribute('data-key')));
    f.on('[data-replay]', play);
    play();
  }

  /* ---------- people: a first day and a last day ---------- */
  function people(root, c, still) {
    const L = [['Email', 47], ['Teams', 125], ['Files', 203]];
    const R = [['Wi-Fi', 47], ['Laptop', 125], ['Apps', 203]];
    const ys = [100, 125, 150];
    const node = (x, y, label) =>
      '<g class="pl__node" transform="translate(' + x + ' ' + (y - 17) + ')"><rect width="100" height="34" rx="17"/>' +
      '<circle class="pl__dot" cx="17" cy="17" r="9.5"/><path class="pl__ck" d="M12.8 17.2l2.9 2.9 5.6-5.8"/><path class="pl__x" d="M13.8 13.8l6.4 6.4M20.2 13.8l-6.4 6.4"/>' +
      '<text x="34" y="21.5">' + label + '</text></g>';
    const links = L.map((n, i) => '<path class="pl__link" pathLength="1" d="M160 ' + ys[i] + 'C138 ' + ys[i] + ' 138 ' + n[1] + ' 116 ' + n[1] + '"/>').join('') +
      R.map((n, i) => '<path class="pl__link" pathLength="1" d="M280 ' + ys[i] + 'C302 ' + ys[i] + ' 302 ' + n[1] + ' 324 ' + n[1] + '"/>').join('');
    const f = frame(root, {
      kind: 'pl',
      title: 'New staff and leavers',
      body:
        '<div class="seg" role="group" aria-label="Choose a day">' +
          '<button class="seg__b" type="button" data-mode="join" aria-pressed="true">A first day</button>' +
          '<button class="seg__b" type="button" data-mode="leave" aria-pressed="false">A last day</button>' +
        '</div>' +
        '<svg class="pl" viewBox="0 0 440 240" aria-hidden="true" focusable="false">' + links +
          L.map((n) => node(16, n[1], n[0])).join('') + R.map((n) => node(324, n[1], n[0])).join('') +
          '<path class="pl__strap" d="M200 -4 211 40M240 -4 229 40"/><rect class="pl__clip" x="209" y="36" width="22" height="12" rx="2"/>' +
          '<rect class="pl__card" x="160" y="46" width="120" height="158" rx="14"/>' +
          '<circle class="pl__av" cx="220" cy="88" r="21"/><text class="pl__ini" x="220" y="93" data-ini>JL</text>' +
          '<text class="pl__name" x="220" y="130" data-name>Jordan Lee</text><text class="pl__sub" x="220" y="147" data-sub>Starts Monday</text>' +
          '<g class="pl__pill" data-pill><rect x="170" y="162" width="100" height="26" rx="13"/><text x="220" y="179" data-pill-t>Setting up</text></g>' +
        '</svg>' +
        '<p class="pl__note" data-note></p>',
    });
    const linkEls = f.qa('.pl__link');
    const nodes = f.qa('.pl__node');
    const pill = f.q('[data-pill]');
    const pillT = f.q('[data-pill-t]');
    const note = f.q('[data-note]');
    const order = [0, 3, 1, 4, 2, 5];
    let mode = 'join';
    const set = (i, cls) => { linkEls[i].setAttribute('class', 'pl__link' + (cls ? ' is-' + cls : '')); nodes[i].setAttribute('class', 'pl__node' + (cls ? ' is-' + cls : '')); };
    const who = (ini, name, sub) => { f.q('[data-ini]').textContent = ini; f.q('[data-name]').textContent = name; f.q('[data-sub]').textContent = sub; };
    const pillSet = (text, ok) => { pillT.textContent = text; pill.setAttribute('class', 'pl__pill' + (ok ? ' is-ok' : '')); };

    function play() {
      c.clear();
      note.textContent = '';
      note.classList.remove('is-in');
      if (mode === 'join') {
        who('JL', 'Jordan Lee', 'Starts Monday');
        order.forEach((i) => set(i, ''));
        const end = () => {
          order.forEach((i) => set(i, 'on'));
          pillSet('Ready', true);
          note.textContent = 'Laptop delivered Friday. Jordan just signs in on Monday.';
          note.classList.add('is-in');
          f.status('Ready · Mon 8:58 am', 'ok');
        };
        pillSet('Setting up', false);
        if (still) { end(); return; }
        f.status('Setting up', 'busy');
        order.forEach((i, k) => c.at(400 + k * 380, () => set(i, 'on')));
        c.at(400 + order.length * 380 + 150, end);
      } else {
        who('SP', 'Sam Patel', 'Last day Friday');
        order.forEach((i) => set(i, 'on'));
        const end = () => {
          order.forEach((i) => set(i, 'cut'));
          pillSet('Access closed', true);
          note.textContent = 'Files kept for the team. Laptop wiped for the next person.';
          note.classList.add('is-in');
          f.status('Closed · Fri 5:00 pm', 'ok');
        };
        pillSet('Leaving 5:00 pm', false);
        if (still) { end(); return; }
        f.status('Fri 5:00 pm', 'busy');
        order.forEach((i, k) => c.at(600 + k * 300, () => set(i, 'cut')));
        c.at(600 + order.length * 300 + 150, end);
      }
    }
    seg(f, (m) => { mode = m; play(); });
    f.on('[data-replay]', play);
    play();
  }

  /* ---------- help desk: the printer, fixed in 12 minutes ---------- */
  function helpdesk(root, c, still) {
    const script = [
      ['them', 'Sam · Reception', 'Hi! The front desk printer says it\'s offline, and we have a client waiting.', 'Open'],
      ['us', 'Alex · Lanyard', 'Hi Sam, I\'m on it. Connecting to the printer now.', 'Alex is on it'],
      ['sys', '', 'Alex connected remotely'],
      ['us', 'Alex · Lanyard', 'Found it: it lost its Wi-Fi settings after last night\'s power cut. Fixed! Can you try printing again?', 'Fixing'],
      ['them', 'Sam · Reception', 'It works. Thank you!', ''],
      ['done', '', 'Fixed in 12 minutes'],
    ];
    const f = frame(root, {
      kind: 'chat',
      title: 'Help desk · Ticket #4821',
      body: '<ol class="chat" data-log></ol>',
    });
    const log = f.q('[data-log]');
    const msg = (m) => {
      const li = document.createElement('li');
      li.className = 'msg msg--' + (m[0] === 'done' ? 'sys is-ok' : m[0]);
      li.innerHTML = (m[1] ? '<span class="msg__who">' + m[1] + '</span>' : '') + '<p>' + m[2] + '</p>';
      if (m[0] === 'done') li.innerHTML += '<span class="stars" aria-label="Rated 5 out of 5"><i></i><i></i><i></i><i></i><i></i></span>';
      return li;
    };
    const add = (li) => { log.appendChild(li); log.scrollTop = log.scrollHeight; return li; };
    const stars = (li, now) => li.querySelectorAll('.stars i').forEach((s, i) => (now ? s.classList.add('is-on') : c.at(250 + i * 120, () => s.classList.add('is-on'))));

    function play() {
      c.clear();
      log.textContent = '';
      if (still) { script.forEach((m) => { const li = add(msg(m)); if (m[0] === 'done') stars(li, true); }); f.status('Fixed in 12 min', 'ok'); return; }
      f.status('New request', 'busy');
      let t = 300;
      script.forEach((m) => {
        if (m[0] === 'us' || m[0] === 'them') {
          const typing = t;
          c.at(typing, () => {
            const li = document.createElement('li');
            li.className = 'msg msg--' + m[0] + ' msg--typing';
            li.innerHTML = '<p><i></i><i></i><i></i></p>';
            add(li);
          });
          t += m[0] === 'us' ? 1100 : 800;
        }
        c.at(t, () => {
          const typing = log.querySelector('.msg--typing');
          if (typing) typing.remove();
          const li = add(msg(m));
          if (m[3]) f.status(m[3], 'busy');
          if (m[0] === 'done') { stars(li, false); f.status('Fixed in 12 min', 'ok'); }
        });
        t += m[0] === 'sys' ? 700 : 500;
      });
    }
    f.on('[data-replay]', play);
    play();
  }

  /* ---------- hardware: an office, out of one box ---------- */
  function hardware(root, c, still) {
    const devs = [
      ['Laptop', 76, '<rect class="box__ln" x="-30" y="-26" width="60" height="38" rx="3"/><rect class="box__scr" x="-25" y="-21" width="50" height="28" rx="1.5"/><path class="box__ln" d="M-38 14h76l-6 8h-64z"/>',
        'Laptop: Windows 11, Microsoft 365 and protection already installed, and encrypted. Just sign in.'],
      ['Firewall', 188, '<rect class="box__ln" x="-26" y="-24" width="52" height="44" rx="5"/><path class="box__thin" d="M-26 -9h52M-26 6h52M-10 -24v15M10 -9v15M-2 6v14"/>',
        'Firewall: blocks attacks from the internet, set up with your office\'s rules.'],
      ['Switch', 300, '<rect class="box__ln" x="-34" y="-11" width="68" height="22" rx="3"/><path class="box__ports" d="M-26 -4h6v8h-6zM-16 -4h6v8h-6zM-6 -4h6v8h-6zM4 -4h6v8h-6zM14 -4h6v8h-6z"/>',
        'Switch: connects the office\'s computers, printers and Wi-Fi.'],
      ['Wi-Fi', 412, '<ellipse class="box__ln" cy="8" rx="22" ry="8"/><path class="box__wave" d="M-19 -10a27 27 0 0 1 38 0M-12 -3a17 17 0 0 1 24 0"/>',
        'Wi-Fi: strong signal for your team, and a separate network for guests.'],
      ['Desk phone', 524, '<rect class="box__ln" x="-26" y="-6" width="52" height="28" rx="4"/><path class="box__ln" d="M-28 -10c0-10 56-10 56 0v5h-13v-4h-30v4h-13z"/><path class="box__ports" d="M-14 3h5v3h-5zM-4 3h5v3h-5zM6 3h5v3h-5zM-14 10h5v3h-5zM-4 10h5v3h-5zM6 10h5v3h-5z"/>',
        'Desk phone: your number and extension, ready to ring.'],
    ];
    const f = frame(root, {
      kind: 'box',
      title: 'Office in a box · 5 devices',
      body:
        '<svg class="box" viewBox="28 64 544 232" aria-hidden="true" focusable="false">' +
          '<path class="box__floor" d="M40 288H560"/>' +
          devs.map((d, i) => '<g transform="translate(' + d[1] + ' 104)"><g class="box__dev box__dev--' + (i + 1) + '">' + d[2] +
            '<circle class="box__on" cy="52" r="5"/><text class="box__lbl" y="76">' + d[0] + '</text></g></g>').join('') +
          '<g transform="translate(300 258)">' +
            '<path class="box__flap box__flap--l" d="M-84 -26h84l-5-14h-74z"/><path class="box__flap box__flap--r" d="M84 -26h-84l5-14h74z"/>' +
            '<rect class="box__front" x="-84" y="-26" width="168" height="56" rx="3"/><rect class="box__tape" x="-10" y="-26" width="20" height="24"/>' +
            '<text class="box__stamp" y="18">lanyard_</text>' +
          '</g>' +
        '</svg>' +
        '<div class="box__chips" role="group" aria-label="What\'s inside">' +
          devs.map((d, i) => '<button class="chip" type="button" data-dev="' + i + '" aria-pressed="false">' + d[0] + '</button>').join('') +
        '</div>' +
        '<p class="box__info" data-info aria-live="polite">Tap a device to see how it arrives.</p>',
    });
    const groups = f.qa('.box__dev');
    const chips = f.qa('.chip');
    const info = f.q('[data-info]');

    function pick(i) {
      chips.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      groups.forEach((g, k) => g.classList.toggle('is-pick', k === i));
      f.app.classList.toggle('has-pick', i >= 0);
      info.textContent = i >= 0 ? devs[i][3] : 'Tap a device to see how it arrives.';
    }
    function play() {
      c.clear();
      pick(-1);
      groups.forEach((g) => g.classList.remove('is-on'));
      // pack everything back into the box instantly, then play
      f.app.classList.add('is-reset');
      f.app.classList.remove('is-open', 'is-out', 'is-settled');
      void f.app.getBoundingClientRect();
      f.app.classList.remove('is-reset');
      if (still) {
        f.app.classList.add('is-open', 'is-out', 'is-settled');
        groups.forEach((g) => g.classList.add('is-on'));
        f.status('5 of 5 online', 'ok');
        return;
      }
      f.status('Delivered', 'busy');
      c.at(450, () => { f.app.classList.add('is-open'); f.status('Unboxing', 'busy'); });
      c.at(950, () => f.app.classList.add('is-out'));
      c.at(2100, () => f.app.classList.add('is-settled'));
      groups.forEach((g, i) => c.at(2000 + i * 260, () => {
        g.classList.add('is-on');
        f.status((i + 1) + ' of 5 online', i === 4 ? 'ok' : 'busy');
      }));
    }
    f.on('[data-dev]', (b) => { const i = Number(b.getAttribute('data-dev')); pick(b.getAttribute('aria-pressed') === 'true' ? -1 : i); });
    f.on('[data-replay]', play);
    play();
  }

  /* ---------- security: a hidden threat, found and cleaned ---------- */
  function security(root, c, still) {
    const f = frame(root, {
      kind: 'radar',
      title: 'Threat monitoring · 24 computers',
      replay: 'Scan again',
      body:
        '<div class="radar">' +
          '<canvas class="radar__c" aria-hidden="true"></canvas>' +
          '<ul class="radar__stats">' +
            '<li><b data-k="checked">0</b><span>computers checked</span></li>' +
            '<li class="is-bad"><b data-k="found">0</b><span>threat found</span></li>' +
            '<li class="is-ok"><b data-k="fixed">0</b><span>fixed</span></li>' +
          '</ul>' +
          '<p class="radar__log" data-log></p>' +
        '</div>',
    });
    const cv = f.q('canvas');
    const ctx = cv.getContext('2d');
    const k = (n) => f.q('[data-k="' + n + '"]');
    const logEl = f.q('[data-log]');
    const TAU = Math.PI * 2;
    const PERIOD = 2800;
    const START = -Math.PI / 2;
    const rnd = LY.rng(7);
    const dots = [];
    for (let i = 0; i < 24; i++) dots.push({ a: START + rnd() * TAU, r: 0.22 + rnd() * 0.7, lit: 0, seen: false });
    const target = dots[9];
    target.a = START + 0.62 * TAU;
    target.r = 0.6;
    let size = 0;
    let dpr = 1;
    let state = 'scan';
    let t0 = 0;
    let tFound = 0;
    let lastT = 0;

    function fit() {
      const w = cv.parentElement.clientWidth;
      if (!w) return;
      size = Math.round(Math.max(170, Math.min(240, w)));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = size * dpr;
      cv.height = size * dpr;
      cv.style.width = size + 'px';
      cv.style.height = size + 'px';
      draw(lastT);
    }
    const norm = (a) => ((a % TAU) + TAU) % TAU;

    function draw(t) {
      if (!size) return;
      lastT = t;
      const R = size / 2 - 4;
      const sweep = START + (t / PERIOD) * TAU;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      bg.addColorStop(0, '#f7f8ff');
      bg.addColorStop(1, '#e8ebff');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(31,43,255,.14)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(0, 0, (R * i) / 4, 0, TAU); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0); ctx.moveTo(0, -R); ctx.lineTo(0, R); ctx.stroke();
      if (state !== 'still') {
        for (let i = 0; i < 26; i++) {
          const a0 = sweep - (i + 1) * 0.032;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a0 + 0.034); ctx.closePath();
          ctx.fillStyle = 'rgba(31,43,255,' + (0.2 * (1 - i / 26)).toFixed(3) + ')';
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(31,43,255,.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(sweep) * R, Math.sin(sweep) * R); ctx.stroke();
      }
      dots.forEach((d) => {
        if (state !== 'still' && norm(sweep - d.a) < 0.09) d.lit = 1;
        d.lit = Math.max(0, d.lit * 0.97);
        const x = Math.cos(d.a) * d.r * R;
        const y = Math.sin(d.a) * d.r * R;
        let col;
        if (d === target && (state === 'found' || state === 'isolated')) col = '#e5384f';
        else if (d.seen || state === 'still') col = 'rgba(15,157,85,' + (0.55 + d.lit * 0.45).toFixed(2) + ')';
        else col = 'rgba(71,77,110,' + (0.3 + d.lit * 0.5).toFixed(2) + ')';
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, y, d === target ? 4.5 : 3.2, 0, TAU); ctx.fill();
      });
      if (state !== 'scan') {
        const tx = Math.cos(target.a) * target.r * R;
        const ty = Math.sin(target.a) * target.r * R;
        const red = state === 'found' || state === 'isolated';
        ctx.strokeStyle = red ? '#e5384f' : '#0f9d55';
        ctx.lineWidth = 1.6;
        const s = 12;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.moveTo(tx + sx * s, ty + sy * (s - 5));
          ctx.lineTo(tx + sx * s, ty + sy * s);
          ctx.lineTo(tx + sx * (s - 5), ty + sy * s);
          ctx.stroke();
        });
        if (state === 'isolated') {
          ctx.setLineDash([3, 4]);
          ctx.lineDashOffset = -t / 40;
          ctx.beginPath(); ctx.arc(tx, ty, 21, 0, TAU); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = red ? '#c41f2d' : '#0b6b3b';
        ctx.font = '600 11px "Instrument Sans", system-ui, sans-serif';
        ctx.textAlign = tx > 0 ? 'right' : 'left';
        ctx.fillText(red ? 'Reception laptop' : 'Reception laptop ✓', tx + (tx > 0 ? -18 : 18), ty - 15);
      }
      ctx.restore();
    }

    function finish() {
      state = 'still';
      dots.forEach((d) => { d.seen = true; d.lit = 0; });
      k('checked').textContent = '24';
      k('found').textContent = '1';
      k('fixed').textContent = '1';
      logEl.textContent = 'Reception laptop cleaned and back online';
      f.status('All clear', 'ok');
      draw(0);
    }
    function play() {
      c.clear();
      dots.forEach((d) => { d.seen = false; d.counted = false; d.lit = 0; });
      ['checked', 'found', 'fixed'].forEach((n) => { k(n).textContent = '0'; });
      if (still) { finish(); return; }
      state = 'scan';
      logEl.textContent = 'Checking every computer for unusual behaviour';
      f.status('Scanning', 'busy');
      t0 = performance.now();
      let checked = 0;
      c.loop((now) => {
        const t = now - t0;
        const sweep = START + (t / PERIOD) * TAU;
        if (t < PERIOD) {
          dots.forEach((d) => {
            if (!d.counted && norm(sweep - d.a) < 0.09) {
              d.counted = true;
              d.seen = d !== target;
              checked += 1;
              k('checked').textContent = String(checked);
            }
          });
        } else if (checked < 24) {
          checked = 24;
          k('checked').textContent = '24';
          dots.forEach((d) => { d.counted = true; if (d !== target) d.seen = true; });
        }
        if (state === 'scan' && norm(sweep - target.a) < 0.09 && t > 200) {
          state = 'found';
          tFound = t;
          k('found').textContent = '1';
          logEl.textContent = 'Hidden threat found on the reception laptop';
          f.status('Threat found', 'bad');
        } else if (state === 'found' && t - tFound > 1000) {
          state = 'isolated';
          logEl.textContent = 'Laptop cut off from the network while we clean it';
          f.status('Isolated', 'busy');
        } else if (state === 'isolated' && t - tFound > 2800) {
          state = 'clean';
          target.seen = true;
          k('fixed').textContent = '1';
          logEl.textContent = 'Cleaned and back online. Nothing else affected.';
          f.status('All clear', 'ok');
        }
        draw(t);
      });
    }
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(fit);
      ro.observe(cv.parentElement);
      c.onEnd(() => ro.disconnect());
    } else {
      c.at(30, fit);
    }
    f.on('[data-replay]', play);
    play();
  }

  const defs = { computers, email, network, m365, backups, phones, people, helpdesk, hardware, security };

  LY.demos = {
    // Build the named demo inside el and start it. Returns { stop }.
    mount(el, name) {
      const make = defs[name];
      if (!el || !make) return null;
      const c = clock();
      el.textContent = '';
      try {
        make(el, c, LY.reduced());
      } catch (err) {
        c.end();
        console.warn('[lanyard] demo ' + name + ' failed:', err);
        return null;
      }
      return { stop: () => c.end() };
    },
  };
})();
