/**
 * Fold `expo export --platform web` into one self-contained HTML file.
 *
 *   npx expo export --platform web
 *   node scripts/build-web-page.mjs [outfile]
 *
 * The result has no external requests at all, so it can be opened from a file,
 * dropped on any static host, or added to an iPhone home screen where it runs
 * full screen with its own icon.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const out = process.argv[2] ?? 'dist/golf-notebook.html';

const indexPath = path.join(DIST, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('No dist/index.html — run `npx expo export --platform web` first.');
  process.exit(1);
}

const html = fs.readFileSync(indexPath, 'utf8');
const scriptSrc = html.match(/<script src="([^"]+)"/)?.[1];
if (!scriptSrc) {
  console.error('Could not find the bundle reference in dist/index.html.');
  process.exit(1);
}

const bundlePath = path.join(DIST, scriptSrc.replace(/^\//, ''));
const bundle = fs.readFileSync(bundlePath, 'utf8');

// A literal </script> anywhere in the bundle would close the tag early.
const safeBundle = bundle.replace(/<\/script/gi, '<\\/script');

const PAPER = '#F4EFE1';
const INK = '#1F2A23';
const FLAG = '#C2412D';

const page = `<style>
  html, body { height: 100%; margin: 0; background: ${PAPER}; }
  body { overflow: hidden; overscroll-behavior: none; }
  #root { display: flex; height: 100%; flex: 1; }
</style>

<div id="root"></div>

<script>
  // The page is served inside a wrapper we do not control, so the tags that
  // make an iPhone treat this as an app are added here instead of in <head>.
  // Safari reads them when you tap Share -> Add to Home Screen.
  (function () {
    var meta = function (attr, name, content) {
      var existing = document.querySelector('meta[' + attr + '="' + name + '"]');
      if (existing) { existing.setAttribute('content', content); return; }
      var el = document.createElement('meta');
      el.setAttribute(attr, name);
      el.setAttribute('content', content);
      document.head.appendChild(el);
    };

    if (!document.title) document.title = 'Golf Notebook';

    meta('name', 'viewport', 'width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no');
    meta('name', 'apple-mobile-web-app-capable', 'yes');
    meta('name', 'mobile-web-app-capable', 'yes');
    meta('name', 'apple-mobile-web-app-title', 'Golf Notebook');
    meta('name', 'apple-mobile-web-app-status-bar-style', 'default');
    meta('name', 'theme-color', '${PAPER}');

    // Home screen icon: a flag on the green, drawn to match the app itself.
    try {
      var size = 180;
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      var g = canvas.getContext('2d');
      g.fillStyle = '${PAPER}';
      g.fillRect(0, 0, size, size);
      g.fillStyle = '#CDE6A4';
      g.beginPath();
      g.arc(size / 2, size / 2 + 12, 62, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '${INK}';
      g.beginPath();
      g.arc(size / 2, size * 0.63, 9, 0, Math.PI * 2);
      g.fill();
      g.fillRect(size / 2 - 2, size * 0.24, 4, size * 0.4);
      g.fillStyle = '${FLAG}';
      g.beginPath();
      g.moveTo(size / 2 + 2, size * 0.24);
      g.lineTo(size * 0.74, size * 0.31);
      g.lineTo(size / 2 + 2, size * 0.38);
      g.closePath();
      g.fill();

      var href = canvas.toDataURL('image/png');
      ['apple-touch-icon', 'icon'].forEach(function (rel) {
        var link = document.createElement('link');
        link.setAttribute('rel', rel);
        link.setAttribute('href', href);
        document.head.appendChild(link);
      });
    } catch (e) {
      // An icon is a nicety; never block the app over it.
    }
  })();
</script>

<script>
${safeBundle}
</script>
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log(`${out} — ${(Buffer.byteLength(page) / 1024).toFixed(0)} KB, no external requests`);
