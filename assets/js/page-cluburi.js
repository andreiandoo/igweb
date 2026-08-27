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
})();
