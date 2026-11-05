# Lanyard · website

![Lanyard: your IT department, without hiring one.](assets/img/og-image.png)

The website for **Lanyard**, a managed IT company for small businesses in Victoria, BC. It's written for business owners, not IT people: plain English, short sections, clear prices.

It's a static site: no build step, no framework, no cookies, no trackers. Drop the folder on any web host and it works.

> **Lanyard** is a working name. See [Renaming the company](#renaming-the-company) when you pick the real one.

## Preview it

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## What's on the page

1. **Hero:** "Your IT department, without hiring one," with a live "Your business today" card that ticks off what we handled (computers protected, backup done, scam emails stopped) and pops up small updates.
2. **What is managed IT?** Three plain answers: we set it up, we keep it safe, we're here when you need us.
3. **Services:** computers, email and scam protection, Wi-Fi and network security, Microsoft 365, backups, business phones, new staff and leavers, help desk, hardware and leasing.
4. **How it works:** free IT check, a clear plan, we set it up, we look after it.
5. **Pricing:** Security Essentials, Managed Services and Office in a Box, with a slider that shows the monthly total for your team size.
6. **Why Lanyard:** plain English, local, predictable price, your data stays yours.
7. **FAQ** and a **"Book a free IT check"** form.

## Before you go live

1. **Domain.** Replace `lanyard.example` in `index.html` (canonical, Open Graph, JSON-LD), `robots.txt`, `sitemap.xml`, `.well-known/security.txt` and `deploy/nginx/lanyard.conf`.
2. **Email.** Replace `hello@lanyard.example` in `assets/js/config.js`, `index.html` and `humans.txt`, and `security@lanyard.example` in `.well-known/security.txt`.
3. **Prices.** Change them in one place: `prices` in `assets/js/config.js` (the numbers in `index.html` are only the fallback).
4. **Contact form.** By default, submitting opens the visitor's email app with their request filled in. To receive requests directly, put a form endpoint (Formspree, Basin or your own) in `formEndpoint` in `assets/js/config.js`, and add its origin to `connect-src` in the Content Security Policy.
5. **Phone number.** If you want one on the site, add it to the contact section and footer in `index.html`.
6. **Check the promises** match what you and your partners deliver: on-site visits in Victoria, 24/7 support on request, "back up in hours, not weeks", hardware leasing and discounts, unlimited North America calling, and "leave any time and we'll hand everything over".
7. **Security.txt** expires on 2027-11-01. Update it before then.

## Deploy

Upload everything **except** `deploy/` and `tools/` to the root of your domain.

| Host | Notes |
|---|---|
| **Netlify** or **Cloudflare Pages** | Drag and drop or connect this repo. `_headers` sets security and caching headers. `404.html` is picked up automatically. |
| **Apache / shared hosting** | `.htaccess` sets headers, compression, caching and the 404 page. |
| **nginx** | `deploy/nginx/lanyard.conf` + `deploy/nginx/security-headers.conf`. Steps are in the comments. |
| **GitHub Pages** | Works, but can't set custom headers. |

All configs send a strict Content Security Policy (`default-src 'self'`, no `unsafe-inline`). The site has no inline scripts or styles, makes no third-party requests, and was tested under that policy.

## Renaming the company

1. Regenerate the logo files (needs `pip install fonttools brotli`):
   ```bash
   python tools/make_brand.py --name newname
   ```
2. Search and replace `Lanyard` / `lanyard` across `index.html`, `404.html`, `site.webmanifest`, `humans.txt` and this README.
3. Regenerate the share image and icons (needs Node, Playwright and Pillow):
   ```bash
   node tools/render-images.js && python tools/make_favicon.py
   ```

## Brand

| Colour | Value | Use |
|---|---|---|
| Lanyard Blue | `#1f2bff` | Hero, contact section, main plan, links |
| Yellow | `#ffe14a` | Main buttons and small highlights |
| Ink | `#0b0f2a` | Text and footer |
| Soft grey | `#f4f6fb` | Alternate section background |

Type: **Instrument Sans** for everything people read, **Martian Mono** for the wordmark and small labels. Both are self-hosted. Logo files are in `assets/brand/`.

## Structure

```
index.html            the site
404.html              not-found page
assets/
  css/main.css        all styles; colours at the top
  js/
    config.js         your settings: email, form endpoint, prices, time zone
    ui.js             header, mobile menu, the live hero card
    plans.js          pricing slider
    contact.js        free IT check form
    util.js, main.js  helpers and start-up
  fonts/              WOFF2 files and their licences
  brand/              logo files
  img/og-image.png    social share image
_headers, .htaccess   host configs
deploy/nginx/         nginx configs
tools/                logo and image generators (don't deploy)
```

## Credits

- Instrument Sans © The Instrument Sans Project Authors, SIL Open Font License 1.1, `assets/fonts/OFL-InstrumentSans.txt`
- Martian Mono © The Martian Mono Project Authors (Evil Martians), SIL Open Font License 1.1, `assets/fonts/OFL-MartianMono.txt`
- Product names belong to their owners.
