/* Fleet demo: 63 simulated managed devices plus the visitor's real one.
   "Push update" rolls a patch out in rings (pilot → early → broad).
   "Fix issues" remediates drift, including an in-place Windows 10 → 11 upgrade.
   Also fills the "your device" panel from LY.device. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  const OS = {
    w11: { code: 'W11', label: 'Windows 11 25H2', enc: 'BitLocker' },
    w11b: { code: 'W11', label: 'Windows 11 24H2', enc: 'BitLocker' },
    w10: { code: 'W10', label: 'Windows 10 22H2', enc: 'BitLocker', eos: true },
    mac: { code: 'MAC', label: 'macOS 26', enc: 'FileVault' },
    ios: { code: 'iOS', label: 'iOS 26', enc: 'Data Protection' },
    and: { code: 'AND', label: 'Android 16', enc: 'File-based encryption' },
  };
  const ROLES = ['reception', 'sales', 'accounts', 'ops', 'design', 'warehouse', 'admin', 'field', 'hr', 'exec', 'support', 'eng'];
  const STATE_LABEL = { ok: 'compliant', pend: 'update pending', run: 'installing', bad: 'needs attention', off: 'offline', you: 'not enrolled' };

  function build() {
    const rnd = LY.rng(1042);
    const kinds = [];
    const push = (k, n) => { for (let i = 0; i < n; i++) kinds.push(k); };
    push('w11', 20); push('w11b', 10); push('w10', 3); push('mac', 12); push('ios', 12); push('and', 6);
    for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
    const counters = {};
    const devs = kinds.map((k, i) => {
      const isDesk = (k === 'w11' || k === 'w11b' || k === 'w10') && rnd() < 0.3;
      const prefix = k === 'mac' ? 'MB' : k === 'ios' ? 'IP' : k === 'and' ? 'AN' : isDesk ? 'DT' : 'LT';
      counters[prefix] = (counters[prefix] || 0) + 1;
      const role = ROLES[Math.floor(rnd() * ROLES.length)];
      return {
        i,
        kind: k,
        os: OS[k],
        host: 'LY-' + prefix + '-' + LY.pad(counters[prefix] * 3 + Math.floor(rnd() * 3), 3),
        type: k === 'ios' || k === 'and' ? 'phone' : k === 'mac' ? 'laptop' : isDesk ? 'desktop' : 'laptop',
        owner: role + '-' + LY.pad(1 + Math.floor(rnd() * 6)),
        seen: 1 + Math.floor(rnd() * 55) + ' min ago',
        enc: true,
        ring: 2,
        s: 'ok',
        issue: '',
      };
    });
    // update rings: 4 pilot devices, 12 early, the rest broad
    const order = devs.map((d) => d.i);
    order.slice(0, 4).forEach((i) => { devs[i].ring = 0; devs[i].owner = 'it-pilot-' + LY.pad(i % 9 + 1); });
    order.slice(4, 16).forEach((i) => { devs[i].ring = 1; });
    // drift
    devs.forEach((d) => { if (d.kind === 'w10') { d.s = 'bad'; d.issue = 'Windows 10 is out of support'; } });
    const pick = (pred) => devs.find((d) => d.s === 'ok' && pred(d));
    let d = pick((x) => x.kind === 'w11'); if (d) { d.s = 'bad'; d.issue = 'Firewall turned off'; }
    d = pick((x) => x.kind === 'mac'); if (d) { d.s = 'bad'; d.enc = false; d.issue = 'Disk encryption suspended'; }
    [0, 1, 2, 3].forEach(() => { const x = devs[Math.floor(rnd() * devs.length)]; if (x.s === 'ok') { x.s = 'pend'; x.issue = 'Security update waiting for restart'; } });
    [0, 1].forEach((n) => { const x = devs.find((y, idx) => y.s === 'ok' && idx > 20 + n * 17); if (x) { x.s = 'off'; x.seen = n ? '3 days ago' : '9 days ago'; x.issue = 'Not checked in recently'; } });
    // the visitor's device goes near the middle
    const you = { i: 27, you: true, host: 'YOUR-DEVICE', type: 'this one', owner: 'you', s: 'you', ring: '-', enc: null, os: { code: '???', label: 'detecting…' }, seen: 'now', issue: 'Not enrolled in any management' };
    devs.splice(27, 0, you);
    devs.forEach((x, idx) => { x.i = idx; });
    return devs;
  }

  LY.fleet = (function () {
    let grid, inspect, kpis, rings, devs, cells = [], active = -1, busy = false, buttons, device;

    function cellLabel(d) {
      return d.host + ', ' + d.os.label + ', ' + STATE_LABEL[d.s];
    }

    function paint(d) {
      const c = cells[d.i];
      c.setAttribute('data-s', d.s);
      c.querySelector('.cell__os').textContent = d.os.code;
      c.setAttribute('aria-label', cellLabel(d));
    }

    function renderGrid() {
      grid.innerHTML = '';
      cells = devs.map((d) => {
        const c = document.createElement('div');
        c.className = 'cell';
        c.id = 'dev-' + d.i;
        c.setAttribute('role', 'option');
        c.setAttribute('aria-selected', 'false');
        c.innerHTML = '<span class="cell__os"></span><span class="cell__n">' + (d.you ? 'you' : d.host.slice(-3)) + '</span><span class="cell__fill"></span>';
        c.addEventListener('mouseenter', () => select(d.i));
        c.addEventListener('click', () => select(d.i));
        grid.appendChild(c);
        return c;
      });
      devs.forEach(paint);
    }

    function managed() { return devs.filter((d) => !d.you); }

    function updateKpis() {
      const m = managed();
      const n = m.length;
      const ok = m.filter((d) => d.s === 'ok').length;
      const enc = m.filter((d) => d.enc).length;
      const upd = m.filter((d) => d.s !== 'pend' && d.s !== 'run' && !(d.os.eos) && d.s !== 'off').length;
      const bad = m.filter((d) => d.s === 'bad').length;
      const set = (k, v, of) => { const el = kpis.querySelector('[data-kpi="' + k + '"]'); el.innerHTML = v + (of ? '<small>/' + of + '</small>' : ''); };
      set('ok', Math.round((ok / n) * 100) + '%', '');
      set('enc', enc, n);
      set('upd', upd, n);
      set('bad', bad, '');
    }

    function ringBar(r, done, total) {
      const bar = rings.querySelector('[data-ring="' + r + '"]');
      bar.style.width = (total ? (done / total) * 100 : 0) + '%';
      bar.classList.toggle('is-done', total > 0 && done === total);
      rings.querySelector('[data-ring-count="' + r + '"]').textContent = done + '/' + total;
    }
    function resetRings() {
      [0, 1, 2].forEach((r) => {
        const total = managed().filter((d) => d.ring === r).length;
        ringBar(r, 0, total);
      });
    }

    function row(k, v) { return '<div><dt>' + k + '</dt><dd>' + LY.esc(v) + '</dd></div>'; }

    function showDevice(d) {
      if (!d) return;
      const chip = d.s === 'ok' ? 'passed' : d.s === 'bad' ? 'failed' : d.s === 'run' || d.s === 'pend' ? 'running' : '';
      let html = '<p class="inspect__title"><span>' + LY.esc(d.host) + '</span><span class="chip" data-state="' + chip + '">' + STATE_LABEL[d.s] + '</span></p><dl>';
      if (d.you) {
        const dv = device || LY.device.sync();
        html += row('os', LY.device.osLabel(dv)) + row('browser', LY.device.browserLabel(dv)) +
          row('screen', dv.screen.w + '×' + dv.screen.h + ' @' + dv.screen.dpr + 'x') +
          row('cpu threads', dv.cores ? String(dv.cores) : 'not reported') +
          row('management', 'none') + row('encryption', 'unknown');
        html += '</dl><p class="inspect__note">This one is yours. It isn\'t managed, which is fine for reading a website and less fine for a company laptop. More detail below.</p>';
      } else {
        html += row('owner', d.owner) + row('os', d.os.label) + row('type', d.type) +
          row('encryption', d.enc ? d.os.enc + ' · key escrowed' : 'suspended') +
          row('update ring', d.ring + (d.ring === 0 ? ' · pilot' : d.ring === 1 ? ' · early' : ' · broad')) +
          row('last seen', d.seen) + row('issue', d.issue || 'none');
        html += '</dl>';
      }
      inspect.innerHTML = html;
    }

    function select(i) {
      if (i < 0 || i >= devs.length) return;
      if (active >= 0 && cells[active]) { cells[active].classList.remove('is-active'); cells[active].setAttribute('aria-selected', 'false'); }
      active = i;
      cells[i].classList.add('is-active');
      cells[i].setAttribute('aria-selected', 'true');
      grid.setAttribute('aria-activedescendant', cells[i].id);
      showDevice(devs[i]);
    }

    async function animateFill(d, ms) {
      const fill = cells[d.i].querySelector('.cell__fill');
      d.s = 'run';
      paint(d);
      const steps = 6;
      for (let k = 1; k <= steps; k++) {
        fill.style.height = (k / steps) * 100 + '%';
        await LY.sleep(ms / steps);
      }
      fill.style.height = '0%';
    }

    function lock(on) {
      busy = on;
      buttons.forEach((b) => { b.disabled = on; });
    }

    async function pushUpdate() {
      if (busy) return;
      lock(true);
      const m = managed();
      m.forEach((d) => {
        if (d.s === 'ok' || d.s === 'pend') { d.s = 'pend'; d.issue = 'Update available'; paint(d); }
      });
      updateKpis();
      resetRings();
      const fast = LY.reduced();
      for (const r of [0, 1, 2]) {
        const group = m.filter((d) => d.ring === r);
        const todo = group.filter((d) => d.s === 'pend');
        let done = 0;
        ringBar(r, 0, group.length);
        const skipped = group.length - todo.length;
        await Promise.all(todo.map(async (d, k) => {
          await LY.sleep(fast ? 0 : k * (r === 2 ? 45 : 110));
          await animateFill(d, fast ? 0 : r === 0 ? 900 : 650);
          d.s = 'ok'; d.issue = ''; d.seen = 'just now';
          paint(d);
          done += 1;
          ringBar(r, done, group.length);
          if (active === d.i) showDevice(d);
        }));
        if (skipped) rings.querySelector('[data-ring-count="' + r + '"]').textContent = done + '/' + group.length;
        updateKpis();
        await LY.sleep(fast ? 0 : 350);
      }
      lock(false);
      LY.toast('Update rolled out. Offline and out-of-support devices were skipped.');
    }

    async function fixIssues() {
      if (busy) return;
      lock(true);
      const fast = LY.reduced();
      const bad = managed().filter((d) => d.s === 'bad');
      for (const d of bad) {
        select(d.i);
        await animateFill(d, fast ? 0 : d.os.eos ? 1800 : 700);
        if (d.os.eos) { d.os = OS.w11; d.kind = 'w11'; d.issue = ''; }
        if (!d.enc) d.enc = true;
        d.issue = '';
        d.s = 'ok';
        d.seen = 'just now';
        paint(d);
        showDevice(d);
        updateKpis();
      }
      lock(false);
      LY.toast(bad.length ? 'Fixed ' + bad.length + ' devices, including an in-place upgrade to Windows 11.' : 'Nothing to fix.');
    }

    function reset() {
      if (busy) return;
      devs = build();
      if (device) applyYou();
      renderGrid();
      updateKpis();
      resetRings();
      select(27);
    }

    function applyYou() {
      const you = devs.find((d) => d.you);
      if (!you || !device) return;
      you.os = { code: device.os.code || '???', label: LY.device.osLabel(device) };
      if (cells.length) paint(you);
      if (active === you.i) showDevice(you);
    }

    function onKey(e) {
      const cols = 8;
      let i = active < 0 ? 0 : active;
      switch (e.key) {
        case 'ArrowRight': i += 1; break;
        case 'ArrowLeft': i -= 1; break;
        case 'ArrowDown': i += cols; break;
        case 'ArrowUp': i -= cols; break;
        case 'Home': i = 0; break;
        case 'End': i = devs.length - 1; break;
        default: return;
      }
      e.preventDefault();
      select(LY.clamp(i, 0, devs.length - 1));
    }

    function verdict(d) {
      const o = d.os;
      if (o.name === 'Windows' && o.certain && o.version === '10') {
        return ['is-warn', 'This device runs <b>Windows 10</b>, which stopped getting free security updates on October 14, 2025. We can move it to Windows 11, usually without reinstalling a single app.'];
      }
      if (o.name === 'Windows' && o.eos) {
        return ['is-warn', 'This device runs an old version of Windows that no longer gets security updates. It should be upgraded or replaced.'];
      }
      if (o.name === 'Windows' && !o.certain) {
        return ['', 'Windows detected. Your browser hides whether it\'s <b>Windows 10</b> or <b>11</b>. If it\'s 10, it stopped getting free security updates on October 14, 2025, and it\'s time to upgrade.'];
      }
      if (o.name === 'Windows') return ['is-ok', '<b>Windows 11</b> detected. Good start. The real questions are the six on the right.'];
      if (o.name === 'macOS') return ['', o.version ? '<b>macOS ' + LY.esc(o.version) + '</b> detected. A management agent would also confirm FileVault, firewall and update status.' : '<b>macOS</b> detected. Browsers report every Mac as the same old version for privacy, so only a management agent can tell whether this one is patched.'];
      if (o.name === 'iOS' || o.name === 'iPadOS') return ['', '<b>' + o.name + ' ' + LY.esc(o.version || '') + '</b> detected. Company phones can be enrolled without touching anyone\'s personal photos or apps.'];
      if (o.name === 'Android') return ['', '<b>Android ' + LY.esc(o.version || '') + '</b> detected. A work profile keeps company data separate from everything personal.'];
      return ['', '<b>' + LY.esc(o.name) + '</b> detected.'];
    }

    function fillMyDevice(d) {
      const facts = LY.$('[data-facts]');
      const ver = LY.$('[data-verdict]');
      if (!facts || !ver) return;
      facts.innerHTML = LY.device.facts(d).map((r) => row(r[0], r[1])).join('');
      const [cls, msg] = verdict(d);
      ver.className = 'mydev__verdict' + (cls ? ' ' + cls : '');
      ver.innerHTML = '<p>' + msg + (d.passkey ? ' It also supports passkeys, so sign-in without passwords is an option.' : '') + '</p>';
    }

    function init() {
      grid = LY.$('[data-fleet-grid]');
      if (!grid) return;
      const root = LY.$('[data-fleet]');
      inspect = LY.$('[data-inspect]', root);
      kpis = LY.$('[data-kpis]', root);
      rings = LY.$('[data-rings]', root);
      buttons = LY.$$('[data-fleet-act]', root);
      devs = build();
      renderGrid();
      updateKpis();
      resetRings();
      select(27);
      grid.addEventListener('keydown', onKey);
      grid.addEventListener('focus', () => { if (active < 0) select(0); });
      buttons.forEach((b) => b.addEventListener('click', () => {
        const a = b.getAttribute('data-fleet-act');
        if (a === 'push') pushUpdate();
        else if (a === 'fix') fixIssues();
        else reset();
      }));
      const sync = LY.device.sync();
      fillMyDevice(sync);
      LY.device.full().then((d) => {
        device = d;
        applyYou();
        fillMyDevice(d);
      }).catch(() => {});
    }

    return { init, push: pushUpdate, fix: fixIssues, reset };
  })();
})();
