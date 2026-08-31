# assets/video

Paginile `/parinti`, `/cluburi` și `/antrenori` au, în secțiunea „cum funcționează",
un slot de video vertical. Fiecare pagină are clipul ei, nu unul comun.

## Cum adaugi un clip

1. Pune fișierul sursă în `_sursa/graphics/new/`.
2. Adaugă-l în `VIDEOS` din `_tools/9-video.py` (sursă → slug).
3. Rulează:

```bash
python _tools/9-video.py                 # mută în assets/video/<slug>.mp4, cu faststart
node --experimental-websocket _tools/9-video-poster.mjs   # scoate posterul
npm run build
```

4. În pagină, pune marcajul: `{{video:<slug>|Descriere pentru cititoarele de ecran}}`

Rezultă:

```
assets/video/<slug>.mp4
assets/img/video/<slug>.jpg   ← primul cadru, afișat până pornește clipul
site/videos.json              ← dimensiuni și durată, pentru width/height în HTML
```

## Recomandări

| | |
|---|---|
| Raport | vertical; containerul se potrivește singur (`4/5` fără clip, `9/16` cu clip) |
| Rezoluție | 720×1280 sau 1080×1920 |
| Durată | 8–15 s, în buclă, fără sunet (rulează cu `muted loop playsinline`) |
| Greutate | sub 2 MB — se încarcă la fiecare vizită a paginii |
| Codec | H.264 fără pistă audio, în `.mp4` |

`_tools/9-video.py` **nu recodează** — doar rearanjează atomii, ca redarea să
poată începe înainte de descărcarea completă. Pentru compresie e nevoie de ffmpeg:

```bash
ffmpeg -i sursa.mov -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  -c:v libx264 -crf 28 -preset slow -an -movflags +faststart iesire.mp4
```

**Dacă slug-ul n-are fișier**, pagina afișează automat ilustrația SVG de fundal
(`#scene-hills`) — nimic nu se rupe și nu se face niciun request degeaba.
Logica e în funcția `video()` din `build.mjs`.
