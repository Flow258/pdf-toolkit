# PDF Toolkit

Free PDF tools that run entirely in the browser. Nothing is uploaded: there is no backend, no database and no accounts, so hosting costs nothing.

**Tools:** Merge, Split, Extract pages, Delete pages, Reorder pages, Rotate, Images to PDF, PDF to images, Add watermark, Compress.

**Also included:** a real page and address for every tool (good for search engines), English and Filipino, dark mode, and an installable app that works offline.

## Run it locally

Any static file server works. From this folder:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>. Use a server rather than double-clicking `index.html`: the offline app and clean URLs need `http://`.

No `npm install`. Everything the site needs is in this folder.

## Deploy for free

The whole site is static files, so pick any host:

| Host | Steps |
|---|---|
| **Cloudflare Pages** (recommended) | Create a Pages project, choose "Direct Upload", and drag this folder in. Or connect a GitHub repo, leave the build command empty and set the output directory to `/`. |
| **GitHub Pages** | Push this folder to a repo, then Settings, Pages, deploy from the `main` branch root. It also works as a project site under `/repo-name/`. |
| **Netlify** | Drag this folder onto app.netlify.com/drop. |

`_headers` is read by Cloudflare Pages and Netlify. GitHub Pages ignores it, but every page also carries the same Content-Security-Policy as a `<meta>` tag, so the protection still applies.

## Set up after you deploy

1. **Donation link.** Open `js/config.js`, paste your Ko-fi, Buy Me a Coffee or GitHub Sponsors URL into `supportUrl`, and a "Support this project" link appears in the footer. Leave it empty to hide it.
2. **Search engines.** Once you know your address, run the build script with it:
   ```bash
   node tools/build.cjs https://your-domain.com
   ```
   This adds canonical URLs, `sitemap.xml` and a `Sitemap:` line in `robots.txt`. Submit the sitemap in Google Search Console and Bing Webmaster Tools.
3. **Colors and branding.** Design tokens are at the top of `css/style.css`. The icons in `icons/` are plain PNGs you can replace with your own.

## Project structure

```text
pdf-toolkit/
├── index.html                 Home page (generated)
├── merge/ split/ extract/ delete/ reorder/ rotate/
│   images-to-pdf/ pdf-to-images/ watermark/ compress/
│   └── index.html             One page per tool (generated)
├── css/style.css              All styles, light and dark themes
├── js/
│   ├── app.js                 Application code
│   ├── tools-meta.js          Names, descriptions, steps and FAQ for every tool
│   ├── config.js              Settings you can edit (donation link)
│   ├── i18n.js                Translation engine
│   └── lang/fil.js            Filipino translation
├── vendor/                    pdf-lib, PDF.js, JSZip (bundled, works offline)
├── fonts/                     Bricolage Grotesque and Figtree
├── icons/                     App icons
├── manifest.webmanifest       Makes the site installable
├── sw.js                      Offline support (generated)
├── tools/build.cjs            Generates the pages and sw.js
├── _headers                   Security headers for Cloudflare Pages / Netlify
└── robots.txt
```

## The build script (optional)

`tools/build.cjs` needs Node 16 or newer and no packages. It regenerates:

- `index.html` and every `<tool>/index.html`, from the text in `js/tools-meta.js`
- `sw.js`, with the current file list and a version derived from the file contents

The generated files are already included, so **you do not need to run it to deploy**. Run it after you change `js/tools-meta.js`, add or remove files, or want SEO output for your domain. If you edit other files without rebuilding, returning visitors still get your changes after one reload.

## Privacy by design

The Content-Security-Policy sets `connect-src 'self'`, and every script and font is served from your own site. The browser therefore refuses to send data to any other server, so PDFs cannot leave the device even if a bug or a compromised dependency tried to. If you later add analytics or ads, you must loosen this policy on purpose (in `_headers`, and it is copied into the pages by `tools/build.cjs`), and you should update the privacy text in `js/app.js` to match.

To check it yourself: open the browser developer tools, go to the Network tab, and run any tool.

## Languages

