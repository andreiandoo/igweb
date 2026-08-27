/**
 * iGROWth · definițiile paginilor
 *
 * Titluri, descrieri, CSS/JS încărcate, CTA-uri și ancorele din meniul mobil.
 * Întrebările frecvente NU se scriu aici: generatorul le citește direct din
 * `<details>`-urile fiecărei pagini, ca să nu existe două surse de adevăr.
 */

const APP_LOGIN = { label: 'Intră în cont', href: '{app}/login' };

export const PAGE_DEFS = {
  acasa: {
    title: 'iGROWth · Platformă pentru cluburi sportive și copii care fac sport',
    ogTitle: 'iGROWth — sportul, transformat în obișnuință',
    description: 'Platforma care leagă copiii, părinții, antrenorii și cluburile: prezență, evoluție, abonamente și încasări într-un panou, plus quiz-uri, ligi și insigne pentru sportivi. Începe gratuit.',
    css: ['/assets/css/page-acasa.css'],
    js: ['/assets/js/page-acasa.js'],
    footerDownload: true,
    navCta: { ghost: APP_LOGIN, primary: { label: 'Creează cont', icon: 'i-sparkles', href: '{app}/register' } },
    mobileCta: { ghost: APP_LOGIN, primary: { label: 'Creează cont', icon: 'i-sparkles', href: '{app}/register' } },
    anchors: [['#features', 'De ce iGROWth'], ['#alege', 'Alege-ți rolul']],
  },

  parinti: {
    title: 'iGROWth pentru părinți · Copilul învață mișcare și nutriție, ca la joacă',
    ogTitle: 'Crește un copil sănătos și motivat, ca la joacă',
    description: 'Nutriție, mișcare și mentalitate sportivă transformate într-un joc zilnic pe care copilul îl deschide singur. Tu vezi progresul, negru pe alb. Începe gratuit, plătește doar dacă merită.',
    css: ['/assets/css/theme.css'],
    js: ['/assets/js/page-parinti.js'],
    footerDownload: true,
    navCta: { ghost: { label: 'Vezi planurile', href: '#preturi' }, primary: { label: 'Creează cont', icon: 'i-sparkles', class: 'js-reg' } },
    mobileCta: { ghost: { label: 'Planuri', href: '#preturi' }, primary: { label: 'Creează cont', icon: 'i-sparkles', class: 'js-reg' } },
    anchors: [
      ['#poveste', 'Cum funcționează'], ['#valoare', 'Ce câștigă copilul'],
      ['#parinte', 'Pentru tine, părinte'], ['#preturi', 'Prețuri'],
      ['#testimoniale', 'Testimoniale'], ['#faq', 'Întrebări frecvente'],
    ],
    offersName: 'iGROWth — planuri pentru sportivi',
    offers: [
      { name: 'Free', price: '0' }, { name: 'Start', price: '5.99' },
      { name: 'Campion', price: '9.99' }, { name: 'Elită', price: '18.99' },
    ],
  },

  sportivi: {
    title: 'iGROWth pentru sportivi · XP, niveluri, insigne și clasamente',
    ogTitle: 'Antrenamentul tău, dar ca un joc',
    description: 'Strânge XP la fiecare antrenament și quiz, urcă de la Începător la Legendă, prinde insigne și intră în clasamentele echipei, clubului și platformei. Gratuit pentru sportivi.',
    css: ['/assets/css/page-sportivi.css'],
    js: ['/assets/js/page-sportivi.js'],
    footerDownload: true,
    navCta: { ghost: APP_LOGIN, primary: { label: 'Creează cont', icon: 'i-sparkles', class: 'js-reg' } },
    mobileCta: { ghost: APP_LOGIN, primary: { label: 'Creează cont', icon: 'i-sparkles', class: 'js-reg' } },
    anchors: [
      ['#xp', 'Cum strângi XP'], ['#niveluri', 'Niveluri și titluri'],
      ['#aplicatie', 'Tur în aplicație'], ['#insigne', 'Insigne și serii'],
      ['#clasament', 'Clasamente'], ['#preturi', 'Prețuri'], ['#faq', 'Întrebări frecvente'],
    ],
    offersName: 'iGROWth — planuri pentru sportivi',
    offers: [
      { name: 'Free', price: '0' }, { name: 'Start', price: '5.99' },
      { name: 'Campion', price: '9.99' }, { name: 'Elită', price: '18.99' },
    ],
  },

  cluburi: {
    title: 'iGROWth pentru cluburi · Sportivi, prezență, abonamente și încasări',
    ogTitle: 'Condu clubul dintr-un singur panou',
    description: 'Sportivi, echipe, prezență, abonamente, încasări (inclusiv cash prin antrenor), facturare și evenimente — într-o singură platformă. Demo gratuit 14 zile, fără card.',
    css: ['/assets/css/theme.css', '/assets/css/page-cluburi.css'],
    js: ['/assets/js/page-cluburi.js'],
    navCta: { ghost: { label: 'Încearcă demo', href: '#demo' }, primary: { label: 'Înregistrează clubul', icon: 'i-rocket', class: 'js-reg' } },
    mobileCta: { ghost: { label: 'Prețuri', href: '#preturi' }, primary: { label: 'Înregistrează clubul', icon: 'i-rocket', class: 'js-reg' } },
    anchors: [
      ['#functii', 'Funcții'], ['#bani', 'Bani și abonamente'],
      ['#preturi', 'Prețuri și comisioane'], ['#securitate', 'Securitate'],
      ['#demo', 'Demo'], ['#intrebari', 'Întrebări'],
    ],
    offersName: 'iGROWth — planuri pentru cluburi',
    offers: [{ name: 'Bază', price: '1' }, { name: 'Premium', price: '2' }],
  },

  antrenori: {
    title: 'iGROWth pentru antrenori · Prezență, planuri și evoluția fiecărui sportiv',
    ogTitle: 'Antrenează cu datele la îndemână',
    description: 'Prezență în câteva secunde, program recurent, măsurători și evoluție fizică pe grafice, comunicare cu părinții. Pentru antrenori din cluburi și antrenori independenți. Demo gratuit.',
    css: ['/assets/css/theme.css', '/assets/css/page-antrenori.css'],
    js: ['/assets/js/page-antrenori.js'],
    navCta: { ghost: { label: 'Încearcă demo', href: '#demo' }, primary: { label: 'Începe ca antrenor', icon: 'i-whistle', class: 'js-reg' } },
    mobileCta: { ghost: { label: 'Prețuri', href: '#preturi' }, primary: { label: 'Începe ca antrenor', icon: 'i-whistle', class: 'js-reg' } },
    anchors: [
      ['#cum', 'Cum funcționează'], ['#functii', 'Funcții'],
      ['#evolutie', 'Evoluție fizică'], ['#preturi', 'Prețuri și comisioane'],
      ['#securitate', 'Securitate'], ['#demo', 'Demo'], ['#intrebari', 'Întrebări'],
    ],
    offersName: 'iGROWth — planuri pentru antrenori',
    offers: [{ name: 'Bază', price: '1' }, { name: 'Premium', price: '2' }],
  },

  /* --------------------------------------------------------------------
   * Pagini legale — schelet, marcate `noindex` în registru până la
   * publicarea textelor finale. Există ca să nu rămână linkuri moarte.
   * ----------------------------------------------------------------- */
  termeni: {
    title: 'Termeni și condiții · iGROWth',
    description: 'Termenii și condițiile de utilizare a platformei iGROWth (sportiveducat.ro) și a aplicației asociate.',
    css: ['/assets/css/theme.css'], sprite: 'legal', mobileCta: false,
    legal: {
      h1: 'Termeni și condiții',
      intro: 'Condițiile în care poți folosi site-ul sportiveducat.ro și aplicația iGROWth.',
      sections: [
        ['Cine suntem', ['iGROWth este o platformă de management pentru cluburi sportive și o aplicație educațională gamificată pentru copii, operată în România.']],
        ['Conturi și roluri', ['Platforma are conturi separate pentru sportivi, părinți, antrenori și cluburi. Pentru sportivii minori, contul este creat și administrat de un părinte sau tutore legal.']],
        ['Abonamente și plăți', ['Planurile, prețurile și modul de facturare sunt cele afișate pe paginile dedicate fiecărui rol. Pentru un sportiv minor, plata este întotdeauna în sarcina părintelui sau tutorelui.']],
        ['Utilizare acceptabilă', ['Conținutul platformei este destinat uzului personal al utilizatorilor înregistrați și al cluburilor partenere.']],
      ],
    },
  },

  confidentialitate: {
    title: 'Politica de confidențialitate · iGROWth',
    description: 'Cum colectăm, folosim și protejăm datele personale ale utilizatorilor iGROWth, inclusiv datele copiilor, conform GDPR.',
    css: ['/assets/css/theme.css'], sprite: 'legal', mobileCta: false,
    legal: {
      h1: 'Politica de confidențialitate',
      intro: 'Cum colectăm, folosim și protejăm datele tale și ale copilului tău, conform GDPR.',
      sections: [
        ['Ce date colectăm', ['Date de cont (nume, email, telefon), date despre copil furnizate de părinte (prenume, vârstă, sport), date de activitate în aplicație (prezență, progres, punctaje) și, pentru cluburi, date de identificare fiscală.']],
        ['De ce le folosim', ['Pentru a furniza serviciul: crearea contului, funcționarea aplicației, rapoartele către părinți și cluburi, facturarea abonamentelor și comunicările legate de cont.']],
        ['Datele copiilor', ['Conturile sportivilor minori sunt legate de un părinte sau tutore legal, care își dă consimțământul la înregistrare. Nu afișăm publicitate țintită către copii și nu vindem date.']],
        ['Drepturile tale', ['Ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție. Poți exercita oricare dintre ele scriindu-ne la adresa de contact de mai jos.']],
        ['Păstrare și securitate', ['Păstrăm datele cât timp contul este activ și pe perioada impusă de obligațiile legale. Accesul la datele unui club este limitat la persoanele autorizate de acel club.']],
      ],
    },
  },

  cookies: {
    title: 'Politica de cookies · iGROWth',
    description: 'Ce cookie-uri și tehnologii similare folosim pe sportiveducat.ro și cum le poți controla.',
    css: ['/assets/css/theme.css'], sprite: 'legal', mobileCta: false,
    legal: {
      h1: 'Politica de cookies',
      intro: 'Ce cookie-uri folosim pe sportiveducat.ro și cum le poți controla.',
      sections: [
        ['Cookie-uri strict necesare', ['Site-ul de prezentare funcționează fără cookie-uri de urmărire. Folosim doar stocare locală în browser (sessionStorage) pentru a reține că ai închis notificarea din colț.']],
        ['Cookie-uri de analiză', ['Dacă activăm un instrument de analiză a traficului, îl vom lista aici împreună cu durata de păstrare și vom cere consimțământul înainte de a-l încărca.']],
        ['Aplicația', ['Aplicația de la app.sportiveducat.ro folosește cookie-uri de autentificare, necesare pentru a te menține conectat.']],
        ['Cum le controlezi', ['Poți șterge sau bloca stocarea locală și cookie-urile din setările browserului. Unele funcții ale aplicației nu vor mai funcționa fără cookie-urile de autentificare.']],
      ],
    },
  },

  /* --------------------------------------------------------------------
   * Întoarcerea de la Stripe Checkout. Sunt `success_url` și `cancel_url`
   * trimise de functions/api/lead.js către /plan-checkout.
   * ----------------------------------------------------------------- */
  'cont-creat': {
    title: 'Cont creat · iGROWth',
    description: 'Contul tău iGROWth a fost creat. Verifică emailul pentru pașii de activare.',
    css: ['/assets/css/theme.css'], sprite: 'stare', mobileCta: false,
    status: {
      tone: 'ok',
      eyebrow: 'Gata',
      h1: 'Contul tău e creat.',
      lead: 'Ți-am trimis pe email pașii de activare. Deschide-l, confirmă adresa și îți alegi parola — apoi intri direct în aplicație.',
      points: [
        ['i-mail', 'Verifică emailul', 'Dacă nu-l găsești în câteva minute, uită-te și în Spam sau Promoții.'],
        ['i-lock', 'Îți alegi parola', 'Linkul din email e valabil 24 de ore.'],
        ['i-rocket', 'Intri în aplicație', 'De acolo urmărești tot: progres, prezență, plăți.'],
      ],
      cta: { label: 'Deschide aplicația', icon: 'i-rocket', href: '{app}/login' },
    },
  },

  'plata-anulata': {
    title: 'Plată anulată · iGROWth',
    description: 'Plata a fost anulată. Contul tău iGROWth există deja și poate fi folosit gratuit.',
    css: ['/assets/css/theme.css'], sprite: 'stare', mobileCta: false,
    status: {
      tone: 'warn',
      eyebrow: 'Plată anulată',
      h1: 'Nu-i nimic — contul tău există deja.',
      lead: 'Nu s-a reținut nicio sumă. Contul a fost creat înainte de plată și poate fi folosit pe planul gratuit, cât timp vrei.',
      points: [
        ['i-check-circle', 'Contul e activ', 'Verifică emailul pentru pașii de activare, dacă n-ai făcut-o deja.'],
        ['i-card', 'Plătești când vrei', 'Poți alege oricând un plan plătit din aplicație, de la Setări → Abonament.'],
        ['i-mail', 'Ai nevoie de ajutor?', 'Scrie-ne și te ajutăm să alegi planul potrivit.'],
      ],
      cta: { label: 'Deschide aplicația', icon: 'i-rocket', href: '{app}/login' },
    },
  },

  eroare: {
    title: 'Pagina nu a fost găsită · iGROWth',
    description: 'Pagina căutată nu există. Mergi la pagina de start iGROWth sau alege secțiunea potrivită rolului tău.',
    css: ['/assets/css/theme.css'], sprite: 'eroare', mobileCta: false,
  },
};
