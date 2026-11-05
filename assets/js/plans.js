/* Pricing: drag the team size and each plan shows its monthly total.
   Prices per person come from LY.config.prices when set, otherwise from the
   data-price attribute on each plan in index.html. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  LY.plans = (function () {
    let range, out, plans;
    const money = (n) => {
      try {
        return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
      } catch (e) {
        return '$' + Math.round(n).toLocaleString();
      }
    };
    const priceOf = (p) => {
      const cfg = LY.config && LY.config.prices && LY.config.prices[p.getAttribute('data-tier')];
      return Number(cfg || p.getAttribute('data-price') || 0);
    };

    function update() {
      const n = Number(range.value);
      const people = n === 1 ? 'person' : 'people';
      out.textContent = n + ' ' + people;
      plans.forEach((p) => {
        const price = priceOf(p);
        const per = p.querySelector('[data-per]');
        const total = p.querySelector('[data-total]');
        const seats = p.querySelector('[data-seats-n]');
        if (per) per.textContent = money(price);
        if (total) total.textContent = money(price * n);
        if (seats) seats.textContent = n + ' ' + people;
      });
    }

    function init() {
      range = LY.$('[data-seats]');
      out = LY.$('[data-seats-out]');
      plans = LY.$$('[data-tier]');
      if (!range || !out) return;
      range.addEventListener('input', update);
      update();
    }

    return { init };
  })();
})();
