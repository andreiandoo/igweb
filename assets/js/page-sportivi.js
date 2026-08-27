/* iGROWth · pagina „Sportivi"
   Marquee de sporturi + selector de plan + modal de inregistrare cu flux
   conditionat (pasul „părinte" apare doar pentru minori). */
(function () {
  'use strict';

  var doc = document;

  window.IG_SPORTS_ICONS = [
    ['i-zap', 'Fotbal'], ['i-dumbbell', 'Baschet'], ['i-star', 'Tenis'], ['i-flame', 'Înot'],
    ['i-trophy', 'Atletism'], ['i-heart', 'Gimnastică'], ['i-gem', 'Volei'], ['i-shield', 'Handbal'],
    ['i-rocket', 'Rugby'], ['i-sparkles', 'Dans'], ['i-whistle', 'Karate'], ['i-users', 'Polo']
  ];

  function onReady(fn) {
    if (doc.readyState === 'complete') fn();
    else doc.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  onReady(function () {
    /* selectorul de plan din modal */
    Array.prototype.slice.call(doc.querySelectorAll('#planPick .plan-opt')).forEach(function (o) {
      o.addEventListener('click', function () { window.pickPlan(o); });
    });

    registerModal();
  });

  /* ------------------------------------------------------------------
     Modal de inregistrare — flux dinamic:
       adult : varsta -> cont -> plan
       minor : varsta -> cont -> parinte -> plan
     ------------------------------------------------------------------ */
  function registerModal() {
    var modal = doc.getElementById('reg');
    if (!modal) return;

    var steps = Array.prototype.slice.call(modal.querySelectorAll('.rstep'));
    var dots = doc.getElementById('regDots');
    var num = doc.getElementById('regStepNum');
    var fwd = doc.getElementById('regFwd');
    var back = doc.getElementById('regBack');
    var ageEl = doc.getElementById('regAge');
    var form = modal.querySelector('form');

    var flow = ['age', 'account', 'plan'];
    var idx = 0;
    var opener = null;

    function show(name) {
      steps.forEach(function (s) { s.classList.toggle('on', s.getAttribute('data-step') === name); });
    }
    function pane(name) {
      return modal.querySelector('.rstep[data-step="' + name + '"]');
    }
    function rebuildFlow() {
      var age = parseInt(ageEl && ageEl.value, 10);
      var minor = !isNaN(age) && age < 18;
      flow = minor ? ['age', 'account', 'parent', 'plan'] : ['age', 'account', 'plan'];
      /* campurile parintelui devin obligatorii doar pentru minori */
      ['pgName', 'pgEmail'].forEach(function (id) {
        var el = doc.getElementById(id);
        if (el) { if (minor) el.setAttribute('required', 'required'); else el.removeAttribute('required'); }
      });
      var consent = modal.querySelector('[name="guardian_consent"]');
      if (consent) { if (minor) consent.setAttribute('required', 'required'); else consent.removeAttribute('required'); }
    }
    function render() {
      show(flow[idx]);
      dots.innerHTML = flow.map(function (_, i) {
        return '<span class="rp ' + (i < idx ? 'done' : (i === idx ? 'cur' : '')) + '"></span>';
      }).join('');
      num.textContent = 'Pasul ' + (idx + 1) + ' din ' + flow.length;
      back.style.display = idx > 0 ? '' : 'none';
      fwd.textContent = idx === flow.length - 1 ? 'Creează contul' : 'Continuă';
      var body = modal.querySelector('.modal-body');
      if (body) body.scrollTop = 0;
    }

    window.openReg = function (e) {
      if (e && e.preventDefault) e.preventDefault();
      opener = doc.activeElement;
      idx = 0;
      rebuildFlow();
      render();
      modal.classList.add('open');
      doc.body.style.overflow = 'hidden';
      var first = modal.querySelector('input:not([type="hidden"]), select');
      if (first) first.focus();
    };
    window.closeReg = function () {
      modal.classList.remove('open');
      doc.body.style.overflow = '';
      if (opener && opener.focus) opener.focus();
    };
    function showError(message) {
      var foot = modal.querySelector('.modal-foot');
      if (!foot) return;
      var box = foot.parentNode.querySelector('.reg-error');
      if (!message) { if (box) box.remove(); return; }
      if (!box) {
        box = doc.createElement('p');
        box.className = 'reg-error';
        box.setAttribute('role', 'alert');
        foot.parentNode.insertBefore(box, foot);
      }
      box.textContent = message;
    }

    function done() {
      show('done');
      num.textContent = 'Gata';
      dots.innerHTML = flow.map(function () { return '<span class="rp done"></span>'; }).join('');
      back.style.display = 'none';
      fwd.textContent = 'Închide';
    }

    var sending = false;

    window.regNav = function (d) {
      if (sending) return;
      /* pe ecranul de confirmare, butonul inchide modalul */
      var doneStep = modal.querySelector('.rstep[data-step="done"]');
      if (doneStep && doneStep.classList.contains('on')) { window.closeReg(); return; }

      if (d > 0) {
        if (!window.igValidate(pane(flow[idx]))) return;
        if (flow[idx] === 'age') rebuildFlow();
      }
      var n = idx + d;
      if (n < 0) return;
      showError('');

      if (n >= flow.length) {
        var label = fwd.textContent;
        sending = true;
        fwd.disabled = true;
        fwd.textContent = 'Se trimite…';
        window.igSubmitLead(form).then(function (res) {
          sending = false;
          fwd.disabled = false;
          fwd.textContent = label;
          if (!res || !res.ok) {
            showError((res && res.error) || 'Nu am putut trimite formularul. Încearcă din nou.');
            return;
          }
          done();
        });
        return;
      }
      idx = n;
      render();
    };

    Array.prototype.slice.call(doc.querySelectorAll('.js-reg')).forEach(function (b) {
      b.addEventListener('click', window.openReg);
    });
    var bd = modal.querySelector('.modal-backdrop');
    if (bd) bd.addEventListener('click', window.closeReg);
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); window.regNav(1); });

    /* deep-link din campanii: /sportivi#inregistrare deschide direct formularul */
    if (window.location.hash === '#inregistrare') window.openReg();
    window.addEventListener('hashchange', function () {
      if (window.location.hash === '#inregistrare') window.openReg();
    });
  }
})();
