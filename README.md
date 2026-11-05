# Lanyard Systems · website

![Lanyard: first login to last logoff](assets/img/og-image.png)

The website for **Lanyard**, a managed IT company for businesses without an IT department: endpoint management, onboarding, offboarding, help desk and IT projects, based in Victoria, BC.

It's a static site. There's no build step, no framework, no dependencies, no cookies and no trackers. Drop the folder on any web host and it works.

> **Lanyard** is a working name. See [Renaming the company](#renaming-the-company) when you pick the real one.

---

## Preview it

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Opening `index.html` straight from disk also works. Two things need a real server: the terminal's `ping` command and the git-log hash check, which needs https or localhost.

Add `?noboot` to the URL to skip the boot screen while you work. It plays once per browser session anyway.

## What's on the page

The whole site is built around one idea: it's a sysadmin's console. Each section is a real IT artifact rather than a stock photo.

| Section | What it is |
|---|---|
| Boot screen | A BIOS-style POST log built from the visitor's actual device (CPU threads, memory, display, GPU, locale). Values are read locally and never sent anywhere. |
| Status bar | A tmux-style bar with section "windows", a Vim-style scroll ruler (`Top`, `42%`, `Bot`), the Victoria clock, theme toggle and terminal button. |
| Hero | Real-time ray-marched 3D endpoints (laptop, phone, ID badge, desktop) rendered as ASCII on the GPU. Hover to "inspect" (glyphs turn to hex); click to switch device. |
| Ticker | `tail -f demo.log`: an example activity log. |
| Services | `ls -l ~/services`: each service is a directory that opens to show what's included and a real PowerShell or Microsoft Graph snippet. |
| Lifecycle | A CI-style **joiner** and **leaver** pipeline that streams its log. The leaver run ends with a real SHA-256 of its own log. |
| Fleet | A 64-device demo fleet. Push an update in rings (pilot, early, broad) or fix drift, including an in-place Windows 10 → 11 upgrade. The visitor's own device is the yellow tile. |
| Your device | What a browser can see about the visitor's device, and the six things it can't (encryption, patch level and so on). That gap is the sales pitch for endpoint management. Windows 10 visitors get an end-of-support notice. |
| Process | `traceroute your-company`: six hops from intro call to monthly report. |
| Plans | Three modes as CLI flags: `--fully-managed`, `--co-managed`, `--project`. |
| About | A founder ID badge hanging from a physics-simulated lanyard (drag it), a `neofetch` summary, and the career highlights as a `git log` whose hashes are real SHA-1s, verified in the browser. |
| FAQ | A man page: `LANYARD(1)`. |
| Contact | The form is a support ticket with a live `ticket.json` preview. |
| Footer | `logout`, the session's length, and this page's real weight and load time. |
| Terminal | Press <kbd>`</kbd> anywhere. Try `help`, `scan`, `neofetch`, `onboard Alex`, `ping`, `traceroute`, `sudo`. |

Everything respects `prefers-reduced-motion`. The page is fully readable without JavaScript, works with a keyboard (skip link, focus states, arrow keys in the fleet grid), and has light and dark themes.

## Before you go live

1. **Domain.** Replace `lanyard.example` with your domain in `index.html` (canonical, Open Graph and JSON-LD), `robots.txt`, `sitemap.xml`, `.well-known/security.txt`, `assets/js/config.js` and `deploy/nginx/lanyard.conf`.
2. **Email.** Replace `hello@lanyard.example` in `assets/js/config.js`, `index.html` and `humans.txt`, and `security@lanyard.example` in `.well-known/security.txt`. The script updates the visible addresses from `config.js`, but the HTML keeps a copy for people without JavaScript.
3. **Contact form.** By default, submitting opens the visitor's email app with the ticket filled in. To receive tickets directly, create a form endpoint (for example Formspree or Basin, or your own API) and put its URL in `formEndpoint` in `assets/js/config.js`. Then add that origin to `connect-src` in your Content Security Policy (see below).
4. **Check every claim.** Make sure each of these is something you're happy to commit to:
   - "accepting new clients", "on-site across Greater Victoria", "remote across Canada"
   - process timings (`1–2 wk` and so on) and the FAQ answers (team sizes, pricing model)
   - the plans' pricing models ("monthly, per person", "monthly, per device")
   - the platforms listed under each service. Several (Intune, Autopilot, Apple Business Manager, Android Enterprise) aren't in your CV; keep only what you'll support.
   - **Training:** ITIL 4 Foundation and CompTIA Security+ are listed under *training*, because your CV shows the courses but not the exam results. If you've passed them, say *certified* in the `neofetch` block (`index.html`) and in the terminal's `about.txt` (`assets/js/terminal.js`).
   - **Security.txt** expires on 2027-11-01. Update it before then.
5. **Your background.** The About section describes your current job only as "a secure federal defence environment". Your clearance level, unit, internal system names, colleagues' names and their quotes were left out on purpose. Before publishing, check what your employer allows public servants to say publicly, and its rules on outside work.
6. **Regenerate the share image** if you change the headline (see [Tools](#tools)).

## Deploy

Upload everything **except** `deploy/` and `tools/` to the root of your domain. The 404 page uses root-relative paths, so the site expects to live at `/`, not in a subfolder.

| Host | Notes |
|---|---|
| **Netlify** or **Cloudflare Pages** | Drag and drop the folder or connect this repo. `_headers` applies the security and caching headers. `404.html` is picked up automatically. |
| **Apache / shared hosting** | `.htaccess` sets the headers, compression, caching and the 404 page. Uncomment the HTTPS redirect if your host doesn't already do it. |
| **nginx (your own server)** | Use `deploy/nginx/lanyard.conf` and `deploy/nginx/security-headers.conf`. Steps are in the comments at the top. Certificates come from `certbot`. |
| **GitHub Pages** | Works, but it can't set custom headers, so you lose the CSP and friends. |

### Security headers

All three configs send the same policy:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self';
  font-src 'self'; connect-src 'self'; manifest-src 'self'; frame-ancestors 'none';
  base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests
```

The site has no inline scripts, no inline styles and no third-party requests, so it runs under this strict policy without `unsafe-inline`. It was tested that way. The configs also set HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` and `Cross-Origin-Opener-Policy`. Check the result at <https://securityheaders.com> once it's live.

## Renaming the company

1. Regenerate the logo files with the new name. The wordmark is converted to outlines, so the SVGs don't need the font installed:
   ```bash
   pip install fonttools brotli
   python tools/make_brand.py --name newname
   ```
2. Search and replace `Lanyard` / `lanyard` across `index.html`, `404.html`, `assets/js/*.js`, `site.webmanifest`, `humans.txt` and `README.md`. The strap text on the founder badge is in `index.html` (`data-strap-text`).
3. Regenerate the images (next section).

The mark (a lanyard strap, an RJ45 network-plug clip, and an ID card that doubles as a terminal cursor) isn't tied to the name, so it can stay.

## Tools

| File | What it does |
|---|---|
| `tools/make_brand.py` | Builds every logo file in `assets/brand/` plus `favicon.svg` from one set of geometry. |
| `tools/render-images.js` | Renders `assets/img/og-image.png` (from `tools/og-card.html`, including a live ASCII frame) and the PNG app icons. Needs Node and Playwright. |
| `tools/make_favicon.py` | Packs the rendered favicon PNGs into `favicon.ico`. Needs Pillow. |

```bash
node tools/render-images.js && python tools/make_favicon.py && rm tools/.favicon-*.png
```

## Brand

| Token | Value | Use |
|---|---|---|
| Setup Blue | `#1f2bff` | The BIOS-screen field: hero, footer, primary buttons |
| Select Yellow | `#ffe14a` | Highlighted option: cursor, focus, accents on blue |
| Phosphor | `#5ff3ff` | Emissive glyphs and code keywords on dark |
| Ink | `#0b0f2a` | Text on light |
| Paper | `#eef0f6` | Light background |

Type: **Martian Mono** (display, labels, data) and **Atkinson Hyperlegible Next** (reading). Atkinson was designed so that 0/O and 1/l/I can't be confused, which matters when someone reads you a recovery key over the phone. Logo files are in `assets/brand/`: mark, app icon, wordmark and horizontal lockup, each in on-light and on-dark versions.

## Structure

```
index.html            the site
404.html              not-found page
assets/
  css/main.css        all styles; colour tokens at the top
  js/                 one small file per feature, no dependencies
    config.js         your settings: email, form endpoint, time zone
    ascii.js          WebGL ray-marcher and ASCII renderer (hero)
    badge.js          verlet-rope lanyard and Code 39 barcode
    boot.js           boot screen
    contact.js        ticket form
    device.js         what the browser reveals about the visitor's device
    fleet.js          fleet demo and the "your device" panel
    pipeline.js       joiner and leaver runs
    terminal.js       the ` terminal
    ui.js             status bar, clocks, theme, ticker and small effects
  fonts/              self-hosted WOFF2 files and their licences
  brand/              logo files
  img/og-image.png    social share image
_headers, .htaccess   host configs (Netlify/Cloudflare, Apache)
deploy/nginx/         nginx configs
.well-known/security.txt, humans.txt, robots.txt, sitemap.xml, site.webmanifest
tools/                logo and image generators (don't deploy)
```

## Credits

- Martian Mono © The Martian Mono Project Authors (Evil Martians), SIL Open Font License 1.1, `assets/fonts/OFL-MartianMono.txt`
- Atkinson Hyperlegible Next © The Atkinson Hyperlegible Next Project Authors (Braille Institute), SIL Open Font License 1.1, `assets/fonts/OFL-AtkinsonHyperlegibleNext.txt`
- Product names mentioned on the site belong to their owners and are used only to describe compatible services.
