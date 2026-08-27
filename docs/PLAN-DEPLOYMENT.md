# Deployment pe Cloudflare Pages

Ghid pas cu pas pentru a pune site-ul nou pe **sportiveducat.ro**, cu deploy automat
la fiecare push în branch.

---

## 0. Situația de plecare (verificată pe 27.08.2026)

| | |
|---|---|
| Hosting actual | Cloudflare Pages, proiect **`igapp`** |
| Se alimentează din | `github.com/andreiandoo/igapp`, branch **`master`**, folderul `landing/` |
| Conținut | SPA React (Vite) — `<title>pagina</title>`, `lang="en"`, fără description, fără Open Graph |
| Comportament | orice URL întoarce **200** cu același HTML gol (`/parinti`, `/sitemap.xml`, `/orice`) |
| `www.sportiveducat.ro` | întoarce **200**, nu redirecționează → conținut duplicat |
| `robots.txt` | generat de funcția **Managed robots.txt** din Cloudflare |

**Ce înseamnă asta pentru SEO:** site-ul actual e practic invizibil în Google — tot
conținutul se randează din JavaScript într-un `<div id="root">` gol, iar titlul paginii
este literalmente „pagina". **Nu ai URL-uri vechi de redirecționat** și nu ai autoritate
de pierdut. Migrarea e curată.

---

## 1. De ce nu PHP și de ce nu React

Cloudflare Pages servește **fișiere statice**. Imaginea de build v2 conține Node, Go,
Python, Ruby — **nu și PHP** (doar imaginea v1, legacy, are PHP 5.6–7.4).

Nu e nevoie de React: HTML static e mai rapid și se indexează mai bine decât un SPA.

Site-ul de aici este HTML generat de un script Node (`build.mjs`), fără framework și fără
dependințe. Ce înseamnă practic:

- **URL-uri curate, fără configurare** — Pages servește `parinti.html` la `/parinti` și
  redirecționează `/parinti.html` → `/parinti` cu 308.
- **Înregistrările din formulare** merg printr-o **Pages Function**
  (`functions/api/lead.js`) — cod JavaScript care rulează pe edge, în același proiect.
  Fără CORS, fără server separat.
- **404 real** pentru URL-uri inexistente, în loc de 200.

---

## 2. Pregătirea repo-ului

Site-ul stă în folderul `igweb/`. Recomandarea: branch dedicat, ca `master` să rămână
neatins până ești mulțumit de rezultat.

```bash
cd /calea/catre/igapp
git checkout master
git pull
git checkout -b web

# copiază folderul igweb/ în repo (dacă nu e deja acolo)
cp -r /calea/catre/igweb ./igweb

git add igweb
git commit -m "Site de prezentare sportiveducat.ro (static, Cloudflare Pages)"
git push -u origin web
```

**Verifică înainte de push** că `igweb/dist/` **nu** intră în commit — e generat la build
și e deja în `.gitignore`.

> **Alternativă:** repo separat `andreiandoo/igweb`. Mai curat pe termen lung (istoric
> propriu, permisiuni proprii), dar înseamnă două repo-uri de urmărit. Pașii din Cloudflare
> sunt identici, doar alegi alt repo la pasul 3.

---

## 3. Proiect nou în Cloudflare Pages

**Nu modifica proiectul `igapp` existent** — rămâne intact ca plasă de siguranță.

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**
2. Alege repo-ul `andreiandoo/igapp`
3. Setări de build:

   | Câmp | Valoare |
   |---|---|
   | Project name | `sportiveducat` |
   | Production branch | `web` |
   | Framework preset | **None** |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory (advanced) | `igweb` |

4. **Environment variables** → Production:

   | Variabilă | Valoare | De ce |
   |---|---|---|
   | `NODE_VERSION` | `20` | implicitul e Node 18, ieșit din suport |
   | `IG_ENV` | `production` | |

   Și pe **Preview**, aceleași, dar cu `IG_ENV` = `preview` — atunci build-ul pune
   `noindex` pe toate paginile și `Disallow: /` în `robots.txt`, ca deploy-urile de test
   să nu ajungă în Google.

5. **Save and Deploy**

Build-ul durează sub un minut. La final primești un URL de forma
`https://sportiveducat.pages.dev`.

### Oprește build-urile inutile pentru celelalte branch-uri

Cu *Root directory* = `igweb`, orice build pornit pe un branch unde folderul nu există
va eșua. Mergi la **Settings → Builds → Branch control**:

- **Preview branches** → *Custom* → include doar `web` și `web/*`
  (sau *None*, dacă nu vrei deloc preview-uri)

---

## 4. Verificare pe pages.dev, înainte de comutare

Deschide `https://sportiveducat.pages.dev` și verifică:

- [ ] `/`, `/parinti`, `/sportivi`, `/cluburi`, `/antrenori` se încarcă corect
- [ ] `/parinti.html` redirecționează la `/parinti`
- [ ] Un URL inventat întoarce **404**, nu 200
- [ ] `/sitemap.xml` întoarce XML, nu HTML
- [ ] Meniul mobil, modalele de înscriere, calculatorul de comisioane funcționează
- [ ] Trimiți un formular de test → primești confirmare (vezi §6 pentru unde ajunge)

Automat, din terminal:

```bash
node _tools/4-verify.mjs https://sportiveducat.pages.dev
```

Și încă două verificări externe:

