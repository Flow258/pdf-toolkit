# PDF Toolkit

Free PDF tools that run entirely in the browser. Nothing is uploaded: there is no backend, no database and no accounts, so hosting costs nothing.

**Tools:** Merge, Split, Extract pages, Delete pages, Reorder pages, Rotate, Images to PDF, PDF to images, Add watermark, Compress.

## Run it locally

Any static file server works. From this folder:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>. (Opening `index.html` by double-clicking may work, but some browsers block features on `file://` URLs, so use a server.)

No build step, no `npm install`. Everything the site needs is in this folder.

## Deploy for free

The whole site is static files, so pick any host:

| Host | Steps |
|---|---|
| **Cloudflare Pages** (recommended) | Create a Pages project, choose "Direct Upload", and drag this folder in. Or connect a GitHub repo with build command left empty and output directory `/`. |
| **GitHub Pages** | Push this folder to a repo, then Settings, Pages, deploy from the `main` branch root. |
| **Netlify** | Drag this folder onto app.netlify.com/drop. |

`_headers` is read by Cloudflare Pages and Netlify. GitHub Pages ignores it, but `index.html` contains the same Content-Security-Policy as a `<meta>` tag, so the protection still applies.

## Project structure

```text
pdf-toolkit/
├── index.html          Page shell and Content-Security-Policy
├── css/style.css       All styles (light and dark themes, design tokens at the top of :root)
├── js/app.js           All application code (see "How the code is organized")
├── vendor/             Third-party libraries, bundled so the site works offline
│   ├── pdf-lib.min.js        pdf-lib 1.17.1   (create and edit PDFs)
│   ├── pdf.min.js            PDF.js 3.11.174  (render pages and thumbnails)
│   ├── pdf.worker.min.js     PDF.js worker
│   ├── jszip.min.js          JSZip 3.10.1     (ZIP downloads)
│   ├── cmaps/                PDF.js character maps for CJK documents
│   └── licenses/
├── fonts/              Bricolage Grotesque and Figtree (SIL Open Font License)
├── _headers            Security headers for Cloudflare Pages / Netlify
└── robots.txt
```

## Privacy by design

The Content-Security-Policy sets `connect-src 'self'`, and every script and font is served from your own site. The browser therefore refuses to send data to any other server, so uploaded PDFs cannot leave the device even if a bug or a compromised dependency tried to. If you later add analytics or ads, you must loosen this policy on purpose, and you should update the privacy text in `js/app.js` to match.

To check it yourself: open the browser developer tools, go to the Network tab, and run any tool. No file is sent anywhere.

## How the code is organized

`js/app.js` is a single file with clearly marked sections:

1. **Helpers**: DOM builder `h()`, icons, toasts, saving files, page-range parsing.
2. **Libraries**: loading PDFs with PDF.js (for viewing) and pdf-lib (for editing), page rendering, ZIP creation, lazy thumbnails, drag-and-drop sorting.
3. **UI components**: dropzone, segmented controls, progress bar with cancel, result card, and `pdfTool()`, the shared "pick a PDF, then edit" flow.
4. **Page grid**: the thumbnail grid used by Extract, Delete, Rotate and Reorder.
5. **Tools**: one function per tool (`toolMerge`, `toolSplit`, `toolSelect`, `toolRotate`, `toolReorder`, `toolImagesToPdf`, `toolPdfToImages`, `toolCompress`, `toolWatermark`).
6. **Registry and pages**: the `TOOLS` list, home page, tool page, and hash-based routing (`#/merge`, `#/split`, ...).

### Add a new tool

1. Write `function toolMyThing(root) { ... }`. For a single-PDF tool, wrap your UI in `pdfTool(root, (item, reset) => { ... })`. `item.doc` is the PDF.js document, `item.bytes` are the raw bytes, and `libDoc(item)` gives you a pdf-lib document to edit.
2. Use `withProgress(host, async task => { ... })` for the work and `showResult(root, {...})` to show the download.
3. Add an entry to the `TOOLS` array with an `id`, `name`, `cat`, `tint`, `desc`, `h1`, `sub` and `mount`.
4. Add an icon with the same `id` to `ICONS`.

## Known limits

- **Compress** works by re-drawing pages as JPEG images. That gives large savings on scans and photos, but text can no longer be selected. "Optimize only" keeps text but saves little.
- **Password-protected PDFs** are rejected with a message. pdf-lib cannot edit encrypted files.
- **Watermark text** uses the standard PDF fonts, so it supports Latin letters, numbers and common symbols but not other scripts.
- **Large files** are limited by the device. Around 100 MB is usually fine; phones may struggle above that.
- **Not included:** PDF and Word conversion, adding a password, and OCR. These need a server or a large download to work well.

## Ideas for next steps

- A donation link (Ko-fi, Buy Me a Coffee, GitHub Sponsors) in the footer in `js/app.js`.
- One page per tool with its own title and description for search engines.
- Filipino translation.
- Add a service worker to make the site installable as an app.

## Licenses

The application code is yours to license as you wish. Bundled third-party software keeps its own license:

- pdf-lib: MIT
- PDF.js: Apache 2.0
- JSZip: MIT or GPLv3 (dual-licensed)
- Bricolage Grotesque, Figtree: SIL Open Font License 1.1

The license texts are in `vendor/licenses/` and `fonts/`.
