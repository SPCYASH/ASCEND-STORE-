/* Fills the contact email on the policy pages from config.js */
(function () {
  var email = (window.ASCEND_CONFIG || {}).CONTACT_EMAIL || '';
  Array.prototype.forEach.call(document.querySelectorAll('[data-contact]'), function (a) {
    if (email) { a.textContent = email; a.href = 'mailto:' + email; }
  });
})();
