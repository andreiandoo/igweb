/* ==========================================================================
   iGROWth · site.js — comportamente comune tuturor paginilor.
   Vanilla JS, fara dependinte. Incarcat cu `defer`.

   Ordinea conteaza: helper-ele (igFillTrack, igQuoteCard, setPeriod, ...) sunt
   definite imediat, ca sa fie disponibile pentru page-*.js, iar initializarile
   care citesc date din pagina (window.IG_SPORTS_*, window.IG_FOMO) ruleaza pe
   DOMContentLoaded — adica dupa ce toate scripturile `defer` au fost executate.

   Totul e defensiv: daca elementul nu exista pe pagina, functia nu face nimic.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  doc.documentElement.classList.remove('no-js');

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts); }
  /* ATENTIE: scripturile `defer` ruleaza cand readyState e deja 'interactive',
     inainte de DOMContentLoaded. Daca am rula imediat, datele definite in
     page-*.js (care se incarca dupa) inca n-ar exista. Asteptam evenimentul. */
  function onReady(fn) {
    if (doc.readyState === 'complete') fn();
    else doc.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  /* ======================================================================
     1. Helper-e globale (disponibile imediat pentru page-*.js)
     ====================================================================== */

  function stars(n) {
    var s = '';
    for (var i = 0; i < (n || 5); i++) s += '<svg class="icon" aria-hidden="true"><use href="#i-star"/></svg>';
    return s;
  }
  window.igStars = stars;

  /** Umple un track de marquee cu continutul duplicat (pentru bucla continua). */
  window.igFillTrack = function (id, data, render) {
    var el = doc.getElementById(id);
    if (!el || !data || !data.length) return;
    var html = data.map(render).join('');
    el.innerHTML = html + html;
  };

  /** Card „quote" folosit de cluburi + antrenori. */
  window.igQuoteCard = function (o) {
    return '<div class="qcard"><div class="qs" aria-hidden="true">' + stars() + '</div>' +
      '<p>“' + o.t + '”</p>' +
      '<div class="qwho"><div class="qav" style="background:linear-gradient(135deg,' + o.c + ',#ffffff55)">' + o.n.charAt(0) + '</div>' +
      '<div><div class="qn">' + o.n + '</div><div class="qr">' + o.r + '</div></div></div></div>';
  };

  /* --- meniu mobil --- */
  var lastFocus = null;
  function openMnav() {
    var m = doc.getElementById('mnav');
    if (!m) return;
    lastFocus = doc.activeElement;
    m.classList.add('open');
    doc.body.style.overflow = 'hidden';
    var burger = $('.burger[data-mnav="open"]');
    if (burger) burger.setAttribute('aria-expanded', 'true');
    var first = m.querySelector('a, button');
    if (first) first.focus();
  }
  function closeMnav() {
    var m = doc.getElementById('mnav');
    if (!m || !m.classList.contains('open')) return;
    m.classList.remove('open');
    doc.body.style.overflow = '';
    var burger = $('.burger[data-mnav="open"]');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.openMnav = openMnav;
  window.closeMnav = closeMnav;
  /* compatibilitate cu markup-ul vechi: mo(1) / mo(0) */
  window.mo = function (o) { if (o) openMnav(); else closeMnav(); };

  /* --- comutator preturi lunar / anual --- */
  window.setPeriod = function (p) {
    var monthly = p === 'm';
    var bm = doc.getElementById('btnMonthly'), by = doc.getElementById('btnYearly');
    if (bm) { bm.classList.toggle('active', monthly); bm.setAttribute('aria-pressed', String(monthly)); }
    if (by) { by.classList.toggle('active', !monthly); by.setAttribute('aria-pressed', String(!monthly)); }
    $$('.prices .amt[data-m], .pprice .amt[data-m]').forEach(function (el) {
      var v = el.getAttribute(monthly ? 'data-m' : 'data-y'); if (v) el.textContent = v;
    });
    $$('.prices .per[data-m], .pprice .per[data-m]').forEach(function (el) {
      var v = el.getAttribute(monthly ? 'data-m' : 'data-y'); if (v) el.textContent = v;
    });
    $$('.week[data-mw]').forEach(function (el) {
      var v = el.getAttribute(monthly ? 'data-mw' : 'data-yw'); if (v) el.textContent = v;
    });
  };

  /* Perioada aleasa in modal. `year` se trimite DOAR daca planul selectat are
     pret anual in catalog (window.IG.yearlyPlans) — altfel backend-ul da 400. */
  var regPeriod = 'month';

  function syncBillingPeriod() {
    var hidden = $('#reg [name="billing_period"]');
    if (!hidden) return;
    var checked = $('#reg [name="plan"]:checked');
    var code = checked ? checked.value : '';
    var allowed = (window.IG && window.IG.yearlyPlans) || [];
    hidden.value = (regPeriod === 'year' && allowed.indexOf(code) !== -1) ? 'year' : 'month';
  }
  window.igSyncBillingPeriod = syncBillingPeriod;

  window.setRegPeriod = function (p) {
    var monthly = p === 'm';
    regPeriod = monthly ? 'month' : 'year';
    var bm = doc.getElementById('rBtnM'), by = doc.getElementById('rBtnY');
    if (bm) bm.classList.toggle('active', monthly);
    if (by) by.classList.toggle('active', !monthly);
    $$('.plan-opt .pa[data-m]').forEach(function (el) {
      var v = el.getAttribute(monthly ? 'data-m' : 'data-y'); if (v) el.textContent = v;
    });
    $$('.plan-opt .pw[data-m]').forEach(function (el) {
      var v = el.getAttribute(monthly ? 'data-m' : 'data-y'); if (v) el.textContent = v;
    });
    syncBillingPeriod();
  };

  /* --- selectoare din formulare (apelate din onclick in markup) --- */
  window.pickPlan = function (el) {
    $$('.plan-opt', el.parentNode).forEach(function (a) { a.classList.remove('sel'); });
    el.classList.add('sel');
    var input = el.querySelector('input[type="radio"]');
    if (input) input.checked = true;
    syncBillingPeriod();
  };
  window.pickAv = function (el) {
    $$('.ap', el.parentNode).forEach(function (a) { a.classList.remove('sel'); a.setAttribute('aria-checked', 'false'); });
    el.classList.add('sel');
    el.setAttribute('aria-checked', 'true');
    var hidden = $('[name="avatar"]');
    if (hidden) hidden.value = el.getAttribute('data-avatar') || '';
  };
  window.toggleSport = function (el) {
    el.classList.toggle('on');
    el.setAttribute('aria-pressed', el.classList.contains('on') ? 'true' : 'false');
    var hidden = $('[name="sports"]');
    if (hidden) hidden.value = $$('.sport-pick .sp.on').map(function (s) { return s.textContent.trim(); }).join(',');
  };
  window.setChildMode = function (m) {
    var isEmail = m === 'email';
    var se = doc.getElementById('segEmail'), su = doc.getElementById('segUser');
    var fe = doc.getElementById('childEmailField'), fu = doc.getElementById('childUserField');
    if (se) se.classList.toggle('on', isEmail);
    if (su) su.classList.toggle('on', !isEmail);
    if (fe) fe.style.display = isEmail ? '' : 'none';
    if (fu) fu.style.display = isEmail ? 'none' : '';
  };
  window.pickWork = function (el, which) {
    window.pickPlan(el);
    var indep = doc.getElementById('indepBox'), club = doc.getElementById('clubBox');
    if (indep) indep.style.display = which === 'indep' ? '' : 'none';
    if (club) club.style.display = which === 'club' ? '' : 'none';
  };

  /**
   * Trimite formularul catre /api/lead (Cloudflare Pages Function).
   * Emite si evenimentul `ig:lead`, util pentru analytics.
   * Intoarce o promisiune cu { ok, error?, fields? }.
   */
  window.igSubmitLead = function (form) {
    if (!form) return Promise.resolve({ ok: false, error: 'Formular indisponibil.' });

    var data = {};
    new FormData(form).forEach(function (v, k) {
      if (data[k] === undefined) data[k] = v;
      else if (Array.isArray(data[k])) data[k].push(v);
      else data[k] = [data[k], v];
    });
    /* checkbox-urile neacceptate nu apar in FormData */
    ['terms_accepted', 'privacy_accepted'].forEach(function (k) {
      if (form.querySelector('[name="' + k + '"]')) data[k] = data[k] ? 1 : 0;
    });

    var type = form.getAttribute('data-lead-type') || 'lead';
    doc.dispatchEvent(new CustomEvent('ig:lead', { detail: { form: type, data: data } }));

    var endpoint = (window.IG && window.IG.lead) || '/api/lead';
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type, data: data })
    })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
      .catch(function () {
        return { ok: false, error: 'Conexiune întreruptă. Încearcă din nou.' };
      });
  };

  /** Mesajul de eroare din subsolul modalului. */
  function regError(modal, message) {
    var foot = modal.querySelector('.modal-foot');
    if (!foot) return;
    var box = foot.querySelector('.reg-error');
    if (!message) { if (box) box.remove(); return; }
    if (!box) {
      box = doc.createElement('p');
      box.className = 'reg-error';
      box.setAttribute('role', 'alert');
      foot.parentNode.insertBefore(box, foot);
    }
    box.textContent = message;
  }

  /**
   * Valideaza campurile `required` dintr-un container si perechile de parole.
   * Orice camp `x_confirm` trebuie sa fie identic cu campul `x` din acelasi
   * formular (exceptie: `website_confirm`, care e honeypot-ul anti-spam).
   */
  window.igValidate = function (pane) {
    if (!pane) return true;

    var fields = $$('input[required], select[required], textarea[required]', pane);
    for (var i = 0; i < fields.length; i++) {
      if (fields[i].offsetParent === null) continue; /* ascuns -> ignora */
      if (!fields[i].checkValidity()) { fields[i].reportValidity(); return false; }
    }

    var confirms = $$('input[name$="_confirm"]', pane);
    for (var j = 0; j < confirms.length; j++) {
      var el = confirms[j];
      var name = el.getAttribute('name');
      if (name === 'website_confirm' || el.offsetParent === null) continue;
      var origin = el.form && el.form.querySelector('[name="' + name.slice(0, -8) + '"]');
      if (!origin) continue;
      el.setCustomValidity(el.value === origin.value ? '' : 'Cele două parole nu coincid.');
      if (!el.checkValidity()) { el.reportValidity(); return false; }
    }

    return true;
  };

  /**
   * Ce facem cu raspunsul de la /api/lead.
   * Daca planul ales e platit, functia intoarce `checkout_url` — ducem omul
   * la Stripe in loc sa aratam ecranul de confirmare.
   * Intoarce true daca fluxul continua in pagina (afisam „gata").
   */
  function handleLeadResult(res, onError) {
    if (res && res.ok && res.checkout_url) {
      window.location.assign(res.checkout_url);
      return false;   /* pagina se schimba; nu mai atingem modalul */
    }
    if (!res || !res.ok) {
      onError((res && res.error) || 'Nu am putut trimite formularul. Încearcă din nou.');
      return false;
    }
    return true;
  }
  window.igHandleLeadResult = handleLeadResult;

  /**
   * Butoanele din zona de preturi au `data-plan`. Cand unul dintre ele deschide
   * modalul, planul respectiv devine cel selectat — altfel omul ar alege „Start"
   * si ar gasi „Campion" bifat la ultimul pas.
   */
  window.igPreselectPlan = function (trigger) {
    var code = trigger && trigger.getAttribute && trigger.getAttribute('data-plan');
    if (!code) return;
    var input = doc.querySelector('#reg [name="plan"][value="' + code + '"]');
    if (!input) return;
    input.checked = true;
    var opt = input.closest('.plan-opt');
    if (opt) {
      $$('.plan-opt', opt.parentNode).forEach(function (a) { a.classList.remove('sel'); });
      opt.classList.add('sel');
    }
    syncBillingPeriod();
  };

  /** Ecranul „te ducem la plata", inainte de a parasi site-ul spre Stripe. */
  window.igShowRedirecting = function (modal) {
    var body = modal.querySelector('.modal-body');
    var foot = modal.querySelector('.modal-foot');
    var head = modal.querySelector('.reg-prog, .reg-steps');
    var num = modal.querySelector('.reg-stepnum');
    if (foot) foot.style.display = 'none';
    if (head) head.style.display = 'none';
    if (num) num.style.display = 'none';
    if (!body) return;
    body.innerHTML =
      '<div class="reg-redirect">' +
        '<div class="spin" aria-hidden="true"></div>' +
        '<h3>Te ducem la plată</h3>' +
        '<p>Îți deschidem pagina securizată Stripe, unde finalizezi abonamentul. ' +
        'Nu închide fereastra.</p>' +
        '<span class="lock"><svg class="icon" aria-hidden="true"><use href="#i-lock"/></svg> ' +
        'Plată procesată de Stripe</span>' +
      '</div>';
  };

  /**
   * Daca planul ales cerea plata dar checkout-ul n-a pornit, intoarce textul
   * onest pentru ecranul de confirmare. Altfel null.
   */
  window.igPaymentNote = function (res) {
    var p = res && res.payment;
    return (p && p.expected && !p.started) ? 'Contul tău e creat, dar planul ales nu a putut fi pornit acum. Nu s-a reținut nicio sumă — poți activa planul din aplicație, de la Setări → Abonament.' : null;
  };

  /* ======================================================================
     2. Initializari care depind de DOM si de datele din page-*.js
     ====================================================================== */
  onReady(function () {

    /* --- bara de progres --- */
    (function () {
      var prog = doc.getElementById('progress');
      if (!prog) return;
      var ticking = false;
      function update() {
        var h = doc.documentElement.scrollHeight - window.innerHeight;
        prog.style.width = (h > 0 ? (window.scrollY / h * 100) : 0) + '%';
        ticking = false;
      }
      on(window, 'scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    })();

    /* --- reveal la scroll --- */
    (function () {
      var targets = $$('.reveal, .rev');
      if (!targets.length) return;
      if (!('IntersectionObserver' in window) || reduceMotion) {
        targets.forEach(function (el) { el.classList.add('in'); });
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
      targets.forEach(function (el) { io.observe(el); });
    })();

    /* --- pasii din „poveste" (stagger) --- */
    (function () {
      var steps = $$('#storySteps .step');
      if (!steps.length) return;
      if (!('IntersectionObserver' in window) || reduceMotion) {
        steps.forEach(function (el) { el.classList.add('in'); });
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.style.transitionDelay = (steps.indexOf(e.target) % 4 * 0.08) + 's';
          e.target.classList.add('in');
          io.unobserve(e.target);
        });
      }, { threshold: 0.2 });
      steps.forEach(function (el) { io.observe(el); });
    })();

    /* --- numaratori animate ---
       Suporta ambele conventii: .sn[data-to][data-suf] si
       [data-count][data-suffix][data-decimal]. */
    (function () {
      var els = $$('.sn[data-to], [data-count]');
      if (!els.length) return;

      function finalText(el) {
        if (el.hasAttribute('data-to')) {
          return Number(el.getAttribute('data-to')).toLocaleString('ro-RO') + (el.getAttribute('data-suf') || '');
        }
        var target = parseFloat(el.getAttribute('data-count'));
        var dec = el.getAttribute('data-decimal');
        var suf = el.getAttribute('data-suffix') || '';
        if (dec) return (target / Math.pow(10, dec)).toFixed(dec).replace('.', ',') + suf;
        return Math.round(target).toLocaleString('ro-RO') + suf;
      }

      function run(el) {
        var isTo = el.hasAttribute('data-to');
        var target = parseFloat(isTo ? el.getAttribute('data-to') : el.getAttribute('data-count'));
        var suf = (isTo ? el.getAttribute('data-suf') : el.getAttribute('data-suffix')) || '';
        var dec = isTo ? null : el.getAttribute('data-decimal');
        var t0 = null, dur = 1400;
        function tick(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          var v = (1 - Math.pow(1 - p, 3)) * target;
          el.textContent = dec
            ? (v / Math.pow(10, dec)).toFixed(dec).replace('.', ',') + suf
            : Math.floor(v).toLocaleString('ro-RO') + suf;
          if (p < 1) requestAnimationFrame(tick); else el.textContent = finalText(el);
        }
        requestAnimationFrame(tick);
      }

      if (!('IntersectionObserver' in window) || reduceMotion) {
        els.forEach(function (el) { el.textContent = finalText(el); });
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
        });
      }, { threshold: 0.5 });
      els.forEach(function (el) { io.observe(el); });
    })();

    /* --- meniu mobil: butoane --- */
    $$('[data-mnav="open"]').forEach(function (b) { on(b, 'click', openMnav); });
    $$('[data-mnav="close"]').forEach(function (b) { on(b, 'click', closeMnav); });
    $$('#mnav a[href^="#"]').forEach(function (a) { on(a, 'click', closeMnav); });

    /* --- marquee sporturi --- */
    (function () {
      var t = doc.getElementById('sportsTrack');
      if (t && window.IG_SPORTS_EMOJI) {
        var h = window.IG_SPORTS_EMOJI.map(function (s) {
          return '<span class="sport-chip"><span class="e" aria-hidden="true">' + s[0] + '</span>' + s[1] + '</span>';
        }).join('');
        t.innerHTML = h + h;
      }
      var s = doc.getElementById('smq');
      if (s && window.IG_SPORTS_ICONS) {
        var h2 = window.IG_SPORTS_ICONS.map(function (x) {
          return '<span class="chip"><svg class="icon" aria-hidden="true"><use href="#' + x[0] + '"/></svg> ' + x[1] + '</span>';
        }).join('');
        s.innerHTML = h2 + h2;
      }
    })();

    /* --- modal de inregistrare, flux numerotat 1..3 + confirmare ---
       Folosit de: parinti, cluburi, antrenori.
       Pagina sportivi are un flux conditionat propriu (page-sportivi.js). */
    (function () {
      var modal = doc.getElementById('reg');
      if (!modal || !doc.getElementById('rstep1')) return;

      var TOTAL = 3;
      var step = 1;
      var opener = null;

      function render() {
        for (var i = 1; i <= TOTAL + 1; i++) {
          var s = doc.getElementById('rstep' + i);
          if (s) s.classList.toggle('on', i === step);
        }
        for (var j = 1; j <= TOTAL; j++) {
          var rp = doc.getElementById('rp' + j);
          if (rp) rp.className = 'rp ' + (step > j ? 'done' : (step === j ? 'cur' : ''));
        }
        var num = doc.getElementById('regStepNum');
        var fwd = doc.getElementById('regFwd');
        var back = doc.getElementById('regBack');
        var foot = doc.getElementById('regFoot');
        if (step <= TOTAL) {
          if (num) { num.textContent = 'Pasul ' + step + ' din ' + TOTAL; num.style.display = ''; }
          if (back) back.style.display = step > 1 ? '' : 'none';
          if (fwd) {
            fwd.style.display = '';
            fwd.textContent = step === TOTAL ? (modal.getAttribute('data-submit-label') || 'Trimite') : 'Continuă';
            fwd.classList.toggle('btn-block', step === 1);
          }
          if (foot) foot.style.display = '';
        } else {
          if (num) num.style.display = 'none';
          if (foot) foot.style.display = 'none';
          var doneMsg = doc.getElementById('doneMsg');
          var tpl = modal.getAttribute('data-done-template');
          var nameEl = modal.querySelector('[data-done-name]');
          if (doneMsg && tpl) {
            var who = (nameEl && nameEl.value.trim()) || modal.getAttribute('data-done-fallback') || '';
            doneMsg.textContent = tpl.replace('{name}', who);
          }
          /* planul platit n-a putut porni: spunem adevarul, nu „gata" */
          var note = window.igPaymentNote(lastResult);
          if (doneMsg && note) doneMsg.textContent = note;
        }
        var body = modal.querySelector('.modal-body');
        if (body) body.scrollTop = 0;
      }

      window.openReg = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        opener = doc.activeElement;
        step = 1;
        render();
        window.igPreselectPlan(e && e.currentTarget);
        modal.classList.add('open');
        doc.body.style.overflow = 'hidden';
        var first = modal.querySelector('input:not([type="hidden"]), select, button');
        if (first) first.focus();
      };
      window.closeReg = function () {
        modal.classList.remove('open');
        doc.body.style.overflow = '';
        if (opener && opener.focus) opener.focus();
      };
      var sending = false;
      var lastResult = null;

      window.regNext = function (d) {
        if (sending) return;
        var next = step + d;
        if (next < 1) return;
        if (next > TOTAL + 1) { window.closeReg(); return; }
        if (d > 0 && step <= TOTAL && !window.igValidate(doc.getElementById('rstep' + step))) return;

        regError(modal, '');

        /* ultimul pas: trimitem, si abia dupa raspuns aratam confirmarea */
        if (next === TOTAL + 1) {
          var fwd = doc.getElementById('regFwd');
          var label = fwd ? fwd.textContent : '';
          sending = true;
          if (fwd) { fwd.disabled = true; fwd.textContent = 'Se trimite…'; }

          window.igSubmitLead(modal.querySelector('form')).then(function (res) {
            /* la plan platit se face redirect spre Stripe — lasam butonul blocat */
            if (res && res.ok && res.checkout_url) {
              window.igShowRedirecting(modal);
              /* o clipa, ca mesajul sa apuce sa fie vazut */
              setTimeout(function () { window.location.assign(res.checkout_url); }, 900);
              return;
            }
            sending = false;
            lastResult = res;
            if (fwd) { fwd.disabled = false; fwd.textContent = label; }
            if (!handleLeadResult(res, function (m) { regError(modal, m); })) return;
            step = next;
            render();
          });
          return;
        }

        step = next;
        render();
      };

      $$('.js-reg').forEach(function (b) { on(b, 'click', window.openReg); });
      on(modal.querySelector('.modal-backdrop'), 'click', window.closeReg);
      on(modal.querySelector('form'), 'submit', function (e) { e.preventDefault(); window.regNext(1); });

      /* deep-link din campanii: /cluburi#inregistrare deschide direct formularul */
      if (window.location.hash === '#inregistrare') window.openReg();
      on(window, 'hashchange', function () {
        if (window.location.hash === '#inregistrare') window.openReg();
      });
    })();

    /* --- inchidere cu Escape (valabil si pentru meniu) --- */
    on(doc, 'keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (typeof window.closeReg === 'function') window.closeReg();
      closeMnav();
    });

    /* --- toast „social proof" ---
       Datele vin din window.IG_FOMO (definit in page-*.js).
       ATENTIE: in productie alimenteaza lista din inregistrari reale. */
    (function () {
      var el = doc.getElementById('fomo');
      if (!el || !window.IG_FOMO || reduceMotion) return;
      var i = 0, timer = null, active = true;
      var nEl = doc.getElementById('foN'), sEl = doc.getElementById('foS'), avEl = doc.getElementById('foAv');

      function show() {
        if (!active) return;
        var o = window.IG_FOMO[i % window.IG_FOMO.length]; i++;
        if (nEl) nEl.textContent = o.n;
        if (sEl) sEl.textContent = o.s;
        if (avEl) { avEl.textContent = o.n.charAt(0); avEl.style.background = 'linear-gradient(135deg,' + o.c + ',#ffffff55)'; }
        el.classList.add('show');
        timer = setTimeout(function () {
          el.classList.remove('show');
          timer = setTimeout(show, 7000 + Math.floor(i % 4) * 1500);
        }, 5200);
      }
      window.stopFomo = function () {
        active = false;
        el.classList.remove('show');
        if (timer) clearTimeout(timer);
        try { sessionStorage.setItem('ig-fomo-off', '1'); } catch (err) { /* ignora */ }
      };
      var off = false;
      try { off = sessionStorage.getItem('ig-fomo-off') === '1'; } catch (err) { /* ignora */ }
      if (!off) setTimeout(show, 6500);
    })();

    /* --- calculator club / antrenor ---
       Acelasi model pe ambele pagini; limitele se citesc din <input type=range>. */
    (function () {
      var kids = doc.getElementById('kids');
      var adopt = doc.getElementById('adopt');
      if (!kids || !adopt) return;

      var plan = 'baza';

      function money(n) {
        n = Math.round(n * 10) / 10;
        return n.toLocaleString('ro-RO', {
          minimumFractionDigits: (n % 1 ? 1 : 0), maximumFractionDigits: 1
        }) + ' €';
      }
      function pct(input) {
        var min = +input.min || 0, max = +input.max || 100;
        return ((+input.value - min) / (max - min) * 100) + '%';
      }
      function set(id, txt) { var e2 = doc.getElementById(id); if (e2) e2.textContent = txt; }

      function run() {
        var n = +kids.value, a = +adopt.value;
        set('kidsV', n); set('adoptV', a);
        kids.style.setProperty('--p', pct(kids));
        adopt.style.setProperty('--p', pct(adopt));

        var price = plan === 'prem' ? 2 : 1;
        var cost = n * price;
        var accounts = Math.round(n * a / 100);
        var nStart = Math.round(accounts * 0.25);
        var nCampion = Math.round(accounts * 0.25);
        var nElita = Math.round(accounts * 0.15);
        var nFree = Math.max(0, accounts - nStart - nCampion - nElita);
        var vStart = nStart * 1.2, vCampion = nCampion * 2, vElita = nElita * 4;
        var comm = vStart + vCampion + vElita;
        var net = comm - cost;

        set('oKids', n);
        set('oCost', '−' + money(cost));
        set('oComm', '+' + money(comm));
        set('nStart', nStart); set('vStart', money(vStart));
        set('nCampion', nCampion); set('vCampion', money(vCampion));
        set('nElita', nElita); set('vElita', money(vElita));
        set('nFree', nFree);

        var netEl = doc.getElementById('oNet');
        if (netEl) {
          if (net >= 0) {
            netEl.textContent = '+' + money(net);
            netEl.className = 'cn-v pos';
            set('oNetL', 'Rămâi în plus cu');
            set('oNetS', 'comisioanele acoperă tot costul — și rămâne profit');
          } else {
            netEl.textContent = money(Math.abs(net));
            netEl.className = 'cn-v neg';
            set('oNetL', 'Cost real, după comisioane');
            set('oNetS', 'de la ' + money(cost) + ' scade la ' + money(Math.abs(net)) + ' pe lună');
          }
        }
        var cover = cost > 0 ? Math.min(100, comm / cost * 100) : 100;
        var bar = doc.getElementById('oBar');
        if (bar) bar.style.width = cover + '%';
        set('oBarL', Math.round(cover) + '% din cost acoperit din comisioane');
      }

      window.setPlan = function (p) {
        plan = p;
        var b = doc.getElementById('planBaza'), pr = doc.getElementById('planPrem');
        if (b) b.classList.toggle('on', p === 'baza');
        if (pr) pr.classList.toggle('on', p === 'prem');
        run();
      };

      on(kids, 'input', run);
      on(adopt, 'input', run);
      run();
    })();

  });
})();
