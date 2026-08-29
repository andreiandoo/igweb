#!/usr/bin/env python3
"""
Pregăteşte ilustraţiile pentru web: taie marginile transparente, redimensionează
şi exportă AVIF + WebP în assets/img/.

    python _tools/6-graphics.py

Sursele stau în _sursa/graphics/ (PNG, fundal transparent) şi NU se publică —
sunt de 1–2 MB fiecare. Rezultatul are câteva zeci de kilooctei.

Cere Pillow:  pip install Pillow
Se rulează doar când primeşti grafică nouă; restul build-ului e Node.
"""

import json
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Lipseşte Pillow. Instalează cu:  pip install Pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "_sursa", "graphics")
OUT = os.path.join(HERE, "..", "assets", "img", "ill")
MANIFEST = os.path.join(HERE, "..", "site", "illustrations.json")

# sursă  →  (nume final, lăţime maximă)
GRAPHICS = {
    "parinti - hero image.png":        ("hero-parinti",        900),
    "home sus sportiv.png":            ("hero-rol-sportiv",    620),
    "home sus parinte.png":            ("hero-rol-parinte",    620),
    "home sus antrenor.png":           ("hero-rol-antrenor",   620),
    "home sus club.png":               ("hero-rol-club",       900),
    "Home  Motivație prin joc.png":    ("acasa-motivatie",    1100),
    "Home Control pentru echipă.png":  ("acasa-control",      1100),
    "Home  Sigur și transparent.png":  ("acasa-siguranta",    1100),
}

QUALITY_WEBP = 82
QUALITY_AVIF = 60          # AVIF arată bine la calitate mai mică decât WebP


def kb(path):
    return os.path.getsize(path) / 1024


def main():
    os.makedirs(OUT, exist_ok=True)
    total_src = total_out = 0
    missing = []
    manifest = {}

    for filename, (slug, max_w) in GRAPHICS.items():
        src = os.path.join(SRC, filename)
        if not os.path.isfile(src):
            missing.append(filename)
            continue

        total_src += kb(src)
        im = Image.open(src).convert("RGBA")

        # 1. taie zona complet transparentă din jur
        box = im.getchannel("A").getbbox()
        if box:
            im = im.crop(box)

        # 2. redimensionează doar în jos, niciodată în sus
        if im.width > max_w:
            h = round(im.height * max_w / im.width)
            im = im.resize((max_w, h), Image.LANCZOS)

        made = []
        for ext, params in (
            ("avif", dict(quality=QUALITY_AVIF)),
            ("webp", dict(quality=QUALITY_WEBP, method=6)),
        ):
            dst = os.path.join(OUT, f"{slug}.{ext}")
            im.save(dst, **params)
            total_out += kb(dst)
            made.append(f"{ext} {kb(dst):.0f} KB")

        manifest[slug] = {"w": im.width, "h": im.height}
        print(f"  {slug:<20} {im.width}x{im.height}  " + " · ".join(made))

    # Dimensiunile ajung în build.mjs (marcajul {{ill:…}}) ca <img> să aibă
    # width/height şi pagina să nu sară la încărcare. Manifestul stă în site/,
    # nu în assets/, ca să nu fie publicat degeaba.
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(manifest.items())), f, indent=2)
        f.write("\n")

    if missing:
        print("\n  Lipsesc din _sursa/graphics/:")
        for m in missing:
            print(f"    - {m}")

    print(f"\n  surse {total_src / 1024:.1f} MB  →  publicat {total_out / 1024:.2f} MB")
    print("  Nu uita `npm run build` după.")


if __name__ == "__main__":
    main()
