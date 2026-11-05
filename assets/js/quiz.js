/* The 1-minute IT health check: six quick questions, a score out of 100 and
   a short list of what to fix first. Each gap links to the service that fixes
   it, and the result can be carried into the free IT check form.
   Answers are kept while the page is open, so closing the panel and coming
   back shows the same result. Nothing is stored or sent anywhere. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  const QS = [
    { id: 'backups', q: 'If a laptop died today, could you get its files back?', hint: 'Laptops break, get stolen and get hit by ransomware.', fix: 'Automatic backups, kept off-site and tested', gap: 'backups', need: 'Backups' },
    { id: 'computers', q: 'Do security updates install on every computer automatically?', hint: 'Most attacks use security holes that already have a fix.', fix: 'Updates installed for you, on every computer', gap: 'updates', need: 'Computers' },
    { id: 'm365', q: 'Does signing in to email need a code from your phone?', hint: 'It stops most attacks that use stolen passwords.', fix: 'A phone code at sign-in for everyone', gap: 'sign-in codes', need: 'Email' },
    { id: 'people', q: 'When someone leaves, is their access closed on their last day?', hint: 'Old accounts are an easy way in.', fix: 'The same leaver checklist, every time', gap: 'access for leavers', need: 'Everything' },
    { id: 'network', q: 'Do guests use a separate Wi-Fi from your team?', hint: 'Visitors\' phones shouldn\'t be able to see your computers.', fix: 'A separate Wi-Fi for guests', gap: 'guest Wi-Fi', need: 'Wi-Fi and network' },
    { id: 'helpdesk', q: 'When something breaks, do you know exactly who to call?', hint: 'Small problems get expensive when nobody owns them.', fix: 'One team to call, for everything', gap: 'support', need: 'Everything' },
  ];
  const OPTS = [['Yes', 2], ['Not sure', 1], ['No', 0]];
  const ARC = 'M20 118a90 90 0 0 1 180 0';
  const BACK = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M12 5l-5 5 5 5"/></svg>';

  const answers = [];
  let stage = null;

  function question(i, dir) {
    const q = QS[i];
    stage.innerHTML =
      '<div class="qz">' +
        '<div class="qz__top"><span class="qz__count">Question ' + (i + 1) + ' of ' + QS.length + '</span>' +
          '<span class="qz__dots" aria-hidden="true">' + QS.map((x, k) => '<i class="' + (k < i ? 'is-done' : k === i ? 'is-on' : '') + '"></i>').join('') + '</span></div>' +
        '<div class="qz__card' + (dir ? (dir > 0 ? ' is-next' : ' is-prev') : '') + '">' +
          '<h3 class="qz__q" tabindex="-1">' + q.q + '</h3>' +
          '<p class="qz__hint">' + q.hint + '</p>' +
          '<div class="qz__opts">' + OPTS.map((o) =>
            '<button class="qz__opt' + (answers[i] === o[1] ? ' is-picked' : '') + '" type="button" data-v="' + o[1] + '">' + o[0] + '</button>').join('') +
          '</div>' +
        '</div>' +
        (i > 0 ? '<button class="qz__back" type="button" data-back>' + BACK + 'Back</button>' : '') +
      '</div>';
    stage.setAttribute('data-step', String(i));
    if (dir) stage.querySelector('.qz__q').focus({ preventScroll: true });
  }

  function summary(score) {
    const gaps = QS.filter((q, i) => answers[i] < 2).map((q) => q.gap);
    return 'From the 1-minute check: ' + score + '/100.' + (gaps.length ? ' To look at: ' + gaps.join(', ') + '.' : '');
  }

  function result(animate) {
    const score = Math.round((answers.reduce((a, b) => a + b, 0) / (QS.length * 2)) * 100);
    const lvl = score >= 84 ? 'good' : score >= 50 ? 'mid' : 'bad';
    const verdict = { good: 'In good shape', mid: 'A few gaps to close', bad: 'At risk' }[lvl];
    const gaps = QS.map((q, i) => ({ q, v: answers[i] })).filter((g) => g.v < 2).sort((a, b) => a.v - b.v);
    const line = {
      good: 'You\'ve covered the basics. A free IT check can make sure nothing is hiding.',
      mid: 'You\'ve got some of the basics. Here\'s what we\'d fix first:',
      bad: 'A few gaps leave your business exposed. Here\'s what we\'d fix first:',
    }[lvl];
    const needs = Array.from(new Set(gaps.map((g) => g.q.need))).join('|');
    stage.innerHTML =
      '<div class="qz__res">' +
        '<div class="qz__head is-' + lvl + '">' +
          '<div class="qz__score">' +
            '<svg class="gauge" viewBox="0 0 220 128" aria-hidden="true" focusable="false"><path class="gauge__track" d="' + ARC + '"/><path class="gauge__fill" pathLength="100" d="' + ARC + '"/></svg>' +
            '<p class="qz__num"><b data-num>' + score + '</b><span>/100</span></p>' +
          '</div>' +
          '<div class="qz__sum"><h3 class="qz__verdict" tabindex="-1">' + verdict + '</h3><p>' + line + '</p></div>' +
        '</div>' +
        (gaps.length ? '<ul class="qz__fixes">' + gaps.map((g) =>
          '<li class="qz__fix"><span class="sev ' + (g.v === 0 ? 'sev--high">Fix first' : 'sev--mid">Worth checking') + '</span>' +
          '<b>' + g.q.fix + '</b><a class="more" href="#' + g.q.id + '" data-open="' + g.q.id + '">How we do it</a></li>').join('') + '</ul>' : '') +
        '<div class="qz__ctas">' +
          '<a class="btn btn--blue" href="#contact" data-cta data-needs="' + needs + '" data-message="' + LY.esc(summary(score)) + '">Book a free IT check</a>' +
          '<button class="btn btn--outline" type="button" data-again>Start again</button>' +
        '</div>' +
        '<p class="qz__note">Your answers stay on this page. Nothing is saved or sent.</p>' +
      '</div>';
    stage.setAttribute('data-step', 'result');
    const fill = stage.querySelector('.gauge__fill');
    const num = stage.querySelector('[data-num]');
    if (animate && !LY.reduced()) {
      num.textContent = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.strokeDashoffset = String(100 - score); }));
      LY.countUp(num, score, 1200);
      stage.querySelector('.qz__verdict').focus({ preventScroll: true });
    } else {
      fill.style.strokeDashoffset = String(100 - score);
    }
  }

  function onClick(e) {
    const opt = e.target.closest('.qz__opt');
    if (opt) {
      const i = Number(stage.getAttribute('data-step'));
      answers[i] = Number(opt.getAttribute('data-v'));
      stage.querySelectorAll('.qz__opt').forEach((b) => b.classList.toggle('is-picked', b === opt));
      setTimeout(() => {
        if (!stage || !stage.isConnected) return;
        if (i + 1 < QS.length) question(i + 1, 1);
        else result(true);
      }, LY.reduced() ? 0 : 220);
      return;
    }
    if (e.target.closest('[data-back]')) {
      const i = Number(stage.getAttribute('data-step'));
      if (i > 0) question(i - 1, -1);
      return;
    }
    if (e.target.closest('[data-again]')) {
      answers.length = 0;
      question(0, 1);
    }
  }

  LY.quiz = {
    // Draw the check into el: the result if it's finished, else the next question
    mount(el) {
      if (!el) return;
      stage = el;
      el.addEventListener('click', onClick);
      if (answers.length === QS.length) result(false);
      else question(answers.length, 0);
    },
  };
})();
