/* The pop-up panel ("sheet"). One <dialog> is filled from a <template> for
   whatever was clicked: a service, the 1-minute check, the sample report or
   the plan comparison. Each panel has its own address (#email, #quiz…), so it
   can be shared, and the browser's back button closes it.
   Desktop: the panel grows out of whatever opened it. Phones: it slides up as
   a bottom sheet that can be dragged down to close. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  LY.modal = (function () {
    let dlg, body, nav, live, cur = null, demo = null, closing = false, closeTimer = 0;
    const titles = {};
    const group = [];
    const root = document.documentElement;

    const tpl = (id) => (id && /^[a-z0-9-]+$/.test(id) ? document.getElementById('tpl-' + id) : null);
    const hashId = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch (e) { return ''; } };
    const phone = () => matchMedia('(max-width: 700px)').matches;
    const pushed = () => !!(history.state && history.state.ly);

    // Keep the address bar in step with the open panel
    function address(id, mode) {
      try {
        const url = id ? '#' + id : location.pathname + location.search;
        if (mode === 'push') history.pushState({ ly: id }, '', url);
        else history.replaceState(id && pushed() ? { ly: id } : null, '', url);
      } catch (e) { /* sandboxed frames may refuse; the panel still works */ }
    }

    function stopDemo() {
      if (demo) { demo.stop(); demo = null; }
    }

    function render(id, dir) {
      const t = tpl(id);
      stopDemo();
      body.replaceChildren(t.content.cloneNode(true));
      dlg.setAttribute('data-size', t.getAttribute('data-size') || 'l');
      const title = body.querySelector('[data-sheet-title]');
      if (title) title.id = 'sheet-title';
      body.scrollTop = 0;
      cur = id;

      const gi = t.hasAttribute('data-group') ? group.indexOf(id) : -1;
      nav.hidden = gi < 0;
      if (gi >= 0) {
        const prev = group[(gi - 1 + group.length) % group.length];
        const next = group[(gi + 1) % group.length];
        nav.querySelector('[data-prev-name]').textContent = titles[prev];
        nav.querySelector('[data-next-name]').textContent = titles[next];
        nav.querySelector('[data-pos]').textContent = (gi + 1) + ' of ' + group.length;
      }

      body.classList.remove('is-next', 'is-prev', 'is-swap');
      if (dir) {
        void body.offsetWidth;
        body.classList.add(dir === 2 ? 'is-swap' : dir > 0 ? 'is-next' : 'is-prev');
      }

      const name = t.getAttribute('data-demo');
      const mount = body.querySelector('[data-demo-mount]');
      if (name && mount && LY.demos) demo = LY.demos.mount(mount, name);
      if (hooks[id]) {
        try { hooks[id](body); } catch (err) { console.warn('[lanyard] panel ' + id + ':', err); }
      }
    }

    // Where the panel grows from: the middle of whatever was clicked
    function origin(el) {
      let x = 0;
      let y = 36;
      if (el && !phone()) {
        const r = el.getBoundingClientRect();
        if (r.width || r.height) {
          x = r.left + r.width / 2 - window.innerWidth / 2;
          y = r.top + r.height / 2 - window.innerHeight / 2;
        }
      }
      dlg.style.setProperty('--ox', Math.round(x) + 'px');
      dlg.style.setProperty('--oy', Math.round(y) + 'px');
    }

    function open(id, from) {
      if (!tpl(id)) return false;
      if (dlg.open && !closing) {
        if (id !== cur) render(id, 2);
        return true;
      }
      clearTimeout(closeTimer);
      closing = false;
      dlg.classList.remove('is-closing', 'is-flung', 'is-shown', 'is-dragging');
      dlg.style.removeProperty('transform');
      render(id, 0);
      origin(from);
      root.classList.add('sheet-open');
      if (!dlg.open) dlg.showModal();
      // once the entrance has played, keep the panel still (so dragging can't replay it)
      closeTimer = setTimeout(() => dlg.classList.add('is-shown'), LY.reduced() ? 0 : 650);
      return true;
    }

    function close(opts) {
      opts = opts || {};
      if (!dlg.open || closing) return;
      closing = true;
      stopDemo();
      clearTimeout(closeTimer);
      dlg.classList.remove('is-shown');
      dlg.classList.add('is-closing');
      const done = () => {
        if (!closing) return;
        closing = false;
        dlg.classList.remove('is-closing', 'is-flung', 'is-dragging');
        dlg.style.removeProperty('transform');
        dlg.close();
        root.classList.remove('sheet-open');
        body.replaceChildren();
        cur = null;
        if (opts.after) opts.after();
      };
      closeTimer = setTimeout(done, LY.reduced() ? 0 : 250);
      if (!opts.keepAddress) {
        if (pushed()) { try { history.back(); } catch (e) { /* ignore */ } } else address(null);
      }
    }

    function step(d) {
      const i = group.indexOf(cur);
      if (i < 0) return;
      const id = group[(i + d + group.length) % group.length];
      render(id, d);
      address(id, 'replace');
      live.textContent = titles[id] + ', ' + (group.indexOf(id) + 1) + ' of ' + group.length;
    }

    // "Get this for your business": close, go to the form, and fill in what we know
    function toContact(cta) {
      const t = tpl(cur);
      const need = t && t.getAttribute('data-need');
      const needs = (cta.getAttribute('data-needs') || need || '').split('|').filter(Boolean);
      const message = cta.getAttribute('data-message') || '';
      const topic = t && t.hasAttribute('data-demo') ? titles[cur] : '';
      try { history.replaceState(null, '', '#contact'); } catch (e) { /* ignore */ }
      close({
        keepAddress: true,
        after: () => {
          const h = document.getElementById('contact-title');
          if (h) h.setAttribute('tabindex', '-1');
          const fill = () => { if (LY.contact && LY.contact.prefill) LY.contact.prefill({ needs, message, topic }); };
          // change page to the form the same way the menu does, then fill it in
          if (LY.pages && LY.pages.go('contact', { focus: h, after: fill })) return;
          fill();
          const sec = document.getElementById('contact');
          if (sec) sec.scrollIntoView({ behavior: LY.reduced() ? 'auto' : 'smooth', block: 'start' });
          if (h) h.focus({ preventScroll: true });
        },
      });
    }

    const hooks = {
      quiz(el) { if (LY.quiz) LY.quiz.mount(el.querySelector('[data-quiz-stage]')); },
      compare(el) { if (LY.plans && LY.plans.fillCompare) LY.plans.fillCompare(el); },
      report(el) {
        const fill = el.querySelector('[data-gauge-fill]');
        const num = el.querySelector('[data-gauge-num]');
        if (!fill || !num) return;
        const to = Number(num.getAttribute('data-gauge-to')) || 0;
        if (LY.reduced()) { fill.style.strokeDashoffset = String(100 - to); return; }
        num.textContent = '0';
        setTimeout(() => { fill.style.strokeDashoffset = String(100 - to); LY.countUp(num, to, 1200); }, 260);
      },
    };

    function onDocClick(e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('[data-open]');
      if (a) {
        const id = a.getAttribute('data-open');
        if (!tpl(id)) return;
        e.preventDefault();
        if (dlg.open && !closing) {
          if (id !== cur) { render(id, 2); address(id, 'replace'); }
        } else if (open(id, a)) {
          address(id, location.hash === '#' + id ? 'replace' : 'push');
        }
        return;
      }
      const cta = e.target.closest('[data-cta]');
      if (cta && dlg.contains(cta)) { e.preventDefault(); toContact(cta); }
    }

    function onHash() {
      const id = hashId();
      if (tpl(id)) {
        if (!dlg.open || closing) open(id, null);
        else if (id !== cur) render(id, 2);
      } else if (dlg.open) {
        close({ keepAddress: true });
      }
    }

    function onKey(e) {
      if (nav.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.target.closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      step(e.key === 'ArrowRight' ? 1 : -1);
    }

    // Phones: drag the handle down to close
    function drag() {
      const grab = dlg.querySelector('[data-sheet-grab]');
      if (!grab) return;
      let id = null;
      let y0 = 0;
      let dy = 0;
      let t0 = 0;
      grab.addEventListener('pointerdown', (e) => {
        if (!phone() || closing) return;
        id = e.pointerId;
        y0 = e.clientY;
        dy = 0;
        t0 = performance.now();
        grab.setPointerCapture(id);
        dlg.classList.add('is-dragging', 'is-shown');
      });
      grab.addEventListener('pointermove', (e) => {
        if (e.pointerId !== id) return;
        dy = e.clientY - y0;
        dlg.style.transform = 'translateY(' + (dy > 0 ? dy : dy / 5).toFixed(1) + 'px)';
      });
      const end = (e) => {
        if (e.pointerId !== id) return;
        id = null;
        const v = dy / Math.max(1, performance.now() - t0);
        dlg.classList.remove('is-dragging');
        if (dy > 120 || (dy > 24 && v > 0.55)) {
          dlg.classList.add('is-flung');
          dlg.style.transform = 'translateY(105%)';
          close({ flung: true });
        } else {
          dlg.style.removeProperty('transform');
        }
      };
      grab.addEventListener('pointerup', end);
      grab.addEventListener('pointercancel', end);
    }

    function buildNav() {
      nav = document.createElement('nav');
      nav.className = 'sheet__nav';
      nav.setAttribute('aria-label', 'More services');
      nav.hidden = true;
      nav.innerHTML =
        '<button class="sheet__step" type="button" data-step="-1"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M12 5l-5 5 5 5"/></svg>' +
          '<span><small>Previous</small><b data-prev-name></b></span></button>' +
        '<span class="sheet__pos" data-pos></span>' +
        '<button class="sheet__step sheet__step--next" type="button" data-step="1"><span><small>Next</small><b data-next-name></b></span>' +
          '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M8 5l5 5-5 5"/></svg></button>' +
        '<span class="sr-only" aria-live="polite" data-live></span>';
      dlg.appendChild(nav);
      live = nav.querySelector('[data-live]');
      nav.addEventListener('click', (e) => {
        const b = e.target.closest('[data-step]');
        if (b) step(Number(b.getAttribute('data-step')));
      });
    }

    function init() {
      dlg = LY.$('[data-sheet]');
      if (!dlg || typeof dlg.showModal !== 'function') return;
      body = LY.$('[data-sheet-body]', dlg);
      LY.$$('template[id^="tpl-"]').forEach((t) => {
        const id = t.id.slice(4);
        const h = t.content.querySelector('[data-sheet-title]');
        titles[id] = h ? h.textContent.trim() : '';
        if (t.getAttribute('data-group') === 'services') group.push(id);
      });
      buildNav();
      drag();
      document.addEventListener('click', onDocClick);
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
      dlg.addEventListener('keydown', onKey);
      dlg.querySelector('[data-sheet-close]').addEventListener('click', () => close());
      // if the browser closes the dialog by itself (it can, after repeated Escapes), tidy up
      dlg.addEventListener('close', () => {
        if (cur === null) return;
        const was = closing;
        stopDemo();
        clearTimeout(closeTimer);
        closing = false;
        dlg.classList.remove('is-closing', 'is-flung', 'is-dragging', 'is-shown');
        dlg.style.removeProperty('transform');
        root.classList.remove('sheet-open');
        body.replaceChildren();
        cur = null;
        if (!was) { if (pushed()) { try { history.back(); } catch (e) { /* ignore */ } } else address(null); }
      });
      // a click on the dimmed backdrop (outside the panel) closes it
      dlg.addEventListener('click', (e) => {
        if (e.target !== dlg) return;
        const r = dlg.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
      });
      window.addEventListener('hashchange', onHash);
      const id = hashId();
      if (tpl(id)) open(id, null);
    }

    return { init, open, close };
  })();
})();
