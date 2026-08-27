# Conectarea formularelor la app.sportiveducat.ro

> **Stare actuală:** formularele colectează înscrieri reale prin
> `functions/api/lead.js` (Cloudflare Pages Function): validare pe server,
> anti-spam, stocare și notificare. **Nu creează încă conturi în aplicație.**
> Trimiterea mai departe către API-ul `igapp` e deja scrisă, dar rulează doar
> dacă variabila de mediu `IG_FORWARD` = `on`.
>
> Nu s-a modificat nimic în `igapp`.

---

## 1. Ce există acum

### 1.1 Pe site

| Pagină | Formular | `data-lead-type` | Fișier |
|---|---|---|---|
| `/parinti` | părinte + copil, 3 pași | `parent` | `content/overlay-parinti.html` |
| `/sportivi` | sportiv, 3–4 pași (pasul „părinte" apare doar sub 18 ani) | `athlete` | `content/overlay-sportivi.html` |
| `/cluburi` | club, 3 pași | `club` | `content/overlay-cluburi.html` |
| `/antrenori` | antrenor, 3 pași | `coach` | `content/overlay-antrenori.html` |

Fiecare are: validare nativă pe pas, honeypot (`website_confirm`), checkbox-uri explicite
pentru termeni și confidențialitate, deep-link `#inregistrare`, stare de încărcare pe
buton și afișarea erorilor din server sub formular.

Traseul unei trimiteri:

```
formular → igSubmitLead()          assets/js/site.js
         → POST /api/lead          functions/api/lead.js   (edge, same-origin)
         → validare + anti-spam
         → KV / webhook / email
         → [oprit] POST către API-ul igapp
         → { ok: true } → ecranul de confirmare
```

Se emite și evenimentul DOM `ig:lead`, pentru analytics:

```js
document.addEventListener('ig:lead', (e) => {
  gtag('event', 'generate_lead', { form: e.detail.form });   // 'parent' | 'athlete' | 'club' | 'coach'
});
```

### 1.2 În backend (`igapp/backend/src/routes/auth.ts`)

| Endpoint | Public | Acoperă formularul |
|---|---|---|
| `POST /auth/register` | da | parțial „Sportivi" — doar `{ email, password, name? }` |
| `POST /auth/register-club-admin` | da | **integral „Cluburi"** |
| `POST /auth/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/complete-setup` | da | — |

**Nu există** endpoint public pentru **antrenori** și pentru **părinte + copil**.

### 1.3 Constrângeri deja prezente în `igapp`

- `app.use("/auth", authLimiter, authRoutes)` — 100 încercări eșuate / 15 min, cheie
  `email sau IP`, `skipSuccessfulRequests: true`.
- CORS: `ALLOWED_ORIGINS` nu conține `https://sportiveducat.ro`.
  **Nu contează** în arhitectura aleasă: apelul se face server-to-server, din Function,
  nu din browser.
- `register-club-admin` creează user cu parolă temporară aleatorie, trimite email de
  verificare, iar utilizatorul își setează parola prin `/auth/complete-setup`.

---

## 2. Arhitectura aleasă

```
[browser] --POST same-origin--> /api/lead  (Pages Function, edge)
                                     |
                                     ├─→ KV: lead salvat
                                     ├─→ webhook / email: notificare
                                     └─→ [IG_FORWARD=on] api.sportiveducat.ro
```

De ce prin Function și nu direct din browser către API:

- **fără CORS** — nu trebuie atins `ALLOWED_ORIGINS` din `igapp`;
- **anti-spam înainte de API** — honeypot, limitare pe IP, validare server-side;
- **lead-ul nu se pierde** dacă API-ul e indisponibil: e deja salvat;
- **conectare etapizată** — formularele fără endpoint merg pe email/webhook, cele cu
  endpoint se conectează pe rând;
- **site-ul rămâne independent** de deploy-urile aplicației.

---

## 3. Etape

### ✅ Etapa 1 — colectarea lead-urilor (gata, nu atinge `igapp`)

Implementată în `functions/api/lead.js`. Ce face:

- respinge tipurile necunoscute și cererile fără JSON valid;
- înghite honeypot-ul cu `{ ok: true }`, ca botul să nu învețe;
- verifică per tip câmpurile obligatorii, formatul emailului și cele două acorduri;
- limitează la 5 trimiteri / 10 min / IP (dacă e legat un KV namespace);
- **elimină parolele** înainte de a stoca sau notifica ceva;
- salvează în KV, trimite webhook și/sau email (Postmark);
- răspunde `{ ok: true }` sau `{ ok: false, error, fields? }`.

Configurarea (variabile în Cloudflare Pages): vezi
[PLAN-DEPLOYMENT.md §6](PLAN-DEPLOYMENT.md#6-unde-ajung-înscrierile).

### Etapa 2 — „Cluburi" se conectează la endpoint-ul existent

Singurul formular care se poate conecta **fără nicio modificare în `igapp`**.

Se setează în Cloudflare:

```
IG_API_URL = https://api.sportiveducat.ro     ← confirmă domeniul real
IG_FORWARD = on
```

Maparea e 1:1 — numele câmpurilor din formular au fost alese exact pentru asta:

| Formular (`name=`) | Payload API | Obligatoriu |
|---|---|---|
| `legal_name` | `legal_name` | da |
| `short_name` | `short_name` | da |
| `sports` (CSV → array) | `sports` | da, min. 1 |
| `cui` | `cui` | nu |
| `cis_code` | `cis_code` | nu |
| `president_name` | `president_name` | da |
| `phone` | `phone` | da |
| `email` | `email` | da |
| `website` | `website` | nu |
| `street` / `city` / `county` | idem | nu |
| `heard_about_us` | `heard_about_us` | nu |
| `terms_accepted` / `privacy_accepted` | idem | da |
| `country` | — | *ignorat de API azi* |
| `demo_type` (`self` / `guided`) | — | *rămâne în lead-ul local, pentru vânzări* |

Răspunsurile sunt deja tratate în Function și în interfață:

| Cod | Ce vede utilizatorul |
|---|---|
| 200 | ecranul de confirmare + „verifică emailul" |
| 409 | mesajul din API („email deja înregistrat" / „CIF deja înregistrat"), sub formular |
| 4xx / 5xx | lead-ul e salvat; utilizatorul primește confirmare, iar tu ai datele |

**Înainte de a porni `IG_FORWARD`:** testează pe un deploy de preview, cu un email real
de test, și verifică în `igapp` că s-a creat clubul și că a plecat emailul de verificare.

### Etapa 3 — endpoint-uri noi în `igapp` (task separat, necesită aprobare)

Singura parte care atinge aplicația.

#### 3a. `POST /auth/register-coach`

```jsonc
{
  "full_name": "…", "email": "…", "phone": "…",
  "sports": ["Fotbal"],
  "work_mode": "independent" | "club",
  "display_name": "…",   // doar independent
  "city": "…",           // doar independent
  "club_name": "…",      // doar work_mode=club → cerere de asociere
  "demo_type": "self" | "guided",
  "terms_accepted": true, "privacy_accepted": true,
  "source": "web:antrenori"
}
```

Prin analogie cu `register-club-admin`: user cu parolă temporară → rol `coach` → email de
verificare → `/auth/complete-setup`. Pentru `independent`, se creează și un „club de unul
singur" (exact promisiunea din pagină). Pentru `club`, o cerere pe care club-adminul o aprobă.

#### 3b. `POST /auth/register-parent`

```jsonc
{
  "parent": { "name": "…", "email": "…", "phone": "…" },
  "child":  { "first_name": "…", "age": 10, "sport": "…", "avatar": "rocket",
              "email": "…", "username": "…" },
  "plan": "free|start|campion|elita", "billing_period": "monthly|yearly",
  "terms_accepted": true, "privacy_accepted": true,
  "source": "web:parinti"
}
```

Într-o singură tranzacție Prisma: user părinte (rol `parent`) + user copil (rol `athlete`)
+ legătura părinte–copil (aceeași folosită de `/auth/parent-children`) + consimțământul
tutorelui cu marcaj de timp. Plata se atașează **doar** contului de părinte.

#### 3c. `POST /auth/register-athlete`

Formularul de pe `/sportivi` trimite mai mult decât acceptă `/auth/register` azi:
`first_name`, `age`, `username` (alternativă la email), `sport`, iar pentru minori
`guardian_name`, `guardian_email`, `guardian_phone`, `guardian_consent`.

Rută nouă, ca să nu se schimbe contractul lui `/auth/register` (folosit deja de aplicație):

- respinge înregistrarea unui minor fără date de tutore și fără consimțământ;
- pentru minori, trimite emailul de activare **către părinte**, nu către copil;
- acceptă `username` acolo unde nu există email.

#### 3d. Comun celor trei

- câmp `source` persistat pe user (pagina + campania din care a venit);
- rate-limit dedicat înregistrărilor, nu doar login-urilor eșuate;
- opțional: verificare captcha în middleware.

Pe măsură ce apar rutele, în `functions/api/lead.js` se extinde funcția `forward()` —
o singură funcție, un `switch` pe `lead.type`.

### Etapa 4 — întărire și măsurare

- **Cloudflare Turnstile** pe formulare (gratuit, fără cookie-uri, se integrează direct
  în Function). Honeypot-ul singur nu ține la spam țintit.
- **Double opt-in** pentru lead-urile care nu creează cont imediat.
- **Deduplicare** după email, fereastră de 24 h (ușor cu KV).
- **Analytics**: `ig:lead` → GA4 / Meta CAPI, fără să atingi formularele.
- **Monitorizare**: alertă dacă `/api/lead` returnează erori sau dacă API-ul respinge
  peste X% din cereri.

---

## 4. Ce se schimbă în `igapp`, pe scurt

| Etapă | Modificare în `igapp` | Risc |
|---|---|---|
| 1 | **niciuna** — gata | — |
| 2 | **niciuna** (apel server-to-server) | minim |
| 3a | rută nouă `register-coach` + model de cerere de asociere | mediu |
| 3b | rută nouă `register-parent` + tranzacție părinte–copil | mediu |
| 3c | rută nouă `register-athlete` (fără a atinge `/auth/register`) | mic |
| 3d | câmp `source`, rate-limit, captcha | mic |

Recomandare: 3a–3c ca PR-uri separate, fiecare cu testele lui.

---

## 5. Atenție: parolele din formulare

Formularele de pe `/parinti` și `/sportivi` cer **parolă** — moștenit din machetele
originale. Cât timp nu există endpoint-urile 3b/3c, aceste parole nu au unde să ajungă.

Funcția le elimină explicit înainte de a stoca sau trimite orice (`scrub()` din
`functions/api/lead.js`), deci **nu ajung nicăieri**. Rămâne însă o promisiune falsă în
interfață: utilizatorul crede că și-a ales parola.

Trei opțiuni, în ordinea preferinței:

1. **Recomandat până la Etapa 3:** scoate câmpurile de parolă și înlocuiește-le cu
   „îți trimitem pe email linkul de activare" — exact modelul folosit deja de
   `register-club-admin`. Crește și conversia: mai puține câmpuri.
   Se șterg două blocuri `.field` din `content/overlay-parinti.html` și
   `content/overlay-sportivi.html`.
2. Le păstrezi, dar le arăți abia după ce Etapa 3 e live.
3. Le lași cum sunt și accepți neconcordanța — nu o recomand.

---

## 6. Verificare înainte de a considera integrarea terminată

- [ ] Fiecare formular trimite și primește răspuns real (200 / 4xx / 5xx tratate distinct)
- [ ] Ecranul de confirmare apare **numai** după un răspuns reușit
- [ ] Eroarea „email deja folosit" duce utilizatorul spre login, nu într-o fundătură
- [ ] Lead-ul se salvează chiar dacă API-ul e indisponibil
- [ ] Honeypot + rate-limit testate cu un script simplu de spam
- [ ] Consimțământul (termeni, confidențialitate, tutore) e persistat cu marcaj de timp
- [ ] Nicio parolă în KV, în emailuri sau în webhook
- [ ] `ig:lead` ajunge în GA4 și conversia e vizibilă
- [ ] Emailurile de activare ajung în Inbox, nu în Spam (SPF / DKIM / DMARC pe sportiveducat.ro)
