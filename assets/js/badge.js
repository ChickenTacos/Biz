/* The founder's badge, hanging from a simulated lanyard.
   Verlet integration: the strap is a chain of points with distance
   constraints, pinned at the top; the card hangs from its last point and gets
   its angle from a second point below it. Drag it, throw it, let it swing.
   Also renders a real (scannable) Code 39 barcode for the badge ID. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  // Code 39: 9 elements per character (bar, space, bar ...), 3 of them wide
  const C39 = {
    '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
    '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
    'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw', 'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw', 'E': 'wnnnwwnnn',
    'F': 'nnwnwwnnn', 'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn', 'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn',
    'K': 'wnnnnnnww', 'L': 'nnwnnnnww', 'M': 'wnwnnnnwn', 'N': 'nnnnwnnww', 'O': 'wnnnwnnwn',
    'P': 'nnwnwnnwn', 'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn', 'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn',
    'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw', 'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw', 'Y': 'wwnnwnnnn',
    'Z': 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
  };

  LY.barcode = function (svg) {
    const value = (svg.getAttribute('data-barcode') || '').toUpperCase();
    const text = '*' + value.split('').filter((c) => C39[c]).join('') + '*';
    const N = 1, W = 2.6;
    let x = 10; // quiet zone
    let rects = '';
    for (let i = 0; i < text.length; i++) {
      const pat = C39[text[i]];
      for (let j = 0; j < 9; j++) {
        const w = pat[j] === 'w' ? W : N;
        if (j % 2 === 0) rects += '<rect x="' + x.toFixed(2) + '" y="0" width="' + w + '" height="40"/>';
        x += w;
      }
      x += N; // inter-character gap
    }
    x += 9;
    svg.setAttribute('viewBox', '0 0 ' + x.toFixed(2) + ' 40');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = rects;
  };

  LY.badge = function (stage) {
    const svg = stage.querySelector('[data-badge-strap]');
    const path = svg && svg.querySelector('path');
    const card = stage.querySelector('[data-badge]');
    if (!svg || !path || !card) return null;
    const reduced = LY.reduced();
    const N = 14;
    const pts = [];
    let bottom = null;
    let W = 0, H = 0, cardW = 0, cardH = 0, seg = 0, hang = 0;
    let raf = 0, running = false, inView = false, last = 0, acc = 0, quiet = 0;
    let drag = null;
    const anchor = { x: 0, y: -240 };

    function P(x, y) { return { x, y, px: x, py: y }; }

    function setup() {
      W = stage.clientWidth;
      H = stage.clientHeight;
      cardW = card.offsetWidth;
      cardH = card.offsetHeight;
      anchor.x = W / 2;
      const rope = Math.max(90, H - cardH - 56) - anchor.y;
      seg = rope / (N - 1);
      hang = cardH * 0.86;
      pts.length = 0;
      for (let i = 0; i < N; i++) pts.push(P(anchor.x, anchor.y + i * seg));
      const end = pts[N - 1];
      bottom = P(end.x, end.y + hang);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    }

    function constrain(a, b, len, wa, wb) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const diff = (d - len) / d;
      a.x += dx * diff * wa; a.y += dy * diff * wa;
      b.x -= dx * diff * wb; b.y -= dy * diff * wb;
    }

    function step(dt) {
      const g = 2600 * dt * dt;
      const damp = 0.985;
      const all = pts.concat([bottom]);
      for (let i = 1; i < all.length; i++) {
        const p = all[i];
        const vx = (p.x - p.px) * damp;
        const vy = (p.y - p.py) * damp;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + g;
      }
      for (let k = 0; k < 16; k++) {
        pts[0].x = anchor.x; pts[0].y = anchor.y;
        for (let i = 0; i < N - 1; i++) constrain(pts[i], pts[i + 1], seg, i === 0 ? 0 : 0.5, i === 0 ? 1 : 0.5);
        constrain(pts[N - 1], bottom, hang, 0.5, 0.5);
        if (drag) { pts[N - 1].x = drag.x; pts[N - 1].y = drag.y; }
        // keep the card inside the stage
        const m = Math.min(cardW * 0.5 + 6, W / 2);
        for (const p of [pts[N - 1], bottom]) {
          p.x = LY.clamp(p.x, m, W - m);
          p.y = LY.clamp(p.y, 0, H - 8);
        }
      }
    }

    function draw() {
      let d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
      for (let i = 1; i < N - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        d += ' Q' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' ' + ((a.x + b.x) / 2).toFixed(1) + ' ' + ((a.y + b.y) / 2).toFixed(1);
      }
      const end = pts[N - 1];
      d += ' L' + end.x.toFixed(1) + ' ' + (end.y + 8).toFixed(1);
      path.setAttribute('d', d);
      const ang = Math.atan2(bottom.x - end.x, bottom.y - end.y);
      card.style.transform = 'translate(' + (end.x - cardW / 2).toFixed(1) + 'px,' + (end.y - 16).toFixed(1) + 'px) rotate(' + (-ang).toFixed(4) + 'rad)';
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      acc += dt;
      const h = 1 / 120;
      let n = 0;
      while (acc >= h && n < 8) { step(h); acc -= h; n++; }
      draw();
      // go to sleep once the badge has come to rest; any touch wakes it
      const end = pts[N - 1];
      const speed = Math.abs(bottom.x - bottom.px) + Math.abs(bottom.y - bottom.py) + Math.abs(end.x - end.px) + Math.abs(end.y - end.py);
      quiet = !drag && speed < 0.06 ? quiet + 1 : 0;
      if (quiet > 60) stop();
    }
    function start() {
      if (running || reduced || !inView || document.hidden) return;
      running = true;
      quiet = 0;
      last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    function local(e) {
      const r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    card.addEventListener('pointerdown', (e) => {
      if (reduced) return;
      const p = local(e);
      const end = pts[N - 1];
      drag = { ox: p.x - end.x, oy: p.y - end.y, x: end.x, y: end.y };
      card.setPointerCapture(e.pointerId);
      stage.classList.add('is-dragging');
      start();
    });
    card.addEventListener('pointermove', (e) => {
      if (!drag) {
        // a gentle nudge when the pointer brushes past
        if (!reduced && e.pointerType === 'mouse' && bottom && e.movementX) { bottom.px -= e.movementX * 0.35; start(); }
        return;
      }
      const p = local(e);
      drag.x = p.x - drag.ox;
      drag.y = p.y - drag.oy;
    });
    const release = () => {
      if (!drag) return;
      drag = null;
      stage.classList.remove('is-dragging');
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
    card.addEventListener('lostpointercapture', release);

    setup();
    if (reduced) {
      stage.classList.add('is-static');
      for (let i = 0; i < 80; i++) step(1 / 60);
      draw();
    } else {
      // start slightly to one side so it swings in
      bottom.x += 120; bottom.px += 120;
      for (let i = 0; i < N; i++) { pts[i].x += i * 6; pts[i].px += i * 6; }
      draw();
    }
    LY.watchVisible(stage, (v) => { inView = v; if (v) start(); else stop(); }, '80px');
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    let t = 0;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => { setup(); draw(); start(); }, 150);
    });
    return { start, stop };
  };
})();
