/* Shared navigation and the homepage's single motion element. */
(function () {
  var doc = document;
  doc.documentElement.classList.add("motion-ready");

  function resetInitialScroll() {
    if (!doc.documentElement.classList.contains("research-page") || window.location.hash) return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    window.requestAnimationFrame(function () { window.scrollTo(0, 0); });
  }

  resetInitialScroll();
  window.addEventListener("pageshow", resetInitialScroll, { once: true });

  function initNavigation() {
    var toggle = doc.querySelector(".menu-toggle");
    var nav = doc.querySelector(".main-nav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.classList.toggle("show", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      doc.body.classList.toggle("nav-open", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    doc.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    doc.addEventListener("click", function (event) {
      if (toggle.getAttribute("aria-expanded") === "true" && !nav.contains(event.target) && !toggle.contains(event.target)) {
        setOpen(false);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) setOpen(false);
    });
  }

  function initHeaderAppearance() {
    if (!doc.body.classList.contains("research-home")) return;

    function updateHeader() {
      doc.body.classList.toggle("header-scrolled", window.scrollY > 24);
    }

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  function initHeroReel() {
    var reel = doc.querySelector("[data-hero-reel]");
    if (!reel) return;

    var slides = Array.prototype.slice.call(reel.querySelectorAll("[data-hero-slide]"));
    var previous = reel.querySelector("[data-hero-prev]");
    var next = reel.querySelector("[data-hero-next]");
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var activeIndex = 0;
    var timer;
    var controlsTimer;
    var visible = true;
    var touchStartX = 0;

    function playVideo(slide) {
      var video = slide.querySelector("video");
      if (!video || reduceMotion || !visible) return;
      var promise = video.play();
      if (promise && typeof promise.catch === "function") promise.catch(function () {});
    }

    function pauseVideo(slide) {
      var video = slide.querySelector("video");
      if (video) video.pause();
    }

    function show(index) {
      activeIndex = index;
      slides.forEach(function (slide, slideIndex) {
        var active = slideIndex === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", String(!active));
        slide.tabIndex = active ? 0 : -1;
        if (active) playVideo(slide); else pauseVideo(slide);
      });
    }

    function start() {
      window.clearInterval(timer);
      if (!reduceMotion && visible && slides.length > 1) {
        timer = window.setInterval(function () {
          show((activeIndex + 1) % slides.length);
        }, 6000);
      }
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) {
          playVideo(slides[activeIndex]);
          start();
        } else {
          window.clearInterval(timer);
          slides.forEach(pauseVideo);
        }
      }, { threshold: 0.15 });
      observer.observe(reel);
    }

    reel.addEventListener("mouseenter", function () { window.clearInterval(timer); });
    reel.addEventListener("mousemove", function () {
      reel.classList.add("controls-visible");
      window.clearTimeout(controlsTimer);
      controlsTimer = window.setTimeout(function () {
        reel.classList.remove("controls-visible");
      }, 1400);
    });
    reel.addEventListener("mouseleave", function () {
      reel.classList.remove("controls-visible");
      window.clearTimeout(controlsTimer);
      start();
    });
    reel.addEventListener("focusin", function () { window.clearInterval(timer); });
    reel.addEventListener("focusout", function (event) {
      if (!reel.contains(event.relatedTarget)) start();
    });

    if (previous) {
      previous.addEventListener("click", function () {
        show((activeIndex - 1 + slides.length) % slides.length);
      });
    }

    if (next) {
      next.addEventListener("click", function () {
        show((activeIndex + 1) % slides.length);
      });
    }

    reel.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        show((activeIndex - 1 + slides.length) % slides.length);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        show((activeIndex + 1) % slides.length);
      }
    });

    reel.addEventListener("touchstart", function (event) {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });

    reel.addEventListener("touchend", function (event) {
      var distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) < 48) return;
      show(distance > 0 ? (activeIndex - 1 + slides.length) % slides.length : (activeIndex + 1) % slides.length);
    }, { passive: true });

    show(0);
    start();
  }

  function initHeroBoundarySnap() {
    var hero = doc.querySelector(".research-hero");
    var intro = doc.querySelector("#intro");
    var introContent = intro && intro.querySelector(".home-profile-photo");
    var header = doc.querySelector(".site-header");
    if (!hero || !intro) return;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var locked = false;
    var settling = false;
    var animationFrame = 0;
    var settleTimer = 0;
    var lastWheelAt = 0;
    var touchStartY = 0;

    function contentTop() {
      var target = introContent || intro;
      var top = target.getBoundingClientRect().top + window.scrollY;
      return Math.max(0, top - (header ? header.offsetHeight : 0) - 24);
    }

    function snapTo(top) {
      if (locked) return;
      locked = true;
      window.cancelAnimationFrame(animationFrame);

      var start = window.scrollY;
      var distance = top - start;
      var duration = reduceMotion ? 0 : 340;
      var startedAt = performance.now();
      var previousScrollBehavior = doc.documentElement.style.scrollBehavior;
      doc.documentElement.style.scrollBehavior = "auto";

      function finish() {
        window.scrollTo(0, top);
        doc.documentElement.style.scrollBehavior = previousScrollBehavior;
        locked = false;
        settling = performance.now() - lastWheelAt < 100;
        if (settling) {
          window.clearTimeout(settleTimer);
          settleTimer = window.setTimeout(function () { settling = false; }, 100);
        }
      }

      function animate(now) {
        if (!duration) {
          finish();
          return;
        }
        var progress = Math.min((now - startedAt) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        window.scrollTo(0, start + distance * eased);
        if (progress < 1) animationFrame = window.requestAnimationFrame(animate);
        else finish();
      }

      animationFrame = window.requestAnimationFrame(animate);
    }

    function shouldSnapDown() {
      return window.scrollY < contentTop() - 80;
    }

    function shouldSnapUp() {
      var target = contentTop();
      return window.scrollY > 80 && window.scrollY < target + 96;
    }

    window.addEventListener("wheel", function (event) {
      var now = performance.now();
      var gap = now - lastWheelAt;
      lastWheelAt = now;

      if (locked) {
        event.preventDefault();
        return;
      }

      if (settling) {
        if (gap > 100) {
          settling = false;
          window.clearTimeout(settleTimer);
        } else {
          event.preventDefault();
          window.clearTimeout(settleTimer);
          settleTimer = window.setTimeout(function () { settling = false; }, 100);
          return;
        }
      }

      if (event.deltaY > 0 && shouldSnapDown()) {
        event.preventDefault();
        snapTo(contentTop());
      } else if (event.deltaY < 0 && shouldSnapUp()) {
        event.preventDefault();
        snapTo(0);
      }
    }, { passive: false });

    window.addEventListener("touchstart", function (event) {
      touchStartY = event.changedTouches[0].clientY;
    }, { passive: true });

    window.addEventListener("touchend", function (event) {
      var distance = touchStartY - event.changedTouches[0].clientY;
      if (distance > 36 && shouldSnapDown()) snapTo(contentTop());
      if (distance < -36 && shouldSnapUp()) snapTo(0);
    }, { passive: true });

    window.addEventListener("keydown", function (event) {
      var down = event.key === "ArrowDown" || event.key === "PageDown" || (event.key === " " && !event.shiftKey);
      var up = event.key === "ArrowUp" || event.key === "PageUp" || (event.key === " " && event.shiftKey);
      if (down && shouldSnapDown()) {
        event.preventDefault();
        snapTo(contentTop());
      } else if (up && shouldSnapUp()) {
        event.preventDefault();
        snapTo(0);
      }
    });
  }

  function initReveal() {
    var elements = Array.prototype.slice.call(doc.querySelectorAll(".reveal"));
    if (!elements.length) return;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    elements.forEach(function (element) {
      var group = element.parentElement;
      var siblings = group ? Array.prototype.filter.call(group.children, function (child) {
        return child.classList && child.classList.contains("reveal");
      }) : [];
      var index = siblings.indexOf(element);
      element.style.setProperty("--reveal-delay", Math.min(Math.max(index, 0) * 70, 280) + "ms");
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach(function (element) { element.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

    elements.forEach(function (element) { observer.observe(element); });
  }

  function init() {
    initNavigation();
    initHeaderAppearance();
    initHeroReel();
    initHeroBoundarySnap();
    initReveal();
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
