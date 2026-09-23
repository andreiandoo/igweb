/* iGROWth · pagina „Cluburi"
   Date pentru marquee-ul de sporturi, testimoniale verticale si toast. */
(function () {
  'use strict';

  window.IG_SPORTS_EMOJI = [
    ['⚽', 'Fotbal'], ['🏀', 'Baschet'], ['🤾', 'Handbal'], ['🏐', 'Volei'], ['🎾', 'Tenis'],
    ['🏓', 'Tenis de masă'], ['🏊', 'Înot'], ['🏃', 'Atletism'], ['🤸', 'Gimnastică'], ['🏉', 'Rugby'],
    ['🥋', 'Judo'], ['🥊', 'Box'], ['♟️', 'Șah'], ['🚴', 'Ciclism'], ['⛷️', 'Schi'],
    ['⛸️', 'Patinaj'], ['💃', 'Dans sportiv'], ['🤺', 'Scrimă'], ['🏸', 'Badminton'], ['🏇', 'Călărie']
  ];

  /* ATENTIE: in productie, alimenteaza lista din inregistrari reale. */
  window.IG_FOMO = [
    { n: 'CS Viitorul Ploiești', s: 'tocmai a pornit demo-ul', c: '#2FB673' },
    { n: 'Un antrenor din Cluj', s: 'și-a creat contul de club', c: '#5B4BD6' },
    { n: 'Academia Lupii', s: 'a invitat 4 antrenori', c: '#FFB020' },
    { n: 'Un club din Iași', s: 'a importat 60 de sportivi', c: '#ff5d8f' },
    { n: 'Sport Club Timișoara', s: 'a activat clubul', c: '#38b6ff' },
    { n: 'Un antrenor din Brașov', s: 'a marcat prima prezență', c: '#2FB673' }
  ];

  var OWNERS = [
    { n: 'Robert S.', r: 'owner, CS Viitorul · 6 echipe', c: '#5B4BD6', t: 'Am mutat tot clubul aici. Văd încasările, abonamentele și prezența într-un singur loc — inclusiv banii cash strânși de antrenori.' },
    { n: 'Adriana M.', r: 'owner, Academia Lupii', c: '#2FB673', t: 'Facturarea pro-rata ne-a scutit de multă muncă la final de lună. Iar datele clubului sunt strict ale noastre.' },
    { n: 'Ionuț P.', r: 'owner, Sport Club Timișoara', c: '#38b6ff', t: 'Calculatorul de comisioane m-a convins — practic ne acoperim costul din abonamentele copiilor.' },
    { n: 'Cristian D.', r: 'owner, ACS Delta', c: '#FFB020', t: 'Rapoartele pe tot clubul îmi arată clar unde stăm cu prezența și cu banii. Iau decizii pe cifre.' }
  ];

  var COACHES = [
    { n: 'Mihai V.', r: 'antrenor la CS Viitorul · U12', c: '#FFB020', t: 'Prezența întregii echipe o marchez din telefon, în pauză. Programul recurent îmi spune și când sala e deja rezervată.' },
    { n: 'Elena D.', r: 'antrenoare la Academia Lupii', c: '#ff5d8f', t: 'Evoluția fizică pe grafice îi impresionează pe părinți. Copiii revin pentru clasamente și insigne — și rămân în echipă.' },
    { n: 'Andrei M.', r: 'antrenor, tenis', c: '#2FB673', t: 'Ca antrenor independent, arăt profesionist fără birocrație. Îmi gestionez singur abonamentele și încasările.' },
    { n: 'Vlad T.', r: 'antrenor la ACS Delta', c: '#5B4BD6', t: 'Notificările către părinți la antrenamente ne-au redus mult întârzierile și absențele.' }
  ];

  function onReady(fn) {
    if (document.readyState === 'complete') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  onReady(function () {
    window.igFillTrack('ownersTrack', OWNERS, window.igQuoteCard);
    window.igFillTrack('coachesTrack', COACHES, window.igQuoteCard);
  });
  /* ==================================================================
     Verificarea clubului la ANAF

     Codul fiscal e prima intrebare si conditia pentru tot restul: pana
     cand serviciul nu confirma firma, formularul nu merge mai departe.
     Motivul e concret — pana acum campurile acceptau orice text si s-au
     strecurat inregistrari cu date inventate.

     Verdictul vine INTOTDEAUNA de la server. Cifra de control se poate
     potrivi si pentru un cod care nu exista, deci nu validam local.

     Interogarea trece prin /api/anaf (functie Pages), nu direct catre API:
     CSP-ul paginii are `connect-src 'self'`, deci un fetch catre alt domeniu
     ar fi blocat de browser.
     ================================================================== */
  onReady(function () {
    var input = document.getElementById('clubCui');
    var out   = document.getElementById('cuiState');
    if (!input || !out) return;

    var AJUTOR = 'Îl verificăm în registrul ANAF și completăm automat datele necesare';
    var BLOCAT = 'Începe cu codul fiscal (CUI/CIF) al clubului — facem o verificare automată și completăm noi datele necesare.';
    var DEBOUNCE = 500;   /* limita e 120 de cereri / 5 min / IP */

    var state = 'idle';
    var timer = null;
    /* Ultimul cod pentru care am cerut un verdict. Un raspuns lent pentru un
       cod vechi nu are voie sa suprascrie unul mai nou. */
    var asteptat = '';

    var doar_cifre = function (v) { return String(v || '').replace(/\D+/g, ''); };

    function buton() { return document.getElementById('regFwd'); }

    function setState(next) {
      state = next;
      input.classList.toggle('is-ok', next === 'ok');
      input.classList.toggle('is-err', next === 'error');
      input.setAttribute('aria-invalid', next === 'error' ? 'true' : 'false');
      var b = buton();
      if (b) b.disabled = (next !== 'ok');
    }

    function scrie(next, noduri) {
      setState(next);
      out.className = 'cui-state cui-' + next;
      out.replaceChildren.apply(out, noduri);
    }

    var text = function (t, cls) {
      var el = document.createElement('span');
      if (cls) el.className = cls;
      el.textContent = t;
      return el;
    };

    function idle()     { scrie('idle', [text(AJUTOR)]); }
    function checking() { scrie('checking', [text('Verificăm la ANAF…')]); }

    function ok(company) {
      var nume = document.createElement('b');
      nume.className = 'cui-name';
      nume.textContent = company.legal_name || '';
      scrie('ok', [nume, text('Datele oficiale au fost preluate de la ANAF.', 'cui-note')]);
    }

    /* Mesajul vine de la server ca text, nu ca HTML: il punem prin
       textContent, iar linkul il construim noi. */
    function eroare(mesaj, cuLogin) {
      var noduri = [text(mesaj)];
      if (cuLogin) {
        var a = document.createElement('a');
        a.className = 'cui-note';
        a.href = ((window.IG && window.IG.app) || '') + '/login';
        a.rel = 'noopener';
        a.textContent = 'Intră în cont';
        noduri.push(a);
      }
      scrie('error', noduri);
    }

    function completeaza(company) {
      /* Denumirea clubului NU se precompleteaza: nu e neaparat aceeasi cu
         numele persoanei juridice din spate. Restul, doar daca e gol —
         nu suprascriem ce a scris omul. Adresa de antrenament ramane a lui:
         sediul social din ANAF nu e locul unde se antreneaza clubul. */
      [['clubShortName', company.legal_name],
       ['clubCity',      company.city],
       ['clubCounty',    company.county]].forEach(function (pereche) {
        var el = document.getElementById(pereche[0]);
        if (el && !el.value.trim() && pereche[1]) el.value = pereche[1];
      });
    }

    function intreaba(cui) {
      asteptat = cui;
      checking();
      fetch('/api/anaf?cui=' + encodeURIComponent(cui), { headers: { Accept: 'application/json' } })
        .then(function (r) {
          return r.json().catch(function () { return {}; })
            .then(function (d) { return { status: r.status, data: d }; });
        })
        .catch(function () {
          return { status: 0, data: { error: 'Conexiune întreruptă. Încearcă din nou.', reason: 'unavailable' } };
        })
        .then(function (res) {
          /* intre timp s-a schimbat codul: verdictul asta nu mai e al nostru */
          if (asteptat !== cui || doar_cifre(input.value) !== cui) return;

          if (res.status === 200 && res.data && res.data.company) {
            if (res.data.already_registered) {
              eroare('Acest club este deja înregistrat pe iGROWth. Autentifică-te sau recuperează-ți parola.', true);
              return;
            }
            completeaza(res.data.company);
            ok(res.data.company);
            return;
          }
          eroare((res.data && res.data.error) || 'Nu am putut verifica acest cod. Încearcă din nou.');
        });
    }

    function laScriere() {
      clearTimeout(timer);
      var cui = doar_cifre(input.value);
      asteptat = '';                    /* orice raspuns in zbor devine vechi */
      if (cui.length < 2) { idle(); return; }
      setState('idle');                 /* butonul se blocheaza pana la verdict */
      timer = setTimeout(function () { intreaba(cui); }, DEBOUNCE);
    }

    input.addEventListener('input', laScriere);
    idle();

    /* Poarta citita de regNext din site.js inainte de fiecare pas. */
    window.igRegGate = function () {
      if (state === 'ok') return '';
      if (state !== 'checking') { try { input.focus(); } catch (e) {} }
      return state === 'checking' ? 'Așteaptă verificarea codului fiscal.' : BLOCAT;
    };
  });
})();
