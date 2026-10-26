/* ==========================================================================
   iGROWth · page-parteneri.js — landing page „Program de parteneriat"
   Calculator de câștig, notificările din hero, linia pașilor, atribuirea
   reclamelor (UTM / gclid / fbclid) și trimiterea formularului.
   Trimiterea folosește window.igSubmitLead din site.js → /api/lead, tip
   `partner` → Google Sheets (vezi functions/api/lead.js).
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function fmt(n) { return Math.round(n).toLocaleString('ro-RO'); }

  /* --- atribuire: parametrii din URL ținuți pe sesiune ------------------
     Omul poate veni din reclamă, citi pagina, pleca și reveni; păstrăm
     prima sursă cunoscută a sesiunii. */
  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
  var ATTR_STORE = 'ig-partner-attr';

  function attribution() {
    var saved = {};
    try { saved = JSON.parse(sessionStorage.getItem(ATTR_STORE) || '{}') || {}; } catch (e) { saved = {}; }
    var qs = new URLSearchParams(window.location.search);
    var fresh = {};
    ATTR_KEYS.forEach(function (k) { var v = qs.get(k); if (v) fresh[k] = v.slice(0, 200); });
    if (Object.keys(fresh).length) {
      saved = fresh;
      saved.landing_url = window.location.href.slice(0, 500);
      saved.referrer = (doc.referrer || '').slice(0, 500);
    } else if (!saved.landing_url) {
      saved.landing_url = window.location.href.slice(0, 500);
      saved.referrer = (doc.referrer || '').slice(0, 500);
    }
    try { sessionStorage.setItem(ATTR_STORE, JSON.stringify(saved)); } catch (e) { /* fără stocare: doar pagina curentă */ }
    return saved;
  }

  doc.addEventListener('DOMContentLoaded', function () {

    /* ------------------------------------------------------- calculator */
    var calc = $('#calc');
    var lastMonthly = 0;
    (function () {
      if (!calc) return;
      var sliders = $$('.lp-slider', calc);
      var out = {
        monthly: $('#calcMonthly'), count: $('#calcCount'), year: $('#calcYear'), y3: $('#calc3y'),
        mix: [$('#mixS'), $('#mixC'), $('#mixE')]
      };
      var hidden = $('#partnerForm [name="estimated_monthly"]');
      var shown = 0, raf = 0;

      /* numărul mare urcă/coboară animat până la valoarea nouă */
      function animateTo(target) {
        cancelAnimationFrame(raf);
        if (reduceMotion) { shown = target; out.monthly.textContent = fmt(target); return; }
        var from = shown, t0 = null;
        function tick(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / 450, 1);
          shown = from + (target - from) * (1 - Math.pow(1 - p, 3));
          out.monthly.textContent = fmt(shown);
          if (p < 1) raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
      }

      function update() {
        var total = 0, count = 0, parts = [];
        sliders.forEach(function (s) {
          var input = $('input', s);
          var n = Number(input.value);
          var sum = n * Number(s.getAttribute('data-com'));
          total += sum; count += n; parts.push(sum);
          $('[data-n]', s).textContent = n;
          $('[data-t]', s).textContent = fmt(sum) + ' €';
          input.style.setProperty('--fill', (n / Number(input.max) * 100) + '%');
        });
        animateTo(total);
        out.count.textContent = fmt(count);
        out.year.textContent = fmt(total * 12);
        out.y3.textContent = fmt(total * 36);
        out.mix.forEach(function (el, i) { if (el) el.style.width = (total ? parts[i] / total * 100 : 0) + '%'; });
        if (hidden) hidden.value = String(total);
        if (total !== lastMonthly) {
          var big = out.monthly.parentNode;
          big.classList.remove('bump'); void big.offsetWidth; big.classList.add('bump');
        }
        lastMonthly = total;
      }

      sliders.forEach(function (s) {
        $('input', s).addEventListener('input', function () {
          $$('.lp-chip').forEach(function (c) { c.classList.remove('active'); });
          update();
        });
      });

      $$('.lp-chip[data-preset]').forEach(function (chip) {
        chip.addEventListener('click', function () {
          var v = chip.getAttribute('data-preset').split(',');
          sliders.forEach(function (s, i) { $('input', s).value = v[i] || 0; });
          $$('.lp-chip').forEach(function (c) { c.classList.toggle('active', c === chip); });
          update();
        });
      });

      shown = 0;
      update();
    })();

    /* ------------------------------------------- notificările din hero */
    (function () {
      var toasts = $$('.lp-toast');
      if (!toasts.length) return;
      var msgs = [
        ['+3 € comision', 'Abonament Campion activat'],
        ['+4 € comision', 'Abonament Elită reînnoit'],
        ['+2 € comision', 'Abonament Start activat'],
        ['+3 € comision', 'Abonament Campion reînnoit'],
        ['+2 € comision', 'Familie nouă prin linkul tău'],
        ['+4 € comision', 'Abonament Elită activat']
      ];
      if (reduceMotion) { toasts.forEach(function (t) { t.classList.add('show'); }); return; }
      var i = 0;
      function cycle(t, delay) {
        setTimeout(function () {
          t.classList.add('show');
          setTimeout(function () {
            t.classList.remove('show');
            setTimeout(function () {
              var m = msgs[i++ % msgs.length];
              $('b', t).textContent = m[0];
              $('small', t).textContent = m[1];
              cycle(t, 600);
            }, 600);
          }, 3600);
        }, delay);
      }
      cycle(toasts[0], 900);
      cycle(toasts[1], 2700);
    })();

    /* ------------------------------------------ linia care leagă pașii */
    (function () {
      var steps = $('#lpSteps');
      if (!steps) return;
      if (reduceMotion) { steps.style.setProperty('--p', 1); return; }
      var ticking = false;
      function update() {
        var r = steps.getBoundingClientRect();
        var vh = window.innerHeight;
        var p = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
        steps.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(3));
        ticking = false;
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    })();

    /* ------------------------------------- graficul „venit recurent" */
    (function () {
      var bars = $('.lp-bars');
      if (!bars) return;
      $$('.lp-bars-in span', bars).forEach(function (b, i) { b.style.transitionDelay = (i * 0.06) + 's'; });
      if (!('IntersectionObserver' in window) || reduceMotion) { bars.classList.add('in'); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { bars.classList.add('in'); io.disconnect(); } });
      }, { threshold: 0.35 });
      io.observe(bars);
    })();

    /* ------------------------------------------------------- formular */
    var form = $('#partnerForm');
    if (!form) return;

    /* pe mobil, butonul fix „Vreau să devin partener" nu are rost când
       formularul e deja pe ecran — doar ar acoperi butonul de trimitere */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        doc.body.classList.toggle('lp-form-visible', entries[0].isIntersecting);
      }, { threshold: 0.15 }).observe($('#inscriere'));
    }

    var attr = attribution();
    Object.keys(attr).forEach(function (k) {
      var input = form.querySelector('[name="' + k + '"]');
      if (input) input.value = attr[k];
    });

    /* Antrenor / Club: pastila glisează, iar pentru club numele clubului
       devine obligatoriu. */
    var seg = $('.lp-seg', form);
    var clubInput = form.querySelector('[name="club_name"]');
    function syncRole() {
      var club = form.querySelector('[name="role"]:checked').value === 'club';
      seg.classList.toggle('is-club', club);
      $('#clubLabel').textContent = club ? 'Numele clubului' : 'Club / echipă';
      $('#clubOpt').hidden = club;
      clubInput.required = club;
      clubInput.placeholder = club ? 'Ex: CS Viitorul Ploiești' : 'Ex: CS Viitorul';
    }
    $$('[name="role"]', form).forEach(function (r) { r.addEventListener('change', syncRole); });
    syncRole();

    /* Butonul din calculator aduce omul la formular cu estimarea deja
       calculată (câmpul ascuns e ținut la zi de calculator). */
    $$('a[href="#inscriere"]').forEach(function (a) {
      a.addEventListener('click', function () {
        setTimeout(function () {
          var first = form.querySelector('[name="full_name"]');
          if (first && !first.value) first.focus({ preventScroll: true });
        }, 650);
      });
    });

    var err = $('#pfError');
    var btn = $('#pfSubmit');

    function showError(msg, fields) {
      err.textContent = msg;
      err.hidden = false;
      (fields || []).forEach(function (name) {
        var el = form.querySelector('[name="' + name + '"]');
        if (el) el.classList.add('bad');
      });
    }

    form.addEventListener('input', function (e) {
      if (e.target.classList) e.target.classList.remove('bad');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;

      var fields = $$('input[required], select[required]', form);
      for (var i = 0; i < fields.length; i++) {
        if (!fields[i].checkValidity()) {
          fields[i].classList.add('bad');
          fields[i].reportValidity();
          return;
        }
      }

      btn.disabled = true;
      btn.classList.add('loading');

      window.igSubmitLead(form).then(function (res) {
        btn.disabled = false;
        btn.classList.remove('loading');
        if (!res || !res.ok) {
          showError((res && res.error) || 'Nu am putut trimite formularul. Încearcă din nou.', res && res.fields);
          return;
        }
        var name = (form.querySelector('[name="full_name"]').value || '').trim().split(/\s+/)[0];
        $('#pfName').textContent = name ? ', ' + name : '';
        $('#pfFields').hidden = true;
        var done = $('#pfDone');
        done.hidden = false;
        done.focus({ preventScroll: true });
        done.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        confetti();
        /* conversia (form_submission_success / form_cluburi) o trimite
           igSubmitLead din site.js; Ads și Meta se configurează în GTM */
      });
    });

    function confetti() {
      if (reduceMotion) return;
      var box = doc.createElement('div');
      box.className = 'lp-confetti';
      box.setAttribute('aria-hidden', 'true');
      var colors = ['#2FB673', '#38b6ff', '#5B4BD6', '#FFB020', '#ff5d8f'];
      for (var i = 0; i < 90; i++) {
        var c = doc.createElement('i');
        c.style.left = (Math.random() * 100) + '%';
        c.style.background = colors[i % colors.length];
        c.style.setProperty('--x', ((Math.random() - 0.5) * 240) + 'px');
        c.style.setProperty('--r', (360 + Math.random() * 720) + 'deg');
        c.style.setProperty('--t', (2 + Math.random() * 1.8) + 's');
        c.style.animationDelay = (Math.random() * 0.5) + 's';
        box.appendChild(c);
      }
      doc.body.appendChild(box);
      setTimeout(function () { box.remove(); }, 4600);
    }
  });
})();
