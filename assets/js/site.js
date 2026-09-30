/* Shared behaviour for every page: menu, theme, scroll UI, counters, filters, reveal. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ── Mobile menu ─────────────────────────── */
  const hamburger = $('#hamburgerBtn');
  const mobileNav = $('#mobileNav');
  if (hamburger && mobileNav) {
    const setOpen = open => {
      hamburger.classList.toggle('open', open);
      mobileNav.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    hamburger.addEventListener('click', () => setOpen(!mobileNav.classList.contains('open')));
    $$('a', mobileNav).forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('click', e => {
      if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) { setOpen(false); hamburger.focus(); }
    });
    window.matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
  }

  /* ── Theme toggle (follows the OS until the visitor chooses) ── */
  const root = document.documentElement;
  const themeBtn = $('#themeBtn');
  const themeIcon = $('#themeIcon');
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const applyTheme = t => {
    root.setAttribute('data-theme', t);
    if (!themeBtn) return;
    themeIcon.innerHTML = t === 'light' ? '<use href="#ico-moon"/>' : '<use href="#ico-sun"/>';
    const label = t === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
    themeBtn.setAttribute('aria-label', label);
    themeBtn.setAttribute('title', label);
    themeBtn.setAttribute('aria-pressed', String(t === 'dark'));
  };
  let stored = null;
  try { stored = localStorage.getItem('sb3-theme'); } catch (e) {}
  applyTheme(stored || (media.matches ? 'dark' : 'light'));
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('sb3-theme', next); } catch (e) {}
    applyTheme(next);
  });
  media.addEventListener('change', e => {
    let hasChoice = false;
    try { hasChoice = !!localStorage.getItem('sb3-theme'); } catch (err) {}
    if (!hasChoice) applyTheme(e.matches ? 'dark' : 'light');
  });

  /* ── Scroll progress, nav border, back to top ── */
  const bar = $('#scrollProgress');
  const nav = $('#siteNav');
  const toTop = $('#toTop');
  let ticking = false;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    if (nav) nav.classList.toggle('scrolled', y > 8);
    if (toTop) toTop.classList.toggle('show', y > 700);
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  const hasIO = 'IntersectionObserver' in window;

  /* ── Case-study table of contents: highlight the section in view ── */
  const tocLinks = $$('.toc a');
  if (tocLinks.length && hasIO) {
    const secs = tocLinks.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    const vis = new Map();
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => vis.set(en.target.id, en.isIntersecting ? en.intersectionRatio : 0));
      let best = null, r = 0;
      vis.forEach((v, id) => { if (v > r) { r = v; best = id; } });
      if (best) tocLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + best));
    }, { rootMargin: '-80px 0px -50% 0px', threshold: [0, .1, .3, .6, 1] });
    secs.forEach(s => io.observe(s));
  }

  /* ── Count up the headline figures ── */
  const nums = $$('.stat-n');
  nums.forEach(n => n.dataset.final = n.textContent.trim());
  window.addEventListener('beforeprint', () => nums.forEach(n => n.textContent = n.dataset.final));
  if (!reduceMotion && hasIO) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target, m = el.dataset.final.match(/^(\d+)(\D*)$/);
        if (!m) return;
        const target = parseInt(m[1], 10), suffix = m[2], start = performance.now(), dur = 1100;
        (function step(now) {
          const p = Math.min((now - start) / dur, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(start);
      });
    }, { threshold: .5 });
    nums.forEach(n => io.observe(n));
  }

  /* ── Project filters ── */
  const filters = $$('.filter');
  if (filters.length) {
    const cards = $$('.card[data-cat]');
    filters.forEach(btn => btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      filters.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      cards.forEach(c => { c.hidden = !(f === 'all' || c.dataset.cat.split(' ').includes(f)); });
    }));
  }

  /* ── Gentle reveal on scroll ── */
  const reveals = $$('.reveal');
  if (!reduceMotion && hasIO) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .05 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* ── Profile photo: fall back to the monogram if the image is missing ── */
  $$('.polaroid-photo img').forEach(img => {
    const hide = () => img.remove();
    if (img.complete && img.naturalWidth === 0) hide(); else img.addEventListener('error', hide);
  });

  /* ── Print: expand every collapsible section ── */
  window.addEventListener('beforeprint', () => $$('details').forEach(d => { d.dataset.wasOpen = d.open; d.open = true; }));
  window.addEventListener('afterprint', () => $$('details').forEach(d => { d.open = d.dataset.wasOpen === 'true'; }));
})();
