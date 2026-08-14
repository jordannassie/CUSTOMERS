(function () {
  "use strict";

  if (window.__customersDirectCallBarLoaded) return;
  window.__customersDirectCallBarLoaded = true;

  var script = document.currentScript;
  if (!script) return;

  var rawPhone = script.getAttribute("data-phone") || "";
  var digits = rawPhone.replace(/\D/g, "");
  if (!digits) return;
  var dialNumber = digits.length === 10 ? "+1" + digits : "+" + digits;

  var label = (script.getAttribute("data-text") || "Call Now").slice(0, 80);
  var businessName = (script.getAttribute("data-business-name") || "").slice(0, 200);
  var colorPattern = /^#[0-9a-f]{6}$/i;
  var requestedBackground = script.getAttribute("data-bg-color") || "";
  var requestedText = script.getAttribute("data-text-color") || "";
  var backgroundColor = colorPattern.test(requestedBackground)
    ? requestedBackground
    : "#2563EB";
  var textColor = colorPattern.test(requestedText) ? requestedText : "#FFFFFF";

  var host = document.createElement("div");
  host.id = "customers-direct-call-bar";
  host.setAttribute("data-nosnippet", "");
  var shadow = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent =
    ":host{all:initial;display:none}" +
    "@media(max-width:767px){:host{display:block;position:fixed;z-index:2147483000;left:0;right:0;bottom:0;width:100%}" +
    "a{box-sizing:border-box;display:flex;min-height:64px;width:100%;align-items:center;justify-content:center;gap:10px;padding:15px 20px calc(15px + env(safe-area-inset-bottom,0px));background:" +
    backgroundColor +
    ";color:" +
    textColor +
    ";font:800 17px/1.2 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;text-align:center;text-decoration:none;box-shadow:0 -8px 28px rgba(15,23,42,.2);-webkit-tap-highlight-color:transparent}" +
    "a:focus-visible{outline:3px solid #fff;outline-offset:-5px}svg{width:21px;height:21px;flex:none;fill:none;stroke:currentColor;stroke-width:2.25;stroke-linecap:round;stroke-linejoin:round}}" +
    "@media print{a{display:none!important}}";

  var link = document.createElement("a");
  link.href = "tel:" + dialNumber;
  link.setAttribute(
    "aria-label",
    label + (businessName ? " — call " + businessName : ""),
  );
  link.innerHTML =
    '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z"></path></svg><span></span>';
  link.querySelector("span").textContent = label;

  shadow.appendChild(style);
  shadow.appendChild(link);
  document.body.appendChild(host);

  var spacer = document.createElement("div");
  spacer.setAttribute("aria-hidden", "true");
  spacer.style.cssText = "display:none;height:calc(64px + env(safe-area-inset-bottom,0px))";
  spacer.className = "customers-direct-call-bar-spacer";
  var spacerStyle = document.createElement("style");
  spacerStyle.textContent =
    "@media(max-width:767px){.customers-direct-call-bar-spacer{display:block!important}}";
  document.head.appendChild(spacerStyle);
  document.body.appendChild(spacer);
})();
