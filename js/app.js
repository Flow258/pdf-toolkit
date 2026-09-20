(() => {
'use strict';

/* =====================================================================
   Helpers
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
let uid = 0;
class UserError extends Error {}
class Cancelled extends Error {}
const tick = () => new Promise(r => setTimeout(r, 0));
const state = { handoff: null, task: null };
const SCRIPT_SRC = document.currentScript ? document.currentScript.src : location.href;
const BASE = new URL('../', SCRIPT_SRC);          /* site root, wherever the site is hosted */
const BASE_PATH = BASE.pathname;
const CMAP = new URL('vendor/cmaps/', BASE).href;
const CONFIG = Object.assign({ supportUrl: '', supportLabel: 'Support this project' }, window.PDFTK_CONFIG || {});
const I18N = window.PDFTK_I18N;

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  const late = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') { for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv); }
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') late[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const [k, v] of Object.entries(late)) el[k] = v;
  el.append(...kids.flat(Infinity).filter(x => x != null && x !== false));
  return el;
}

const fmtBytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(n < 10485760 ? 2 : 1) + ' MB';
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const baseName = name => name.replace(/\.[^.]+$/, '');
const toBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
const pdfBlob = bytes => new Blob([bytes], { type: 'application/pdf' });

const ICONS = {
  merge: '<rect x="3" y="3" width="9" height="11" rx="1.5"/><rect x="12" y="10" width="9" height="11" rx="1.5"/><path d="M12 8h2.5a1.5 1.5 0 0 1 1.5 1.5V10"/>',
  split: '<rect x="3" y="5" width="7" height="14" rx="1.5"/><rect x="14" y="5" width="7" height="14" rx="1.5"/><path d="M12 3v18" stroke-dasharray="2 3"/>',
  extract: '<path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5z"/><path d="M14 3v4.5h4.5"/><path d="M12 17v-6m-2.5 2.5L12 11l2.5 2.5"/>',
  delete: '<path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5z"/><path d="M14 3v4.5h4.5"/><path d="M9.5 12l5 5m0-5l-5 5"/>',
  reorder: '<rect x="3" y="4" width="7" height="9" rx="1.5"/><rect x="14" y="11" width="7" height="9" rx="1.5"/><path d="M14 6h6m0 0l-2-2m2 2l-2 2"/><path d="M10 18H4m0 0l2-2m-2 2l2 2"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>',
  'images-to-pdf': '<rect x="3" y="5" width="12" height="12" rx="1.5"/><circle cx="7.5" cy="9.5" r="1.3"/><path d="M3 14.5l3.5-3.5 3 3 2-2 3.5 3.5"/><path d="M18 8h2.5v13H8v-2.5"/>',
  'pdf-to-images': '<path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5z"/><path d="M14 3v4.5h4.5"/><circle cx="10" cy="13" r="1.2"/><path d="M7 19l3.2-3.2 2 2 1.8-1.8 2 3"/>',
  watermark: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  compress: '<path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5"/>',
  upload: '<path d="M12 16V5m-4.5 4.5L12 5l4.5 4.5"/><path d="M4 16v3a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3"/>',
  file: '<path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5z"/><path d="M14 3v4.5h4.5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  up: '<path d="M5 15l7-7 7 7"/>',
  down: '<path d="M5 9l7 7 7-7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  download: '<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5"/><path d="M4 16v3a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>'
};
const ico = (name, size = 22) => h('span', { class: 'ico', html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>` });

function toast(msg, kind = 'info') {
  const t = h('div', { class: 'toast ' + kind, role: kind === 'error' ? 'alert' : 'status' }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('out'), 4600);
  setTimeout(() => t.remove(), 5100);
}

/* ---------- saving files ---------- */
let dlCap = null;
try {
  if (window.claude && typeof window.claude.use === 'function') {
    Promise.resolve(window.claude.use('downloads')).then(d => { dlCap = d || null; }).catch(() => {});
  }
} catch (e) { /* not in a hosted preview */ }

async function saveBlob(blob, filename) {
  if (dlCap) {
    try { await dlCap.save({ filename, data: blob }); toast('Saved ' + filename); }
    catch (e) { if (!e || e.code !== 'declined') toast('Could not save the file. Try again.', 'error'); }
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ---------- ranges ---------- */
function parseRanges(str, max) {
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  if (!parts.length) throw new UserError('Enter pages or ranges, like 1-3, 5.');
  return parts.map(p => {
    const m = p.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw new UserError(`"${p}" is not a page number or range.`);
    let a = +m[1], b = m[2] ? +m[2] : a;
    if (a > b) [a, b] = [b, a];
    if (a < 1 || b > max) throw new UserError(`Pages must be between 1 and ${max}.`);
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  });
}
const uniqSorted = arr => [...new Set(arr)].sort((a, b) => a - b);
function moveItem(arr, from, to, after) {
  const [x] = arr.splice(from, 1);
  let idx = from < to ? to - 1 : to;
  if (after) idx++;
  arr.splice(idx, 0, x);
}

/* ---------- libraries ---------- */
const libsReady = () => !!(window.PDFLib && window.pdfjsLib && window.JSZip);
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('vendor/pdf.worker.min.js', BASE).href;
}
const stamp = doc => { doc.setProducer('PDF Toolkit'); doc.setCreator('PDF Toolkit'); };

async function loadPdfItem(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let doc;
  try {
    doc = await pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false, cMapUrl: CMAP, cMapPacked: true }).promise;
  } catch (e) {
    if (e && e.name === 'PasswordException') throw new UserError(`${file.name} is password-protected. Remove the password first, then try again.`);
    throw new UserError(`${file.name} is not a valid PDF, or it is damaged.`);
  }
  return { file, name: file.name, size: file.size, bytes, doc, pageCount: doc.numPages };
}
async function libDoc(item) {
  try { return await PDFLib.PDFDocument.load(item.bytes, { updateMetadata: false }); }
  catch (e) {
    if (/encrypt/i.test(String(e && e.message))) throw new UserError(`${item.name} is encrypted or restricted, so it cannot be edited here.`);
    throw new UserError(`${item.name} could not be read. It may be damaged.`);
  }
}
async function renderPage(doc, n, scale, maxPx = 16e6) {
  const page = await doc.getPage(n);
  const v1 = page.getViewport({ scale: 1 });
  let s = scale;
  if (v1.width * s * v1.height * s > maxPx) s = Math.sqrt(maxPx / (v1.width * v1.height));
  const vp = page.getViewport({ scale: s });
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.floor(vp.width)); c.height = Math.max(1, Math.floor(vp.height));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  page.cleanup();
  return { canvas: c, w: v1.width, h: v1.height };
}
async function makeZip(files, task) {
  const zip = new JSZip();
  files.forEach(f => zip.file(f.name, f.blob));
  return zip.generateAsync({ type: 'blob', compression: 'STORE' }, m => { if (task) task.set(0.9 + 0.1 * m.percent / 100, 'Packing ZIP'); });
}

/* ---------- lazy thumbnails ---------- */
let renderChain = Promise.resolve();
const enqueue = fn => { const p = renderChain.then(fn); renderChain = p.catch(() => {}); return p; };
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); e.target._load && e.target._load(); } }), { rootMargin: '400px' })
  : null;
const lazy = (el, load) => { el._load = load; io ? io.observe(el) : load(); };

function fitCanvasCss(canvas, aspect, boxAspect) {
  let fw, fh;
  if (aspect <= boxAspect) { fh = 1; fw = aspect / boxAspect; } else { fw = 1; fh = boxAspect / aspect; }
  canvas.style.width = (fw * 100) + '%';
  canvas.style.height = (fh * 100) + '%';
  return { fw, fh };
}
async function drawPageThumb(doc, n, canvas, boxAspect = 0.75) {
  const page = await doc.getPage(n);
  const v1 = page.getViewport({ scale: 1 });
  const s = Math.min(300 / v1.width, 400 / v1.height);
  const vp = page.getViewport({ scale: s });
  canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
  const r = fitCanvasCss(canvas, v1.width / v1.height, boxAspect);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  page.cleanup();
  canvas.classList.add('ready');
  return r;
}
function drawBitmapThumb(bmp, canvas, boxAspect) {
  const s = Math.min(1, 200 / Math.max(bmp.width, bmp.height));
  canvas.width = Math.max(1, Math.round(bmp.width * s)); canvas.height = Math.max(1, Math.round(bmp.height * s));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  fitCanvasCss(canvas, bmp.width / bmp.height, boxAspect);
  canvas.classList.add('ready');
}
function smallCanvas(src, w = 160) {
  const c = document.createElement('canvas');
  c.width = w; c.height = Math.max(1, Math.round(src.height * w / src.width));
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/* ---------- drag and drop sorting ---------- */
const dnd = { from: null };
function clearMarks() { document.querySelectorAll('.drop-before,.drop-after,.dragging').forEach(e => e.classList.remove('drop-before', 'drop-after', 'dragging')); }
function makeDraggable(el, getIndex, move, axis) {
  el.setAttribute('draggable', 'true');
  const after = e => { const r = el.getBoundingClientRect(); return axis === 'x' ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2; };
  el.addEventListener('dragstart', e => {
    dnd.from = getIndex();
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', 'x'); } catch (_) { /* ignore */ }
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', () => { dnd.from = null; clearMarks(); });
  el.addEventListener('dragover', e => {
    if (dnd.from == null) return;
    e.preventDefault();
    const a = after(e);
    el.classList.toggle('drop-after', a); el.classList.toggle('drop-before', !a);
  });
  el.addEventListener('dragleave', () => el.classList.remove('drop-after', 'drop-before'));
  el.addEventListener('drop', e => {
    if (dnd.from == null) return;
    e.preventDefault();
    const from = dnd.from, to = getIndex(), a = after(e);
    dnd.from = null; clearMarks();
    if (from !== to) move(from, to, a);
  });
}

/* =====================================================================
   UI components
   ===================================================================== */
function dropzone({ title, hint, accept, multiple = false, compact = false, onFiles }) {
  const exts = accept.filter(a => a.startsWith('.')), mimes = accept.filter(a => !a.startsWith('.'));
  const ok = f => mimes.includes(f.type) || exts.some(x => f.name.toLowerCase().endsWith(x));
  const handle = files => {
    const all = [...files], good = all.filter(ok);
    if (good.length < all.length) toast(`Skipped ${plural(all.length - good.length, 'unsupported file')}.`, 'warn');
    if (good.length) onFiles(multiple ? good : good.slice(0, 1));
  };
  const input = h('input', { type: 'file', class: 'sr-only', accept: accept.join(','), multiple, onchange: e => { handle(e.target.files); e.target.value = ''; } });
  const el = h('label', { class: 'drop' + (compact ? ' compact' : '') }, input, ico(compact ? 'plus' : 'upload', compact ? 20 : 36), h('span', { class: 'drop-title' }, title), hint && h('span', { class: 'drop-hint' }, hint));
  el.addEventListener('dragover', e => { if (dnd.from != null) return; e.preventDefault(); el.classList.add('over'); });
  el.addEventListener('dragleave', () => el.classList.remove('over'));
  el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('over'); if (e.dataTransfer.files.length) handle(e.dataTransfer.files); });
  return el;
}

function seg(options, value, onChange) {
  const name = 'seg' + (++uid);
  const el = h('div', { class: 'seg', role: 'radiogroup' });
  options.forEach(o => {
    const id = name + '-' + o.value;
    el.append(h('input', { type: 'radio', name, id, value: o.value, checked: o.value === value, onchange: () => onChange(o.value) }), h('label', { for: id }, o.label));
  });
  return el;
}
function field(label, control, hint) {
  const tag = control.matches && control.matches('input,select') ? 'label' : 'div';
  return h(tag, { class: 'field' }, h('span', { class: 'flabel' }, label), control, hint && h('span', { class: 'fhint' }, hint));
}
function rangeField(label, { min, max, step = 1, value, unit = '', onInput }) {
  const out = h('output', {}, value + unit);
  const inp = h('input', { type: 'range', min, max, step, value, oninput: e => { out.textContent = e.target.value + unit; onInput(+e.target.value); } });
  return h('label', { class: 'field' }, h('span', { class: 'flabel' }, label), h('div', { class: 'rangerow' }, inp, out));
}
function fileBar(item, onChange) {
  return h('div', { class: 'filebar' }, ico('file', 26),
    h('div', { class: 'fb-main' }, h('strong', { class: 'fb-name', 'data-notr': '' }, item.name), h('span', { class: 'fb-meta' }, `${plural(item.pageCount, 'page')} · ${fmtBytes(item.size)}`)),
    h('button', { class: 'btn small ghost', onclick: onChange }, 'Change file'));
}

function makeTask() {
  const task = { cancelled: false };
  const fill = h('div', { class: 'prog-fill' });
  const label = h('span', {}, 'Working');
  task.el = h('div', { class: 'prog', role: 'status' },
    h('div', { class: 'prog-top' }, label, h('button', { class: 'btn small ghost', onclick: () => { task.cancelled = true; label.textContent = 'Cancelling'; } }, 'Cancel')),
    h('div', { class: 'prog-track' }, fill));
  task.set = (f, text) => { fill.style.width = Math.round(Math.min(1, f) * 100) + '%'; if (text) label.textContent = text; };
  task.check = () => { if (task.cancelled) throw new Cancelled(); };
  return task;
}
async function withProgress(host, fn) {
  const task = makeTask();
  state.task = task;
  host.replaceChildren(task.el);
  try { return await fn(task); }
  catch (e) {
    if (e instanceof Cancelled) toast('Cancelled');
    else { console.error(e); toast(e instanceof UserError ? e.message : 'Something went wrong: ' + (e && e.message || e), 'error'); }
    return null;
  } finally { host.replaceChildren(); if (state.task === task) state.task = null; }
}

const KEEP = ['compress', 'split', 'rotate', 'watermark', 'extract', 'delete', 'reorder', 'pdf-to-images'];
function showResult(root, { title, primary, stats, warn, extras, keepId, reset }) {
  const btns = h('div', { class: 'btns' },
    h('button', { class: 'btn primary', onclick: () => saveBlob(primary.blob, primary.name) }, ico('download', 18), `Download ${primary.name} (${fmtBytes(primary.blob.size)})`),
    h('button', { class: 'btn', onclick: reset }, 'Start over'));
  const card = h('section', { class: 'result', 'aria-live': 'polite' },
    h('h2', {}, h('span', { class: 'okdot' }, ico('check', 20)), title),
    stats && h('p', { class: 'stats' + (warn ? ' warn' : '') }, stats), btns);
  if (extras && extras.length) {
    card.append(h('div', { class: 'gallery' }, extras.map(x => h('div', { class: 'gcard' }, x.canvas, h('small', { 'data-notr': '', title: x.name }, x.name),
      h('button', { class: 'btn small ghost', onclick: () => saveBlob(x.blob, x.name) }, 'Save')))));
  }
  if (keepId && primary.blob.type === 'application/pdf') {
    card.append(h('div', { class: 'keep' }, h('p', {}, 'Keep working on this file'),
      h('div', { class: 'chips', style: { margin: 0 } }, KEEP.filter(k => k !== keepId).map(k => {
        const t = TOOLS.find(x => x.id === k);
        return h('button', { class: 'chip', onclick: () => { state.handoff = new File([primary.blob], primary.name, { type: 'application/pdf' }); navigate(toolHref(k)); } }, t.name);
      }))));
  }
  root.replaceChildren(card);
  card.scrollIntoView({ block: 'nearest' });
}

/* Single-PDF tools share the same pick, read, edit flow */
function pdfTool(root, build) {
  let current = null;
  function pick() {
    if (current) { try { current.doc.destroy(); } catch (_) { /* ignore */ } current = null; }
    root.replaceChildren(dropzone({ title: 'Drop a PDF here, or choose a file', hint: 'Your file stays on this device', accept: ['.pdf', 'application/pdf'], onFiles: f => ingest(f[0]) }));
  }
  async function ingest(file) {
    if (file.size > 200 * 1024 * 1024) toast('This is a very large file. Your browser may run slowly or run out of memory.', 'warn');
    root.replaceChildren(h('div', { class: 'loading' }, h('span', { class: 'spin' }), `Reading ${file.name}`));
    try { current = await loadPdfItem(file); build(current, pick); }
    catch (e) { toast(e instanceof UserError ? e.message : 'Could not open that file.', 'error'); pick(); }
  }
  pick();
  if (state.handoff) { const f = state.handoff; state.handoff = null; ingest(f); }
}

function actionBar(sum, btn) { return h('div', { class: 'actionbar' }, sum, btn); }

/* =====================================================================
   Page grid (select / rotate / reorder)
   ===================================================================== */
function pageGrid(item, { mode, danger = false, onChange = () => {} }) {
  const n = item.pageCount;
  const pages = Array.from({ length: n }, (_, i) => ({ i, rot: 0, sel: false, fw: 1, fh: 1 }));
  let order = pages.slice();
  const grid = h('div', { class: 'pgrid', role: 'list' });

  function applyRot(p) {
    const r = ((p.rot % 360) + 360) % 360;
    let k = 1;
    if (r === 90 || r === 270) k = Math.min(1, 0.75 / p.fh, (1 / 0.75) / p.fw);
    p.canvas.style.transform = `translate(-50%,-50%) rotate(${p.rot}deg) scale(${k})`;
  }
  function refresh(p) {
    if (mode === 'select') { p.el.classList.toggle('sel', p.sel); p.el.setAttribute('aria-checked', String(p.sel)); }
    if (mode === 'reorder') p.badge.textContent = order.indexOf(p) + 1;
  }
  function paint() { grid.replaceChildren(...order.map(p => p.el)); order.forEach(refresh); }
  function render() { paint(); onChange(); }
  function toggle(p) { p.sel = !p.sel; refresh(p); onChange(); }
  function step(p, d, which) {
    const i = order.indexOf(p), j = i + d;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    render();
    const b = p.el.querySelector('.' + which); if (b && !b.disabled) b.focus();
  }

  pages.forEach(p => {
    const thumb = h('div', { class: 'pg-thumb' });
    p.canvas = h('canvas');
    thumb.append(p.canvas);
    lazy(thumb, () => enqueue(async () => {
      try { const r = await drawPageThumb(item.doc, p.i + 1, p.canvas); p.fw = r.fw; p.fh = r.fh; applyRot(p); } catch (e) { console.warn(e); }
    }));
    const label = h('div', { class: 'pg-label' }, 'Page ' + (p.i + 1));
    if (mode === 'select') {
      p.el = h('div', { class: 'pg' + (danger ? ' danger' : ''), role: 'checkbox', 'aria-checked': 'false', 'aria-label': 'Page ' + (p.i + 1), tabindex: '0',
        onclick: () => toggle(p), onkeydown: e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(p); } } },
        h('span', { class: 'pg-badge' }, p.i + 1), thumb, label);
    } else if (mode === 'rotate') {
      p.el = h('div', { class: 'pg', role: 'listitem' }, thumb, label, h('div', { class: 'pg-ctrls' },
        h('button', { class: 'iconbtn flip', 'aria-label': `Rotate page ${p.i + 1} left`, onclick: () => { p.rot -= 90; applyRot(p); onChange(); } }, ico('rotate', 18)),
        h('button', { class: 'iconbtn', 'aria-label': `Rotate page ${p.i + 1} right`, onclick: () => { p.rot += 90; applyRot(p); onChange(); } }, ico('rotate', 18))));
    } else {
      p.badge = h('span', { class: 'pg-badge' }, p.i + 1);
      p.el = h('div', { class: 'pg', role: 'listitem' }, p.badge, thumb, label, h('div', { class: 'pg-ctrls' },
        h('button', { class: 'iconbtn mv-l', 'aria-label': `Move page ${p.i + 1} earlier`, onclick: () => step(p, -1, 'mv-l') }, ico('left', 18)),
        h('button', { class: 'iconbtn mv-r', 'aria-label': `Move page ${p.i + 1} later`, onclick: () => step(p, 1, 'mv-r') }, ico('right', 18))));
      makeDraggable(p.el, () => order.indexOf(p), (f, t, a) => { moveItem(order, f, t, a); render(); }, 'x');
    }
  });

  const api = {
    get selected() { return pages.filter(p => p.sel).map(p => p.i); },
    get order() { return order.map(p => p.i); },
    get rotations() { return pages.map(p => ((p.rot % 360) + 360) % 360); },
    get changed() {
      if (mode === 'rotate') return pages.some(p => ((p.rot % 360) + 360) % 360 !== 0);
      if (mode === 'reorder') return order.some((p, k) => p.i !== k);
      return false;
    }
  };

  const tools = h('div', { class: 'pgtools' });
  const btn = (text, fn) => h('button', { class: 'btn small ghost', onclick: fn }, text);
  if (mode === 'select') {
    const setSel = fn => { pages.forEach(p => { p.sel = fn(p); refresh(p); }); onChange(); };
    const rin = h('input', { type: 'text', class: 'input', placeholder: 'Pages, e.g. 1-3, 7', 'aria-label': 'Select pages by number' });
    const apply = () => { try { parseRanges(rin.value, n).flat().forEach(k => { pages[k - 1].sel = true; refresh(pages[k - 1]); }); onChange(); } catch (e) { toast(e.message, 'warn'); } };
    rin.addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
    tools.append(btn('Select all', () => setSel(() => true)), btn('Clear', () => setSel(() => false)),
      btn('Odd pages', () => setSel(p => p.i % 2 === 0)), btn('Even pages', () => setSel(p => p.i % 2 === 1)),
      h('span', { class: 'grow' }), rin, btn('Add to selection', apply));
  } else if (mode === 'rotate') {
    tools.append(btn('Rotate all left', () => { pages.forEach(p => { p.rot -= 90; applyRot(p); }); onChange(); }),
      btn('Rotate all right', () => { pages.forEach(p => { p.rot += 90; applyRot(p); }); onChange(); }),
      btn('Reset', () => { pages.forEach(p => { p.rot = 0; applyRot(p); }); onChange(); }));
  } else {
    tools.append(btn('Reverse order', () => { order.reverse(); render(); }), btn('Reset order', () => { order = pages.slice(); render(); }));
  }
  api.el = h('div', {}, tools, grid);
  paint();
  return api;
}

/* =====================================================================
   Tools
   ===================================================================== */

/* ---------- Merge ---------- */
function toolMerge(root) {
  let items = [];
  const list = h('div', { class: 'rows', role: 'list' });
  const host = h('div');
  const sum = h('span', { class: 'sum' });
  const runBtn = h('button', { class: 'btn primary', onclick: run }, 'Merge PDFs');
  const adder = dropzone({ title: 'Add more PDFs', accept: ['.pdf', 'application/pdf'], multiple: true, compact: true, onFiles: addFiles });
  const ui = h('div', {}, list, adder, host, actionBar(sum, runBtn));

  function start() {
    items.forEach(i => i.doc && i.doc.destroy && i.doc.destroy());
    items = []; list.replaceChildren();
    root.replaceChildren(dropzone({ title: 'Drop PDFs here, or choose files', hint: 'Select two or more. You can reorder them next.', accept: ['.pdf', 'application/pdf'], multiple: true, onFiles: f => { root.replaceChildren(ui); addFiles(f); } }));
    if (state.handoff) { const f = state.handoff; state.handoff = null; root.replaceChildren(ui); addFiles([f]); }
  }
  async function addFiles(files) {
    for (const f of files) {
      const it = { id: ++uid, file: f, name: f.name, size: f.size, loading: true };
      items.push(it); draw();
      try {
        Object.assign(it, await loadPdfItem(f));
        it.loading = false;
      } catch (e) { it.loading = false; it.error = e instanceof UserError ? e.message : 'Could not read this file.'; }
      draw();
    }
  }
  function draw() {
    list.replaceChildren(...items.map((it, idx) => {
      const thumb = h('div', { class: 'rthumb' }, h('canvas'));
      if (it.doc) lazy(thumb, () => enqueue(async () => { try { await drawPageThumb(it.doc, 1, thumb.firstChild, 52 / 68); } catch (_) { /* ignore */ } }));
      const meta = it.loading ? 'Reading' : it.error ? it.error : `${plural(it.pageCount, 'page')} · ${fmtBytes(it.size)}`;
      const row = h('div', { class: 'row' + (it.error ? ' bad' : ''), role: 'listitem' }, thumb,
        h('div', { class: 'rinfo' }, h('span', { class: 'rname', 'data-notr': '', title: it.name }, it.name), h('span', { class: 'rmeta' + (it.error ? ' err' : '') }, meta)),
        h('div', { class: 'rbtns' },
          h('button', { class: 'iconbtn', 'aria-label': 'Move up', disabled: idx === 0, onclick: () => { moveItem(items, idx, idx - 1, false); draw(); } }, ico('up', 18)),
          h('button', { class: 'iconbtn', 'aria-label': 'Move down', disabled: idx === items.length - 1, onclick: () => { moveItem(items, idx, idx + 1, true); draw(); } }, ico('down', 18)),
          h('button', { class: 'iconbtn', 'aria-label': 'Remove ' + it.name, onclick: () => { it.doc && it.doc.destroy && it.doc.destroy(); items = items.filter(x => x !== it); if (!items.length) start(); else draw(); } }, ico('x', 18))));
      makeDraggable(row, () => items.indexOf(it), (f, t, a) => { moveItem(items, f, t, a); draw(); }, 'y');
      return row;
    }));
    const good = items.filter(i => i.doc), bad = items.some(i => i.error), busy = items.some(i => i.loading);
    const pages = good.reduce((s, i) => s + i.pageCount, 0);
    sum.classList.toggle('err', bad);
    sum.textContent = bad ? 'Remove the files marked in red to continue' : good.length < 2 ? 'Add at least 2 PDFs' : `${plural(good.length, 'file')}, ${plural(pages, 'page')} in total`;
    runBtn.disabled = busy || bad || good.length < 2;
  }
  async function run() {
    runBtn.disabled = true;
    const out = await withProgress(host, async task => {
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.create(); stamp(doc);
      const good = items.filter(i => i.doc);
      for (let k = 0; k < good.length; k++) {
        task.check(); task.set(k / good.length, `Adding ${good[k].name}`);
        const src = await libDoc(good[k]);
        (await doc.copyPages(src, src.getPageIndices())).forEach(p => doc.addPage(p));
        await tick();
      }
      task.set(0.95, 'Saving');
      return { blob: pdfBlob(await doc.save()), pages: doc.getPageCount(), files: good.length };
    });
    if (!out) { draw(); return; }
    showResult(root, { title: 'Your merged PDF is ready', primary: { name: 'merged.pdf', blob: out.blob }, stats: `${plural(out.files, 'file')} combined into ${plural(out.pages, 'page')}.`, keepId: 'merge', reset: start });
  }
  start();
}

/* ---------- Split ---------- */
function toolSplit(root) {
  pdfTool(root, (item, reset) => {
    const n = item.pageCount, base = baseName(item.name);
    let mode = 'each', rangeText = '', every = 2;
    const host = h('div'), sum = h('span', { class: 'sum' });
    const runBtn = h('button', { class: 'btn primary', onclick: run }, 'Split PDF');
    const rangeIn = h('input', { type: 'text', class: 'input', placeholder: 'e.g. 1-3, 4-6, 9', oninput: e => { rangeText = e.target.value; sync(); } });
    const everyIn = h('input', { type: 'number', class: 'input', min: 1, max: n, value: every, oninput: e => { every = Math.max(1, Math.floor(+e.target.value || 0)); sync(); } });
    const rangeF = field('Page ranges', rangeIn, 'Each range becomes its own PDF. Separate ranges with commas.');
    const everyF = field('Pages per file', everyIn);
    const pad = k => String(k).padStart(String(n).length, '0');

    function plan() {
      if (mode === 'each') return Array.from({ length: n }, (_, i) => ({ name: `${base}-page-${pad(i + 1)}.pdf`, pages: [i] }));
      if (mode === 'ranges') return parseRanges(rangeText, n).map(r => ({ name: r.length === 1 ? `${base}-page-${pad(r[0])}.pdf` : `${base}-pages-${pad(r[0])}-${pad(r[r.length - 1])}.pdf`, pages: r.map(x => x - 1) }));
      if (!(every >= 1)) throw new UserError('Enter a number of pages of 1 or more.');
      const out = [];
      for (let s = 0, k = 1; s < n; s += every, k++) out.push({ name: `${base}-part-${String(k).padStart(2, '0')}.pdf`, pages: Array.from({ length: Math.min(every, n - s) }, (_, i) => s + i) });
      return out;
    }
    function sync() {
      rangeF.classList.toggle('hidden', mode !== 'ranges'); everyF.classList.toggle('hidden', mode !== 'every');
      try { const p = plan(); sum.classList.remove('err'); sum.textContent = `Creates ${plural(p.length, 'file')}`; runBtn.disabled = false; }
      catch (e) { sum.classList.toggle('err', !!rangeText || mode !== 'ranges'); sum.textContent = e.message; runBtn.disabled = true; }
    }
    async function run() {
      const p = plan(); runBtn.disabled = true;
      const out = await withProgress(host, async task => {
        const { PDFDocument } = PDFLib;
        const src = await libDoc(item), files = [];
        for (let k = 0; k < p.length; k++) {
          task.check(); task.set(k / p.length * 0.9, `Creating file ${k + 1} of ${p.length}`);
          const d = await PDFDocument.create(); stamp(d);
          (await d.copyPages(src, p[k].pages)).forEach(x => d.addPage(x));
          files.push({ name: p[k].name, blob: pdfBlob(await d.save()) });
          await tick();
        }
        if (files.length === 1) return { primary: files[0], count: 1 };
        return { primary: { name: `${base}-split.zip`, blob: await makeZip(files, task) }, count: files.length };
      });
      sync();
      if (!out) return;
      showResult(root, { title: out.count === 1 ? 'Your PDF is ready' : 'Your files are ready', primary: out.primary, stats: out.count === 1 ? null : `${plural(out.count, 'PDF')} packed in one ZIP file.`, keepId: out.count === 1 ? 'split' : null, reset });
    }
    root.replaceChildren(fileBar(item, reset),
      h('div', { class: 'panel' }, h('div', { class: 'opts' },
        field('How to split', seg([{ value: 'each', label: 'Every page' }, { value: 'ranges', label: 'Page ranges' }, { value: 'every', label: 'Every N pages' }], 'each', v => { mode = v; sync(); })),
        rangeF, everyF)),
      host, actionBar(sum, runBtn));
    sync();
  });
}

/* ---------- Page selection tools: extract, delete ---------- */
function toolSelect(root, kind) {
  pdfTool(root, (item, reset) => {
    const n = item.pageCount, base = baseName(item.name), isDel = kind === 'delete';
    const host = h('div'), sum = h('span', { class: 'sum' });
    const runBtn = h('button', { class: 'btn primary', onclick: run }, isDel ? 'Delete pages' : 'Extract pages');
    const grid = pageGrid(item, { mode: 'select', danger: isDel, onChange: sync });
    function sync() {
      const s = grid.selected.length;
      if (isDel) { sum.classList.toggle('err', s === n); sum.textContent = s === n ? 'You cannot delete every page' : s ? `${plural(s, 'page')} will be removed, ${n - s} kept` : 'Click the pages you want to remove'; runBtn.disabled = !s || s === n; }
      else { sum.textContent = s ? `${plural(s, 'page')} selected` : 'Click the pages you want to keep'; runBtn.disabled = !s; }
    }
    async function run() {
      const keep = isDel ? Array.from({ length: n }, (_, i) => i).filter(i => !grid.selected.includes(i)) : grid.selected;
      runBtn.disabled = true;
      const out = await withProgress(host, async task => {
        const { PDFDocument } = PDFLib;
        const src = await libDoc(item); task.set(0.3, 'Copying pages');
        const d = await PDFDocument.create(); stamp(d);
        (await d.copyPages(src, keep)).forEach(x => d.addPage(x));
        task.set(0.8, 'Saving');
        return pdfBlob(await d.save());
      });
      sync();
      if (!out) return;
      showResult(root, { title: isDel ? 'Pages deleted' : 'Pages extracted', primary: { name: `${base}-${isDel ? 'edited' : 'extracted'}.pdf`, blob: out }, stats: `Your new PDF has ${plural(keep.length, 'page')}.`, keepId: kind, reset });
    }
    root.replaceChildren(fileBar(item, reset), grid.el, host, actionBar(sum, runBtn));
    sync();
  });
}

/* ---------- Rotate ---------- */
function toolRotate(root) {
  pdfTool(root, (item, reset) => {
    const base = baseName(item.name), host = h('div'), sum = h('span', { class: 'sum' });
    const runBtn = h('button', { class: 'btn primary', onclick: run }, 'Save rotated PDF');
    const grid = pageGrid(item, { mode: 'rotate', onChange: sync });
    function sync() { const c = grid.rotations.filter(r => r).length; sum.textContent = c ? `${plural(c, 'page')} rotated` : 'Use the arrows under a page to rotate it'; runBtn.disabled = !c; }
    async function run() {
      const rots = grid.rotations; runBtn.disabled = true;
      const out = await withProgress(host, async task => {
        const { degrees } = PDFLib;
        const src = await libDoc(item); task.set(0.4, 'Rotating');
        src.getPages().forEach((p, i) => { if (rots[i]) p.setRotation(degrees((p.getRotation().angle + rots[i]) % 360)); });
        stamp(src); task.set(0.8, 'Saving');
        return pdfBlob(await src.save());
      });
      sync();
      if (!out) return;
      showResult(root, { title: 'Your rotated PDF is ready', primary: { name: `${base}-rotated.pdf`, blob: out }, stats: `${plural(rots.filter(r => r).length, 'page')} rotated.`, keepId: 'rotate', reset });
    }
    root.replaceChildren(fileBar(item, reset), grid.el, host, actionBar(sum, runBtn));
    sync();
  });
}

/* ---------- Reorder ---------- */
function toolReorder(root) {
  pdfTool(root, (item, reset) => {
    const base = baseName(item.name), host = h('div'), sum = h('span', { class: 'sum' });
    const runBtn = h('button', { class: 'btn primary', onclick: run }, 'Save new order');
    const grid = pageGrid(item, { mode: 'reorder', onChange: sync });
    function sync() { sum.textContent = grid.changed ? 'Order changed' : 'Drag pages, or use the arrows, to change the order'; runBtn.disabled = !grid.changed; }
    async function run() {
      const order = grid.order; runBtn.disabled = true;
      const out = await withProgress(host, async task => {
        const { PDFDocument } = PDFLib;
        const src = await libDoc(item); task.set(0.3, 'Copying pages');
        const d = await PDFDocument.create(); stamp(d);
        (await d.copyPages(src, order)).forEach(x => d.addPage(x));
        task.set(0.8, 'Saving');
        return pdfBlob(await d.save());
      });
      sync();
      if (!out) return;
      showResult(root, { title: 'Your reordered PDF is ready', primary: { name: `${base}-reordered.pdf`, blob: out }, stats: `${plural(order.length, 'page')} in the new order.`, keepId: 'reorder', reset });
    }
    root.replaceChildren(fileBar(item, reset), grid.el, host, actionBar(sum, runBtn));
    sync();
  });
}

/* ---------- Images to PDF ---------- */
function jpegOrientation(b) {
  try {
    if (b[0] !== 0xFF || b[1] !== 0xD8) return 1;
    let o = 2;
    while (o + 4 < b.length && b[o] === 0xFF) {
      const marker = b[o + 1], len = (b[o + 2] << 8) | b[o + 3];
      if (marker === 0xE1 && b[o + 4] === 0x45 && b[o + 5] === 0x78 && b[o + 6] === 0x69 && b[o + 7] === 0x66) {
        const t = o + 10, le = b[t] === 0x49;
        const r16 = p => le ? (b[p] | (b[p + 1] << 8)) : ((b[p] << 8) | b[p + 1]);
        const r32 = p => le ? (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) : ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]);
        const ifd = t + r32(t + 4), cnt = r16(ifd);
        for (let i = 0; i < cnt; i++) { const e = ifd + 2 + i * 12; if (r16(e) === 0x0112) return r16(e + 8) || 1; }
        return 1;
      }
      if (marker === 0xDA) break;
      o += 2 + len;
    }
  } catch (_) { /* fall through */ }
  return 1;
}
async function makeBitmap(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (_) { return createImageBitmap(file); }
}

function toolImagesToPdf(root) {
  let items = [], sizeKey = 'a4', orient = 'auto', marginKey = 'small';
  const list = h('div', { class: 'rows', role: 'list' }), host = h('div'), sum = h('span', { class: 'sum' });
  const runBtn = h('button', { class: 'btn primary', onclick: run }, 'Create PDF');
  const accept = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
  const adder = dropzone({ title: 'Add more images', accept, multiple: true, compact: true, onFiles: addFiles });
  const orientF = field('Orientation', seg([{ value: 'auto', label: 'Match image' }, { value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }], orient, v => { orient = v; }));
  const opts = h('div', { class: 'panel' }, h('div', { class: 'opts' },
    field('Page size', seg([{ value: 'fit', label: 'Fit to image' }, { value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'legal', label: 'Legal' }], sizeKey, v => { sizeKey = v; orientF.classList.toggle('hidden', v === 'fit'); })),
    orientF,
    field('Margin', seg([{ value: 'none', label: 'None' }, { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }], marginKey, v => { marginKey = v; }))));
  const ui = h('div', {}, list, adder, opts, host, actionBar(sum, runBtn));

  function start() {
    items.forEach(i => i.bmp && i.bmp.close && i.bmp.close());
    items = []; list.replaceChildren();
    root.replaceChildren(dropzone({ title: 'Drop images here, or choose files', hint: 'JPG, PNG, WebP, GIF or BMP. Each image becomes a page.', accept, multiple: true, onFiles: f => { root.replaceChildren(ui); addFiles(f); } }));
  }
  async function addFiles(files) {
    for (const f of files) {
      try { const bmp = await makeBitmap(f); items.push({ file: f, bmp, w: bmp.width, h: bmp.height }); }
      catch (_) { toast(`${f.name} could not be read as an image.`, 'warn'); }
      draw();
    }
    if (!items.length) start();
  }
  function draw() {
    list.replaceChildren(...items.map((it, idx) => {
      const thumb = h('div', { class: 'rthumb' }, h('canvas'));
      drawBitmapThumb(it.bmp, thumb.firstChild, 52 / 68);
      const row = h('div', { class: 'row', role: 'listitem' }, thumb,
        h('div', { class: 'rinfo' }, h('span', { class: 'rname', 'data-notr': '', title: it.file.name }, it.file.name), h('span', { class: 'rmeta' }, `${it.w} × ${it.h} px · ${fmtBytes(it.file.size)}`)),
        h('div', { class: 'rbtns' },
          h('button', { class: 'iconbtn', 'aria-label': 'Move up', disabled: idx === 0, onclick: () => { moveItem(items, idx, idx - 1, false); draw(); } }, ico('up', 18)),
          h('button', { class: 'iconbtn', 'aria-label': 'Move down', disabled: idx === items.length - 1, onclick: () => { moveItem(items, idx, idx + 1, true); draw(); } }, ico('down', 18)),
          h('button', { class: 'iconbtn', 'aria-label': 'Remove ' + it.file.name, onclick: () => { it.bmp.close && it.bmp.close(); items = items.filter(x => x !== it); if (!items.length) start(); else draw(); } }, ico('x', 18))));
      makeDraggable(row, () => items.indexOf(it), (f, t, a) => { moveItem(items, f, t, a); draw(); }, 'y');
      return row;
    }));
    sum.textContent = plural(items.length, 'image') + ' = ' + plural(items.length, 'page');
    runBtn.disabled = !items.length;
  }
  async function embed(doc, it) {
    const type = it.file.type;
    if (type === 'image/jpeg' || type === 'image/png') {
      const bytes = new Uint8Array(await it.file.arrayBuffer());
      if (type === 'image/png') return doc.embedPng(bytes);
      if (jpegOrientation(bytes) <= 1) return doc.embedJpg(bytes);
    }
    const c = document.createElement('canvas'); c.width = it.w; c.height = it.h;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(it.bmp, 0, 0);
    const blob = await toBlob(c, 'image/jpeg', 0.92);
    if (!blob) throw new UserError(`${it.file.name} is too large to convert.`);
    return doc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
  }
  async function run() {
    runBtn.disabled = true;
    const out = await withProgress(host, async task => {
      const { PDFDocument } = PDFLib;
      const sizes = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008] };
      const m = { none: 0, small: 18, medium: 36, large: 54 }[marginKey];
      const doc = await PDFDocument.create(); stamp(doc);
      for (let k = 0; k < items.length; k++) {
        task.check(); task.set(k / items.length, `Adding image ${k + 1} of ${items.length}`);
        const it = items[k], img = await embed(doc, it);
        let pw, ph, x, y, dw, dh;
        if (sizeKey === 'fit') {
          let sc = 0.75; if (Math.max(it.w, it.h) * sc > 1400) sc = 1400 / Math.max(it.w, it.h);
          dw = it.w * sc; dh = it.h * sc; pw = dw + 2 * m; ph = dh + 2 * m; x = m; y = m;
        } else {
          let [a, b] = sizes[sizeKey];
          const land = orient === 'auto' ? it.w > it.h : orient === 'landscape';
          pw = land ? b : a; ph = land ? a : b;
          const s = Math.min((pw - 2 * m) / it.w, (ph - 2 * m) / it.h);
          dw = it.w * s; dh = it.h * s; x = (pw - dw) / 2; y = (ph - dh) / 2;
        }
        doc.addPage([pw, ph]).drawImage(img, { x, y, width: dw, height: dh });
        await tick();
      }
      task.set(0.95, 'Saving');
      return pdfBlob(await doc.save());
    });
    draw();
    if (!out) return;
    showResult(root, { title: 'Your PDF is ready', primary: { name: 'images.pdf', blob: out }, stats: `${plural(items.length, 'image')} turned into ${plural(items.length, 'page')}.`, keepId: 'images-to-pdf', reset: start });
  }
  start();
}

/* ---------- PDF to images ---------- */
function toolPdfToImages(root) {
  pdfTool(root, (item, reset) => {
    const n = item.pageCount, base = baseName(item.name);
    let fmt = 'png', dpi = 150, quality = 0.9, pageMode = 'all', rangeText = '';
    const host = h('div'), sum = h('span', { class: 'sum' });
    const runBtn = h('button', { class: 'btn primary', onclick: run }, 'Convert to images');
    const qF = rangeField('Image quality', { min: 40, max: 100, step: 5, value: 90, unit: '%', onInput: v => { quality = v / 100; } });
    const rangeIn = h('input', { type: 'text', class: 'input', placeholder: 'e.g. 1-3, 7', oninput: e => { rangeText = e.target.value; sync(); } });
    const rangeF = field('Pages', rangeIn);
    function pageList() { return pageMode === 'all' ? Array.from({ length: n }, (_, i) => i + 1) : uniqSorted(parseRanges(rangeText, n).flat()); }
    function sync() {
      qF.classList.toggle('hidden', fmt === 'png'); rangeF.classList.toggle('hidden', pageMode === 'all');
      try { const p = pageList(); sum.classList.remove('err'); sum.textContent = `Creates ${plural(p.length, 'image')}`; runBtn.disabled = false; }
      catch (e) { sum.classList.toggle('err', !!rangeText); sum.textContent = e.message; runBtn.disabled = true; }
    }
    async function run() {
      const pages = pageList(); runBtn.disabled = true;
      const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[fmt];
      const out = await withProgress(host, async task => {
        const files = []; let fellBack = false;
        for (let k = 0; k < pages.length; k++) {
          task.check(); task.set(k / pages.length * 0.9, `Rendering page ${pages[k]} of ${n}`);
          const r = await renderPage(item.doc, pages[k], dpi / 72);
          const blob = await toBlob(r.canvas, mime, quality);
          if (!blob) throw new UserError(`Page ${pages[k]} is too large to render at this resolution. Try a lower one.`);
          if (blob.type !== mime) fellBack = true;
          const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
          files.push({ name: `${base}-page-${String(pages[k]).padStart(String(n).length, '0')}.${ext}`, blob, canvas: smallCanvas(r.canvas) });
          r.canvas.width = r.canvas.height = 0;
          await tick();
        }
        if (fellBack) toast('Your browser cannot save WebP, so PNG was used instead.', 'warn');
        const primary = files.length === 1 ? { name: files[0].name, blob: files[0].blob } : { name: `${base}-images.zip`, blob: await makeZip(files, task) };
        return { primary, files };
      });
      sync();
      if (!out) return;
      showResult(root, { title: 'Your images are ready', primary: out.primary, stats: `${plural(out.files.length, 'page')} saved as images.`, extras: out.files.length > 1 ? out.files : null, reset });
    }
    root.replaceChildren(fileBar(item, reset),
      h('div', { class: 'panel' }, h('div', { class: 'opts' },
        field('Format', seg([{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }, { value: 'webp', label: 'WebP' }], fmt, v => { fmt = v; sync(); })),
        field('Resolution', seg([{ value: '72', label: 'Screen (72)' }, { value: '150', label: 'Standard (150)' }, { value: '220', label: 'High (220)' }, { value: '300', label: 'Print (300)' }], '150', v => { dpi = +v; }), 'Higher resolution means larger images.'),
        qF,
        field('Which pages', seg([{ value: 'all', label: 'All pages' }, { value: 'custom', label: 'Choose pages' }], pageMode, v => { pageMode = v; sync(); })),
        rangeF)),
      host, actionBar(sum, runBtn));
    sync();
  });
}

/* ---------- Compress ---------- */
function toolCompress(root) {
  pdfTool(root, (item, reset) => {
    const base = baseName(item.name);
    let method = 'raster', level = 'balanced';
    const LV = { light: { s: 2, q: 0.82 }, balanced: { s: 1.5, q: 0.65 }, strong: { s: 1, q: 0.5 } };
    const host = h('div'), sum = h('span', { class: 'sum' }, `Original size: ${fmtBytes(item.size)}`);
    const runBtn = h('button', { class: 'btn primary', onclick: run }, 'Compress PDF');
    const levelF = field('Compression level', seg([{ value: 'light', label: 'Light' }, { value: 'balanced', label: 'Balanced' }, { value: 'strong', label: 'Strong' }], level, v => { level = v; }), 'Stronger compression gives a smaller file and lower image quality.');
    const noteEl = h('p', { class: 'note warn' }, 'This method turns each page into an image. The file gets much smaller, but text can no longer be selected or searched.');
    function sync() { levelF.classList.toggle('hidden', method !== 'raster'); noteEl.classList.toggle('hidden', method !== 'raster'); }
    async function run() {
      runBtn.disabled = true;
      const out = await withProgress(host, async task => {
        const { PDFDocument } = PDFLib;
        if (method === 'structure') {
          task.set(0.4, 'Optimizing');
          const d = await libDoc(item); stamp(d);
          return pdfBlob(await d.save({ useObjectStreams: true }));
        }
        const { s, q } = LV[level], n = item.pageCount;
        const d = await PDFDocument.create(); stamp(d);
        for (let i = 1; i <= n; i++) {
          task.check(); task.set((i - 1) / n * 0.95, `Compressing page ${i} of ${n}`);
          const r = await renderPage(item.doc, i, s, 12e6);
          const blob = await toBlob(r.canvas, 'image/jpeg', q);
          if (!blob) throw new UserError(`Page ${i} could not be compressed.`);
          const img = await d.embedJpg(new Uint8Array(await blob.arrayBuffer()));
          d.addPage([r.w, r.h]).drawImage(img, { x: 0, y: 0, width: r.w, height: r.h });
          r.canvas.width = r.canvas.height = 0;
          await tick();
        }
        task.set(0.97, 'Saving');
        return pdfBlob(await d.save());
      });
      runBtn.disabled = false;
      if (!out) return;
      const diff = (1 - out.size / item.size) * 100, smaller = out.size < item.size;
      showResult(root, {
        title: smaller ? 'Your PDF is smaller' : 'No size savings',
        primary: { name: `${base}-compressed.pdf`, blob: out },
        stats: smaller ? `${fmtBytes(item.size)} to ${fmtBytes(out.size)}, ${diff.toFixed(1)}% smaller.`
          : `The result (${fmtBytes(out.size)}) is not smaller than the original (${fmtBytes(item.size)}). This file is already compact. Try a stronger level, or keep your original.`,
        warn: !smaller, keepId: 'compress', reset
      });
    }
    root.replaceChildren(fileBar(item, reset),
      h('div', { class: 'panel' }, h('div', { class: 'opts' },
        field('Method', seg([{ value: 'raster', label: 'Reduce image quality' }, { value: 'structure', label: 'Optimize only' }], method, v => { method = v; sync(); }),
          'Optimize only keeps text selectable, but usually saves little.'),
        levelF), noteEl),
      host, actionBar(sum, runBtn));
    sync();
  });
}

/* ---------- Watermark ---------- */
const WM_FONTS = {
  HelveticaBold: { label: 'Sans serif bold', css: '700 {s}px Helvetica, Arial, sans-serif' },
  Helvetica: { label: 'Sans serif', css: '400 {s}px Helvetica, Arial, sans-serif' },
  TimesRomanBold: { label: 'Serif bold', css: '700 {s}px "Times New Roman", Times, serif' },
  TimesRoman: { label: 'Serif', css: '400 {s}px "Times New Roman", Times, serif' },
  Courier: { label: 'Typewriter', css: '400 {s}px "Courier New", Courier, monospace' }
};
function layoutCenters(W, H, iw, ih, pos, deg) {
  const a = deg * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const bw = iw * c + ih * s, bh = iw * s + ih * c, M = 36;
  const map = {
    center: [W / 2, H / 2], top: [W / 2, H - M - bh / 2], bottom: [W / 2, M + bh / 2],
    'top-left': [M + bw / 2, H - M - bh / 2], 'top-right': [W - M - bw / 2, H - M - bh / 2],
    'bottom-left': [M + bw / 2, M + bh / 2], 'bottom-right': [W - M - bw / 2, M + bh / 2]
  };
  if (pos !== 'tile') { const [x, y] = map[pos]; return [{ x, y }]; }
  const gx = bw + Math.max(24, bw * 0.25), gy = bh + Math.max(30, bh * 0.5), out = [];
  let row = 0;
  for (let y = gy / 2; y < H + gy / 2 && out.length < 300; y += gy, row++) {
    for (let x = row % 2 ? 0 : gx / 2; x < W + gx / 2; x += gx) out.push({ x, y });
  }
  return out;
}
function toUnrotated(x, y, W, H, rot) {
  if (rot === 90) return { u: W - y, v: x };
  if (rot === 180) return { u: W - x, v: H - y };
  if (rot === 270) return { u: y, v: H - x };
  return { u: x, v: y };
}

function toolWatermark(root) {
  pdfTool(root, (item, reset) => {
    const n = item.pageCount, base = baseName(item.name);
    const o = { type: 'text', text: 'CONFIDENTIAL', font: 'HelveticaBold', size: 64, color: '#d32f2f', opacity: 30, angle: 45, pos: 'center', scale: 30, pages: 'all', range: '' };
    let img = null; // { bytes, type, bmp, name }
    const host = h('div'), sum = h('span', { class: 'sum' });
    const runBtn = h('button', { class: 'btn primary', onclick: run }, 'Add watermark');

    /* preview */
    const base1 = h('canvas'), ov = h('canvas', { class: 'ov' });
    const pv = h('div', { class: 'pv' }, base1, ov);
    let pw = 595, ph = 842, pvReady = false, raf = 0;
    (async () => {
      try {
        const page = await item.doc.getPage(1), v1 = page.getViewport({ scale: 1 });
        const s = Math.min(340 / v1.width, 460 / v1.height), vp = page.getViewport({ scale: s * 1.5 });
        base1.width = Math.floor(vp.width); base1.height = Math.floor(vp.height);
        base1.style.width = Math.floor(v1.width * s) + 'px'; base1.style.height = Math.floor(v1.height * s) + 'px';
        ov.width = base1.width; ov.height = base1.height; ov.style.width = base1.style.width; ov.style.height = base1.style.height;
        pw = v1.width; ph = v1.height;
        await page.render({ canvasContext: base1.getContext('2d'), viewport: vp }).promise;
        pvReady = true; drawOverlay();
      } catch (e) { console.warn(e); }
    })();
    function queueOverlay() { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawOverlay); }
    function drawOverlay() {
      if (!pvReady) return;
      const ctx = ov.getContext('2d'); ctx.clearRect(0, 0, ov.width, ov.height);
      const k = ov.width / pw;
      ctx.save(); ctx.globalAlpha = o.opacity / 100;
      if (o.type === 'text') {
        if (!o.text.trim()) { ctx.restore(); return; }
        ctx.font = WM_FONTS[o.font].css.replace('{s}', o.size * k);
        const tw = ctx.measureText(o.text).width / k;
        ctx.fillStyle = o.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        layoutCenters(pw, ph, tw, o.size, o.pos, o.angle).forEach(c => {
          ctx.save(); ctx.translate(c.x * k, (ph - c.y) * k); ctx.rotate(-o.angle * Math.PI / 180); ctx.fillText(o.text, 0, 0); ctx.restore();
        });
      } else if (img) {
        const iw = pw * o.scale / 100, ih = iw * img.bmp.height / img.bmp.width;
        layoutCenters(pw, ph, iw, ih, o.pos, o.angle).forEach(c => {
          ctx.save(); ctx.translate(c.x * k, (ph - c.y) * k); ctx.rotate(-o.angle * Math.PI / 180); ctx.drawImage(img.bmp, -iw * k / 2, -ih * k / 2, iw * k, ih * k); ctx.restore();
        });
      }
      ctx.restore();
    }

    /* controls */
    const upd = (k, v) => { o[k] = v; queueOverlay(); sync(); };
    const textIn = h('input', { type: 'text', class: 'input', maxlength: 60, value: o.text, oninput: e => upd('text', e.target.value) });
    const fontSel = h('select', { class: 'input', onchange: e => upd('font', e.target.value) }, Object.entries(WM_FONTS).map(([k, v]) => h('option', { value: k, selected: k === o.font }, v.label)));
    const colorIn = h('input', { type: 'color', class: 'input', value: o.color, oninput: e => upd('color', e.target.value) });
    const imgBtnLabel = h('span', {}, 'Choose an image');
    const imgIn = h('input', { type: 'file', class: 'sr-only', accept: '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp', onchange: async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { const bmp = await makeBitmap(f); img && img.bmp.close && img.bmp.close(); img = { bytes: new Uint8Array(await f.arrayBuffer()), type: f.type, bmp, name: f.name }; imgBtnLabel.textContent = f.name; queueOverlay(); sync(); }
      catch (_) { toast('That image could not be read.', 'warn'); }
    } });
    const imgPick = h('label', { class: 'btn ghost small', style: { alignSelf: 'flex-start' } }, imgIn, ico('upload', 16), imgBtnLabel);
    const rangeIn = h('input', { type: 'text', class: 'input', placeholder: 'e.g. 1-3, 7', oninput: e => upd('range', e.target.value) });

    const textFs = [field('Watermark text', textIn), field('Font', fontSel), rangeField('Text size', { min: 12, max: 200, value: o.size, unit: ' pt', onInput: v => upd('size', v) }), field('Color', colorIn)];
    const imgFs = [field('Image', imgPick, 'PNG works best, especially with a transparent background.'), rangeField('Image width', { min: 5, max: 100, value: o.scale, unit: '%', onInput: v => upd('scale', v) })];
    const posOpts = [['center', 'Center'], ['tile', 'Repeat across page'], ['top', 'Top'], ['bottom', 'Bottom'], ['top-left', 'Top left'], ['top-right', 'Top right'], ['bottom-left', 'Bottom left'], ['bottom-right', 'Bottom right']];
    const posSel = h('select', { class: 'input', onchange: e => upd('pos', e.target.value) }, posOpts.map(([v, l]) => h('option', { value: v }, l)));
    const rangeF = field('Pages', rangeIn);
    const common = [field('Position', posSel), rangeField('Opacity', { min: 5, max: 100, value: o.opacity, unit: '%', onInput: v => upd('opacity', v) }), rangeField('Rotation', { min: -90, max: 90, value: o.angle, unit: '°', onInput: v => upd('angle', v) }),
      field('Apply to', seg([{ value: 'all', label: 'All pages' }, { value: 'custom', label: 'Choose pages' }], 'all', v => upd('pages', v))), rangeF];

    function sync() {
      textFs.forEach(f => f.classList.toggle('hidden', o.type !== 'text')); imgFs.forEach(f => f.classList.toggle('hidden', o.type !== 'image'));
      rangeF.classList.toggle('hidden', o.pages === 'all');
      let msg = null;
      if (o.type === 'text' && !o.text.trim()) msg = 'Enter the watermark text';
      else if (o.type === 'image' && !img) msg = 'Choose a watermark image';
      else if (o.pages === 'custom') { try { parseRanges(o.range, n); } catch (e) { msg = e.message; } }
      sum.classList.toggle('err', !!msg && !(o.pages === 'custom' && !o.range));
      sum.textContent = msg || `Ready to stamp ${o.pages === 'all' ? plural(n, 'page') : 'the chosen pages'}`;
      runBtn.disabled = !!msg;
    }

    async function embedWm(doc) {
      if (img.type === 'image/png') return doc.embedPng(img.bytes);
      if (img.type === 'image/jpeg') return doc.embedJpg(img.bytes);
      const c = document.createElement('canvas'); c.width = img.bmp.width; c.height = img.bmp.height; c.getContext('2d').drawImage(img.bmp, 0, 0);
      return doc.embedPng(new Uint8Array(await (await toBlob(c, 'image/png')).arrayBuffer()));
    }
    async function run() {
      runBtn.disabled = true;
      const out = await withProgress(host, async task => {
        const { rgb, degrees, StandardFonts } = PDFLib;
        const doc = await libDoc(item); stamp(doc);
        const targets = new Set(o.pages === 'all' ? Array.from({ length: n }, (_, i) => i) : parseRanges(o.range, n).flat().map(x => x - 1));
        let font = null, wmImg = null, tw = 0;
        if (o.type === 'text') {
          font = await doc.embedFont(StandardFonts[o.font]);
          try { tw = font.widthOfTextAtSize(o.text, o.size); }
          catch (_) { throw new UserError('The watermark text has characters that the built-in fonts cannot show. Use letters, numbers and common symbols.'); }
        } else wmImg = await embedWm(doc);
        const cr = parseInt(o.color.slice(1, 3), 16) / 255, cg = parseInt(o.color.slice(3, 5), 16) / 255, cb = parseInt(o.color.slice(5, 7), 16) / 255;
        const pages = doc.getPages();
        let done = 0;
        for (const i of [...targets].sort((a, b) => a - b)) {
          task.check(); task.set(done++ / targets.size * 0.9, `Stamping page ${i + 1}`);
          const page = pages[i], mb = page.getMediaBox(), rot = ((page.getRotation().angle % 360) + 360) % 360;
          const dw = rot === 90 || rot === 270 ? mb.height : mb.width, dh = rot === 90 || rot === 270 ? mb.width : mb.height;
          let iw = tw, ih = o.size;
          if (o.type === 'image') { iw = dw * o.scale / 100; ih = iw * wmImg.height / wmImg.width; }
          const ang = (o.angle + rot) * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
          const ly = o.type === 'text' ? -o.size * 0.33 : -ih / 2, lx = -iw / 2;
          for (const c of layoutCenters(dw, dh, iw, ih, o.pos, o.angle)) {
            const { u, v } = toUnrotated(c.x, c.y, mb.width, mb.height, rot);
            const x = mb.x + u + lx * ca - ly * sa, y = mb.y + v + lx * sa + ly * ca;
            if (o.type === 'text') page.drawText(o.text, { x, y, size: o.size, font, color: rgb(cr, cg, cb), opacity: o.opacity / 100, rotate: degrees(o.angle + rot) });
            else page.drawImage(wmImg, { x, y, width: iw, height: ih, opacity: o.opacity / 100, rotate: degrees(o.angle + rot) });
          }
          if (done % 5 === 0) await tick();
        }
        task.set(0.95, 'Saving');
        return { blob: pdfBlob(await doc.save()), count: targets.size };
      });
      sync();
      if (!out) return;
      showResult(root, { title: 'Your watermarked PDF is ready', primary: { name: `${base}-watermarked.pdf`, blob: out.blob }, stats: `Watermark added to ${plural(out.count, 'page')}.`, keepId: 'watermark', reset });
    }

    root.replaceChildren(fileBar(item, reset),
      h('div', { class: 'wmgrid' },
        h('div', { class: 'panel' }, h('div', { class: 'opts', style: { gridTemplateColumns: '1fr' } },
          field('Watermark type', seg([{ value: 'text', label: 'Text' }, { value: 'image', label: 'Image' }], 'text', v => upd('type', v))),
          ...textFs, ...imgFs, ...common)),
        h('div', {}, h('div', { class: 'preview' }, pv), h('p', { class: 'note', style: { marginTop: '10px' } }, 'Preview of page 1. Fonts may look slightly different in the final file.'))),
      host, actionBar(sum, runBtn));
    sync();
  });
}

/* =====================================================================
   Tool registry (text comes from js/tools-meta.js)
   ===================================================================== */
const MOUNTS = {
  merge: toolMerge, split: toolSplit, extract: r => toolSelect(r, 'extract'), delete: r => toolSelect(r, 'delete'),
  reorder: toolReorder, rotate: toolRotate, 'images-to-pdf': toolImagesToPdf, 'pdf-to-images': toolPdfToImages,
  watermark: toolWatermark, compress: toolCompress
};
const TOOLS = window.PDFTK_TOOLS_META.map(m => Object.assign({}, m, { mount: MOUNTS[m.id] }));
const CATS = [['all', 'All tools'], ['organize', 'Organize'], ['convert', 'Convert'], ['edit', 'Edit and optimize']];
const SECTIONS = ['tools', 'privacy', 'faq', 'soon'];

/* =====================================================================
   URLs and navigation (real paths, so every tool has its own address)
   ===================================================================== */
const toolHref = id => BASE_PATH + id + '/';
const homeHref = () => BASE_PATH;
const sectionHref = name => BASE_PATH + '#' + name;
function relPath(pathname) {
  const p = pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) : pathname;
  return p.replace(/index\.html$/, '').replace(/\/+$/, '');
}
function scrollToSection(name) { const el = $('#sec-' + name); if (el) el.scrollIntoView(); }
function navigate(url) {
  const u = new URL(url, location.href);
  const samePage = relPath(u.pathname) === relPath(location.pathname);
  history.pushState(null, '', u.pathname + u.search + u.hash);
  if (samePage && u.hash) scrollToSection(u.hash.slice(1)); else route();
}
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a || a.target || a.hasAttribute('download')) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || !u.pathname.startsWith(BASE_PATH)) return;
  const rel = relPath(u.pathname);
  if (rel !== '' && !TOOLS.some(t => t.id === rel)) return;
  e.preventDefault();
  navigate(u.pathname + u.search + u.hash);
});
window.addEventListener('popstate', route);

/* Older links used #/merge style addresses. Turn them into real paths. */
(function upgradeLegacyHash() {
  const m = location.hash.match(/^#\/([\w-]*)$/);
  if (!m) return;
  const id = m[1];
  if (TOOLS.some(t => t.id === id)) history.replaceState(null, '', toolHref(id));
  else if (SECTIONS.includes(id)) history.replaceState(null, '', sectionHref(id));
  else if (id === '') history.replaceState(null, '', homeHref());
})();

/* =====================================================================
   Pages
   ===================================================================== */
function setTitle(fn) {
  state.titleFn = fn;
  document.title = fn();
}
function logo() {
  return h('a', { class: 'logo', href: homeHref(), 'aria-label': 'PDF Toolkit home' },
    h('span', { html: '<svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true"><path d="M0 0h21l9 9v25H0z" fill="var(--ink)"/><path d="M21 0v9h9z" fill="var(--hi)"/><rect x="5" y="17" width="20" height="6" fill="var(--hi)" transform="skewX(-6)" /><rect x="5" y="26" width="13" height="2.5" rx="1.2" fill="var(--bg)"/></svg>' }), 'PDF Toolkit');
}
function currentTheme() { return document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
function langButton() {
  const next = I18N.get() === 'fil' ? 'en' : 'fil';
  return h('button', {
    class: 'btn small ghost langbtn', 'data-notr': '', lang: next,
    'aria-label': next === 'fil' ? 'Switch to Filipino' : 'Lumipat sa English',
    onclick: () => { I18N.set(next); try { localStorage.setItem('pdftk-lang', next); } catch (_) { /* storage may be unavailable */ } }
  }, next === 'fil' ? 'Filipino' : 'English');
}
function updateInstall() {
  const slot = $('#install-slot');
  if (!slot) return;
  slot.replaceChildren(state.install ? h('button', { class: 'btn small ghost install-btn', onclick: async () => {
    const ev = state.install; state.install = null; updateInstall();
    try { ev.prompt(); await ev.userChoice; } catch (_) { /* ignore */ }
  } }, ico('download', 16), h('span', { class: 'txt' }, 'Install app')) : '');
}
function header() {
  const dark = currentTheme() === 'dark';
  const tbtn = h('button', { class: 'iconbtn', 'aria-label': dark ? 'Switch to light mode' : 'Switch to dark mode', onclick: () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('pdftk-theme', next); } catch (_) { /* storage may be unavailable */ }
    tbtn.replaceChildren(ico(next === 'dark' ? 'sun' : 'moon', 20)); tbtn.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  } }, ico(dark ? 'sun' : 'moon', 20));
  return h('header', { class: 'site-header' }, h('div', { class: 'wrap' }, logo(),
    h('nav', { 'aria-label': 'Main' }, h('a', { href: sectionHref('tools') }, 'Tools'), h('a', { class: 'opt', href: sectionHref('privacy') }, 'Privacy'), h('a', { class: 'opt', href: sectionHref('faq') }, 'FAQ')),
    h('span', { id: 'install-slot' }), langButton(), tbtn));
}
function footer() {
  const support = CONFIG.supportUrl && h('a', { class: 'support', href: CONFIG.supportUrl, target: '_blank', rel: 'noopener' }, CONFIG.supportLabel);
  return h('footer', {}, h('div', { class: 'wrap' },
    h('span', {}, 'PDF Toolkit. Free, and your files stay on your device.'),
    support,
    h('span', {}, 'Built with ', h('a', { href: 'https://pdf-lib.js.org', target: '_blank', rel: 'noopener' }, 'pdf-lib'), ', ', h('a', { href: 'https://mozilla.github.io/pdf.js/', target: '_blank', rel: 'noopener' }, 'PDF.js'), ' and ', h('a', { href: 'https://stuk.github.io/jszip/', target: '_blank', rel: 'noopener' }, 'JSZip'), '.')));
}

function renderHome() {
  setTitle(() => I18N.t('PDF Toolkit: free PDF tools that run in your browser'));
  const sheet = (cls, kids) => h('div', { class: 'sheet-wrap ' + cls }, h('div', { class: 'sheet' }, ...kids));
  const line = w => h('i', { style: { width: w } });
  const hero = h('section', { class: 'wrap hero' },
    h('div', {},
      h('h1', {}, 'Edit PDFs without uploading them.'),
      h('p', { class: 'lede' }, 'Merge, split, rotate, compress and convert PDFs right in your browser. It is free, needs no sign-up, and your files never leave your device.'),
      h('div', { class: 'cta' }, h('a', { class: 'btn hi', href: sectionHref('tools') }, 'Choose a tool'), h('a', { class: 'btn', href: sectionHref('privacy') }, 'How is that possible?'))),
    h('div', { class: 'hero-art', 'aria-hidden': 'true' },
      sheet('sw1', [line('70%'), line('90%'), line('60%')]),
      sheet('sw2', [line('55%'), line('85%'), line('75%'), line('40%')]),
      sheet('sw3', [h('b', {}, 'Q3 report.pdf'), line('92%'), line('80%'), h('div', { class: 'hl' }, line('88%')), line('70%'), line('84%'), line('50%')]),
      h('div', { class: 'stamp' }, ico('lock', 18), 'Stays on your device')));

  const grid = h('div', { class: 'grid' }, TOOLS.map(t => h('a', { class: 'tile', href: toolHref(t.id), 'data-cat': t.cat, style: { '--tint': `var(--${t.tint})` } }, ico(t.id, 30), h('h3', {}, t.name), h('p', {}, t.desc))));
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter tools' }, CATS.map(([id, label], k) => h('button', { class: 'chip' + (k === 0 ? ' on' : ''), 'aria-pressed': String(k === 0), onclick: e => {
    chips.querySelectorAll('.chip').forEach(c => { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
    e.currentTarget.classList.add('on'); e.currentTarget.setAttribute('aria-pressed', 'true');
    grid.querySelectorAll('.tile').forEach(t => { t.hidden = id !== 'all' && t.dataset.cat !== id; });
  } }, label)));
  const tools = h('section', { class: 'wrap section', id: 'sec-tools' }, h('h2', {}, 'Pick a tool'), chips, grid);

  const privacy = h('section', { class: 'wrap section', id: 'sec-privacy' }, h('div', { class: 'split' },
    h('div', {}, h('h2', {}, 'There is no server to upload to'),
      h('p', { class: 'sub' }, 'PDF Toolkit is a static website. The code that merges, splits and converts your files is downloaded once, then runs on your own device. Nothing about your documents is sent anywhere, so there is nothing to store, leak or delete later.'),
      h('p', { class: 'sub' }, 'Every script and font is served from this site, and a security policy stops the page from contacting anyone else. Your PDFs cannot be sent anywhere.')),
    h('ol', { class: 'steps' },
      h('li', {}, h('div', {}, h('strong', {}, 'Open your browser tools'), h('span', {}, 'Press F12, or right-click the page and choose Inspect.'))),
      h('li', {}, h('div', {}, h('strong', {}, 'Go to the Network tab'), h('span', {}, 'It lists every request the page makes.'))),
      h('li', {}, h('div', {}, h('strong', {}, 'Run any tool'), h('span', {}, 'Watch the list. Your file is never uploaded.'))))));

  const soon = h('section', { class: 'wrap section', id: 'sec-soon' }, h('h2', {}, 'Not here yet'),
    h('p', { class: 'sub' }, 'These need more than a browser can do well for free, so they are left out for now instead of working badly.'),
    h('div', { class: 'soon' },
      h('div', {}, h('h3', {}, 'PDF and Word'), h('p', {}, 'Good conversion needs a full office engine running on a server.')),
      h('div', {}, h('h3', {}, 'Password protection'), h('p', {}, 'Needs an encryption library that is safe to run in the browser.')),
      h('div', {}, h('h3', {}, 'OCR for scanned PDFs'), h('p', {}, 'Works in the browser, but needs a large language download and is slow on long files.'))));

  const faq = (q, a) => h('details', { class: 'faq' }, h('summary', {}, q), h('p', {}, a));
  const faqs = h('section', { class: 'wrap section', id: 'sec-faq' }, h('h2', {}, 'Questions'), h('div', { class: 'faqs' },
    faq('Is it really free?', 'Yes. There are no accounts, limits or watermarks. Because your own device does the work, running the site costs almost nothing.'),
    faq('Are my files uploaded anywhere?', 'No. Files are opened and processed in your browser tab. When you close the tab, they are gone.'),
    faq('How big can my files be?', 'Your device sets the limit. Files up to around 100 MB usually work. Phones and older computers may struggle with anything larger.'),
    faq('Why can I not select text after compressing?', 'The strongest compression turns pages into images. Choose "Optimize only" to keep text, though that saves less space.'),
    faq('Can I open password-protected PDFs?', 'Not yet. Remove the password in the app you used to create the file, then try again.'),
    faq('Does it work on my phone?', 'Yes, in any modern browser. Large files may be slow on older phones.')));

  return h('main', { id: 'main' }, hero, tools, privacy, soon, faqs);
}

function renderTool(t) {
  setTitle(() => I18N.get() === 'en' ? t.title : I18N.t(t.name) + ' | PDF Toolkit');
  const body = h('div', { class: 'tool-body' });
  const info = h('section', { class: 'tool-info' },
    h('h2', {}, 'How to use this tool'),
    h('ol', { class: 'steps' }, t.steps.map(step => h('li', {}, h('div', {}, h('strong', {}, step))))),
    h('h2', {}, 'Good to know'),
    h('h3', {}, t.faq.q), h('p', { class: 'sub' }, t.faq.a));
  const view = h('main', { class: 'wrap tool', id: 'main' },
    h('a', { class: 'back', href: homeHref() }, ico('back', 18), 'All tools'),
    h('nav', { class: 'toolnav', 'aria-label': 'Tools' }, TOOLS.map(x => h('a', { class: 'chip' + (x.id === t.id ? ' on' : ''), href: toolHref(x.id), 'aria-current': x.id === t.id ? 'page' : null }, x.name))),
    h('h1', {}, t.h1), h('p', { class: 'lede small' }, t.sub),
    h('p', { class: 'privacy-note' }, ico('lock', 16), 'Runs in your browser. Files are never uploaded.'),
    body, info);
  t.mount(body);
  return view;
}

function route() {
  if (state.task) state.task.cancelled = true;
  const rel = relPath(location.pathname);
  const tool = TOOLS.find(t => t.id === rel);
  const section = location.hash.replace(/^#\/?/, '');
  const app = $('#app');
  if (!libsReady()) {
    app.replaceChildren(h('div', { class: 'banner', role: 'alert' }, 'The PDF libraries could not be loaded. Check your internet connection and reload the page.'), header(), tool ? renderTool(tool) : renderHome());
  } else {
    app.replaceChildren(header(), tool ? renderTool(tool) : renderHome(), footer());
  }
  updateInstall();
  if (!tool && SECTIONS.includes(section)) requestAnimationFrame(() => scrollToSection(section)); else window.scrollTo(0, 0);
}

/* Install as an app (Chrome, Edge, Android) */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); state.install = e; updateInstall(); });
window.addEventListener('appinstalled', () => { state.install = null; updateInstall(); });

/* Offline support */
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(BASE_PATH + 'sw.js', { scope: BASE_PATH }).catch(() => { /* not critical */ });
  });
}

/* Start: theme, language, first render */
try { const t = localStorage.getItem('pdftk-theme'); if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t); } catch (_) { /* storage may be unavailable */ }
let startLang = 'en';
try { startLang = localStorage.getItem('pdftk-lang') || ''; } catch (_) { /* storage may be unavailable */ }
if (!startLang) startLang = (navigator.languages || [navigator.language || '']).some(l => /^(fil|tl)\b/i.test(l)) ? 'fil' : 'en';
I18N.onChange(() => {
  if (state.titleFn) document.title = state.titleFn();
  const old = $('.langbtn'); if (old) old.replaceWith(langButton());
});
I18N.start(startLang);
route();
window.__pdftk = { TOOLS };
})();
