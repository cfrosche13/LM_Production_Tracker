"""Builds css/spooky.css, the dark "Haunted House" Halloween theme for EGPrint
(the Operator Tracker, root index.html). Same palettes and fonts as EGDash's
dashboard/css/spooky.css.

EGPrint has hundreds of hard-coded colors (css/styles.css plus inline styles in
index.html and the js/ files), so instead of hand-writing overrides this script
maps every color it finds into the theme:
  - rules in css/styles.css are copied with each color swapped
  - inline colors get attribute-selector overrides (both the as-written form,
    e.g. "color:#cc3333", and the rgb() form the browser writes when js sets
    el.style.color)

Everything is scoped to body.sp-on, which js/halloween.js adds (with
sp-purple or sp-orange for the tab that's showing), so the theme switches off
with the rest of the Halloween decorations on Nov 1.

Run from the repo root:  python tools/build_spooky_css.py
Hand-written rules live in tools/spooky_manual.css and are appended last.
"""
import colorsys
import glob
import re

SCOPE = "body.sp-on"

# ── Palettes (CSS variables, switched by body class) ──
# "box" is the light middle tone for every card/box (owner request 2026-10-08: lighter boxes
# for contrast); "L-*" are the dark text colors used inside those boxes.
PALETTES = {
    "sp-purple": {  # Printing, Waiting, Colex, Settings
        "bg": "#3a3242", "bubble": "#4a4054", "inner": "#574c62", "soft": "#6c5f7a",
        "frame": "#a07cc5", "head": "#d9c2f0", "text": "#ece4d6", "muted": "#c3b8a8",
        "fill": "#7d55a8", "deep": "#2a2233",
        "box": "#d6c7ea", "L-text": "#2a1d3a", "L-head": "#4b2466", "L-muted": "#5d4b6b",
        "L-inner": "#ece2f7", "L-soft": "#a48cc4",
    },
    "sp-orange": {  # Maintenance, Stamped, Open Orders
        "bg": "#2b1e17", "bubble": "#3b2a20", "inner": "#4a3629", "soft": "#614636",
        "frame": "#e0904a", "head": "#f7c48f", "text": "#f2e6d6", "muted": "#c9b39b",
        "fill": "#b8621f", "deep": "#1d140f",
        "box": "#f2d2ad", "L-text": "#3a2414", "L-head": "#7a3d10", "L-muted": "#6b4a33",
        "L-inner": "#fbe6cf", "L-soft": "#c99a6e",
    },
}
# Status colors keep their meaning; brighter on the dark page, deeper inside the light boxes.
STATUS_DARK = {"red": "#ff8080", "orangetxt": "#ffa04d", "blue": "#9cc4ec", "purpletxt": "#c9a3f0",
               "pinklight": "#f0b6cf", "pink": "#ff7aa8", "redbg": "#4a2626", "redbg2": "#5a2a2a",
               "redborder": "#8a3a3a"}
STATUS_LIGHT = {"red": "#b3261e", "orangetxt": "#a65000", "blue": "#2a5d9f", "purpletxt": "#6b3fa0",
                "pinklight": "#a8326a", "pink": "#b0306a", "redbg": "#f4d4d4", "redbg2": "#ecc0c0",
                "redborder": "#d08080"}
# Declarations added to every light box: text and nested cells inside switch to the dark set.
LIGHT_BOX_VARS = " ".join(
    [f"--sp-{k}: var(--sp-L-{k});" for k in ("text", "head", "muted", "inner", "soft")]
    + [f"--sp-{k}: {v};" for k, v in STATUS_LIGHT.items()])
# And the reverse, for dark surfaces (the page itself, near-black header strips inside a box).
DARK_VARS = " ".join(
    [f"--sp-{k}: var(--sp-D-{k});" for k in ("text", "head", "muted", "inner", "soft")]
    + [f"--sp-{k}: {v};" for k, v in STATUS_DARK.items()])
# Page-level areas that the old light theme drew as boxes but are dark here: always light text.
DARK_AREAS = ["div.view", "#top-bar", "#nav-bar", "#transition-bar", "#pt-login-screen"]

HEX_RE = re.compile(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b")
RGBA_RE = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)")


def norm(h):
    h = h.lower()
    if len(h) == 4:
        h = "#" + "".join(c * 2 for c in h[1:])
    return h


