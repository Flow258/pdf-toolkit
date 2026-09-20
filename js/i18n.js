/* Tiny runtime translator.
   The app writes plain English into the page. This file swaps text nodes and a few
   attributes (placeholder, aria-label, title, alt) for a translation, and swaps them
   back when the language changes. English stays the source of truth, so a missing
   translation simply shows English.

   A language file (js/lang/xx.js) registers:
     dict      exact English text  ->  translation
     patterns  [ [RegExp, (match, tr) => string], ... ] for text with numbers or names
     count     optional function that translates "3 pages" style phrases

   Mark any element that must never be translated (file names, for example) with
   the attribute data-notr. */
(function () {
  'use strict';
  var langs = {};
  var lang = 'en';
  var listeners = [];
  var textOrig = new WeakMap();
  var attrOrig = new WeakMap();
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var SKIP = { SCRIPT: 1, STYLE: 1, CANVAS: 1, TEXTAREA: 1, NOSCRIPT: 1 };
  var obs = null;
  var OBS_CFG = { childList: true, subtree: true, attributes: true, attributeFilter: ATTRS };

  function translateCore(core) {
    var L = langs[lang];
    if (!L) return null;
    if (Object.prototype.hasOwnProperty.call(L.dict, core)) return L.dict[core];
    for (var i = 0; i < L.patterns.length; i++) {
      var m = core.match(L.patterns[i][0]);
      if (m) return L.patterns[i][1](m, tr);
    }
    if (L.count) { var c = L.count(core); if (c !== core) return c; }
    return null;
  }
  function tr(str) {
    if (lang === 'en' || !langs[lang]) return str;
    var m = str.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!m[2]) return str;
    var out = translateCore(m[2]);
    return out == null ? str : m[1] + out + m[3];
  }

  function skipped(el) { return !el || SKIP[el.tagName] || (el.closest && el.closest('[data-notr]')); }

  function doText(n) {
    if (skipped(n.parentElement)) return;
    if (!textOrig.has(n)) textOrig.set(n, n.data);
    var t = tr(textOrig.get(n));
    if (n.data !== t) n.data = t;
  }
  function doAttrs(el) {
    if (skipped(el)) return;
    var map = attrOrig.get(el);
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      if (!map) { map = {}; attrOrig.set(el, map); }
      if (!(a in map)) map[a] = el.getAttribute(a);
      var t = tr(map[a]);
      if (el.getAttribute(a) !== t) el.setAttribute(a, t);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doAttrs(root);
    var w = document.createTreeWalker(root, 1 | 4);
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function quietly(fn) {
    if (obs) obs.disconnect();
    try { fn(); } finally { if (obs) obs.observe(document.body, OBS_CFG); }
  }

  function onMutations(records) {
    quietly(function () {
      records.forEach(function (r) {
        if (r.type === 'childList') {
          r.addedNodes.forEach(function (n) { walk(n); });
        } else if (r.type === 'attributes') {
          var map = attrOrig.get(r.target);
          if (!map) { map = {}; attrOrig.set(r.target, map); }
          map[r.attributeName] = r.target.getAttribute(r.attributeName); // the app wrote new English
          doAttrs(r.target);
        }
      });
    });
  }

  function set(code) {
    if (code !== 'en' && !langs[code]) code = 'en';
    lang = code;
    document.documentElement.lang = code;
    quietly(function () { walk(document.body); });
    listeners.forEach(function (fn) { try { fn(code); } catch (e) { /* ignore */ } });
  }

  window.PDFTK_I18N = {
    register: function (code, data) { langs[code] = data; },
    languages: function () { return Object.keys(langs).map(function (c) { return { code: c, name: langs[c].name }; }); },
    get: function () { return lang; },
    set: set,
    t: tr,
    onChange: function (fn) { listeners.push(fn); },
    start: function (initial) {
      obs = new MutationObserver(onMutations);
      obs.observe(document.body, OBS_CFG);
      set(initial || 'en');
    }
  };
})();