- [ ] [Rich Results Test](https://search.google.com/test/rich-results) pe `/parinti` — FAQ-urile trebuie să apară ca eligibile
- [ ] Lighthouse mobil — Performance ≥ 90, SEO = 100

---

## 5. Comutarea domeniului

Un domeniu personalizat poate fi atașat **unui singur** proiect Pages. Deci ordinea contează.

1. **Proiectul `sportiveducat`** → **Custom domains** → *Set up a domain* →
   `sportiveducat.ro`
   → Cloudflare îți spune că domeniul e folosit de alt proiect. Nu forța încă.
2. **Proiectul `igapp`** → **Custom domains** → șterge `sportiveducat.ro`
3. Revino la `sportiveducat` → adaugă `sportiveducat.ro`. Se activează în câteva secunde
   (DNS-ul e deja în Cloudflare, nu se schimbă nimic la registrar).
4. Verifică imediat: `curl -I https://sportiveducat.ro` → `200`, și o pagină inexistentă → `404`.

**Revenire, dacă ceva nu merge:** ștergi domeniul din `sportiveducat` și îl pui înapoi pe
`igapp`. Sub un minut. **Nu șterge proiectul `igapp` cel puțin 30 de zile.**

### Redirect pentru www

`www.sportiveducat.ro` întoarce azi 200 — trebuie să redirecționeze, altfel Google vede
două site-uri identice.

Cloudflare → zona `sportiveducat.ro` → **Rules** → **Redirect Rules** → *Create rule*:

- **If** — Custom filter expression: `http.host eq "www.sportiveducat.ro"`
- **Then** — Dynamic redirect:
  - Expression: `concat("https://sportiveducat.ro", http.request.uri.path)`
  - Status: **301**
  - ✅ Preserve query string

### Restul setărilor de zonă

- **SSL/TLS → Edge Certificates → Always Use HTTPS**: pornit
- **SSL/TLS → Edge Certificates → HSTS**: pornit, max-age 12 luni
  (antetele de securitate le pune `cloudflare/_headers`; HSTS se setează doar din zonă)
- **Speed → Optimization → Brotli**: pornit

### Managed robots.txt

Zona are pornită funcția **Managed robots.txt** din Cloudflare, care adaugă automat un bloc
peste `robots.txt`-ul tău. Blocul actual permite indexarea normală
(`Content-Signal: search=yes`), dar **interzice** `GPTBot` și `Google-Extended`.

Practic: rămâi în Google Search, dar conținutul tău nu e folosit pentru răspunsurile AI
(ChatGPT, AI Overviews, Gemini). E o decizie de business, nu una tehnică — dacă vrei
vizibilitate și în căutarea AI, oprește funcția din **Security → Settings → Managed robots.txt**.

---

## 6. Unde ajung înscrierile

Formularele creează conturi **direct în aplicație**, prin funcția `/api/lead`, iar
planurile plătite trec prin Stripe Checkout.

Variabilele obligatorii (`REGISTRATION_API_SECRET`, `IG_API_URL`, `IG_FORWARD`),
binding-ul KV recomandat, verificarea configurării și testul obligatoriu de după
activare sunt descrise în [PLAN-FORMULARE-APP.md](PLAN-FORMULARE-APP.md).

**Fă testul acela înainte de a muta domeniul.** Dacă secretul e greșit, oamenii primesc
„Gata, contul e pregătit" fără să se creeze cont — datele nu se pierd (ajung în KV), dar
nu vrei să afli asta de la primul client real.

---

## 7. După comutare

### Prima zi

- [ ] Google Search Console → adaugă proprietatea (dacă nu există), trimite `sitemap.xml`
- [ ] Cere indexare pentru cele 5 pagini principale
- [ ] Bing Webmaster Tools → adaugă domeniul + sitemap
- [ ] Verifică în GA4 / Cloudflare Analytics că traficul curge

### Prima lună

- [ ] Search Console → *Pages*: cele 5 pagini trebuie să apară ca „Indexed"
- [ ] Search Console → *Core Web Vitals*: toate în „Good"
- [ ] Rich Results: FAQ-urile eligibile pe cele 4 pagini de rol

Pentru că site-ul vechi nu era indexat, **nu te aștepta la o scădere** — orice apare e
câștig net.

---

## 8. Cum se lucrează de acum înainte

```bash
git checkout web
# editezi content/*.html, site/pages.mjs, assets/…
npm run build        # verifică local: marcaje, simboluri SVG, h1, JSON-LD
npm run dev          # build + server local pe http://localhost:8099
git commit -am "…"
git push             # → Cloudflare face deploy automat în ~40 s
```

Fiecare push în alt branch (dacă ai activat preview-urile) primește un URL propriu de
test, iar în dashboard poți reveni la orice deploy anterior cu un click
(**Deployments → … → Rollback**).

---

## 9. Ce mai rămâne de decis

| # | Decizie | Blochează |
|---|---|---|
| 1 | Branch `web` în `igapp` sau repo separat `igweb`? | pasul 2 |
| 2 | Ce facem cu `landing/` din `igapp` după comutare? | curățenia repo-ului |
| 3 | Unde vrei să primești lead-urile (webhook / email)? | §6 |
| 4 | Ținem blocarea AI-crawlerelor din Managed robots.txt? | §5 |
| 5 | Cifrele din pagini sunt reale? | vezi README, „De completat" |
| 6 | Cine scrie textele legale? | scoaterea `noindex` |
