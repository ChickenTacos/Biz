/* Pricing calculator: drag the team size, every plan's monthly total updates.
   Prices per person come from LY.config.prices when set, otherwise from the
   data-price attribute on each plan in index.html. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  LY.plans = (function () {
    let range, out, tiers;
    const money = (n) => {
      try {
        return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
      } catch (e) {
        return '$' + Math.round(n).toLocaleString();
      }
    };

    function priceOf(t) {
      const p = LY.config && LY.config.prices && LY.config.prices[t.getAttribute('data-tier')];
      return Number(p || t.getAttribute('data-price') || 0);
    }

    function animate(el, to) {
      const from = Number(el.getAttribute('data-v') || to);
      el.setAttribute('data-v', to);
      if (LY.reduced() || from === to) { el.textContent = money(to); return; }
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 260);
        el.textContent = money(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function update() {
      const n = Number(range.value);
      out.textContent = n + (n === 1 ? ' person' : ' people');
      tiers.forEach((t) => {
        const price = priceOf(t);
        const per = t.querySelector('.tier__per');
        if (per) per.textContent = money(price) + ' per person';
        animate(t.querySelector('[data-total]'), n * price);
      });
      const seats = document.querySelector('[data-ticket-form] [name="seats"]');
      if (seats) seats.value = String(n);
      if (LY.contact && LY.contact.refresh) LY.contact.refresh();
    }

    function init() {
      range = LY.$('[data-seats]');
      out = LY.$('[data-seats-out]');
      tiers = LY.$$('[data-tier]');
      if (!range || !out) return;
      range.addEventListener('input', update);
      update();
    }

    return { init };
  })();
})();
