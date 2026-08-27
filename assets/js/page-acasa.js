/* iGROWth · pagina de start
   Switcher-ul de rol din hero + marquee-ul de sporturi + donut-ul de misiune. */
(function () {
  'use strict';

  /* sporturile din marquee (randate de site.js in #smq) */
  window.IG_SPORTS_ICONS = [
    ['i-zap', 'Fotbal'], ['i-dumbbell', 'Baschet'], ['i-star', 'Tenis'], ['i-flame', 'Înot'],
    ['i-trophy', 'Atletism'], ['i-heart', 'Gimnastică'], ['i-gem', 'Volei'], ['i-shield', 'Handbal'],
    ['i-rocket', 'Rugby'], ['i-sparkles', 'Dans'], ['i-whistle', 'Karate'], ['i-users', 'Polo']
  ];

  function onReady(fn) {
    if (document.readyState === 'complete') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }
  onReady(function () {
    roleSwitcher();
    donut();
  });

  /* ---------- switcher de rol ---------- */
  function roleSwitcher() {
    var sw = document.getElementById('switcher');
    var hero = document.getElementById('top');
    var head = document.getElementById('hHead');
    var sub = document.getElementById('hSub');
    var link = document.getElementById('hLink');
    var eyebrow = document.getElementById('hEyebrow');
    if (!sw || !hero || !head || !sub || !link || !eyebrow) return;

    var DUR = 5000;
    var pages = window.IG_ROLE_LINKS || {};
    var data = {
      sportiv: {
        eb: 'Pentru sportivi',
        head: 'Sportul devine <span class="accent">jocul tău preferat.</span>',
        sub: 'Serii de zile, ligi, insigne și quiz-uri. Revii din plăcere și crești puțin în fiecare zi.',
        link: pages.sportivi || '#alege', label: 'Pagina sportivi'
      },
      parinte: {
        eb: 'Pentru părinți',
        head: 'Vezi cum crește copilul tău, <span class="accent">zi de zi.</span>',
        sub: 'Prezență, evoluție fizică și tot ce învață — clar, într-un singur loc, fără „cum a fost azi?”.',
        link: pages.parinti || '#alege', label: 'Pagina părinți'
      },
      antrenor: {
        eb: 'Pentru antrenori',
        head: 'Antrenează cu <span class="accent">datele la îndemână.</span>',
        sub: 'Prezență în câteva secunde, planuri, comunicare cu părinții și evoluția fiecărui sportiv.',
        link: pages.antrenori || '#alege', label: 'Pagina antrenori'
      },
      club: {
        eb: 'Pentru cluburi',
        head: 'Conduce clubul <span class="accent">dintr-un singur panou.</span>',
        sub: 'Abonamente, încasări (inclusiv cash prin antrenor), programe și evenimente — sub control.',
        link: pages.cluburi || '#alege', label: 'Pagina cluburi'
      }
    };

    var order = ['sportiv', 'parinte', 'antrenor', 'club'];
    var idx = 0, timer = null;
    var btns = Array.prototype.slice.call(sw.querySelectorAll('button'));
    var ebText = eyebrow.querySelector('span');
    var linkLbl = link.querySelector('span');
    var devs = {};
    Array.prototype.slice.call(document.querySelectorAll('.dev')).forEach(function (d) {
      devs[d.getAttribute('data-r')] = d;
    });
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    function apply(name) {
      var d = data[name];
      hero.setAttribute('data-role', name);
      ebText.textContent = d.eb;
      head.innerHTML = d.head;
      sub.textContent = d.sub;
      link.setAttribute('href', d.link);
      linkLbl.textContent = d.label;
      btns.forEach(function (b) {
        var on = b.getAttribute('data-r') === name;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      for (var k in devs) { devs[k].classList.toggle('show', k === name); }
      var ab = sw.querySelector('button.active .prog');
      if (ab) { ab.style.animation = 'none'; void ab.offsetWidth; ab.style.animation = ''; }
    }
    function reset() { if (timer) clearInterval(timer); if (!reduce) timer = setInterval(next, DUR); }
    function next() { idx = (idx + 1) % order.length; apply(order[idx]); }

    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        idx = order.indexOf(b.getAttribute('data-r'));
        apply(order[idx]);
        reset();
      });
    });
    [sw, document.getElementById('stage')].forEach(function (el) {
      if (!el) return;
      el.addEventListener('mouseenter', function () { if (timer) { clearInterval(timer); timer = null; } });
      el.addEventListener('mouseleave', reset);
    });
    Array.prototype.slice.call(sw.querySelectorAll('button .prog')).forEach(function (p) {
      p.style.setProperty('--dur', (DUR / 1000) + 's');
    });

    apply('sportiv');
    reset();
  }

  /* ---------- donut „90% reinvestit" ---------- */
  function donut() {
    var d = document.getElementById('donut');
    var v = document.getElementById('donutV');
    if (!d || !v) return;
    if (!('IntersectionObserver' in window)) { d.style.setProperty('--p', 90); v.textContent = '90%'; return; }
    var done = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || done) return;
        done = true;
        var n = 0;
        var t = setInterval(function () {
          n += 2;
          if (n >= 90) { n = 90; clearInterval(t); }
          d.style.setProperty('--p', n);
          v.textContent = n + '%';
        }, 22);
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    io.observe(d);
  }
})();
