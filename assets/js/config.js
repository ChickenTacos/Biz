/* Site settings. Change these before you go live.
   The email address also appears in index.html (mailto links, JSON-LD),
   .well-known/security.txt and humans.txt; see README.md for the full list. */
window.LY = window.LY || {};
window.LY.config = {
  brand: 'Lanyard Systems',
  host: 'lanyard.example',
  email: 'hello@lanyard.example',

  // Optional. A URL that accepts a JSON POST and returns 2xx, for example a
  // Formspree or Basin form endpoint, or your own small API.
  // Leave empty and the form opens the visitor's email app with the ticket filled in.
  formEndpoint: '',

  // Guide prices per person per month (CAD), shown in the plan calculator.
  prices: { security: 30, managed: 100, office: 225 },

  city: 'Victoria, BC',
  timeZone: 'America/Vancouver',
  tzLabel: 'PT'
};
