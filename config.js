/*
  ASCEND. — site configuration (the ONLY file you normally need to edit).

  API_BASE
    Leave as "" while you are only building/testing the storefront.
    With "" the Buy buttons show a clear "Checkout not active yet" message.
    After you deploy the backend (see README.md, Part 5) paste its address here,
    for example: "https://ascend-api.yourname.workers.dev"
    (no trailing slash).

  CONTACT_EMAIL
    The support address shown in the footer and the policy pages.
    Replace it with your real email before going live.
*/
window.ASCEND_CONFIG = {
  API_BASE: "",
  CONTACT_EMAIL: "support@example.com",
  PRICE_DISPLAY: "₹149"
};
