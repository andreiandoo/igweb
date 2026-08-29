#!/usr/bin/env python3
"""
Taie plansa cu Growie in ipostaze separate.

    python _tools/8-growies.py            # doar raporteaza ce a gasit
    python _tools/8-growies.py --scrie    # scrie si fisierele

Sursa e _sursa/graphics/growies.png, o plansa cu fundal transparent. Fiecare
ipostaza e o insula de pixeli opaci; le gasesc prin etichetare de componente
conexe, dupa o dilatare care lipeste accesoriile (scanteile, inima, mingea) de
corpul de care apartin.

Rezultatul: assets/img/growie/<nume>.avif + .webp, plus dimensiunile in
site/growies.json, la fel ca la ilustratii.

Cere Pillow si numpy.
"""

import json
import os
import sys
from collections import deque

try:
    import numpy as np
    from PIL import Image, ImageFilter
except ImportError:
    sys.exit("Lipseste Pillow sau numpy. Instaleaza cu:  pip install Pillow numpy")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "_sursa", "graphics", "growies.png")
OUT = os.path.join(HERE, "..", "assets", "img", "growie")
MANIFEST = os.path.join(HERE, "..", "site", "growies.json")

ALPHA_MIN = 24        # sub asta consider pixelul transparent
DILATE = 11           # raza de lipire a accesoriilor de corp (pixeli)
MIN_AREA = 4000       # sub asta e zgomot, nu ipostaza
MAX_WIDTH = 440       # latimea maxima a unei ipostaze exportate
QUALITY_WEBP = 82
QUALITY_AVIF = 60


def components(mask):
    """Componente conexe (8-vecini) pe o masca booleana, prin parcurgere in latime."""
    h, w = mask.shape
    seen = np.zeros((h, w), dtype=bool)
    out = []

    for y0 in range(h):
        row = mask[y0]
        for x0 in np.nonzero(row & ~seen[y0])[0]:
            q = deque([(y0, int(x0))])
            seen[y0, x0] = True
            pixels = []

            while q:
                y, x = q.popleft()
                pixels.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))

            if len(pixels) < MIN_AREA:
                continue
            ys = [p[0] for p in pixels]
            xs = [p[1] for p in pixels]
            out.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1))

    return out


def in_reading_order(boxes):
    """Ordoneaza pe randuri: intai dupa banda verticala, apoi de la stanga la dreapta."""
    if not boxes:
        return []
    heights = sorted(b[3] - b[1] for b in boxes)
    tolerance = heights[len(heights) // 2] * 0.5

    rows = []
    for box in sorted(boxes, key=lambda b: b[1]):
        centre = (box[1] + box[3]) / 2
        for row in rows:
            if abs(centre - row[0]) < tolerance:
                row[1].append(box)
                break
        else:
            rows.append((centre, [box]))

    return [b for _, row in rows for b in sorted(row, key=lambda b: b[0])]


def main():
    write = "--scrie" in sys.argv

    sheet = Image.open(SRC).convert("RGBA")
    alpha = np.array(sheet.getchannel("A"))

    # dilatarea lucreaza pe o masca separata; decupez tot din imaginea originala
    grown = Image.fromarray(((alpha >= ALPHA_MIN) * 255).astype(np.uint8), "L")
    grown = grown.filter(ImageFilter.MaxFilter(DILATE))

    boxes = in_reading_order(components(np.array(grown) > 127))
    print(f"  {len(boxes)} ipostaze gasite in {sheet.width}x{sheet.height}\n")

    names = json.load(open(os.path.join(HERE, "growies-names.json"), encoding="utf-8")) \
        if os.path.exists(os.path.join(HERE, "growies-names.json")) else {}

    manifest = {}
    if write:
        os.makedirs(OUT, exist_ok=True)

    total = 0
    for i, (x0, y0, x1, y1) in enumerate(boxes):
        crop = sheet.crop((x0, y0, x1, y1))
        box = crop.getchannel("A").getbbox()      # strang la continutul real
        if box:
            crop = crop.crop(box)
        if crop.width > MAX_WIDTH:
            crop = crop.resize((MAX_WIDTH, round(crop.height * MAX_WIDTH / crop.width)), Image.LANCZOS)

        name = names.get(str(i))
        label = name or f"(nefolosit #{i})"
        print(f"  {i:>2}  {label:<22} {crop.width}x{crop.height}  la {x0},{y0}")

        if not (write and name):
            continue

        for ext, params in (("avif", dict(quality=QUALITY_AVIF)),
                            ("webp", dict(quality=QUALITY_WEBP, method=6))):
            path = os.path.join(OUT, f"{name}.{ext}")
            crop.save(path, **params)
            total += os.path.getsize(path)
        manifest[name] = {"w": crop.width, "h": crop.height}

    if write:
        with open(MANIFEST, "w", encoding="utf-8") as f:
            json.dump(dict(sorted(manifest.items())), f, indent=2)
            f.write("\n")
        print(f"\n  {len(manifest)} ipostaze scrise · {total / 1024:.0f} KB")
        print("  Nu uita `npm run build` dupa.")
    else:
        print("\n  Nimic scris. Ruleaza cu --scrie dupa ce numesti ipostazele")
        print("  in _tools/growies-names.json (indice -> nume).")


if __name__ == "__main__":
    main()
