/* Contact form as a support ticket, with a live JSON preview of the payload.
   If LY.config.formEndpoint is set, the ticket is POSTed there as JSON.
   Otherwise the visitor's email app opens with the ticket filled in, and the
   page says so plainly (it never claims a message was sent). */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  LY.contact = (function () {
    let form, preview, seatsOut, done, err, ticketId;

    function newId() {
      const n = Math.floor(1000 + Math.random() * 9000);
      return 'LY-' + new Date().getFullYear() + '-' + n;
    }

    function data() {
      const fd = new FormData(form);
      return {
        ticket: ticketId,
        status: 'new',
        priority: fd.get('priority') || 'P4',
        from: {
          name: (fd.get('name') || '').trim(),
          email: (fd.get('email') || '').trim(),
          company: (fd.get('company') || '').trim(),
        },
        team_size: Number(fd.get('seats') || 0),
        interested_in: fd.get('plan') || 'not-sure',
        uses: fd.getAll('platforms'),
        needs: fd.getAll('needs'),
        message: (fd.get('message') || '').trim(),
        opened: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
      };
    }

    // JSON with syntax colouring; every value escaped
    function pretty(v, ind = 0) {
      const pad = '  '.repeat(ind);
      if (Array.isArray(v)) {
        if (!v.length) return '[]';
        return '[\n' + v.map((x) => pad + '  ' + pretty(x, ind + 1)).join(',\n') + '\n' + pad + ']';
      }
      if (v && typeof v === 'object') {
        return '{\n' + Object.keys(v).map((k) => pad + '  <span class="k">"' + LY.esc(k) + '"</span>: ' + pretty(v[k], ind + 1)).join(',\n') + '\n' + pad + '}';
      }
      if (typeof v === 'number') return '<span class="n">' + v + '</span>';
      return '<span class="s">' + LY.esc(JSON.stringify(String(v))) + '</span>';
    }

    function refresh() {
      const d = data();
      seatsOut.textContent = d.team_size + (d.team_size === 1 ? ' person' : ' people');
      preview.innerHTML = pretty(d);
    }

    function plain(d) {
      return [
        'Ticket: ' + d.ticket + ' (' + d.priority + ')',
        'From: ' + d.from.name + ' <' + d.from.email + '>' + (d.from.company ? ', ' + d.from.company : ''),
        'Team size: ' + d.team_size,
        'Interested in: ' + d.interested_in,
        'Uses: ' + (d.uses.join(', ') || '-'),
        'Needs: ' + (d.needs.join(', ') || '-'),
        '',
        d.message || '(no message)',
      ].join('\n');
    }

    function validate(d) {
      const bad = [];
      const name = form.elements.name;
      const email = form.elements.email;
      name.removeAttribute('aria-invalid');
      email.removeAttribute('aria-invalid');
      if (!d.from.name) { bad.push('your name'); name.setAttribute('aria-invalid', 'true'); }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.from.email)) { bad.push('a valid work email'); email.setAttribute('aria-invalid', 'true'); }
      if (bad.length) {
        err.textContent = 'Add ' + bad.join(' and ') + ' so we can reply.';
        err.hidden = false;
        (d.from.name ? email : name).focus();
        return false;
      }
      err.hidden = true;
      return true;
    }

    function showDone(d, msg) {
      done.querySelector('[data-ticket-id]').textContent = d.ticket;
      done.querySelector('[data-ticket-msg]').innerHTML = msg;
      done.querySelector('[data-ticket-text]').textContent = plain(d);
      done.hidden = false;
      done.focus({ preventScroll: true });
      done.scrollIntoView({ behavior: LY.reduced() ? 'auto' : 'smooth', block: 'center' });
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
          if (!res.ok) throw new Error('HTTP ' + res.status);
          showDone(d, 'Ticket received. We\'ll reply to <b>' + LY.esc(d.from.email) + '</b> with a time for an intro call.');
          form.reset();
          ticketId = newId();
          refresh();
        } catch (ex) {
          err.innerHTML = 'The ticket didn\'t go through (' + LY.esc(ex.message) + '). Email <b>' + LY.esc(cfg.email) + '</b> instead and we\'ll pick it up from there.';
          err.hidden = false;
        } finally {
          btn.disabled = false;
        }
        return;
      }
      const subject = encodeURIComponent('[' + d.ticket + '] ' + (d.from.company || d.from.name) + ' · ' + d.priority);
      const body = encodeURIComponent(plain(d));
      showDone(d, 'Your email app should open with this ticket filled in. If it didn\'t, copy the ticket below and send it to <b>' + LY.esc(cfg.email) + '</b>.');
      try { window.location.href = 'mailto:' + cfg.email + '?subject=' + subject + '&body=' + body; } catch (ex) { /* the panel already explains what to do */ }
    }

    function init() {
      form = LY.$('[data-ticket-form]');
      if (!form) return;
      preview = LY.$('[data-ticket-preview]');
      seatsOut = LY.$('[data-seats-out]');
      done = LY.$('[data-ticket-done]');
      err = LY.$('[data-form-error]');
      ticketId = newId();
      form.addEventListener('input', refresh);
      form.addEventListener('change', refresh);
      form.addEventListener('submit', submit);
      refresh();

      done.querySelector('[data-copy-ticket]').addEventListener('click', async () => {
        const ok = await LY.copy(done.querySelector('[data-ticket-text]').textContent);
        LY.toast(ok ? 'Ticket copied' : 'Copy blocked here. Select the text and copy it.');
      });
      done.querySelector('[data-ticket-new]').addEventListener('click', () => {
        done.hidden = true;
        form.reset();
        ticketId = newId();
        refresh();
        form.elements.name.focus();
      });

      // "Start here" buttons on the plans preselect the plan
      LY.$$('[data-plan]').forEach((a) => a.addEventListener('click', () => {
        const sel = form.elements.plan;
        sel.value = a.getAttribute('data-plan');
        refresh();
        setTimeout(() => form.elements.name.focus({ preventScroll: true }), 650);
      }));
    }

    // Used by the terminal
    function prefill(fields) {
      if (!form) return;
      Object.keys(fields || {}).forEach((k) => { if (form.elements[k]) form.elements[k].value = fields[k]; });
      refresh();
    }

    return { init, prefill };
  })();
})();
