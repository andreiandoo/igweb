# Înscrierile din site în aplicație

> **Stare:** părinții și sportivii se înregistrează **direct în aplicație**, cu plată
> prin Stripe. Cluburile la fel, prin endpoint-ul public existent. Antrenorii încă
> nu au endpoint în backend — formularul lor colectează doar lead-uri.

---

## 1. Cum circulă datele

```
formular → igSubmitLead()            assets/js/site.js
         → POST /api/lead            functions/api/lead.js  (edge, same-origin)
         → validare + anti-spam
         → POST către API-ul igapp   cu X-Registration-Key
         → [plan plătit] POST /plan-checkout
         → { ok: true, checkout_url? }
              ├─ cu checkout_url → browserul pleacă la Stripe
              └─ fără            → ecranul „Gata, contul e pregătit"
```

Secretul de înregistrare stă **doar** în variabilele de mediu ale funcției. Nu ajunge
niciodată în browser, pentru că apelul către API se face server-to-server, din edge.

Se emite și evenimentul DOM `ig:lead`, pentru analytics:

```js
document.addEventListener('ig:lead', (e) => {
  gtag('event', 'generate_lead', { form: e.detail.form });   // parent | athlete | club | coach
});
```

## 2. Ce formular merge unde

| Formular | Endpoint | Cere secret | Plată |
|---|---|---|---|
| `/parinti` → `parent` | `POST /auth/register-parent` | da | da, dacă planul e plătit |
| `/sportivi` → `athlete` | `POST /auth/register-athlete` | da | da, dacă planul e plătit |
| `/cluburi` → `club` | `POST /auth/register-club-admin` | nu | nu |
| `/antrenori` → `coach` | *(nu există încă)* | — | — |

Pasul de plată: dacă răspunsul conține `plan.requires_payment === true`, funcția cheamă
`POST /plan-checkout` cu id-ul sportivului și întoarce `checkout_url` către browser.
Activarea abonamentului o face backend-ul, din webhook-ul Stripe — site-ul nu are nimic
de făcut după redirect.

`success_url` și `cancel_url` sunt paginile `/cont-creat` și `/plata-anulata`, generate
din `site/pages.mjs` (câmpul `status`).

## 3. Configurare în Cloudflare

**Settings → Environment variables**, pe *Production*:

| Variabilă | Valoare | Obligatoriu |
|---|---|---|
| `REGISTRATION_API_SECRET` | aceeași valoare ca în Railway — **bifează Encrypt** | da |
| `IG_API_URL` | `https://igapp-production.up.railway.app` | da |
| `IG_FORWARD` | `on` | da |
| `LEAD_WEBHOOK` | URL care primește o copie a lead-ului | nu |
| `POSTMARK_TOKEN` + `LEAD_EMAIL_TO` + `LEAD_EMAIL_FROM` | notificare pe email | nu |

**Binding recomandat:** un KV namespace numit `LEADS` (Settings → Bindings). Cu el,
fiecare înscriere se salvează ca plasă de siguranță și funcția limitează la
5 trimiteri / 10 minute / IP. Parolele **nu** se salvează niciodată — `scrub()` le scoate
înainte de stocare și de notificări; ele merg doar în apelul către API.

### Verificarea configurării, după deploy

Deschide în browser `https://sportiveducat.ro/api/lead`. Răspunde `405`, dar spune ce a
primit funcția:

```json
{ "configurat": { "api": true, "forward": true, "secret": true, "stocare_kv": true } }
```

Doar da/nu, niciodată valorile. Dacă `secret` e `false`, funcția **nu apelează** API-ul
deloc și marchează lead-ul `NECONFIGURAT: lipsește REGISTRATION_API_SECRET` — mai bine
o eroare vizibilă decât un 401 tăcut.

## 4. Ce vede omul când ceva nu merge

| Situație | Răspuns | Ce vede |
|---|---|---|
| Câmpuri lipsă / email invalid / minor fără tutore | 422 | mesajul exact, sub formular |
| Email sau username deja folosit | 409 | mesajul din API, sub formular |
| Secret greșit, API căzut, eroare 5xx | 200 | ecranul de confirmare |
| Plan plătit | 200 + `checkout_url` | pleacă la Stripe |

Ultimul rând din mijloc e intenționat: dacă noi am greșit configurarea, omul nu e
pedepsit — datele lui sunt salvate în KV și ajung în notificare, iar tu îl poți contacta.
**De aceea testul de după activare (§6) nu e opțional.**

## 5. Parolele

Formularele de la părinți și sportivi cer parolă, iar backend-ul o cere la înregistrare
(`min 6 caractere`). Parola circulă doar pe traseul browser → funcție → API, peste HTTPS.

Nu ajunge în KV, în webhook sau în email — `SECRET_FIELD` din `functions/api/lead.js` o
filtrează. Site-ul verifică și pe client că cele două câmpuri de parolă coincid.

> Notă istorică: într-o versiune anterioară recomandam scoaterea câmpurilor de parolă,
> pentru că nu exista endpoint și n-aveau unde ajunge. Acum există; câmpurile rămân.

## 6. Testul obligatoriu după activare

Cu variabilele setate și deploy-ul făcut:

1. `https://sportiveducat.ro/api/lead` → toate cele patru `true`
2. Pe `/cluburi`, înregistrează un club de test cu un **email real** al tău
   → verifică în admin că a apărut clubul și că a sosit emailul de verificare
3. Pe `/parinti`, creează un cont cu planul **Free**
   → cont creat, fără redirect la Stripe
4. Pe `/parinti`, creează un cont cu planul **Campion**
   → ajungi pe Stripe Checkout; plătește cu cardul de test `4242 4242 4242 4242`
   → te întorci pe `/cont-creat`, iar abonamentul apare activ în admin
5. Anulează o plată din Stripe → ajungi pe `/plata-anulata`, contul există deja
6. Încearcă să te înregistrezi a doua oară cu același email → mesaj de conflict, clar

## 7. Ce lipsește încă

**Antrenorii.** Nu există `POST /auth/register-coach`. Până apare, formularul de pe
`/antrenori` colectează lead-uri (KV + notificare) și răspunde „gata". Când endpoint-ul
e gata, se adaugă o intrare în obiectul `FORMS` din `functions/api/lead.js` — restul
funcționează deja.

Payload-ul propus, dacă ajută la implementare:

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

**Turnstile.** Honeypot-ul și limitarea pe IP opresc spam-ul obișnuit, nu unul țintit.
Cloudflare Turnstile e gratuit, fără cookie-uri, și se leagă direct în funcție.

**Deduplicare** după email, cu fereastră de 24 h — ușor de adăugat peste KV.
