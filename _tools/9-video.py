#!/usr/bin/env python3
"""
Pregăteşte clipurile pentru web: le mută în assets/video/ cu „faststart" şi le
scoate un poster din primul cadru.

    python _tools/9-video.py

Ce face şi de ce:

1. Mută atomul `moov` (indexul clipului) înaintea lui `mdat` (datele). Fără el,
   browserul trebuie să descarce tot fişierul ca să afle cum să-l redea — adică
   megaocteţi întregi înainte de primul cadru. Este exact ce face
   `ffmpeg -movflags +faststart`, doar că nu recodează nimic: aceiaşi octeţi,
   rearanjaţi. Offset-urile din `stco`/`co64` se corectează cu mărimea lui
   `moov`, fiindcă sunt absolute în fişier.

2. Scrie dimensiunile şi durata în site/videos.json, pentru marcajul
   {{video:slug|…}} din build.mjs.

Posterul (primul cadru) se face separat, cu _tools/9-video-poster.mjs, fiindcă
are nevoie de un browser ca să decodeze H.264.

Nu recodează şi nu recomprimă — pentru asta e nevoie de ffmpeg; vezi
assets/video/README.md.
"""

import json
import os
import shutil
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "_sursa", "graphics", "new")
OUT = os.path.join(HERE, "..", "assets", "video")
MANIFEST = os.path.join(HERE, "..", "site", "videos.json")

# sursă  →  nume final (fără extensie); slug-ul se foloseşte în {{video:slug|…}}
VIDEOS = {
    "650x800 px pagina parinte.mp4": "parinti",
}


def atoms(data, start=0, end=None):
    """Atomii de la un nivel: [(tip, offset, mărime), …]."""
    end = len(data) if end is None else end
    out, i = [], start
    while i + 8 <= end:
        size = struct.unpack(">I", data[i:i + 4])[0]
        typ = data[i + 4:i + 8]
        if size == 0:
            size = end - i
        elif size == 1:                      # mărime pe 64 de biţi
            size = struct.unpack(">Q", data[i + 8:i + 16])[0]
        if size < 8:
            break
        out.append((typ, i, size))
        i += size
    return out


def shift_chunk_offsets(moov, delta):
    """
    Corectează offset-urile absolute din tabelele de chunk-uri.

    Le caut prin toată zona `moov` — structura e ierarhică, dar un `stco` nu
    poate apărea decât ca antet de atom, iar mărimea declarată trebuie să se
    potrivească exact cu numărul de intrări. Verific ambele, ca să nu ating
    din greşeală date care se nimeresc să conţină octeţii „stco".
    """
    buf = bytearray(moov)
    patched = 0

    for tag, width in ((b"stco", 4), (b"co64", 8)):
        i = 0
        while True:
            i = buf.find(tag, i)
            if i < 0:
                break
            head = i - 4                                   # antetul: [mărime][tip]
            if head < 0:
                i += 4
                continue
            size = struct.unpack(">I", buf[head:head + 4])[0]
            count = struct.unpack(">I", buf[i + 8:i + 12])[0]
            if size != 16 + count * width:                 # nu e un atom real
                i += 4
                continue

            base = i + 12
            for k in range(count):
                at = base + k * width
                if width == 4:
                    (v,) = struct.unpack(">I", buf[at:at + 4])
                    struct.pack_into(">I", buf, at, v + delta)
                else:
                    (v,) = struct.unpack(">Q", buf[at:at + 8])
                    struct.pack_into(">Q", buf, at, v + delta)
            patched += count
            i = head + size

    if not patched:
        sys.exit("  Nu am găsit niciun tabel de offset-uri — nu ating fişierul.")
    return bytes(buf), patched


def faststart(data):
    """Rescrie fişierul cu `moov` mutat înaintea lui `mdat`. Idempotent."""
    top = atoms(data)
    order = [t for t, _, _ in top]
    if b"moov" not in order or b"mdat" not in order:
        sys.exit("  Fişierul nu are moov/mdat — nu pare un MP4 valid.")
    if order.index(b"moov") < order.index(b"mdat"):
        return data, False                                 # deja aranjat

    moov = next(data[o:o + s] for t, o, s in top if t == b"moov")
    moov, _ = shift_chunk_offsets(moov, len(moov))

    out = bytearray()
    for typ, off, size in top:                             # întâi tot ce e până la mdat
        if typ == b"mdat":
            out += moov
        if typ != b"moov":
            out += data[off:off + size]
    return bytes(out), True


def describe(data):
    j = data.find(b"mvhd")
    ver = data[j + 4]
    if ver == 0:
        scale, dur = struct.unpack(">II", data[j + 16:j + 24])
    else:
        scale, dur = struct.unpack(">IQ", data[j + 24:j + 36])

    k = data.find(b"tkhd")
    w, h = struct.unpack(">II", data[k + 80:k + 88])
    return {"w": w >> 16, "h": h >> 16, "seconds": round(dur / scale, 2)}


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    if os.path.exists(MANIFEST):
        manifest = json.load(open(MANIFEST, encoding="utf-8"))

    for filename, slug in VIDEOS.items():
        src = os.path.join(SRC, filename)
        if not os.path.isfile(src):
            print(f"  lipseşte {filename}")
            continue

        data = open(src, "rb").read()
        data, moved = faststart(data)

        dst = os.path.join(OUT, f"{slug}.mp4")
        with open(dst, "wb") as f:
            f.write(data)

        info = describe(data)
        manifest[slug] = info
        mb = len(data) / 1024 / 1024
        print(f"  {slug:<12} {info['w']}x{info['h']}  {info['seconds']}s  {mb:.2f} MB"
              f"  {'· moov mutat în faţă' if moved else '· era deja faststart'}")
        if mb > 2:
            print(f"  {'':12} peste ţinta de 2 MB din README — recomprimarea cere ffmpeg")

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(manifest.items())), f, indent=2)
        f.write("\n")

    print("\n  Posterul: node _tools/9-video-poster.mjs")


if __name__ == "__main__":
    main()
