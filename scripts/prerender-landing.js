// Bakes the actual rendered Landing page into web-build/index.html at
// build time, so a crawler's first fetch sees the real headline, category
// list and FAQ text instead of the empty <div id="root"></div> a
// client-only React bundle leaves for anyone who doesn't execute JS.
//
// This is prerendering, not a hand-written duplicate: it drives a real
// headless Chromium against the actual built app and captures whatever it
// renders, so the crawlable copy can never drift out of sync with what a
// visitor sees — a hand-copied summary of the landing page would.
//
// Landing (App.js's linking config: Landing -> '') is the only route this
// makes sense for. Everything else needs a signed-in session or is one
// specific activity/post/profile pulled from the database — prerendering
// those means generating one file per row at build time, which isn't
// worth doing yet at this little content (see web/sitemap.xml's comment).
//
// Deliberately not `react-snap` or similar: this project has exactly one
// route to prerender, so a ~40-line script is less surface area than a
// dependency built for crawling a whole route tree.

const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

const WEB_BUILD = path.resolve(__dirname, '..', 'web-build');
const PORT = 4173;

function serveStatic() {
  const mimeTypes = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf',
    '.woff': 'font/woff', '.woff2': 'font/woff2',
  };
  const server = http.createServer((req, res) => {
    const reqPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(WEB_BUILD, reqPath === '/' ? 'index.html' : reqPath);
    if (!filePath.startsWith(WEB_BUILD)) { res.writeHead(403); return res.end(); }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

async function main() {
  const server = await serveStatic();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // GitHub Actions runners give /dev/shm far less space than Chromium
      // expects by default, which crashes the browser on launch or mid-page
      // rather than failing with an obviously-related message. This is the
      // single most common reason Puppeteer works locally and dies in CI.
      '--disable-dev-shm-usage',
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0', timeout: 60000 });

    // The headline text is the simplest signal the app actually mounted —
    // simpler than depending on a specific DOM structure, since
    // react-native-web renders every Text/View as a plain <div>.
    await page.waitForFunction(
      () => document.body.innerText.includes('worth doing'),
      { timeout: 30000 }
    );

    // Category cards and FAQ entries fade in via scroll-linked Animated
    // values (opacity/transform, not display:none — so the text is already
    // in the DOM either way) — scrolling through settles them at their
    // final visible state, so the frozen snapshot doesn't show a page
    // full of invisible sections to a visitor whose JS hasn't loaded yet.
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y <= pageHeight; y += 400) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
      await new Promise((r) => setTimeout(r, 60));
    }
    await new Promise((r) => setTimeout(r, 300));

    // Only #root's own content — not documentElement.outerHTML. The app
    // mounts React Navigation, which overwrites document.title per route
    // (App.js's documentTitle.formatter) to "Spurth - Jump In. Connect.";
    // capturing the whole document would permanently bake that runtime
    // mutation over the hand-tuned SEO/OG <title> and description this
    // file already has, for every crawler including ones that never run
    // JS. Splicing only the rendered markup into the original, untouched
    // <head> avoids that entirely rather than fixing it meta-tag by
    // meta-tag.
    const rootHtml = await page.evaluate(() => document.getElementById('root').innerHTML);

    if (errors.length) {
      throw new Error(`Landing page threw while prerendering:\n${errors.join('\n')}`);
    }
    if (!rootHtml.includes('worth doing') || !rootHtml.includes('Is Spurth free to use')) {
      throw new Error('Prerendered HTML is missing expected landing copy — refusing to overwrite index.html with a broken snapshot.');
    }

    const indexPath = path.join(WEB_BUILD, 'index.html');
    const original = fs.readFileSync(indexPath, 'utf8');
    const marker = '<div id="root"></div>';
    if (!original.includes(marker)) {
      throw new Error(`Expected to find an empty ${marker} in web-build/index.html to fill in — the build output's shape may have changed.`);
    }
    const merged = original.replace(marker, `<div id="root">${rootHtml}</div>`);

    fs.writeFileSync(indexPath, merged);
    console.log('Prerendered Landing page into web-build/index.html (%d bytes added)', rootHtml.length);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  // Deliberately exits 0, not 1: index.html is only overwritten after the
  // rendered content is validated (see the checks above), so a launch
  // crash or timeout here always leaves the plain, pre-prerender build
  // output in place — worse for crawlers than the prerendered version, but
  // exactly what shipped before this script existed. Blocking the entire
  // deploy (robots.txt, sitemap, App Links, the actual site) on a headless
  // Chromium quirk in this one CI environment would trade a bigger, more
  // urgent problem for a smaller one.
  console.error('Prerender failed — shipping the plain (non-prerendered) build instead:', err);
});
