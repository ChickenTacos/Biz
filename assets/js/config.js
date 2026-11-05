/* Site settings. Change these before you go live.
   The email address also appears in index.html (links and JSON-LD),
   .well-known/security.txt and humans.txt; see README.md. */
window.LY = window.LY || {};
window.LY.config = {
  email: 'hello@lanyard.example',

  // Optional. A URL that accepts a JSON POST and returns 2xx, for example a
  // Formspree or Basin form endpoint, or your own small API.
  // Leave empty and the form opens the visitor's email app with the message filled in.
  formEndpoint: '',

  // Guide prices per person per month (CAD), used by the pricing calculator.
  prices: { security: 30, managed: 100, office: 225 },

  // Used for the clock on the "Your business today" card.
  timeZone: 'America/Vancouver'
};
