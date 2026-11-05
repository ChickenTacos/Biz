/* "Book a free IT check" form.
   If LY.config.formEndpoint is set, the request is POSTed there as JSON.
   Otherwise the visitor's email app opens with the message filled in, and the
   page says so plainly (it never claims a message was sent). */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  LY.contact = (function () {
    let form, err, done;

    function data() {
      const fd = new FormData(form);
      const v = (k) => String(fd.get(k) || '').trim();
      return {
        name: v('name'),
        business: v('business'),
        email: v('email'),
        phone: v('phone'),
        size: v('size'),
        plan: v('plan'),
        needs: fd.getAll('needs'),
        message: v('message'),
      };
    }

    function text(d) {
      return [
        'Free IT check request',
        '',
        'Name: ' + d.name,
        'Business: ' + (d.business || '-'),
        'Email: ' + d.email,
        'Phone: ' + (d.phone || '-'),
        'People: ' + d.size,
        d.plan ? 'Interested in: ' + d.plan : '',
        'Help with: ' + (d.needs.join(', ') || '-'),
        '',
        d.message,
      ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n').trim();
    }

    function validate(d) {
      const name = form.elements.name;
      const email = form.elements.email;
      name.removeAttribute('aria-invalid');
      email.removeAttribute('aria-invalid');
      const missing = [];
      if (!d.name) { missing.push('your name'); name.setAttribute('aria-invalid', 'true'); }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { missing.push('an email address'); email.setAttribute('aria-invalid', 'true'); }
      if (missing.length) {
        err.textContent = 'Please add ' + missing.join(' and ') + ' so we can get back to you.';
        err.hidden = false;
        (d.name ? email : name).focus();
        return false;
      }
      err.hidden = true;
      return true;
    }

    function finish(d, message) {
      form.hidden = true;
      done.querySelector('[data-done-name]').textContent = d.name.split(' ')[0] || 'there';
      done.querySelector('[data-done-msg]').innerHTML = message;
      done.hidden = false;
      done.focus({ preventScroll: true });
    }

    async function submit(e) {
      e.preventDefault();
      const d = data();
      if (!validate(d)) return;
      const cfg = LY.config || {};
      const btn = form.querySelector('[type="submit"]');
      if (cfg.formEndpoint) {
        btn.disabled = true;
        try {
          const res = await fetch(cfg.formEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(d),
          });
          if (!res.ok) throw new Error('status ' + res.status);
          finish(d, 'We got your request and will be in touch soon to book your free IT check.');
        } catch (ex) {
          err.innerHTML = 'Sorry, that didn\'t send. Please email us at <a href="mailto:' + LY.esc(cfg.email) + '">' + LY.esc(cfg.email) + '</a> instead.';
          err.hidden = false;
        } finally {
          btn.disabled = false;
        }
        return;
      }
      const subject = encodeURIComponent('Free IT check: ' + (d.business || d.name));
      const body = encodeURIComponent(text(d));
      finish(d, 'Your email app should open with your message ready to send. If it doesn\'t, email us at <a href="mailto:' + LY.esc(cfg.email) + '">' + LY.esc(cfg.email) + '</a>.');
      try { window.location.href = 'mailto:' + cfg.email + '?subject=' + subject + '&body=' + body; } catch (ex) { /* the message above explains what to do */ }
    }

    function init() {
      form = LY.$('[data-form]');
      if (!form) return;
      err = LY.$('[data-form-error]');
      done = LY.$('[data-done]');
      form.addEventListener('submit', submit);
      done.querySelector('[data-done-again]').addEventListener('click', () => {
        form.reset();
        done.hidden = true;
        form.hidden = false;
        form.elements.name.focus();
      });
      // "Choose this plan" carries the plan into the form
      LY.$$('[data-plan]').forEach((a) => a.addEventListener('click', () => {
        form.elements.plan.value = a.getAttribute('data-plan');
        const msg = form.elements.message;
        if (!msg.value) msg.placeholder = 'Interested in ' + a.getAttribute('data-plan') + '.';
      }));
    }

    return { init };
  })();
})();
