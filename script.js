/* ASCEND. storefront script. Vanilla JS, no tracking, no secrets. */
(function () {
  'use strict';

  var cfg = window.ASCEND_CONFIG || {};
  var API = (cfg.API_BASE || '').replace(/\/+$/, '');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  document.documentElement.classList.remove('no-js');

  /* ---------- Footer: year + contact ---------- */
  var yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();
  $$('[data-contact]').forEach(function (a) {
    if (cfg.CONTACT_EMAIL) { a.textContent = cfg.CONTACT_EMAIL; a.href = 'mailto:' + cfg.CONTACT_EMAIL; }
  });

  /* ---------- Mobile menu ---------- */
  var burger = $('#burger'), menu = $('#menu');
  function setMenu(open) {
    if (!burger || !menu) return;
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (burger) {
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Checkout ---------- */
  var dlg = $('#checkout');
  var panelDisabled = $('#co-disabled');
  var form = $('#co-form');
  var emailEl = $('#co-email');
  var agreeEl = $('#co-agree');
  var errEl = $('#co-error');
  var payBtn = $('#co-pay');
  var checkout = { state: 'checking', keyId: null }; // checking | enabled | disabled

  function showError(msg) {
    errEl.textContent = msg; errEl.hidden = !msg;
  }

  // Ask the backend if payments are configured. Without API_BASE it stays disabled.
  function checkBackend() {
    if (!API) { checkout.state = 'disabled'; return Promise.resolve(); }
    return fetch(API + '/api/config', { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('bad status')); })
      .then(function (c) {
        if (c && c.checkoutEnabled && c.keyId) { checkout.state = 'enabled'; checkout.keyId = c.keyId; }
        else { checkout.state = 'disabled'; }
      })
      .catch(function () { checkout.state = 'disabled'; });
  }
  var ready = checkBackend();

  function openDialog() {
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); }
    else { dlg.setAttribute('open', ''); }
  }
  function closeDialog() {
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  }

  function openCheckout() {
    showError('');
    ready.then(function () {
      var on = checkout.state === 'enabled';
      panelDisabled.hidden = on;
      form.hidden = !on;
      payBtn.disabled = false;
      payBtn.textContent = 'Pay ₹149 with UPI';
      openDialog();
      if (on) emailEl.focus();
    });
  }

  $$('.js-buy').forEach(function (b) {
    b.addEventListener('click', function () { setMenu(false); openCheckout(); });
  });
  $('#co-close').addEventListener('click', closeDialog);
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', closeDialog); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDialog(); });

  function validEmail(v) {
    return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  function loadRazorpay() {
    return new Promise(function (resolve, reject) {
      if (window.Razorpay) return resolve();
      var s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Could not load the payment window. Check your connection and try again.')); };
      document.head.appendChild(s);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    showError('');
    var email = emailEl.value.trim();
    if (!validEmail(email)) { showError('Please enter a valid email address.'); emailEl.focus(); return; }
    if (!agreeEl.checked) { showError('Please tick the box to agree to the Terms and Refund Policy.'); return; }
    if (checkout.state !== 'enabled') { showError('Checkout is not active.'); return; }

    payBtn.disabled = true; payBtn.textContent = 'Preparing secure payment…';
    var order;

    fetch(API + '/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(j && j.error ? j.error : 'Could not start checkout.');
          return j;
        });
      })
      .then(function (o) { order = o; return loadRazorpay(); })
      .then(function () {
        var rzp = new window.Razorpay({
          key: order.keyId,
          order_id: order.razorpayOrderId,
          amount: order.amount,
          currency: order.currency,
          name: 'ASCEND.',
          description: 'The Ultimate 150+ Glow-Up Guide (Digital PDF)',
          prefill: { email: email },
          theme: { color: '#080808' },
          // The browser result is NOT proof of payment. The server confirms it separately.
          handler: function () {
            try { localStorage.setItem('ascend_order', JSON.stringify({ order: order.orderRef, token: order.deliveryToken })); } catch (x) { /* storage may be blocked */ }
            window.location.href = 'success.html?order=' + encodeURIComponent(order.orderRef) + '#' + encodeURIComponent(order.deliveryToken);
          },
          modal: {
            ondismiss: function () { payBtn.disabled = false; payBtn.textContent = 'Pay ₹149 with UPI'; }
          }
        });
        rzp.on('payment.failed', function () {
          showError('The payment did not go through. You have not been charged for a failed payment. Please try again.');
          payBtn.disabled = false; payBtn.textContent = 'Pay ₹149 with UPI';
        });
        rzp.open();
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : 'Something went wrong. Please try again.');
        payBtn.disabled = false; payBtn.textContent = 'Pay ₹149 with UPI';
      });
  });
})();
