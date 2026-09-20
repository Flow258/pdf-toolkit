/* Text for every tool. This file is the single source of truth: the app reads it
   in the browser, and tools/build.cjs reads it to generate the per-tool pages. */
(function (root) {
  var data = [
    {
      id: 'merge', cat: 'organize', tint: 'sky', name: 'Merge PDF',
      desc: 'Combine several PDFs into one file, in any order.',
      h1: 'Merge PDF files', sub: 'Join PDFs into a single document. Drag files to set the order.',
      title: 'Merge PDF files online: free and private | PDF Toolkit',
      metaDescription: 'Combine several PDFs into one file for free. Drag to reorder. No upload and no sign-up: everything runs in your browser.',
      steps: ['Choose or drop two or more PDF files.', 'Drag the files into the order you want.', 'Click Merge PDFs and download the result.'],
      faq: { q: 'Is there a limit on how many PDFs I can merge?', a: 'There is no fixed limit. The practical limit is your device memory, so very large batches may be slow on phones.' }
    },
    {
      id: 'split', cat: 'organize', tint: 'sky', name: 'Split PDF',
      desc: 'Cut a PDF into separate files by page, range or size.',
      h1: 'Split a PDF', sub: 'Split into single pages, custom ranges or equal parts. Multiple files download as a ZIP.',
      title: 'Split a PDF into pages or ranges: free and private | PDF Toolkit',
      metaDescription: 'Split a PDF into single pages, page ranges or equal parts for free. Files stay on your device and download as a ZIP.',
      steps: ['Choose or drop a PDF file.', 'Pick how to split: every page, custom ranges, or every N pages.', 'Click Split PDF. Several files download together as a ZIP.'],
      faq: { q: 'Can I split a PDF by page ranges?', a: 'Yes. Choose Page ranges and type something like 1-3, 4-6, 9. Each range becomes its own PDF.' }
    },
    {
      id: 'extract', cat: 'organize', tint: 'sky', name: 'Extract pages',
      desc: 'Pick the pages you need and save them as a new PDF.',
      h1: 'Extract pages from a PDF', sub: 'Click the pages you want to keep. They are saved in their original order.',
      title: 'Extract pages from a PDF: free and private | PDF Toolkit',
      metaDescription: 'Pick pages from a PDF and save them as a new file. Free, no upload, and it works right in your browser.',
      steps: ['Choose or drop a PDF file.', 'Click the pages you want to keep, or type page numbers such as 1-3, 7.', 'Click Extract pages and download your new PDF.'],
      faq: { q: 'Are the pages kept in their original order?', a: 'Yes. Extracted pages are saved in the same order as in the original file. Use Reorder pages afterwards to change it.' }
    },
    {
      id: 'delete', cat: 'organize', tint: 'sky', name: 'Delete pages',
      desc: 'Remove the pages you do not want.',
      h1: 'Delete pages from a PDF', sub: 'Click the pages to remove, then save the rest as a new PDF.',
      title: 'Delete pages from a PDF: free and private | PDF Toolkit',
      metaDescription: 'Remove unwanted pages from a PDF for free. Your file never leaves your device.',
      steps: ['Choose or drop a PDF file.', 'Click each page you want to remove. Removed pages are marked in red.', 'Click Delete pages and download the rest as a new PDF.'],
      faq: { q: 'Does deleting pages change my original file?', a: 'No. Your original file is never modified. You get a new PDF without the removed pages.' }
    },
    {
      id: 'reorder', cat: 'organize', tint: 'sky', name: 'Reorder pages',
      desc: 'Drag pages into the order you want.',
      h1: 'Reorder PDF pages', sub: 'Drag pages to a new position. On touch screens, use the arrow buttons.',
      title: 'Reorder PDF pages by dragging: free and private | PDF Toolkit',
      metaDescription: 'Rearrange the pages of a PDF by dragging thumbnails. Free, with no upload and no sign-up.',
      steps: ['Choose or drop a PDF file.', 'Drag pages into a new order, or use the arrow buttons on each page.', 'Click Save new order and download the result.'],
      faq: { q: 'Can I reorder pages on my phone?', a: 'Yes. Dragging is for mouse and trackpad, so on a touch screen use the arrow buttons under each page.' }
    },
    {
      id: 'rotate', cat: 'organize', tint: 'sky', name: 'Rotate PDF',
      desc: 'Turn sideways or upside-down pages the right way up.',
      h1: 'Rotate PDF pages', sub: 'Rotate single pages or the whole document.',
      title: 'Rotate PDF pages: free and private | PDF Toolkit',
      metaDescription: 'Rotate one page or a whole PDF and save the result. Free, and your file stays on your device.',
      steps: ['Choose or drop a PDF file.', 'Use the arrows under a page to rotate it, or rotate every page at once.', 'Click Save rotated PDF and download the result.'],
      faq: { q: 'Can I rotate only some pages?', a: 'Yes. Each page has its own rotate buttons, so you can turn just the pages that need it.' }
    },
    {
      id: 'images-to-pdf', cat: 'convert', tint: 'mint', name: 'Images to PDF',
      desc: 'Turn JPG, PNG and WebP pictures into one PDF.',
      h1: 'Convert images to PDF', sub: 'Choose page size and margins, then put the images in order.',
      title: 'Convert JPG, PNG and WebP images to PDF: free | PDF Toolkit',
      metaDescription: 'Turn photos and images into one PDF for free. Choose page size and margins. Nothing is uploaded.',
      steps: ['Choose or drop your images: JPG, PNG, WebP, GIF or BMP.', 'Put them in order and choose the page size and margin.', 'Click Create PDF and download it.'],
      faq: { q: 'Will my photos come out sideways?', a: 'No. Phone photos that store their rotation in EXIF data are turned the right way up automatically.' }
    },
    {
      id: 'pdf-to-images', cat: 'convert', tint: 'mint', name: 'PDF to images',
      desc: 'Save each page as a PNG, JPG or WebP picture.',
      h1: 'Convert PDF to images', sub: 'Pick a format and resolution. Several images download as a ZIP.',
      title: 'Convert PDF to PNG, JPG or WebP images: free | PDF Toolkit',
      metaDescription: 'Save PDF pages as PNG, JPG or WebP images for free. Choose the resolution and pages. Runs in your browser.',
      steps: ['Choose or drop a PDF file.', 'Pick PNG, JPG or WebP, a resolution, and which pages to convert.', 'Click Convert to images. Several images download together as a ZIP.'],
      faq: { q: 'Which resolution should I choose?', a: 'Standard (150) suits most screens and email. Choose Print (300) for sharp printing, but expect larger files.' }
    },
    {
      id: 'watermark', cat: 'edit', tint: 'lilac', name: 'Add watermark',
      desc: 'Stamp text or a logo across your pages.',
      h1: 'Add a watermark to a PDF', sub: 'Use text or an image. Set position, size, opacity and rotation.',
      title: 'Add a text or image watermark to a PDF: free | PDF Toolkit',
      metaDescription: 'Stamp text or a logo on every page of a PDF. Live preview, free, and your file never leaves your device.',
      steps: ['Choose or drop a PDF file.', 'Enter text or choose an image, then set position, size, opacity and rotation.', 'Click Add watermark and download the result.'],
      faq: { q: 'Can a watermark be removed afterwards?', a: 'It is drawn onto each page, but someone with PDF editing tools may still be able to remove it. Do not rely on it for security.' }
    },
    {
      id: 'compress', cat: 'edit', tint: 'lilac', name: 'Compress PDF',
      desc: 'Make a PDF smaller for email and uploads.',
      h1: 'Compress a PDF', sub: 'Shrink scanned or image-heavy PDFs by lowering image quality.',
      title: 'Compress a PDF to a smaller size: free and private | PDF Toolkit',
      metaDescription: 'Make a PDF smaller for email and uploads. Free, private, and it runs in your browser with no upload.',
      steps: ['Choose or drop a PDF file.', 'Pick a method and level. Reduce image quality gives the biggest savings.', 'Click Compress PDF and compare the sizes before you download.'],
      faq: { q: 'Will compressing change how my PDF looks?', a: 'With Reduce image quality, pages become lower-resolution images, so fine detail may soften and text can no longer be selected. Optimize only changes nothing you can see.' }
    }
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.PDFTK_TOOLS_META = data;
})(typeof window !== 'undefined' ? window : globalThis);
