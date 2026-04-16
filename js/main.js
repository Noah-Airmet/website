(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Scroll Animations ──
  const animatedElements = document.querySelectorAll('.animate-on-scroll');

  if (prefersReducedMotion) {
    animatedElements.forEach(function (el) {
      el.classList.add('visible');
    });
  } else {
    const scrollObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            scrollObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    animatedElements.forEach(function (el) {
      scrollObserver.observe(el);
    });
  }

  // ── Active Nav Highlighting ──
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = [];

  navLinks.forEach(function (link) {
    var target = document.querySelector(link.getAttribute('href'));
    if (target) sections.push({ link: link, section: target });
  });

  var navObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          navLinks.forEach(function (l) { l.classList.remove('active'); });
          sections.forEach(function (s) {
            if (s.section === entry.target) s.link.classList.add('active');
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );

  sections.forEach(function (s) {
    navObserver.observe(s.section);
  });

  // ── Smooth Scroll with Nav Offset ──
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;
      var target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();

      // Close mobile nav if open
      var mobileNav = document.querySelector('.nav-links');
      var toggle = document.querySelector('.nav-toggle');
      if (mobileNav && mobileNav.classList.contains('open')) {
        mobileNav.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }

      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  });

  // ── Mobile Nav Toggle ──
  var navToggle = document.querySelector('.nav-toggle');
  var navMenu = document.querySelector('.nav-links');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      var isOpen = navMenu.classList.toggle('open');
      navToggle.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // ── Commitments Page Progress and Active Section ──
  var progressBar = document.querySelector('.ethics-progress-bar');

  if (progressBar) {
    var updateProgress = function () {
      var scrollTop = window.scrollY || window.pageYOffset;
      var scrollRange = document.documentElement.scrollHeight - window.innerHeight;
      var progress = scrollRange > 0 ? Math.min(scrollTop / scrollRange, 1) : 0;

      progressBar.style.width = String(progress * 100) + '%';
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
  }

  var principleLinks = document.querySelectorAll('[data-principle-link]');
  var principleSections = document.querySelectorAll('[data-principle]');

  if (principleLinks.length && principleSections.length) {
    var setActivePrinciple = function (id) {
      principleLinks.forEach(function (link) {
        var isActive = link.getAttribute('data-principle-link') === id;
        link.classList.toggle('active', isActive);

        if (isActive) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });

      principleSections.forEach(function (section) {
        section.classList.toggle('is-active', section.getAttribute('data-principle') === id);
      });
    };

    setActivePrinciple(principleSections[0].getAttribute('data-principle'));

    var principleObserver = new IntersectionObserver(
      function (entries) {
        var visibleEntries = entries.filter(function (entry) {
          return entry.isIntersecting;
        });

        if (!visibleEntries.length) return;

        visibleEntries.sort(function (a, b) {
          return b.intersectionRatio - a.intersectionRatio;
        });

        setActivePrinciple(visibleEntries[0].target.getAttribute('data-principle'));
      },
      {
        threshold: [0.2, 0.4, 0.6, 0.8],
        rootMargin: '-18% 0px -45% 0px'
      }
    );

    principleSections.forEach(function (section) {
      principleObserver.observe(section);
    });
  }
})();