def hsl(h):
    h = norm(h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    hue, light, sat = colorsys.rgb_to_hls(r, g, b)
    return hue * 360, sat, light


def family(h):
    hue, s, l = hsl(h)
    if s < 0.15:
        return "gray"
    if hue < 15 or hue >= 340: return "red"
    if hue < 45: return "orange"
    if hue < 70: return "yellow"
    if hue < 200: return "green"   # includes teal; EGPrint's brand greens
    if hue < 255: return "blue"
    if hue < 290: return "purple"
    return "pink"


V = lambda name: f"var(--sp-{name})"


def map_bg(h):
    fam, (_, s, l) = family(h), hsl(h)
    if l >= 0.93:
        return V("redbg") if fam == "red" else V("box")
    if l >= 0.80:
        return V("redbg2") if fam == "red" else V("inner")
    if l >= 0.30:
        if fam in ("green", "yellow"): return V("fill")
        return None                    # reds, oranges, blues, pinks keep their color (white text on them)
    # dark greens are filled buttons with white text (e.g. Stamped Start): use the theme fill
    if fam == "green": return V("fill")
    # near-black panels (e.g. the navy Cleaning Checklist header): the palette's deepest shade
    return V("deep") if l < 0.15 else None


def map_text(h):
    fam, (_, s, l) = family(h), hsl(h)
    if l > 0.95:
        return None                    # white text stays white
    if fam == "gray" or (fam == "blue" and s < 0.3):
        return V("text") if l < 0.45 else V("muted")
    if fam in ("green", "yellow"):
        if l < 0.25: return V("text")
        return V("head") if l < 0.5 else V("muted")
    return {"red": V("red"), "orange": V("orangetxt"), "blue": V("blue"),
            "purple": V("purpletxt"), "pink": V("pinklight") if l >= 0.6 else V("pink")}[fam]


def map_border(h):
    fam, (_, s, l) = family(h), hsl(h)
    if l >= 0.75:
        return V("redborder") if fam == "red" else V("soft")
    if fam in ("green", "yellow", "gray"):
        return V("frame")
    return None


def map_shadow(m):
    a = float(m.group(4)) if m.group(4) else 1.0
    return f"rgba(0,0,0,{min(0.6, round(a * 3, 2))})"


def swap_value(prop, value):
    """Return the value with its colors swapped for the theme, or None if nothing changes."""
    prop = prop.strip().lower()
    if "shadow" in prop:
        new = RGBA_RE.sub(map_shadow, value)
        new = HEX_RE.sub(lambda m: "rgba(0,0,0,0.4)", new)
        return new if new != value else None
    if prop in ("color", "fill", "caret-color") or prop.endswith("-color") and prop.startswith(("text", "outline")):
        mapper = map_text
    elif prop.startswith("background"):
        mapper = map_bg
    elif prop.startswith("border") or prop.startswith("outline") or prop == "scrollbar-color":
        mapper = map_border
    else:
        return None
    changed = False

    def sub(m):
        nonlocal changed
        out = mapper(m.group(0))
        if out is None:
            return m.group(0)
        changed = True
        return out
    new = HEX_RE.sub(sub, value)
    # rgba() backgrounds: overlays stay dark, light washes become transparent-ish
    if prop.startswith("background"):
        def rsub(m):
            nonlocal changed
            r, g, b = (int(m.group(i)) for i in (1, 2, 3))
            a = float(m.group(4)) if m.group(4) else 1
            if (r + g + b) / 3 > 200 and a < 1:
                changed = True
                return f"rgba(255,255,255,{round(a * 0.15, 3)})"
            return m.group(0)
        new = RGBA_RE.sub(rsub, new)
    return new if changed else None


FONT_HEAD = "'Jolly Lodger', 'Itim', sans-serif"  # owner pick 2026-10-08 (EGDash keeps Rubik Wet Paint)
FONT_BODY = "'Itim', 'Libre Franklin', sans-serif"  # owner pick 2026-10-08


def scoped(selectors):
    out = []
    for sel in selectors.split(","):
        sel = sel.strip()
        if not sel:
            continue
        if sel == "body":
            out.append(SCOPE)
        elif sel.startswith("body"):
            out.append(SCOPE + sel[4:])
        else:
            out.append(f"{SCOPE} {sel}")
    return ",\n".join(out)


def convert_stylesheet(css):
    """Copy every rule from styles.css that has a color or font, with the colors swapped."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    out, head_selectors = [], []

    def walk(text, wrapper=None):
        i = 0
        while i < len(text):
            brace = text.find("{", i)
            if brace < 0:
                break
            prelude = text[i:brace].strip()
            # find matching close brace
            depth, j = 1, brace + 1
            while depth and j < len(text):
                depth += {"{": 1, "}": -1}.get(text[j], 0)
                j += 1
            body = text[brace + 1:j - 1]
            i = j
            if prelude.startswith("@keyframes"):
                continue
            if prelude.startswith("@media"):
                walk(body, prelude)
                continue
            decls = []
            for d in body.split(";"):
                if ":" not in d:
                    continue
                prop, val = d.split(":", 1)
                prop = prop.strip().lower()
                if prop == "font-family" and "Abril Fatface" in val:
                    head_selectors.append(prelude)
                    continue
                new = swap_value(prop, val.strip())
                if new is not None:
                    decls.append(f"  {prop}: {new};")
            if any(d.strip().startswith("background") and "var(--sp-deep)" in d for d in decls):
                decls.append(f"  {DARK_VARS}")
            if any("var(--sp-box)" in d for d in decls):
                decls.append(f"  {LIGHT_BOX_VARS}")
                if not any(d.strip().startswith("color:") for d in decls):
                    decls.append("  color: var(--sp-text);")
            if decls:
                rule = f"{scoped(prelude)} {{\n" + "\n".join(decls) + "\n}"
                out.append(f"{wrapper} {{\n{rule}\n}}" if wrapper else rule)
    walk(css)
    return out, head_selectors


def rgb_text(h):
    h = norm(h)
    return f"rgb({int(h[1:3], 16)}, {int(h[3:5], 16)}, {int(h[5:7], 16)})"


INLINE_RE = re.compile(
    r"(?<![-\w])(background-color|background|color|border(?:-(?:top|bottom|left|right))?(?:-color)?)"
    r"(\s*:\s*)([^;\"'`{}<>]*?)(#[0-9a-fA-F]{6}(?![0-9a-fA-F])|#[0-9a-fA-F]{3}(?![0-9a-fA-F]))")
JS_STYLE_RE = re.compile(r"\.style\.(color|background(?:Color)?|border\w*Color)\s*=\s*[\"'](#[0-9a-fA-F]{3,6})[\"']")


def mapper_for(prop):
    if prop == "color": return map_text, "color"
    if prop.startswith("background"): return map_bg, "background"
    side = prop.split("-")[1] if prop.count("-") >= 1 and prop.split("-")[1] in ("top", "bottom", "left", "right") else None
    return map_border, (f"border-{side}-color" if side else "border-color")


def inline_rules(sources, js_sources):
    """Attribute-selector overrides for colors written straight into style="..." in index.html
    and js/ markup, matched by the exact text as written (plus the rgb() form the browser
    writes when js sets el.style.* or cssText)."""
    found = {}   # selector text -> (css property, new value, sort length)

    def add(sel_texts, out_prop, val, length):
        for t in sel_texts:
            found[t] = (out_prop, val, length)

    for src in sources:
        for m in INLINE_RE.finditer(src):
            prop, sep, mid, hexv = m.group(1).lower(), m.group(2), m.group(3), m.group(4).lower()
            mapper, out_prop = mapper_for(prop)
            val = mapper(hexv)
            if val is None:
                continue
            text = f"{prop}{sep}{mid}{hexv}".replace('"', "")
            sels = ([f'[style^="{text}" i]', f'[style*=";{text}" i]', f'[style*="; {text}" i]']
                    if prop == "color" else [f'[style*="{text}" i]'])
            add(sels, out_prop, val, len(text))
    for src in js_sources:   # js sets colors through the style object or cssText: browser writes rgb()
        hexes = {(m.group(1).lower(), m.group(4).lower()) for m in INLINE_RE.finditer(src)}
        hexes |= {({"backgroundcolor": "background"}.get(m.group(1).lower(), m.group(1).lower()), m.group(2).lower())
                  for m in JS_STYLE_RE.finditer(src)}
        for prop, hexv in hexes:
            mapper, out_prop = mapper_for("border-color" if "border" in prop else prop)
            val = mapper(hexv)
            if val is None:
                continue
            rgb = rgb_text(hexv)
            if prop == "color":
                add([f'[style^="color: {rgb}"]', f'[style*="; color: {rgb}"]'], out_prop, val, 99)
            elif prop.startswith("background"):
                add([f'[style*="background: {rgb}"]', f'[style*="background-color: {rgb}"]'], out_prop, val, 99)
            else:
                add([f'[style*="solid {rgb}"]', f'[style*="border-color: {rgb}"]'], "border-color", val, 99)

    # Group selectors that share a property + value; shorter text first, since "background:#fff"
    # also matches the start of "background:#fff0f0" and the longer one has to come later to win.
    groups = {}
    for sel, (prop, val, length) in found.items():
        groups.setdefault((length, prop, val), []).append(sel)
    rules = []
    for (length, prop, val), sels in sorted(groups.items(), key=lambda kv: kv[0][0]):
        sel = ",\n".join(f"{SCOPE} {s}" for s in sorted(sels))
        if prop == "background":
            # a light box also switches the text inside it to the dark set (plain color: only
            # applies when the inline style sets no text color of its own)
            extra = (f" {LIGHT_BOX_VARS} color: var(--sp-text);" if val == V("box")
                     else f" {DARK_VARS}" if val == V("deep") else "")
            rules.append(f"{sel} {{ background-color: {val} !important; background-image: none !important;{extra} }}")
        else:
            rules.append(f"{sel} {{ {prop}: {val} !important; }}")
    return rules


def main():
    styles = open("css/styles.css", encoding="utf-8-sig").read()
    js_sources = [open(f, encoding="utf-8").read() for f in sorted(glob.glob("js/*.js")) if not f.endswith("halloween.js")]
    sources = [open("index.html", encoding="utf-8").read()] + js_sources

    sheet_rules, head_selectors = convert_stylesheet(styles)
    parts = [
        "/* GENERATED by tools/build_spooky_css.py; don't edit by hand.\n"
        "   Dark \"Haunted House\" Halloween theme for EGPrint; active only while js/halloween.js\n"
        "   puts body.sp-on on the page (it turns itself off Nov 1). */\n",
    ]
    for cls, pal in PALETTES.items():
        parts.append(f"body.{cls} {{\n" + "\n".join(f"  --sp-{k}: {v};" for k, v in {**pal, **{f"D-{k}": pal[k] for k in ("text", "head", "muted", "inner", "soft")}, **STATUS_DARK}.items()) + "\n}")
    parts.append("\n/* ── Fonts: Itim body, Jolly Lodger headers ── */")
    parts.append(f"{SCOPE}, {SCOPE} * {{ font-family: {FONT_BODY} !important; }}")
    heads = [scoped(s) for s in head_selectors] + [f'{SCOPE} [style*="Abril Fatface"]']
    parts.append(",\n".join(heads) + f" {{ font-family: {FONT_HEAD} !important; font-weight: 400 !important; font-size-adjust: 0.72; letter-spacing: 0.02em; }}")  # Jolly Lodger is narrow with short lowercase: scale it up to a normal height
    parts.append("\n/* ── css/styles.css with colors swapped ── */")
    parts += sheet_rules
    parts.append("\n/* ── Inline colors (index.html and js/) ── */")
    parts += inline_rules(sources, js_sources)
    parts.append("\n/* ── Page-level areas stay dark with light text (even where the old theme drew a box) ── */")
    parts.append(",\n".join([SCOPE] + [f"{SCOPE} {a}" for a in DARK_AREAS]) + " { " + DARK_VARS.replace(";", " !important;") + " color: var(--sp-text) !important; }")
    parts.append("\n/* ── Hand-written (tools/spooky_manual.css) ── */")
    parts.append(open("tools/spooky_manual.css", encoding="utf-8").read())
    open("css/spooky.css", "w", encoding="utf-8", newline="\n").write("\n".join(parts) + "\n")
    print(f"css/spooky.css: {len(sheet_rules)} stylesheet rules, "
          f"{len(head_selectors)} header selectors")


if __name__ == "__main__":
    main()
