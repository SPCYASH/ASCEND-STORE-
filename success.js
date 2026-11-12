/* ASCEND. order page. Asks the SERVER whether payment is verified. Never trusts the browser. */
(function () {
  'use strict';

  var API = ((window.ASCEND_CONFIG || {}).API_BASE || '').replace(/\/+$/, '');
  var $ = function (s) { return document.querySelector(s); };
  var panels = ['s-wait', 's-paid', 's-slow', 's-fail'];

  function show(id) { panels.forEach(function (p) { $('#' + p).hidden = (p !== id); }); }

  var params = new URLSearchParams(location.search);
  var orderRef = params.get('order') || '';
  var token = '';
  try { token = decodeURIComponent((location.hash || '').replace(/^#/, '')); } catch (e) { token = ''; }

  // Fall back to what this browser saved at checkout.
  if ((!orderRef || !token)) {
    try {
      var saved = JSON.parse(localStorage.getItem('ascend_order') || 'null');
      if (saved && (!orderRef || saved.order === orderRef)) { orderRef = orderRef || saved.order; token = token || saved.token; }
    } catch (e) { /* ignore */ }
  }

  function fail(msg) { $('#fail-msg').textContent = msg; show('s-fail'); }

  if (!API) { fail('Checkout is not active on this site.'); return; }
  if (!orderRef || !token) { fail('This order link is incomplete. Open the exact link you bookmarked after paying.'); return; }

  $('#oid').textContent = 'Order ID: ' + orderRef;

  function post(path, body) {
    return fetch(API + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); });
  }

  var tries = 0, MAX_TRIES = 40, timer = null;

  function poll() {
    tries++;
    post('/api/status', { order: orderRef, token: token }).then(function (res) {
      if (res.status === 404 || res.status === 403) { fail('We could not find this order. Check that you opened the full link.'); return; }
      var s = res.body && res.body.status;
      if (s === 'paid') { show('s-paid'); return; }
      if (s === 'mismatch') { fail('This payment could not be matched to the order. Please contact support with your order ID.'); return; }
      if (tries >= MAX_TRIES) { show('s-slow'); return; }
      timer = setTimeout(poll, 3000);
    }).catch(function () {
      if (tries >= MAX_TRIES) { show('s-slow'); return; }
      timer = setTimeout(poll, 4000);
    });
  }

  $('#retry').addEventListener('click', function () { tries = 0; show('s-wait'); poll(); });

  var dl = $('#dl'), msg = $('#dl-msg');
  dl.addEventListener('click', function () {
    dl.disabled = true; msg.textContent = 'Creating your secure link…';
    post('/api/download-link', { order: orderRef, token: token }).then(function (res) {
      dl.disabled = false;
      if (!res.ok) { msg.textContent = (res.body && res.body.error) || 'Could not create a download link. Please try again.'; return; }
      msg.textContent = 'Starting download. This link expires in ' + Math.round(res.body.expiresInSeconds / 60) + ' minutes.';
      window.location.href = res.body.url;
    }).catch(function () {
      dl.disabled = false; msg.textContent = 'Network problem. Please try again.';
    });
  });

  show('s-wait');
  poll();
})();
