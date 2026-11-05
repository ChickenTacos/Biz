/* Pricing: drag the team size and each plan shows its monthly total.
   Prices per person come from LY.config.prices when set, otherwise from the
   data-price attribute on each plan in index.html.
   The "Compare plans" panel has its own team-size slider, kept in step with
   the one on the page. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  LY.plans = (function () {
    let range, out, plans = [];
    const money = (n) => {
      try {
        return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
      } catch (e) {
        return '$' + Math.round(n).toLocaleString();
      }
    };
    const people = (n) => n + ' ' + (n === 1 ? 'person' : 'people');
    const price = (tier) => {
      const cfg = LY.config && LY.config.prices && LY.config.prices[tier];
      const el = LY.$('[data-tier="' + tier + '"]');
      return Number(cfg || (el && el.getAttribute('data-price')) || 0);
    };
    const seats = () => (range ? Number(range.value) : 15);

    function update() {
      const n = seats();
      out.textContent = people(n);
      plans.forEach((p) => {
        const each = price(p.getAttribute('data-tier'));
        const per = p.querySelector('[data-per]');
        const total = p.querySelector('[data-total]');
        const label = p.querySelector('[data-seats-n]');
        if (per) per.textContent = money(each);
        if (total) total.textContent = money(each * n);
        if (label) label.textContent = people(n);
      });
    }

    // Fill the comparison table (in the panel) with prices for the current team size
    function fillCompare(root) {
      const paint = () => {
        const n = seats();
        LY.$$('[data-compare-price]', root).forEach((td) => { td.textContent = money(price(td.getAttribute('data-compare-price'))); });
        LY.$$('[data-compare-total]', root).forEach((td) => { td.textContent = money(price(td.getAttribute('data-compare-total')) * n); });
        LY.$$('[data-compare-seats]', root).forEach((el) => { el.textContent = people(n); });
      };
      const own = LY.$('[data-cmp-range]', root);
      if (own && range) {
        own.min = range.min;
        own.max = range.max;
        own.value = range.value;
        own.addEventListener('input', () => {
          range.value = own.value;
          update();
          paint();
        });
      }
      paint();
    }

    function init() {
      range = LY.$('[data-seats]');
      out = LY.$('[data-seats-out]');
      plans = LY.$$('.plan[data-tier]');
      if (!range || !out) return;
      range.addEventListener('input', update);
      update();
    }

    return { init, fillCompare, money, price };
  })();
})();
