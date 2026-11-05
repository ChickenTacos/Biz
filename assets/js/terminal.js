/* A small terminal. Open with ` (backtick) or the >_ button. Type "help".
   History with ↑/↓, completion with Tab, Ctrl+L clears, Esc closes. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  const SECTIONS = ['home', 'services', 'lifecycle', 'fleet', 'process', 'plans', 'about', 'faq', 'contact'];
  const FILES = ['readme.txt', 'services.txt', 'plans.txt', 'about.txt', 'contact.sh', 'faq.man'];

  LY.terminal = (function () {
    let el, out, input, screen, prevFocus = null, open = false;
    const hist = [];
    let hIdx = 0;

    const e = (s) => LY.esc(s);
    const print = (html) => { out.insertAdjacentHTML('beforeend', html + '\n'); screen.scrollTop = screen.scrollHeight; };
    const line = (text, cls) => print(cls ? '<span class="' + cls + '">' + e(text) + '</span>' : e(text));

    function go(id) {
      close();
      const t = document.getElementById(id === 'home' ? 'home' : id);
      if (t) setTimeout(() => t.scrollIntoView({ behavior: LY.reduced() ? 'auto' : 'smooth' }), 200);
    }

    const cmds = {
      help: {
        d: 'list commands',
        f() {
          print('<span class="y">lanyard shell</span> <span class="dim">· a toy terminal on a real website</span>\n');
          Object.keys(cmds).filter((k) => !cmds[k].hide).forEach((k) => print('  <span class="cy">' + k.padEnd(11) + '</span> <span class="dim">' + e(cmds[k].d) + '</span>'));
          print('\n<span class="dim">Tab completes · ↑ ↓ history · Ctrl+L clears · Esc closes</span>');
        },
      },
      ls: {
        d: 'list sections and files',
        f() { print(SECTIONS.slice(1).map((s) => '<span class="cy">' + s + '/</span>').join('  ') + '  ' + FILES.join('  ')); },
      },
      cd: { d: 'jump to a section, e.g. cd plans', f(a) {
        const t = (a[0] || '').replace(/\/$/, '').replace(/^~\/?/, '') || 'home';
        if (t === '..' || t === '/') return go('home');
        if (SECTIONS.includes(t)) return go(t);
        line('cd: no such section: ' + t, 'err');
      } },
      cat: { d: 'read a file, e.g. cat readme.txt', f(a) {
        const f = (a[0] || '').toLowerCase();
        const files = {
          'readme.txt': 'Lanyard Systems · managed IT for companies without an IT department.\nEndpoint management, onboarding, offboarding, help desk and IT projects.\nBased in Victoria, BC. On-site across Greater Victoria, remote across Canada.',
          'services.txt': 'endpoint-management/  every device enrolled, encrypted, patched\nonboarding/           new hires ready on day one\noffboarding/          access closed on time, laptops back clean\nhelp-desk/            one inbox for every IT question\nprojects/             upgrades, hardware, audits, custom tools\nsecurity-baseline.sh  the basics, done properly, checked monthly',
          'plans.txt': '--fully-managed   we\'re your IT department      monthly, per person\n--co-managed      backup for your IT person     monthly, per device\n--project         one job, done properly        fixed quote',
          'about.txt': 'Hallam Pak, founder. IT analyst in a secure federal defence environment.\nWindows 11 migrations (air-gapped too), smart-card identities, fleet audits,\nhardware specs and onboarding new staff. Trained in ITIL 4 and Security+.',
          'contact.sh': '#!/bin/sh\necho "' + (LY.config.email || '') + '"\n# or type: contact',
          'faq.man': 'Try: man lanyard',
        };
        if (!f) return line('cat: missing file name. Try: ls', 'err');
        if (SECTIONS.includes(f.replace(/\/$/, ''))) return line('cat: ' + f + ': is a directory. Try: cd ' + f, 'err');
        if (!files[f]) return line('cat: ' + f + ': no such file', 'err');
        line(files[f]);
      } },
      whoami: { d: 'who you are, as far as we can tell', f() {
        const d = LY.device.sync();
        print('visitor <span class="dim">(not enrolled)</span>\non ' + e(LY.device.osLabel(d)) + ' · ' + e(LY.device.browserLabel(d)) + '\n<span class="dim">run</span> <span class="cy">scan</span> <span class="dim">for everything your browser told us</span>');
      } },
      scan: { d: 'what your browser reveals about this device', async f() {
        line('scanning (locally, nothing is sent)…', 'dim');
        const d = await LY.device.full();
        LY.device.facts(d).forEach((r) => print('  <span class="cy">' + e(r[0].padEnd(16)) + '</span>' + e(r[1])));
        print('\n  <span class="y">disk encryption  unknown</span>\n  <span class="y">patch level      unknown</span>\n<span class="dim">A browser can\'t see those. A management agent can.</span>');
      } },
      neofetch: { d: 'system summary', f() {
        const art = ['   \\\\    //  ', '    \\\\  //   ', '     [##]    ', '   ########  ', '   ########  ', '   ########  '];
        const info = [
          '<span class="y">visitor</span>@<span class="y">lanyard</span>',
          '<span class="cy">os</span>       LanyardOS 26.11 (static html)',
          '<span class="cy">host</span>     ' + e(LY.config.city || 'Victoria, BC'),
          '<span class="cy">uptime</span>   ' + LY.uptime(),
          '<span class="cy">packages</span> 0 frameworks · 0 trackers · 0 cookies',
          '<span class="cy">shell</span>    lsh 1.0',
        ];
        art.forEach((a, i) => print('<span class="y">' + e(a) + '</span> ' + (info[i] || '')));
      } },
      onboard: { d: 'run a quick joiner, e.g. onboard Alex', async f(a) {
        const name = a.join(' ') || 'Alex Kim';
        const user = name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.') || 'new.hire';
        const steps = ['account ' + user + '@yourcompany.ca created', 'groups and licences assigned by role', 'one-time MFA pass issued', 'laptop pre-provisioned and shipped', 'apps installed · policies applied', 'welcome guide sent'];
        line('onboarding ' + name + '…', 'dim');
        for (const s of steps) { await LY.sleep(220); print('  <span class="ok">✓</span> ' + e(s)); }
        print('<span class="ok">ready for day one.</span> <span class="dim">(simulated)</span>');
      } },
      offboard: { d: 'run a quick leaver, e.g. offboard Sam', async f(a) {
        const name = a.join(' ') || 'Sam Ortiz';
        const steps = ['sign-in blocked', 'every session revoked', 'mailbox handed to manager', 'files kept, owned by manager', 'licences reclaimed', 'laptop wiped and checked in'];
        line('offboarding ' + name + '…', 'dim');
        for (const s of steps) { await LY.sleep(220); print('  <span class="ok">✓</span> ' + e(s)); }
        print('<span class="ok">access closed. nothing left behind.</span> <span class="dim">(simulated)</span>');
      } },
      ping: { d: 'measure real round trips to this server', async f() {
        const host = location.host || 'localhost';
        if (!/^https?:$/.test(location.protocol)) return line('ping: open the site over http(s) to measure latency', 'err');
        line('PING ' + host, 'dim');
        const times = [];
        for (let i = 0; i < 4; i++) {
          const t0 = performance.now();
          try {
            await fetch('favicon.svg?ping=' + Date.now() + '-' + i, { cache: 'no-store' });
            const ms = performance.now() - t0;
            times.push(ms);
            line('reply from ' + host + ': seq=' + i + ' time=' + ms.toFixed(1) + ' ms');
          } catch (err) { line('request ' + i + ' failed', 'err'); }
          await LY.sleep(250);
        }
        if (times.length) {
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          line('--- ' + times.length + '/4 received · min ' + Math.min(...times).toFixed(1) + ' · avg ' + avg.toFixed(1) + ' · max ' + Math.max(...times).toFixed(1) + ' ms', 'ok');
        }
      } },
      traceroute: { d: 'how an engagement starts', f() {
        const hops = [['intro call', '30 min'], ['audit', '1–2 wk'], ['baseline', '1 wk'], ['enrol', '1–2 wk'], ['run', 'ongoing'], ['report', 'monthly']];
        line('traceroute to your-company, 6 hops max', 'dim');
        hops.forEach((h, i) => print(' ' + (i + 1) + '  <span class="cy">' + h[0].padEnd(12) + '</span>' + h[1]));
      } },
      uptime: { d: 'how long you\'ve been here', f() { line('up ' + LY.uptime() + ' · 1 user · load average 0.00, 0.00, 0.00 (we stay calm)'); } },
      date: { d: 'time in Victoria', f() { line(LY.timeIn({ weekday: 'short', year: 'numeric', month: 'short', day: '2-digit' }) + ' ' + (LY.config.tzLabel || 'PT')); } },
      theme: { d: 'theme light | dark | system', f(a) {
        const v = a[0];
        if (!['light', 'dark', 'system'].includes(v)) return line('usage: theme light | dark | system', 'err');
        LY.ui.setTheme(v);
        line('theme set to ' + v, 'ok');
      } },
      contact: { d: 'how to reach us', f() {
        print('email  <span class="y">' + e(LY.config.email) + '</span>\nopening the ticket form…');
        setTimeout(() => go('contact'), 500);
      } },
      man: { d: 'read the manual: man lanyard', f(a) { if ((a[0] || 'lanyard') === 'lanyard') return go('faq'); line('No manual entry for ' + a[0], 'err'); } },
      history: { d: 'commands you typed', f() { hist.forEach((h, i) => line(String(i + 1).padStart(4) + '  ' + h)); } },
      echo: { d: 'print text', f(a) { line(a.join(' ')); } },
      pwd: { d: 'where you are', f() { line('/home/visitor'); } },
      uname: { d: 'system information', f() { line('LanyardOS 26.11 yyj-web-01 static-html #1 SMP (no frameworks were harmed)'); } },
      clear: { d: 'clear the screen', f() { out.innerHTML = ''; } },
      exit: { d: 'close the terminal', f() { close(); } },
      sudo: { hide: true, f() { line('visitor is not in the sudoers file. This incident will be reported.', 'err'); line('(To us. We\'re the IT department.)', 'dim'); } },
      rm: { hide: true, f(a) { if (a.join(' ').includes('-rf')) { line('rm: permission denied. Also, please don\'t.', 'err'); } else { line('rm: nothing here is yours to delete', 'err'); } } },
      hire: { hide: true, f() { cmds.contact.f(); } },
      coffee: { hide: true, f() { line('418 I\'m a teapot', 'y'); } },
      vim: { hide: true, f() { line('You are now trapped in vim. Just kidding. Type :q to… no wait, that\'s also a joke.', 'dim'); } },
      quit: { hide: true, f() { close(); } },
      logout: { hide: true, f() { close(); } },
    };

    async function exec(raw) {
      const text = raw.trim();
      print('<span class="y">visitor@lanyard:~$</span> <span class="cmd">' + e(text) + '</span>');
      if (!text) return;
      hist.push(text);
      hIdx = hist.length;
      const [name, ...args] = text.split(/\s+/);
      const c = cmds[name.toLowerCase()];
      if (!c) { line(name + ': command not found. Try: help', 'err'); return; }
      input.disabled = true;
      try { await c.f(args); } catch (err) { line('error: ' + err.message, 'err'); }
      input.disabled = false;
      if (open) input.focus();
    }

    function complete() {
      const v = input.value;
      const parts = v.split(/\s+/);
      if (parts.length <= 1) {
        const m = Object.keys(cmds).filter((k) => !cmds[k].hide && k.startsWith(parts[0]));
        if (m.length === 1) input.value = m[0] + ' ';
        else if (m.length > 1) print('<span class="dim">' + m.join('  ') + '</span>');
        return;
      }
      const pool = parts[0] === 'cat' ? FILES : parts[0] === 'theme' ? ['light', 'dark', 'system'] : SECTIONS;
      const last = parts[parts.length - 1];
      const m = pool.filter((k) => k.startsWith(last));
      if (m.length === 1) { parts[parts.length - 1] = m[0]; input.value = parts.join(' '); }
      else if (m.length > 1) print('<span class="dim">' + m.join('  ') + '</span>');
    }

    function show() {
      if (open) return;
      open = true;
      prevFocus = document.activeElement;
      el.hidden = false;
      void el.offsetWidth; // flush styles so the slide-in transition runs
      el.classList.add('is-open');
      input.focus({ preventScroll: true });
      if (!out.childNodes.length) {
        print('<span class="dim">Last login: ' + new Date().toDateString() + ' from ' + e(LY.device.osLabel(LY.device.sync())) + '</span>');
        print('Welcome to the Lanyard shell. Type <span class="cy">help</span> to see what you can do.\n');
      }
    }

    function close() {
      if (!open) return;
      open = false;
      el.classList.remove('is-open');
      setTimeout(() => { if (!open) el.hidden = true; }, LY.reduced() ? 0 : 330);
      if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    }

    function toggle() { if (open) close(); else show(); }

    function init() {
      el = LY.$('[data-term]');
      if (!el) return;
      out = LY.$('[data-term-out]', el);
      input = LY.$('[data-term-input]', el);
      screen = LY.$('[data-term-screen]', el);
      LY.$('[data-term-form]', el).addEventListener('submit', (ev) => {
        ev.preventDefault();
        const v = input.value;
        input.value = '';
        exec(v);
      });
      LY.$('[data-term-close]', el).addEventListener('click', close);
      LY.$$('[data-term-open]').forEach((b) => b.addEventListener('click', toggle));
      screen.addEventListener('click', (ev) => { if (!window.getSelection().toString() && ev.target === screen) input.focus(); });

      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowUp') { ev.preventDefault(); if (hIdx > 0) { hIdx -= 1; input.value = hist[hIdx]; } }
        else if (ev.key === 'ArrowDown') { ev.preventDefault(); if (hIdx < hist.length - 1) { hIdx += 1; input.value = hist[hIdx]; } else { hIdx = hist.length; input.value = ''; } }
        else if (ev.key === 'Tab' && !ev.shiftKey) { ev.preventDefault(); complete(); }
        else if (ev.key === 'l' && ev.ctrlKey) { ev.preventDefault(); out.innerHTML = ''; }
        else if (ev.key === 'c' && ev.ctrlKey && !window.getSelection().toString()) { ev.preventDefault(); print('<span class="y">visitor@lanyard:~$</span> ' + e(input.value) + '^C'); input.value = ''; }
        else if (ev.key === '`' && !input.value) { ev.preventDefault(); close(); }
      });

      // keep Tab focus inside the dialog
      el.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') { ev.preventDefault(); close(); return; }
        if (ev.key !== 'Tab') return;
        const btn = LY.$('[data-term-close]', el);
        if (ev.shiftKey && document.activeElement === input) { ev.preventDefault(); btn.focus(); }
        else if (!ev.shiftKey && document.activeElement === btn) { ev.preventDefault(); input.focus(); }
      });

      document.addEventListener('keydown', (ev) => {
        if (ev.key !== '`' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        const t = ev.target;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        ev.preventDefault();
        toggle();
      });
    }

    return { init, show, close, exec };
  })();
})();
