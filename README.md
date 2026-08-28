# sportiveducat.ro — site de prezentare iGROWth

Site static: 5 pagini publice + 3 pagini legale + 404. Generat de un script Node
(`build.mjs`) **fără nicio dependință** și servit de Cloudflare Pages. Formularele
de înscriere merg printr-o Pages Function.

```bash
npm run build     # generează dist/
npm run dev       # build + server local pe http://localhost:8099
```

Deploy: push în branch → Cloudflare Pages construiește și publică.
Ghidul complet: [`docs/PLAN-DEPLOYMENT.md`](docs/PLAN-DEPLOYMENT.md).

## Structură

```
igweb/
├─ build.mjs                generatorul: content/ + site/ → dist/
├─ package.json
│
├─ site/                    logica de template
│  ├─ config.mjs            identitate, registrul de pagini, helper-e de URL
│  ├─ pages.mjs             titluri, descrieri, CSS/JS, CTA-uri, ancore
│  ├─ plans.mjs            catalogul de preţuri, citit din backend la build
│  ├─ seo.mjs               <head>, Open Graph, JSON-LD, sitemap
│  └─ layout.mjs            header (din sportivi.html) + footer (din parinti.html)
│
├─ content/                 conținutul editabil
│  ├─ acasa.html            corpul paginii (fără header/footer)
│  ├─ parinti.html  sportivi.html  cluburi.html  antrenori.html
│  ├─ overlay-*.html        modalele de înscriere
│  └─ sprites/*.svg         sprite SVG per pagină, doar simbolurile folosite
│
├─ assets/                  copiat ca atare în dist/
│  ├─ css/  base.css (layout comun) · theme.css (design v2) · page-*.css
│  ├─ js/   site.js (comun) · page-*.js
│  ├─ img/  favicon.svg · logo.svg · icon-*.png · og/*.png
│  └─ video/  story.mp4 (opțional)
│
├─ functions/api/           Pages Functions (rulează pe edge)
│  ├─ lead.js               primește înscrierile, le trimite în aplicație
│  └─ checkout.js           reia plata dacă omul a închis pagina Stripe
├─ cloudflare/              _headers și _redirects, copiate în dist/
├─ robots.txt  site.webmanifest
│
├─ docs/   PLAN-FORMULARE-APP.md · PLAN-DEPLOYMENT.md
├─ _sursa/ machetele HTML originale (referință, nu se publică)
├─ _tools/ scripturile care au generat content/ din _sursa/
└─ dist/   rezultatul build-ului (gitignored)
```

## Ce editezi, pentru ce

| Vrei să schimbi | Editezi |
|---|---|
| text dintr-o pagină | `content/<pagina>.html` |
| titlu / descriere SEO, CTA, ancore | `site/pages.mjs` |
| **prețurile** | nicăieri — vin din `/public/plans`, vezi `site/plans.mjs` |
| adresă, telefon, rețele sociale, URL-ul aplicației | `site/config.mjs` |
| header, footer, meniu | `site/layout.mjs` |
| textele legale | `site/pages.mjs`, câmpul `legal` |
| un câmp din formulare | `content/overlay-<pagina>.html` |
| unde ajung înscrierile | `functions/api/lead.js` + variabile în Cloudflare |
| culori, spațieri | `assets/css/*` |

O pagină nouă se adaugă **într-un singur loc**: registrul `PAGES` din
`site/config.mjs`. De acolo apare automat în navigație, în footer și în `sitemap.xml`.

## Întrebările frecvente

Nu se scriu separat. Generatorul le citește direct din `<details>`-urile paginii și le
transformă în `FAQPage` (JSON-LD). Adaugi un `<details>` în HTML → apare și în datele
structurate, fără altă intervenție.

## CSS: de ce trei fișiere

Machetele originale foloseau două sisteme de design diferite. În loc să le unific riscant,
sunt separate:

| Fișier | Încărcat de | Conține |
|---|---|---|
| `base.css` | toate | reset, tokens `--ig-*`, butoane, header, meniu, footer, CTA mobil |
| `theme.css` | părinți, cluburi, antrenori | sistemul de design v2 (era duplicat identic în cele 3) |
| `page-*.css` | pagina respectivă | doar ce e specific paginii |

Tokenii din `base.css` sunt prefixați `--ig-*` intenționat: fiecare pagină își păstrează
propriul `:root`, iar header-ul și footer-ul arată identic peste tot.

## JS

`site.js` conține tot ce se repetă: meniu mobil, reveal la scroll, numărători, bara de
progres, comutatorul de preț, calculatorul de comisioane, toast-ul, motorul modalului și
trimiterea formularelor. `page-*.js` conține doar datele și logica specifică paginii.

Ordinea contează: `site.js` definește helper-ele imediat, dar **inițializează pe
`DOMContentLoaded`**, ca datele din `page-*.js` (`IG_SPORTS_*`, `IG_FOMO`) să existe deja.

Deep-link util în campanii: `sportiveducat.ro/cluburi#inregistrare` deschide direct formularul.

## Verificări

`npm run build` oprește build-ul dacă găsește: marcaje `{{…}}` nerezolvate, referințe
`<use href="#…">` fără simbol, alt număr de `<h1>` decât 1, linkuri către fișiere `.php`
sau JSON-LD invalid.

Pe un site pornit (local sau un preview de pe `pages.dev`):

```bash
node _tools/4-verify.mjs http://localhost:8099
```

verifică în plus: coduri HTTP, URL-uri curate, 404 real, redirecturi și `/api/lead`.

## Regenerarea din machetele originale (`_tools/`)

`content/` a fost generat din `_sursa/*.html`. Dacă primești machete actualizate:

```bash
cd _tools
node 1-extract.cjs   # separă CSS / JS / sprite / corpul paginii
node 2-build.cjs     # scrie content/*.html, content/sprites/*.svg și assets/css/*
node 3-images.cjs    # regenerează favicon-urile PNG și imaginile Open Graph
cd .. && npm run build
```

**Ce NU se regenerează** (scris de mână): `site/*`, `content/overlay-*.html`,
`assets/css/base.css`, `assets/js/*`, `functions/`. Scripturile nu le ating.

## De completat înainte de lansare

- **Textele legale** — azi sunt schelet, marcate `noindex` în `site/config.mjs`
- **Datele de firmă** din `site/config.mjs` — ajung în JSON-LD, trebuie să fie exacte
  (codul poștal e gol intenționat: mai bine lipsă decât greșit)
- **Cifrele și testimonialele** din pagini, dacă nu sunt reale — `AggregateRating`
  inventat atrage penalizare manuală de la Google
- **`window.IG_FOMO`** din `assets/js/page-*.js` — azi conține exemple fabricate
- **Variabilele pentru înscrieri** în Cloudflare (`REGISTRATION_API_SECRET`, `IG_API_URL`,
  `IG_FORWARD`) — vezi [`docs/PLAN-FORMULARE-APP.md`](docs/PLAN-FORMULARE-APP.md) §3
- **`assets/video/story.mp4`** (opțional — fără el se afișează o ilustrație de fundal)
- **Imaginile Open Graph cu text** — vezi `_sursa/og-template.html`
