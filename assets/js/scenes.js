/* The ten scenes of "the day". Each one shows a service working instead of
   describing it. Every scene has reset() (back to its "before" state, done
   off-screen) and play() (runs the animation). Without JavaScript, or with
   reduced motion, each scene simply shows its finished state. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  /* ---------- helpers ---------- */
  const timers = new WeakMap();
  function later(v, ms, fn) {
    const list = timers.get(v) || [];
    list.push(setTimeout(fn, ms));
    timers.set(v, list);
  }
  function clearLater(v) {
    (timers.get(v) || []).forEach(clearTimeout);
    timers.set(v, []);
  }
  function status(v, text, kind) {
    const s = v.querySelector('[data-st]');
    if (!s) return;
    s.textContent = text;
    s.classList.toggle('is-busy', kind === 'busy');
    s.classList.toggle('viz__st--bad', kind === 'bad');
  }
  const reflow = (el) => void el.getBoundingClientRect();
  const all = (v, s) => Array.from(v.querySelectorAll(s));

  /* ---------- 08:00 office in a box ---------- */
  const office = {
    reset(v) { clearLater(v); v.classList.add('is-start', 'is-pre'); status(v, 'shipped', 'busy'); },
    play(v) {
      office.reset(v);
      reflow(v);
      later(v, 60, () => { v.classList.remove('is-start'); status(v, 'unboxing', 'busy'); });
      later(v, 1500, () => { v.classList.remove('is-pre'); status(v, 'online 5/5'); });
    },
  };

  /* ---------- 09:00 first login / 17:00 last logoff ---------- */
  function graph(mode) {
    const on = mode === 'join' ? 'on' : 'off';
    return {
      reset(v) {
        clearLater(v);
        v.classList.add('is-start');
        all(v, '.g-link, .g-node').forEach((n) => n.classList.remove(on));
        status(v, mode === 'join' ? 'provisioning' : 'active', 'busy');
      },
      play(v) {
        this.reset(v);
        const links = all(v, '.g-link');
        const nodes = all(v, '.g-node');
        if (mode === 'leave') later(v, 150, () => status(v, '17:00:00 · closing', 'busy'));
        nodes.forEach((n, i) => later(v, 350 + i * 340, () => { links[i].classList.add(on); n.classList.add(on); }));
        later(v, 350 + nodes.length * 340 + 120, () => {
          v.classList.remove('is-start');
          if (mode === 'join') status(v, 'ready 08:58');
          else status(v, 'revoked 17:00:00', 'bad');
        });
      },
    };
  }

  /* ---------- 10:00 patches, in rings ---------- */
  const patch = {
    tiles: null,
    rings: null,
    build(v) {
      const grid = v.querySelector('[data-pf-grid]');
      const rnd = LY.rng(2026);
      const YOU = 27;
      grid.innerHTML = '';
      this.tiles = [];
      for (let i = 0; i < 64; i++) {
        const t = document.createElement('i');
        if (i === YOU) t.className = 'you';
        grid.appendChild(t);
        this.tiles.push(t);
      }
      const managed = this.tiles.filter((t, i) => i !== YOU);
      const shuffled = managed.slice().sort(() => rnd() - 0.5);
      // broad ring rolls out as a left-to-right wave, pilots and early adopters are scattered
      const pilots = shuffled.slice(0, 4);
      const early = shuffled.slice(4, 16);
      const broad = managed.filter((t) => !pilots.includes(t) && !early.includes(t));
      this.rings = [pilots, early, broad];
      LY.device.full().then((d) => {
        const you = v.querySelector('[data-pf-you]');
        if (!you) return;
        if (d.os.name === 'Windows' && d.os.certain && d.os.version === '10') {
          you.innerHTML = '<i aria-hidden="true"></i>yellow = your PC · Windows 10 · out of support since Oct 2025';
          you.classList.add('is-warn');
        }
      }).catch(() => {});
    },
    reset(v) {
      clearLater(v);
      if (!this.tiles) this.build(v);
      this.rings.flat().forEach((t) => { t.className = 'pend'; });
      this.rings.forEach((r, i) => this.bar(v, i, 0, r.length));
      status(v, 'update released', 'busy');
    },
    bar(v, i, n, total) {
      v.querySelector('[data-pf-bar="' + i + '"]').style.width = (total ? (n / total) * 100 : 0) + '%';
      v.querySelector('[data-pf-n="' + i + '"]').textContent = n + '/' + total;
    },
    play(v) {
      this.reset(v);
      let start = 400;
      const gap = [150, 70, 22];
      const install = [650, 520, 420];
      this.rings.forEach((ring, r) => {
        let done = 0;
        later(v, start, () => status(v, 'ring ' + r + (r === 0 ? ' · pilot' : r === 1 ? ' · early' : ' · broad'), 'busy'));
        ring.forEach((t, k) => {
          later(v, start + k * gap[r], () => { t.className = 'run'; });
          later(v, start + k * gap[r] + install[r], () => {
            t.className = '';
            done += 1;
            this.bar(v, r, done, ring.length);
          });
        });
        start += ring.length * gap[r] + install[r] + 300;
      });
      later(v, start, () => status(v, '63/63 patched'));
    },
  };

  /* ---------- 11:12 phishing, quarantined ---------- */
  const phish = {
    reset(v) {
      clearLater(v);
      const rows = all(v, '.mail');
      rows.slice(2).forEach((r) => r.classList.add('pre'));
      rows[2].classList.add('is-clean');
      rows[2].classList.remove('is-flag');
      v.querySelector('[data-q]').textContent = '0';
      status(v, 'scanning', 'busy');
    },
    play(v) {
      this.reset(v);
      const rows = all(v, '.mail');
      const q = v.querySelector('[data-q]');
      later(v, 350, () => rows[2].classList.remove('pre'));
      later(v, 1150, () => {
        rows[2].classList.remove('is-clean');
        rows[2].classList.add('is-flag');
        q.textContent = '1';
        q.classList.remove('pop');
        reflow(q);
        q.classList.add('pop');
        status(v, '1 quarantined', 'bad');
      });
      later(v, 1800, () => rows[3].classList.remove('pre'));
      later(v, 2400, () => rows[4].classList.remove('pre'));
    },
  };

  /* ---------- 12:30 threat hunted (canvas radar) ---------- */
  const hunt = {
    c: null, ctx: null, raf: 0, t0: 0, size: 0, dpr: 1, dots: null, state: 'idle',
    setup(v) {
      this.c = v.querySelector('[data-radar]');
      this.ctx = this.c.getContext('2d');
      const rnd = LY.rng(7);
      this.dots = [];
      for (let i = 0; i < 14; i++) {
        this.dots.push({ a: rnd() * Math.PI * 2, r: 0.22 + rnd() * 0.68, lit: 0 });
      }
      this.target = this.dots[5];
      this.target.a = 5.2;
      this.target.r = 0.62;
      const fit = () => {
        const w = this.c.parentElement.clientWidth;
        const size = Math.max(160, Math.min(w - 140, 340));
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.size = size;
        this.c.width = size * this.dpr;
        this.c.height = size * this.dpr;
        this.c.style.width = size + 'px';
        this.c.style.height = size + 'px';
        this.draw(this.t || 0);
      };
      if ('ResizeObserver' in window) new ResizeObserver(fit).observe(this.c.parentElement);
      fit();
    },
    draw(t) {
      const { ctx, size, dpr } = this;
      if (!ctx || !size) return;
      this.t = t;
      const R = size / 2 - 6;
      const sweep = (t / 2600) * Math.PI * 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.strokeStyle = 'rgba(95,243,255,.18)';
      ctx.lineWidth = 1;
      for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(0, 0, (R * k) / 4, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0); ctx.moveTo(0, -R); ctx.lineTo(0, R); ctx.stroke();
      if (this.state !== 'static') {
        for (let k = 0; k < 28; k++) {
          const a0 = sweep - (k + 1) * 0.03;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a0 + 0.031); ctx.closePath();
          ctx.fillStyle = 'rgba(95,243,255,' + (0.22 * (1 - k / 28)).toFixed(3) + ')';
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(95,243,255,.9)';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(sweep) * R, Math.sin(sweep) * R); ctx.stroke();
      }
      const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      this.dots.forEach((d) => {
        const diff = norm(sweep - d.a);
        if (diff < 0.08) d.lit = 1;
        d.lit = Math.max(0.25, d.lit * 0.985);
        const x = Math.cos(d.a) * d.r * R;
        const y = Math.sin(d.a) * d.r * R;
        let col = 'rgba(95,243,255,' + d.lit.toFixed(2) + ')';
        if (d === this.target) {
          if (this.state === 'found' || this.state === 'isolated') col = '#ff6672';
          if (this.state === 'clean' || this.state === 'static') col = '#3ee08a';
        }
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, y, d === this.target ? 4.5 : 3, 0, Math.PI * 2); ctx.fill();
      });
      const tg = this.target;
      const tx = Math.cos(tg.a) * tg.r * R;
      const ty = Math.sin(tg.a) * tg.r * R;
      if (this.state === 'found' || this.state === 'isolated' || this.state === 'clean' || this.state === 'static') {
        const red = this.state === 'found' || this.state === 'isolated';
        ctx.strokeStyle = red ? '#ff6672' : '#3ee08a';
        ctx.lineWidth = 1.5;
        const s = 13;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.moveTo(tx + sx * s, ty + sy * (s - 5));
          ctx.lineTo(tx + sx * s, ty + sy * s);
          ctx.lineTo(tx + sx * (s - 5), ty + sy * s);
          ctx.stroke();
        });
        if (this.state === 'isolated') {
          ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.arc(tx, ty, 22 + Math.sin(t / 120) * 2, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = red ? '#ff9aa2' : '#3ee08a';
        ctx.font = '600 10px "Martian Mono", ui-monospace, monospace';
        ctx.textAlign = tx > 0 ? 'right' : 'left';
        ctx.fillText(red ? 'LY-LT-019' : 'LY-LT-019 ✓', tx + (tx > 0 ? -20 : 20), ty - 16);
      }
      ctx.restore();
    },
    loop(v) {
      const step = (now) => {
        this.raf = requestAnimationFrame(step);
        const t = now - this.t0;
        const found = v.querySelector('[data-hunt-found]');
        const fixed = v.querySelector('[data-hunt-fixed]');
        if (this.state === 'sweeping' && t > 1500) {
          const norm = ((t / 2600) * Math.PI * 2 - this.target.a) % (Math.PI * 2);
          if (norm >= 0 && norm < 0.12) { this.state = 'found'; this.tFound = t; found.textContent = '1'; status(v, 'threat found', 'bad'); }
        } else if (this.state === 'found' && t - this.tFound > 900) {
          this.state = 'isolated'; status(v, 'isolated', 'busy');
        } else if (this.state === 'isolated' && t - this.tFound > 2300) {
          this.state = 'clean'; fixed.textContent = '1'; status(v, 'clean');
        }
        this.draw(t);
      };
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(step);
    },
    reset(v) {
      if (!this.c) this.setup(v);
      cancelAnimationFrame(this.raf);
      this.state = 'sweeping';
      v.querySelector('[data-hunt-found]').textContent = '0';
      v.querySelector('[data-hunt-fixed]').textContent = '0';
      status(v, 'sweeping', 'busy');
      this.draw(0);
    },
    play(v) {
      this.reset(v);
      this.t0 = performance.now();
      this.loop(v);
    },
    still(v) {
      if (!this.c) this.setup(v);
      this.state = 'static';
      this.draw(0);
    },
    stop() { cancelAnimationFrame(this.raf); },
  };

  /* ---------- 13:05 fixed in 12 minutes ---------- */
  const desk = {
    reset(v) {
      clearLater(v);
      cancelAnimationFrame(v._raf);
      v.classList.add('is-start');
      all(v, '.tk__step, .tk__stars i').forEach((n) => n.classList.remove('on'));
      v.querySelector('[data-timer]').textContent = '00:00';
      status(v, 'new', 'busy');
    },
    play(v) {
      this.reset(v);
      const steps = all(v, '.tk__step');
      const stars = all(v, '.tk__stars i');
      const timer = v.querySelector('[data-timer]');
      const total = 12 * 60 + 4;
      const dur = 2600;
      const t0 = performance.now();
      steps[0].classList.add('on');
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const s = Math.round(total * p);
        timer.textContent = LY.pad(Math.floor(s / 60)) + ':' + LY.pad(s % 60);
        if (p < 1) v._raf = requestAnimationFrame(tick);
      };
      v._raf = requestAnimationFrame(tick);
      later(v, 500, () => { steps[1].classList.add('on'); status(v, 'assigned', 'busy'); });
      later(v, 1200, () => { steps[2].classList.add('on'); status(v, 'fixing', 'busy'); });
      later(v, dur, () => { steps[3].classList.add('on'); v.classList.remove('is-start'); status(v, 'resolved'); });
      stars.forEach((s, i) => later(v, dur + 250 + i * 130, () => s.classList.add('on')));
    },
  };

  /* ---------- 14:00 backups, tested ---------- */
  const backup = {
    built: false,
    build(v) {
      const g = v.querySelector('[data-k-bars]');
      const rnd = LY.rng(14);
      let html = '';
      for (let i = 0; i < 25; i++) {
        const h = 26 + Math.round(rnd() * 46);
        const x = 40 + i * 21.25;
        html += '<rect' + (i === 3 ? ' class="sel"' : '') + ' x="' + x.toFixed(1) + '" y="' + (236 - h) + '" width="12" height="' + h + '" rx="2"/>';
      }
      g.innerHTML = html;
      this.built = true;
    },
    reset(v) {
      clearLater(v);
      if (!this.built) this.build(v);
      v.classList.remove('s1');
      v.classList.add('s0');
      status(v, 'deleted 13:58', 'bad');
    },
    play(v) {
      this.reset(v);
      reflow(v);
      later(v, 350, () => { v.classList.replace('s0', 's1'); status(v, 'seeking', 'busy'); });
      later(v, 1900, () => { v.classList.remove('s1'); status(v, 'restored · 2m 11s'); });
    },
  };

  /* ---------- 15:30 network, locked down ---------- */
  const net = {
    raf: 0, packets: [], last: 0, nextGood: 0, nextBad: 0, dropped: 200,
    reset(v) {
      clearLater(v);
      cancelAnimationFrame(this.raf);
      v.classList.add('is-start');
      const g = v.querySelector('[data-packets]');
      g.innerHTML = '';
      this.packets = [];
      this.dropped = 200;
      v.querySelector('[data-dropped]').textContent = this.dropped;
      status(v, 'monitoring', 'busy');
    },
    play(v) {
      this.reset(v);
      const svg = v.querySelector('svg');
      const g = v.querySelector('[data-packets]');
      const P = (id) => svg.querySelector('#' + id);
      const p0 = P('n-p0'), p1 = P('n-p1');
      const leaves = [P('n-p2'), P('n-p3'), P('n-p4')];
      const NS = 'http://www.w3.org/2000/svg';
      const spawn = (bad) => {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('r', bad ? 4 : 3.5);
        c.setAttribute('class', bad ? 'pk pk--bad' : 'pk');
        g.appendChild(c);
        const ap3 = !v.classList.contains('is-start');
        const route = bad ? [p0] : [p0, p1, leaves[Math.floor(Math.random() * (ap3 ? 3 : 2))]];
        this.packets.push({ c, route, seg: 0, d: 0, bad, speed: bad ? 120 : 170 });
      };
      const burst = (x, y) => {
        const b = document.createElementNS(NS, 'circle');
        b.setAttribute('class', 'burst');
        b.setAttribute('cx', x);
        b.setAttribute('cy', y);
        b.setAttribute('r', 4);
        g.appendChild(b);
        setTimeout(() => b.remove(), 600);
        this.dropped += 1;
        v.querySelector('[data-dropped]').textContent = this.dropped;
      };
      this.last = performance.now();
      this.nextGood = 0;
      this.nextBad = 500;
      let clock = 0;
      const step = (now) => {
        this.raf = requestAnimationFrame(step);
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        clock += dt * 1000;
        if (clock > this.nextGood) { spawn(false); this.nextGood = clock + 240; }
        if (clock > this.nextBad) { spawn(true); this.nextBad = clock + 650 + Math.random() * 500; }
        this.packets = this.packets.filter((pk) => {
          pk.d += pk.speed * dt;
          let path = pk.route[pk.seg];
          let len = path.getTotalLength();
          while (pk.d > len) {
            pk.d -= len;
            pk.seg += 1;
            if (pk.seg >= pk.route.length) {
              if (pk.bad) { const e = path.getPointAtLength(len); burst(e.x, e.y); }
              pk.c.remove();
              return false;
            }
            path = pk.route[pk.seg];
            len = path.getTotalLength();
          }
          const pt = path.getPointAtLength(pk.d);
          pk.c.setAttribute('cx', pt.x.toFixed(1));
          pk.c.setAttribute('cy', pt.y.toFixed(1));
          return true;
        });
      };
      this.raf = requestAnimationFrame(step);
      later(v, 1800, () => { v.classList.remove('is-start'); status(v, '3 aps online'); });
    },
    stop() { cancelAnimationFrame(this.raf); },
  };

  /* ---------- 16:10 calls, routed ---------- */
  const phone = {
    reset(v) {
      clearLater(v);
      v.classList.remove('s1', 's2');
      v.classList.add('s0');
      status(v, 'incoming call', 'busy');
    },
    play(v) {
      this.reset(v);
      reflow(v);
      later(v, 1000, () => { v.classList.replace('s0', 's1'); status(v, 'menu', 'busy'); });
      later(v, 1900, () => { v.classList.replace('s1', 's2'); status(v, 'routing → 201', 'busy'); });
      later(v, 2700, () => { v.classList.remove('s2'); status(v, 'connected 00:03'); });
    },
  };

  LY.scenes = {
    office,
    onboard: graph('join'),
    patch,
    phish,
    hunt,
    desk,
    backup,
    net,
    phone,
    offboard: graph('leave'),
  };

  // Finished state for reduced motion (and anything that needs a frame drawn)
  LY.scenes.prepare = function (name, v) {
    if (name === 'patch') { patch.build(v); }
    if (name === 'backup') { backup.build(v); }
    if (name === 'hunt') { hunt.still(v); }
  };
  LY.scenes.stop = function (name) {
    if (name === 'hunt') hunt.stop();
    if (name === 'net') net.stop();
  };
})();
