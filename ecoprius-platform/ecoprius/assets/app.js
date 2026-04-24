/* ============================================================
   ECOPRIUS Platform — Client Router & Interactions
   Vanilla JS · Azure Static Web Apps compatible
   ============================================================ */

(() => {
  'use strict';

  /* -------------------------------------------------------- */
  /*  Route table                                             */
  /*  Each path matches a server-side rewrite defined in      */
  /*  staticwebapp.config.json. Here we only need client-side */
  /*  detection for same-page navigation + slug parsing.      */
  /* -------------------------------------------------------- */
  const routes = [
    { pattern: /^\/?$/,                                  file: 'index.html'     },
    { pattern: /^\/h2hub\/?$/,                           file: 'h2hub.html'     },
    { pattern: /^\/h2hub\/([a-z0-9-]+)\/?$/,             file: 'dashboard.html' },
    { pattern: /^\/power-grid\/?$/,                      file: 'project.html'   },
    { pattern: /^\/carbon-loop\/?$/,                     file: 'project.html'   },
    { pattern: /^\/green-steel\/?$/,                     file: 'project.html'   },
    { pattern: /^\/rare-metals\/?$/,                     file: 'project.html'   },
    { pattern: /^\/e-fuels\/?$/,                         file: 'project.html'   }
  ];

  const Router = {
    go(path) {
      const target = new URL(path, window.location.origin);
      const currentFile = detectCurrentFile();
      const matched = matchRoute(target.pathname);
      const targetFile = matched ? matched.file : 'index.html';
      if (targetFile !== currentFile) {
        window.location.assign(target.pathname);
        return;
      }
      history.pushState({}, '', target.pathname);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    current() { return matchRoute(window.location.pathname); },
    params() {
      const m = window.location.pathname.match(/^\/h2hub\/([a-z0-9-]+)\/?$/);
      return m ? { dashboard: m[1] } : {};
    }
  };

  function matchRoute(path) {
    for (const r of routes) if (r.pattern.test(path)) return r;
    return null;
  }

  function detectCurrentFile() {
    const meta = document.querySelector('meta[name="page-file"]');
    return meta ? meta.content : 'index.html';
  }

  /* -------------------------------------------------------- */
  /*  Link interception — any <a data-route> goes via router  */
  /* -------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-route]');
    if (!link) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    Router.go(link.getAttribute('href'));
  });

  /* -------------------------------------------------------- */
  /*  Live UTC clock (topbar)                                 */
  /* -------------------------------------------------------- */
  function tickClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    const d = new Date();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    el.textContent = `${hh}:${mm}:${ss} UTC`;
  }

  /* -------------------------------------------------------- */
  /*  Entra ID user hydration                                 */
  /*  Azure SWA exposes /.auth/me with the signed-in user.    */
  /*  Best-effort — local dev will 404 silently.              */
  /* -------------------------------------------------------- */
  async function hydrateUser() {
    const chip = document.querySelector('[data-user]');
    if (!chip) return;
    try {
      const res = await fetch('/.auth/me', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const principal = data.clientPrincipal;
      if (!principal) return;
      const name = principal.userDetails || 'operator';
      chip.textContent = name;
    } catch (_) { /* ignore on local dev */ }
  }

  /* -------------------------------------------------------- */
  /*  Dashboard slug hydration (Level 3)                      */
  /* -------------------------------------------------------- */
  function hydrateDashboard() {
    const host = document.querySelector('[data-dashboard-slot]');
    if (!host) return;
    const { dashboard } = Router.params();
    const catalog = {
      'economy-engineering': {
        id:    'DASH · 01',
        title: 'Economy & Engineering',
        em:    'Economy & Engineering',
        desc:  'Plant sizing, CAPEX and OPEX modelling, LCOH sensitivity and engineering parameter studies for the H2 HUB programme.'
      },
      'intelligence': {
        id:    'DASH · 02',
        title: 'H₂ Intelligence',
        em:    'Intelligence',
        desc:  'Market, policy and competitive signal synthesis across the hydrogen value chain and offtake landscape.'
      },
      'decarbonization': {
        id:    'DASH · 03',
        title: 'Decarbonization Cost & Value',
        em:    'Decarbonization',
        desc:  'Strategic cost and value of abatement pathways. Scope 1–3 reductions, offtake-aligned scenarios and compliance trajectories.'
      },
      'co2': {
        id:    'DASH · 04',
        title: 'CO₂ Emission',
        em:    'CO₂ Accounting',
        desc:  'Lifecycle CO₂ intensity, emission factors, and disclosure-grade reporting aligned with CBAM and GHG Protocol.'
      }
    };
    const meta = catalog[dashboard] || {
      id:    'DASH · ??',
      title: 'Unknown module',
      em:    'Unknown',
      desc:  'The requested dashboard is not registered in the platform catalogue.'
    };
    const idEl    = host.querySelector('[data-slot-id]');
    const titleEl = host.querySelector('[data-slot-title]');
    const descEl  = host.querySelector('[data-slot-desc]');
    if (idEl)    idEl.textContent    = meta.id;
    if (titleEl) titleEl.innerHTML   = `Live · <em>${meta.em}</em>`;
    if (descEl)  descEl.textContent  = meta.desc;
    const crumb = document.querySelector('[data-crumb-current]');
    if (crumb) crumb.textContent = meta.title;
    document.title = `${meta.title} · H2 HUB · ECOPRIUS`;
  }

  /* -------------------------------------------------------- */
  /*  Scroll-reveal (entrance animations)                     */
  /*  Adds .fade-up when elements with [data-reveal] enter    */
  /*  the viewport — GPU-friendly and respects reduced motion */
  /* -------------------------------------------------------- */
  function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('fade-up'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-up');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });
    els.forEach(el => io.observe(el));
  }

  /* -------------------------------------------------------- */
  /*  Boot                                                    */
  /* -------------------------------------------------------- */
  function boot() {
    tickClock();
    setInterval(tickClock, 1000);
    hydrateUser();
    hydrateDashboard();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.EcopriusRouter = Router;
})();
