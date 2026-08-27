/* iGROWth · pagina „Antrenori"
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
    { n: 'Un antrenor din Cluj', s: 'tocmai a pornit demo-ul', c: '#2FB673' },
    { n: 'Elena, tenis', s: 'a marcat prima prezență', c: '#5B4BD6' },
    { n: 'Un antrenor din Iași', s: 'a adăugat 24 de sportivi', c: '#FFB020' },
    { n: 'Andrei, fotbal', s: 'a notat o măsurătoare', c: '#ff5d8f' },
    { n: 'Un antrenor din Timișoara', s: 'și-a creat contul', c: '#38b6ff' },
    { n: 'Ioana, înot', s: 'a trimis un anunț către părinți', c: '#2FB673' }
  ];

  var INDEP = [
    { n: 'Elena D.', r: 'antrenoare, tenis', c: '#2FB673', t: 'Fac prezența în 30 de secunde, chiar pe teren. Programul recurent îmi spune și când sala e ocupată.' },
    { n: 'Andrei M.', r: 'antrenor independent, fotbal', c: '#FFB020', t: 'Ca „club de unul singur”, arăt profesionist în fața părinților. Evoluția fizică pe grafice i-a impresionat.' },
    { n: 'Vlad T.', r: 'antrenor, atletism', c: '#5B4BD6', t: 'Îmi gestionez singur abonamentele și încasările, inclusiv cash. Nimic pierdut pe hârtii.' },
    { n: 'Ioana S.', r: 'antrenoare, înot', c: '#38b6ff', t: 'Notificările către părinți mi-au redus mult întârzierile la antrenamente.' }
  ];

  var CLUBC = [
    { n: 'Mihai V.', r: 'antrenor la CS Viitorul · U12', c: '#5B4BD6', t: 'Într-un club mare, îmi văd clar echipele mele. Prezența și măsurătorile le fac din telefon.' },
    { n: 'Robert P.', r: 'antrenor la Academia Lupii', c: '#ff5d8f', t: 'Comunic direct cu părinții din grupa mea, fără să încarc pe toată lumea din club.' },
    { n: 'Cristian D.', r: 'antrenor, baschet', c: '#2FB673', t: 'Progresul fiecărui copil, pe grafic, m-a ajutat să argumentez în fața părinților.' },
    { n: 'George A.', r: 'antrenor la ACS Delta', c: '#FFB020', t: 'Accesul e limitat la echipele mele — simplu și sigur. Restul rămâne la club.' }
  ];

  function onReady(fn) {
    if (document.readyState === 'complete') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  onReady(function () {
    window.igFillTrack('indepTrack', INDEP, window.igQuoteCard);
    window.igFillTrack('clubTrack', CLUBC, window.igQuoteCard);
  });
})();
