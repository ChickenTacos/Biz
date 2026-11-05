/* Joiner / leaver pipeline: a CI-style run that streams its log.
   Starts by itself the first time it scrolls into view. The leaver run ends
   with a real SHA-256 of its own log, computed in the browser. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  const RUNS = {
    joiner: {
      file: 'joiner.yml',
      steps: [
        ['hr.notice', 'Start date received', '2s', [
          '<span class="t">[Thu 15:02:11]</span> trigger: HR form "new hire" received',
          'name: <span class="y">Jordan Lee</span> · role: sales · starts Mon 09:00',
          'manager: r.chen',
        ]],
        ['identity.create', 'Account and mailbox created', '41s', [
          'create user <span class="cy">jordan.lee@northwind.example</span>',
          'mailbox provisioned · display name, title, manager set',
        ]],
        ['access.assign', 'Groups and licences set by role', '18s', [
          'role template: sales',
          '+ group    sales',
          '+ group    all-staff',
          '+ group    crm-users',
          '+ licence  Microsoft 365 Business Premium',
        ]],
        ['mfa.bootstrap', 'One-time pass ready for MFA setup', '5s', [
          'temporary access pass issued · valid Mon 08:00–16:00',
          'handed to manager in person, never by email',
        ]],
        ['device.provision', 'Laptop assigned and pre-configured', '1d', [
          'asset <span class="y">LY-LT-031</span> · serial PF4X2K9 assigned',
          'autopilot profile: sales-laptop · pre-provisioned',
          'shipped to home address · delivered Sat 11:42',
        ]],
        ['apps.deploy', 'Apps installed for the role', '9m', [
          '12/12 installed: Office, Teams, Edge, Zoom, password manager,',
          '                 CRM, PDF editor, VPN client …',
        ]],
        ['policy.apply', 'Security policies applied and verified', '3m', [
          'bitlocker    on · recovery key escrowed',
          'firewall     on',
          'defender     on · signatures current',
          'update ring  broad',
          'compliance   <span class="ok">compliant</span>',
        ]],
        ['handoff', 'Welcome guide sent, first-login call booked', '4s', [
          'welcome guide sent · first-login call booked Mon 09:15',
          'manager notified: <span class="ok">ready for day one</span>',
        ]],
      ],
      done: '<b>8/8 passed</b> · laptop delivered before day one · 0 tickets raised · example run with made-up names',
    },
    leaver: {
      file: 'leaver.yml',
      steps: [
        ['hr.notice', 'Last day received', '1s', [
          '<span class="t">[Wed 10:20:03]</span> trigger: HR form "leaver" received',
          'name: <span class="y">Sam Ortiz</span> · last day: Fri 17:00',
          'scheduled: close access Fri 17:00:00',
        ]],
        ['signin.block', 'Sign-in blocked at 17:00', '1s', [
          '<span class="t">[Fri 17:00:00]</span> account disabled: <span class="cy">sam.ortiz@northwind.example</span>',
          'password reset to a random value',
        ]],
        ['sessions.revoke', 'Every session ended', '3s', [
          'refresh tokens revoked',
          'signed out on 3 devices: laptop, phone, browser',
          'mfa methods removed',
        ]],
        ['mail.handover', 'Mailbox handed to manager', '22s', [
          'mailbox converted to shared · access: r.chen',
          'auto-reply on: "Sam has left Northwind. Please contact r.chen."',
        ]],
        ['files.transfer', 'Files kept, owned by manager', '6m', [
          'onedrive 38.2 GB → r.chen · kept 90 days',
          'shared links reviewed · 4 external links removed',
        ]],
        ['licences.reclaim', 'Licences back in the pool', '4s', [
          '- licence  Microsoft 365 Business Premium',
          '- licence  CRM seat',
          '2 seats free for the next hire',
        ]],
        ['device.wipe', 'Laptop wiped and checked in', '6m', [
          'remote wipe sent to <span class="y">LY-LT-014</span> · confirmed 17:06',
          'return label sent · asset checked in Tue',
        ]],
        ['audit.record', 'Record of every step, hashed', '1s', [
          'record saved: offboarding/sam.ortiz.txt',
          '@@HASH@@',
        ]],
      ],
      done: '<b>8/8 passed</b> · access closed at 17:00:00 · nothing left behind · example run with made-up names',
    },
  };

  LY.pipeline = (function () {
    let root, stepsEl, out, chip, runIdEl, summary, logTitle, tabs, replay;
    let mode = 'joiner';
    let token = 0;
    let runId = 1041;
    let hasRun = false;

    function renderSteps(m) {
      stepsEl.innerHTML = RUNS[m].steps.map((s) =>
        '<li class="step"><span class="step__icon" aria-hidden="true"></span><span class="step__id">' + s[0] +
        '</span><span class="step__text">' + s[1] + '</span><span class="step__dur"></span></li>').join('');
    }

    function setState(state) {
      chip.textContent = state;
      chip.setAttribute('data-state', state);
    }

    async function run(m) {
      const my = ++token;
      mode = m || mode;
      hasRun = true;
      tabs.forEach((t) => {
        const on = t.getAttribute('data-mode') === mode;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on) root.querySelector('[role="tabpanel"]').setAttribute('aria-labelledby', t.id);
      });
      const R = RUNS[mode];
      renderSteps(mode);
      logTitle.textContent = R.file + ' · output';
      runId += 1;
      runIdEl.textContent = runId;
      out.innerHTML = '';
      summary.textContent = 'Running ' + R.file + '…';
      setState('running');
      const fast = LY.reduced();
      const lis = Array.from(stepsEl.children);
      const transcript = [];
      const print = (html) => {
        out.insertAdjacentHTML('beforeend', html + '\n');
        out.scrollTop = out.scrollHeight;
      };
      print('<span class="t">$ lanyard run ' + R.file + ' --tenant northwind</span>');
      for (let i = 0; i < R.steps.length; i++) {
        if (my !== token) return;
        const [id, , dur, lines] = R.steps[i];
        const li = lis[i];
        li.classList.add('is-running');
        print('\n<span class="cy">▸ ' + id + '</span>');
        await LY.sleep(fast ? 0 : 160);
        for (let line of lines) {
          if (my !== token) return;
          if (line === '@@HASH@@') {
            const hash = await LY.digest('SHA-256', transcript.join('\n'));
            line = hash ? 'sha256: <span class="y">' + hash.slice(0, 32) + '</span><span class="t">…</span>' : '<span class="t">sha256: needs https to compute</span>';
          }
          transcript.push(line.replace(/<[^>]+>/g, ''));
          print('  ' + line);
          await LY.sleep(fast ? 0 : 90 + Math.random() * 110);
        }
        if (my !== token) return;
        li.classList.remove('is-running');
        li.classList.add('is-done');
        li.querySelector('.step__dur').textContent = dur;
        print('  <span class="ok">✓ done</span> <span class="t">(' + dur + ')</span>');
        await LY.sleep(fast ? 0 : 140);
      }
      if (my !== token) return;
      print('\n<span class="ok">● pipeline passed</span>  <span class="caret"></span>');
      setState('passed');
      summary.innerHTML = R.done;
    }

    function init() {
      root = LY.$('[data-pipe]');
      if (!root) return;
      stepsEl = LY.$('[data-steps]', root);
      out = LY.$('[data-log]', root);
      chip = LY.$('[data-run-state]', root);
      runIdEl = LY.$('[data-run-id]', root);
      summary = LY.$('[data-summary]', root);
      logTitle = LY.$('[data-log-title]', root);
      tabs = LY.$$('[role="tab"]', root);
      replay = LY.$('[data-replay]', root);

      tabs.forEach((t, i) => {
        t.addEventListener('click', () => run(t.getAttribute('data-mode')));
        t.addEventListener('keydown', (e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          e.preventDefault();
          const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
          n.focus();
          run(n.getAttribute('data-mode'));
        });
      });
      replay.addEventListener('click', () => run(mode));
      out.innerHTML = '<span class="t">$ lanyard run joiner.yml --tenant northwind</span>\n<span class="t">waiting to start…</span>';
      LY.onceVisible(root, () => { if (!hasRun) run('joiner'); }, 0.12);
    }

    return { init, run };
  })();
})();