English is the source. Other languages are added as a file that swaps text at runtime, so the app code never needs changing. Filipino is included, and the button in the header switches between the two. The choice is remembered, and the site starts in Filipino when the browser's language is Filipino or Tagalog.

### Add another language

1. Copy `js/lang/fil.js` to `js/lang/xx.js` and change the code passed to `PDFTK_I18N.register('xx', ...)` and the `name`.
2. Translate the `dict` entries. Each key is the exact English text, and the value is your translation. Text with numbers or names uses the `patterns` list. Change `count()` for phrases like "3 pages".
3. Add `<script src="js/lang/xx.js">` next to the Filipino one in `tools/build.cjs`, run the build, and extend `langButton()` in `js/app.js` to offer the new language (today it toggles between English and Filipino).

Anything without a translation simply shows English. Mark text that must never change (like file names) with `data-notr`.

The Filipino text was written with machine assistance. Please have a native speaker review it, especially the longer sentences. Search-engine pages and page titles stay in English.

## Offline and install

`sw.js` caches the whole site on the first visit, so every tool keeps working with no connection. Chrome, Edge and Android show an "Install app" button in the header; on iPhone use Share, then Add to Home Screen. Pages load from the network first so updates appear, and fall back to the cache when offline.

## How the code is organized

`js/app.js` is one file with marked sections:

1. **Helpers**: DOM builder `h()`, icons, toasts, saving files, page-range parsing.
2. **Libraries**: loading PDFs with PDF.js (viewing) and pdf-lib (editing), page rendering, ZIP creation, lazy thumbnails, drag-and-drop sorting.
3. **UI components**: dropzone, segmented controls, progress bar with cancel, result card, and `pdfTool()`, the shared "pick a PDF, then edit" flow.
4. **Page grid**: the thumbnail grid used by Extract, Delete, Rotate and Reorder.
5. **Tools**: one function per tool (`toolMerge`, `toolSplit`, `toolSelect`, `toolRotate`, `toolReorder`, `toolImagesToPdf`, `toolPdfToImages`, `toolCompress`, `toolWatermark`).
6. **Registry, navigation and pages**: the `MOUNTS` and `TOOLS` lists, real-path routing, home page, tool page.

### Add a new tool

1. Write `function toolMyThing(root) { ... }`. For a single-PDF tool, wrap your UI in `pdfTool(root, (item, reset) => { ... })`. `item.doc` is the PDF.js document, `item.bytes` are the raw bytes, and `libDoc(item)` gives you a pdf-lib document to edit.
2. Use `withProgress(host, async task => { ... })` for the work and `showResult(root, {...})` to show the download.
3. Add the tool's text to `js/tools-meta.js` (`id`, `name`, `cat`, `tint`, `desc`, `h1`, `sub`, `title`, `metaDescription`, `steps`, `faq`).
4. Add it to `MOUNTS` in `js/app.js`, and add an icon with the same `id` to `ICONS`.
5. Add Filipino text for the new strings in `js/lang/fil.js` (optional; English shows until you do).
6. Run `node tools/build.cjs` to create its page.

## Known limits

- **Compress** re-draws pages as JPEG images. That gives large savings on scans and photos, but text can no longer be selected. "Optimize only" keeps text but saves little.
- **Password-protected PDFs** are rejected with a message. pdf-lib cannot edit encrypted files.
- **Watermark text** uses the standard PDF fonts, so it supports Latin letters, numbers and common symbols but not other scripts.
- **Large files** are limited by the device. Around 100 MB is usually fine; phones may struggle above that.
- **Not included:** PDF and Word conversion, adding a password, and OCR. These need a server or a large download to work well.

## Ideas for next steps

- More languages (see "Add another language").
- Per-language search pages with `hreflang` links, if you want Filipino to show up in search too.
- Protect PDF and OCR, if you are happy to ship a larger download.

## Licenses

The application code is yours to license as you wish. Bundled third-party software keeps its own license:

- pdf-lib: MIT
- PDF.js: Apache 2.0
- JSZip: MIT or GPLv3 (dual-licensed)
- Bricolage Grotesque, Figtree: SIL Open Font License 1.1

The license texts are in `vendor/licenses/` and `fonts/`.
