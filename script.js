/* Scroll-reveal: fades elements up as they enter the viewport.
   Falls back to the CSS load animation when JS is disabled, and
   shows everything immediately when reduced motion is preferred. */
(function () {
  var doc = document;

  // Mark JS as active as early as possible so the reveal targets are
  // hidden before first paint (this file is loaded synchronously in <head>).
  doc.documentElement.classList.add("js");

  function init() {
    var selector = [
      ".about-banner",
      ".page-heading",
      ".about-slogan",
      ".gallery-heading",
      ".sub-heading",
      ".pub-container h1",
      ".content-wrapper > p",
      ".about-text",
      ".project-meta-wrapper",
      ".project-gallery-column img",
      ".gallery .project-card",
      ".pub-item",
      ".reveal"
    ].join(",");

    var els = Array.prototype.slice.call(doc.querySelectorAll(selector));

    var reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    // Stagger items that share a parent (cards in a gallery, items in a list).
    els.forEach(function (el) {
      var siblings = Array.prototype.filter.call(
        el.parentNode.children,
        function (c) { return els.indexOf(c) !== -1; }
      );
      var idx = siblings.indexOf(el);
      if (idx > 0) el.style.transitionDelay = Math.min(idx, 6) * 80 + "ms";
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
    );

    els.forEach(function (el) { io.observe(el); });

    // Failsafe: never leave content hidden. If the observer hasn't revealed
    // an element a few seconds in (e.g. it never fired), show it anyway.
    setTimeout(function () {
      els.forEach(function (el) { el.classList.add("is-visible"); });
    }, 3000);
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
