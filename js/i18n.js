// Język interfejsu: angielski (domyślny) albo polski.
// Kod gry pisze teksty po polsku; przy języku angielskim ten moduł tłumaczy je w chwili wyświetlenia:
//  - teksty w dokumencie (węzły tekstowe i atrybuty title / aria-label / placeholder / alt) przez MutationObserver,
//  - napisy rysowane na canvasie (fillText / strokeText / measureText).
// Słownik: js/lang/en.js (klucz = tekst polski; {0}, {1}… to wstawki, które też są tłumaczone, jeśli się da;
// {#0} to wstawka liczbowa: tylko cyfry, czas, procenty).
// Dzięki temu każdy gracz w grze sieciowej widzi swój język, a host i gość wymieniają tylko stan gry.
(function () {
  'use strict';
  const DD = window.DD = window.DD || {};
  let lang = 'en';
  try { lang = localStorage.getItem('pz-lang') === 'pl' ? 'pl' : 'en'; } catch (e) { /* brak dostępu do pamięci */ }
  DD.lang = lang;
  DD.setLang = function (l) {
    if (l === DD.lang) return;
    try { localStorage.setItem('pz-lang', l); } catch (e) { /* trudno */ }
    location.reload();
  };
  DD.i18nMiss = new Set();   // teksty bez tłumaczenia (do testów)
  DD.t = (s) => s;
  // przełącznik PL / EN na ekranie startowym
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-lang]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
      b.addEventListener('click', () => DD.setLang(b.dataset.lang));
    });
  });
  if (lang === 'pl') return;

  const LETTER = /[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
  const POLISH = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
  let exact = null, templates = null, outputs = null;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function build() {
    const dict = DD.I18N_EN || {};
    exact = new Map(); templates = []; outputs = new Set();
    for (const k in dict) {
      outputs.add(dict[k]);
      if (/\{#?\d\}/.test(k)) {
        const parts = k.split(/\{(#?\d)\}/);
        let re = '^', order = [];
        for (let i = 0; i < parts.length; i++) {
          if (i % 2) {
            const num = parts[i][0] === '#';
            re += num ? '([\\d\\s,.:%−+\\-/]+?)' : '([\\s\\S]+?)';
            order.push(num ? parts[i].slice(1) : parts[i]);
          } else re += esc(parts[i]);
        }
        templates.push({ prefix: parts[0], re: new RegExp(re + '$'), order, out: dict[k].replace(/\{#(\d)\}/g, '{$1}'), len: k.length });
      } else exact.set(k, dict[k]);
    }
    templates.sort((a, b) => b.prefix.length - a.prefix.length || b.len - a.len);
  }

  // małą literą, chyba że to skrót (CRP, E. coli, USG)
  const lowerFirst = (s) => (/^.[A-Z.]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
  const upperFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // tłumaczenie bez białych znaków na brzegach; null = brak tłumaczenia
  function core(s, depth) {
    if (exact.has(s)) return exact.get(s);
    const c0 = s.charAt(0);
    if (c0 !== c0.toUpperCase() && exact.has(upperFirst(s))) return lowerFirst(exact.get(upperFirst(s)));
    if (depth > 4) return null;
    for (const T of templates) {
      if (!s.startsWith(T.prefix)) continue;
      const m = T.re.exec(s);
      if (!m) continue;
      let out = T.out;
      T.order.forEach((n, i) => {
        const part = m[i + 1];
        const tr = LETTER.test(part) ? core(part.trim(), depth + 1) : null;
        out = out.split('{' + n + '}').join(tr != null ? part.replace(part.trim(), tr) : part);
      });
      return out;
    }
    // lista („a 8 s, b 10 s”): na najwyższym poziomie tylko wtedy, gdy da się przetłumaczyć każdy element
    if (s.includes(', ')) {
      const parts = s.split(', ').map((x) => core(x, depth + 1));
      if (depth > 0 || parts.every((x) => x != null)) return parts.map((x, i) => x ?? s.split(', ')[i]).join(', ');
    }
    if (depth > 0) {
      // wstawka będąca nazwą z liczbą („Przeciwciała 8 s”, „przeciwciała 20%”)
      const m = /^(\D+?) (\d.*)$/.exec(s);
      if (m) { const h = core(m[1], depth + 1); if (h != null) return h + ' ' + m[2]; }
    }
    return null;
  }

  const cache = new Map();
  function t(s) {
    if (typeof s !== 'string' || !LETTER.test(s)) return s;
    if (cache.has(s)) return cache.get(s);
    if (!exact) build();
    const trimmed = s.trim();
    let r = core(trimmed, 0);
    if (r == null) {
      if (DD.i18nDebug || POLISH.test(trimmed)) {
        if (!outputs.has(trimmed)) DD.i18nMiss.add(trimmed);
      }
      r = trimmed;
    }
    r = s.replace(trimmed, r);
    if (cache.size > 4000) cache.clear();
    cache.set(s, r);
    return r;
  }
  DD.t = t;

  // ---------- dokument ----------
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1 };
  function textNode(n) {
    const p = n.parentNode;
    if (!p || SKIP[p.nodeName] || (p.closest && p.closest('[data-no-i18n]'))) return;
    const v = t(n.data);
    if (v !== n.data) n.data = v;
  }
  function attrs(el) {
    if (el.closest && el.closest('[data-no-i18n]')) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v) { const tv = t(v); if (tv !== v) el.setAttribute(a, tv); }
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { textNode(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName] || root.hasAttribute('data-no-i18n')) return;
    attrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeType === 1 && (SKIP[n.nodeName] || n.hasAttribute('data-no-i18n')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    });
    let n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) textNode(n); else attrs(n); }
  }
  DD.i18nWalk = walk;

  function start() {
    document.documentElement.lang = 'en';
    document.title = t(document.title);
    walk(document.body);
    new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'characterData') textNode(m.target);
        else if (m.type === 'attributes') attrs(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // ---------- canvas ----------
  const P = CanvasRenderingContext2D.prototype;
  for (const fn of ['fillText', 'strokeText', 'measureText']) {
    const orig = P[fn];
    P[fn] = function (text, ...rest) { return orig.call(this, t(String(text)), ...rest); };
  }
})();
