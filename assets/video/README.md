# assets/video

Paginile `/parinti`, `/cluburi` și `/antrenori` au, în secțiunea „cum funcționează",
un slot de video vertical.

Pune aici fișierul:

```
assets/video/story.mp4
assets/img/story-poster.jpg   ← prima imagine, afișată până pornește video-ul
```

Recomandări:

| | |
|---|---|
| Raport | 4:5 (vertical) — containerul are `aspect-ratio: 4/5` |
| Rezoluție | 720×900 sau 1080×1350 |
| Durată | 8–15 s, în buclă, fără sunet (rulează cu `muted loop playsinline`) |
| Greutate | sub 2 MB — se încarcă pe fiecare vizită a paginii |
| Codec | H.264 + AAC în `.mp4` (compatibilitate maximă) |

Exemplu de compresie:

```bash
ffmpeg -i sursa.mov -vf "scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350" \
  -c:v libx264 -crf 26 -preset slow -an -movflags +faststart story.mp4
ffmpeg -i story.mp4 -vframes 1 -q:v 3 ../img/story-poster.jpg
```

**Dacă fișierul lipsește**, paginile afișează automat o ilustrație SVG de fundal
(`#scene-hills`) — nimic nu se rupe și nu se face niciun request degeaba. Logica e în
blocul `ig_asset_exists('/assets/video/story.mp4')` din fiecare pagină.
