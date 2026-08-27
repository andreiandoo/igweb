/* iGROWth · pagina „Părinți"
   Testimoniale (marquee orizontal), link de recomandare, date pentru toast. */
(function () {
  'use strict';

  var doc = document;

  /* ATENTIE: in productie, alimenteaza lista din inregistrari reale. */
  window.IG_FOMO = [
    { n: 'Andreea din București', s: 'tocmai a creat cont pentru copil', c: '#2FB673' },
    { n: 'Un părinte din Cluj', s: 'a descărcat aplicația acum câteva minute', c: '#5B4BD6' },
    { n: 'Familia Popescu', s: 'a activat planul Campion', c: '#FFB020' },
    { n: 'Un tată din Iași', s: 'a înscris 2 copii în plan de familie', c: '#ff5d8f' },
    { n: 'Maria din Timișoara', s: 'tocmai s-a înregistrat', c: '#38b6ff' },
    { n: 'Un părinte din Ploiești', s: 'a recomandat iGROWth unui prieten', c: '#2FB673' },
    { n: 'Andrei din Brașov', s: 'a descărcat aplicația din App Store', c: '#5B4BD6' }
  ];

  var TESTI = [
    { n: 'Andreea M.', r: 'mamă, David 11 ani', c: '#2FB673', p: 'b-google', pn: 'Google', t: 'A trecut de la „nu vreau apă” la „am băut deja 6 pahare, uite în app”. Mi se pare incredibil.' },
    { n: 'Robert P.', r: 'tată, Maria 9 ani', c: '#5B4BD6', p: 'b-fb', pn: 'Facebook', t: 'Se trezește și primul lucru pe care-l face e „misiunea de azi”. Și învață lucruri utile, nu pierde timpul.' },
    { n: 'Cristina D.', r: 'mamă, 2 copii', c: '#FFB020', p: 'b-apple', pn: 'App Store', t: 'Planul de familie ne-a convins. Amândoi copiii concurează între ei, sănătos, și eu văd totul într-un loc.' },
    { n: 'Mihai V.', r: 'tată, Luca 13 ani', c: '#ff5d8f', p: 'b-gplay', pn: 'Google Play', t: 'Îmi place că nu poți cumpăra locul în clasament. Luca e mândru că a urcat pe bune, prin muncă.' },
    { n: 'Elena T.', r: 'mamă, Sofia 10 ani', c: '#38b6ff', p: 'b-google', pn: 'Google', t: 'Rapoartele lunare sunt exact ce-mi trebuia. Văd negru pe alb la ce e constantă și unde mai are de lucru.' },
    { n: 'Andrei S.', r: 'antrenor & tată', c: '#2FB673', p: 'b-apple', pn: 'App Store', t: 'Ca antrenor recomand aplicația părinților, ca tată o folosesc acasă. Copiii chiar învață despre corpul lor.' }
  ];

  function tcard(o) {
    return '<div class="tcard"><div class="tc-head">' +
      '<div class="tc-av" style="background:linear-gradient(135deg,' + o.c + ',#ffffff55)">' + o.n.charAt(0) + '</div>' +
      '<div class="tc-who"><div class="n">' + o.n + '</div><div class="r">' + o.r + '</div></div></div>' +
      '<div class="tc-stars" aria-hidden="true">' + window.igStars() + '</div>' +
      '<p>“' + o.t + '”</p>' +
      '<div class="tc-plat"><svg class="icon" aria-hidden="true"><use href="#' + o.p + '"/></svg> Recenzie pe ' + o.pn + '</div></div>';
  }

  function onReady(fn) {
    if (doc.readyState === 'complete') fn();
    else doc.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  onReady(function () {
    window.igFillTrack('mtrack', TESTI, tcard);
    referral();
  });

  /* ---------- link de recomandare: copiere + partajare ---------- */
  function referral() {
    var linkEl = doc.getElementById('refLink');
    if (!linkEl) return;

    function url() { return 'https://' + linkEl.textContent.trim(); }

    window.copyRef = function () {
      var box = doc.getElementById('copyBtn');
      var dbtn = doc.querySelector('.btn-copy');
      var original = dbtn ? dbtn.innerHTML : '';
      function ok() {
        if (box) box.classList.add('copied');
        if (dbtn) dbtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg> Copiat!';
        setTimeout(function () {
          if (box) box.classList.remove('copied');
          if (dbtn) dbtn.innerHTML = original;
        }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url()).then(ok, ok);
      } else {
        var t = doc.createElement('textarea');
        t.value = url();
        doc.body.appendChild(t);
        t.select();
        try { doc.execCommand('copy'); } catch (e) { /* ignora */ }
        doc.body.removeChild(t);
        ok();
      }
    };

    window.shareVia = function (k) {
      var msg = 'Am găsit iGROWth — copilul învață mișcare, nutriție și mentalitate sportivă jucându-se. Îți las invitația mea: ';
      var u = encodeURIComponent(url());
      var m = encodeURIComponent(msg);
      var link = k === 'wa' ? 'https://wa.me/?text=' + m + u
        : k === 'fb' ? 'https://www.facebook.com/sharer/sharer.php?u=' + u
          : 'mailto:?subject=' + encodeURIComponent('Cred că îți place iGROWth') + '&body=' + m + u;
      window.open(link, '_blank', 'noopener');
    };
  }
})();
