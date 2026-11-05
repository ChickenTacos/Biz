#!/usr/bin/env python3
"""
Lanyard brand generator.

Builds every logo file (mark, app icon, wordmark, lockups, favicon) from one
set of geometry, so a rename or colour change stays consistent everywhere.

    pip install fonttools brotli
    python tools/make_brand.py                 # default name "lanyard"
    python tools/make_brand.py --name acme     # regenerate wordmarks for a new name

The wordmark is set in Martian Mono (SIL Open Font License) at weight 700,
width 112.5, tracking -0.05em, then converted to outlines so the SVG files
render the same everywhere without the font installed.
"""
import argparse
import pathlib

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT = ROOT / "assets" / "fonts" / "martian-mono.woff2"
OUT = ROOT / "assets" / "brand"

# Brand colours (keep in sync with :root tokens in assets/css/main.css)
BLUE = "#1f2bff"    # Setup Blue: the BIOS-screen field colour
YELLOW = "#ffe14a"  # Select Yellow: the highlighted-option colour
INK = "#0b0f2a"     # Ink: text on light backgrounds
PAPER = "#eef0f6"   # Paper: light background
WHITE = "#ffffff"


def mark(strap, clip, card, contacts=True, x=0.0, y=0.0, s=1.0):
    """The lanyard mark on a 64-unit grid: strap, RJ45 clip, card (cursor)."""
    g = [f'<g transform="translate({x:g} {y:g}) scale({s:g})">']
    g.append(
        f'<path d="M17.5 4.5 29.2 22M46.5 4.5 34.8 22" fill="none" stroke="{strap}" '
        'stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>'
    )
    # RJ45 plug body, with four contact slits cut out (even-odd) when contacts is True
    body = "M27.1 20h9.8a1.6 1.6 0 0 1 1.6 1.6v6.8a1.6 1.6 0 0 1-1.6 1.6h-9.8a1.6 1.6 0 0 1-1.6-1.6v-6.8a1.6 1.6 0 0 1 1.6-1.6z"
    slits = "".join(f"M{cx - 0.6:.1f} 21.9h1.2v4.4h-1.2z" for cx in (28.1, 30.7, 33.3, 35.9))
    if contacts:
        g.append(f'<path fill="{clip}" fill-rule="evenodd" d="{body}{slits}"/>')
    else:
        g.append(f'<path fill="{clip}" d="{body}"/>')
    g.append(f'<path fill="{clip}" d="M29 29.5h6v4.3a1.2 1.2 0 0 1-1.2 1.2h-3.6a1.2 1.2 0 0 1-1.2-1.2z"/>')
    g.append(f'<rect fill="{card}" x="17.5" y="35" width="29" height="24" rx="3.6"/>')
    g.append("</g>")
    return "".join(g)


def wordmark_paths(name):
    font = TTFont(str(FONT))
    inst = instantiateVariableFont(font, {"wght": 700, "wdth": 112.5})
    gs = inst.getGlyphSet()
    cmap = inst.getBestCmap()
    upm = inst["head"].unitsPerEm
    track = -0.05 * upm
    pen, bounds = SVGPathPen(gs), BoundsPen(gs)
    x = 0.0
    for ch in name:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        gs[g].draw(TransformPen(bounds, (1, 0, 0, -1, x, 0)))
        x += gs[g].width + track
    us_pen, us_bounds = SVGPathPen(gs), BoundsPen(gs)
    us = cmap[ord("_")]
    gs[us].draw(TransformPen(us_pen, (1, 0, 0, -1, x, 0)))
    gs[us].draw(TransformPen(us_bounds, (1, 0, 0, -1, x, 0)))
    return {
        "d": pen.getCommands(),
        "bounds": bounds.bounds,
        "cursor_d": us_pen.getCommands(),
        "cursor_bounds": us_bounds.bounds,
        "upm": upm,
    }


def svg(w, h, body, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" '
        f'width="{w:g}" height="{h:g}" role="img" aria-label="{title}">'
        f"<title>{title}</title>{body}</svg>\n"
    )


def build(name):
    OUT.mkdir(parents=True, exist_ok=True)
    title = name.capitalize()
    wm = wordmark_paths(name)
    x0, y0, x1, y1 = wm["bounds"]
    cx1 = wm["cursor_bounds"][2]

    # Mark only (transparent background)
    (OUT / "mark-on-light.svg").write_text(svg(64, 64, mark(BLUE, BLUE, INK), f"{title} mark"))
    (OUT / "mark-on-dark.svg").write_text(svg(64, 64, mark(WHITE, WHITE, YELLOW), f"{title} mark"))

    # App icon (squircle) and favicon (simplified, no contact slits)
    icon_bg = f'<rect width="64" height="64" rx="14" fill="{BLUE}"/>'
    (OUT / "icon.svg").write_text(svg(64, 64, icon_bg + mark(WHITE, WHITE, YELLOW), f"{title}"))
    (ROOT / "favicon.svg").write_text(svg(64, 64, icon_bg + mark(WHITE, WHITE, YELLOW, contacts=False), f"{title}"))

    # Wordmark with cursor underscore. Font units -> 1 unit = 1/1000 em.
    pad = 40
    ww, wh = (cx1 - x0) + pad * 2, (y1 - y0) + pad * 2
    tx, ty = -x0 + pad, -y0 + pad

    def wordmark(fg, cursor):
        return (
            f'<g transform="translate({tx:g} {ty:g})"><path fill="{fg}" d="{wm["d"]}"/>'
            f'<path fill="{cursor}" d="{wm["cursor_d"]}"/></g>'
        )

    (OUT / "wordmark-on-light.svg").write_text(svg(round(ww), round(wh), wordmark(INK, BLUE), title))
    (OUT / "wordmark-on-dark.svg").write_text(svg(round(ww), round(wh), wordmark(WHITE, YELLOW), title))

    # Horizontal lockup: mark at 64 units tall, wordmark x-height optically matched.
    s = 34 / 848  # ascender of the bold "l" -> 34 units
    lock_w = 64 + 14 + (cx1 - x0) * s + 4
    def lockup(strap, card, fg, cursor):
        return (
            mark(strap, strap, card)
            + f'<g transform="translate({78 - x0 * s:g} {49:g}) scale({s:g})">'
            f'<path fill="{fg}" d="{wm["d"]}"/><path fill="{cursor}" d="{wm["cursor_d"]}"/></g>'
        )

    (OUT / "logo-on-light.svg").write_text(svg(round(lock_w, 1), 64, lockup(BLUE, INK, INK, BLUE), title))
    (OUT / "logo-on-dark.svg").write_text(svg(round(lock_w, 1), 64, lockup(WHITE, YELLOW, WHITE, YELLOW), title))
    print(f"brand files written to {OUT.relative_to(ROOT)} and favicon.svg")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--name", default="lanyard", help="lower-case brand name for the wordmark")
    build(ap.parse_args().name)
