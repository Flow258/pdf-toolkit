#!/usr/bin/env node
/* PDF Toolkit build script. No dependencies, needs Node 16 or newer.

   Usage:
     node tools/build.cjs                          regenerate pages and the service worker
     node tools/build.cjs https://your-domain.com  ...and also write canonical URLs, sitemap.xml
                                                   and a Sitemap line in robots.txt

   It generates:
     index.html and <tool>/index.html   one real page per tool, with its own title,
                                        description and readable content for search engines
     sw.js                              service worker with the current file list and a version
                                        derived from the file contents, so updates always ship
   Text for tools comes from js/tools-meta.js. The Content-Security-Policy comes from _headers. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const site = (process.argv[2] || '').replace(/\/+$/, '');
const tools = require(path.join(ROOT, 'js', 'tools-meta.js'));

const headers = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8');
const cspLine = (headers.match(/Content-Security-Policy:\s*(.+)/) || [])[1];
if (!cspLine) throw new Error('No Content-Security-Policy found in _headers');
const cspMeta = cspLine.split(';').map(s => s.trim()).filter(d => d && !d.startsWith('frame-ancestors')).join('; ');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonLd = obj => JSON.stringify(obj).replace(/</g, '\\u003c');

const HOME = {
  title: 'PDF Toolkit: free PDF tools that run in your browser',
  description: 'Merge, split, rotate, compress and convert PDFs for free. Everything runs in your browser, so your files never leave your device.'
};

function page({ depth, title, description, urlPath, body, ld }) {
  const p = depth ? '../' : '';
  const url = site ? site + urlPath : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${esc(cspMeta)}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${url ? `<link rel="canonical" href="${esc(url)}">\n<meta property="og:url" content="${esc(url)}">\n` : ''}<meta property="og:type" content="website">
<meta property="og:site_name" content="PDF Toolkit">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#f3f5f9" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e1116" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="${p}manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="${p}icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="${p}icons/icon-192.png">
<link rel="apple-touch-icon" href="${p}icons/apple-touch-icon.png">
<link rel="preload" href="${p}fonts/bricolage-grotesque-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${p}css/style.css">
<script type="application/ld+json">${jsonLd(ld)}</script>
</head>
<body>
<noscript><div class="banner">PDF Toolkit needs JavaScript to process files in your browser.</div></noscript>
<div id="app">
${body}
</div>
<div id="toasts" aria-live="polite"></div>

<script src="${p}vendor/pdf-lib.min.js"></script>
<script src="${p}vendor/pdf.min.js"></script>
<script src="${p}vendor/jszip.min.js"></script>
<script src="${p}js/i18n.js"></script>
<script src="${p}js/lang/fil.js"></script>
<script src="${p}js/config.js"></script>
<script src="${p}js/tools-meta.js"></script>
<script src="${p}js/app.js"></script>
</body>
</html>
`;
}

const appLd = (name, description, urlPath) => Object.assign({
  '@context': 'https://schema.org', '@type': 'WebApplication', name, description,
  applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', browserRequirements: 'Requires a modern web browser',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
}, site ? { url: site + urlPath } : {});

/* ---- home ---- */
const homeBody = `<main class="wrap hero" id="main">
<div>
<h1>Edit PDFs without uploading them.</h1>
<p class="lede">Merge, split, rotate, compress and convert PDFs right in your browser. It is free, needs no sign-up, and your files never leave your device.</p>
</div>
</main>
<section class="wrap section">
<h2>Pick a tool</h2>
<div class="grid" style="margin-top:22px">
${tools.map(t => `<a class="tile tint-${t.tint}" href="${t.id}/"><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p></a>`).join('\n')}
</div>
</section>`.replace(' style="margin-top:22px"', '');
fs.writeFileSync(path.join(ROOT, 'index.html'), page({ depth: 0, title: HOME.title, description: HOME.description, urlPath: '/', body: homeBody, ld: appLd('PDF Toolkit', HOME.description, '/') }));

/* ---- tool pages ---- */
for (const t of tools) {
  const body = `<main class="wrap tool" id="main">
<a class="back" href="../">All tools</a>
<h1>${esc(t.h1)}</h1>
<p class="lede small">${esc(t.sub)}</p>
<section class="tool-info">
<h2>How to use this tool</h2>
<ol class="steps">
${t.steps.map(s => `<li><div><strong>${esc(s)}</strong></div></li>`).join('\n')}
</ol>
<h2>Good to know</h2>
<h3>${esc(t.faq.q)}</h3>
<p class="sub">${esc(t.faq.a)}</p>
</section>
</main>`;
  const dir = path.join(ROOT, t.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page({ depth: 1, title: t.title, description: t.metaDescription, urlPath: `/${t.id}/`, body, ld: appLd(t.name, t.metaDescription, `/${t.id}/`) }));
}

/* ---- sitemap and robots ---- */
if (site) {
  const urls = ['/'].concat(tools.map(t => `/${t.id}/`));
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(site + u)}</loc></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
} else if (!fs.existsSync(path.join(ROOT, 'robots.txt'))) {
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
}

/* ---- service worker ---- */
const SKIP_DIRS = new Set(['tools', 'node_modules', '.git', 'cmaps', 'licenses']);
const SKIP_FILES = new Set(['sw.js', 'README.md', 'robots.txt', 'sitemap.xml', '_headers', '.gitignore', '.DS_Store']);
const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name), rel = path.relative(ROOT, full).split(path.sep).join('/');
    if (fs.statSync(full).isDirectory()) { if (!SKIP_DIRS.has(name)) walk(full); continue; }
    if (SKIP_FILES.has(name) || /LICENSE/i.test(name)) continue;
    files.push(rel);
  }
})(ROOT);
const hash = crypto.createHash('sha1');
files.forEach(f => { hash.update(f); hash.update(fs.readFileSync(path.join(ROOT, f))); });
const version = hash.digest('hex').slice(0, 10);
const precache = ['./'].concat(files.map(f => f.replace(/index\.html$/, '')).filter(f => f !== ''));

fs.writeFileSync(path.join(ROOT, 'sw.js'), `/* Generated by tools/build.cjs. Do not edit by hand. */
'use strict';
const VERSION = '${version}';
const CACHE = 'pdftoolkit-' + VERSION;
const PRECACHE = ${JSON.stringify(precache, null, 2)};

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('pdftoolkit-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* Pages: try the network first so updates show up, fall back to the cache when offline. */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./')))
    );
    return;
  }

  /* Everything else: use the cached copy, and refresh it in the background. */
  event.respondWith(
    caches.match(req).then(hit => {
      const refresh = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || refresh;
    })
  );
});
`);
console.log(`Built ${tools.length + 1} pages, sw.js (${precache.length} files, version ${version})` + (site ? `, sitemap for ${site}` : ''));
