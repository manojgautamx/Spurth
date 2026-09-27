// Generates spurth.com/blog at deploy time: a list page and one page per
// published post, straight from the API — no client-side React involved, so
// a crawler's first fetch sees the real content, and each page can carry its
// own genuine <title>/description/og:image (nothing else on the site has
// that; even the real screens all share one static tag set in web/index.html).
//
// This mirrors the directory-as-pretty-URL trick deploy-pages.yml's "Add
// legal pages" step already uses for /terms and /privacy — web-build/blog/
// index.html and web-build/blog/<slug>/index.html are real files, not routes
// handled by the React app.
//
// Deliberately NOT modeled on scripts/prerender-landing.js's "exit 0 either
// way" philosophy, even though the two scripts look similar. That one only
// ever edits an EXISTING, already-complete index.html in place, so a failure
// leaves a fine (just non-prerendered) page shipping. This one generates a
// whole subtree from scratch every run, and a GitHub Pages deploy is a FULL
// ARTIFACT REPLACEMENT, not an incremental sync — if the API is unreachable
// and this script silently produced nothing, the deploy would ship with
// web-build/blog/ empty, deleting every already-published post from the live
// site instead of just failing to add a new one. So any fetch/parse failure
// here throws and exits non-zero, failing the whole build job before
// actions/upload-pages-artifact runs — the currently-live site is untouched
// until the next successful run (or a manual workflow_dispatch re-run).
// Zero published posts is NOT a failure; it's a valid empty list page.

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.BLOG_API_BASE_URL || 'https://api.spurth.com';
const SITE = 'https://spurth.com';
const WEB_BUILD = path.resolve(__dirname, '..', 'web-build');
const WEB = path.resolve(__dirname, '..', 'web');
const BLOG_DIR = path.join(WEB_BUILD, 'blog');
const DEFAULT_OG_IMAGE = `${SITE}/og-image.png`;

function readTemplate(name) {
  return fs.readFileSync(path.join(WEB, name), 'utf8');
}

// A small {{TOKEN}} replace is enough for three short templates — no
// templating library exists anywhere else in this repo, and adding one for
// this alone isn't worth it.
function render(template, tokens) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in tokens)) throw new Error(`build-blog: template references unknown token {{${key}}}`);
    return tokens[key];
  });
}

// Templates set raw HTML via tokens (BODY_HTML, COVER_IMG, COVER_HERO) on
// purpose — but anything going into an attribute or text position (titles,
// excerpts, author names, which come from the database) must be escaped, or
// a post whose title happens to contain e.g. `&` or `"` would break the page.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// BlogPosting structured data — every field comes from the same `post`
// object already fetched, no extra requests. author/publisher are
// Organization, not Person: author_name is unconditionally "Spurth" (see
// BlogPostSerializer.get_author_name), never a real account's name.
// publisher.logo is a nested ImageObject on purpose — Google's own
// guidance wants that specific shape there, unlike the plain-string `image`
// field above it.
function buildArticleJsonLd(post, canonicalUrl, ogImage) {
  const json = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: descriptionFor(post),
    image: ogImage,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: { '@type': 'Organization', name: 'Spurth', url: SITE },
    publisher: {
      '@type': 'Organization',
      name: 'Spurth',
      logo: { '@type': 'ImageObject', url: `${SITE}/favicon.png` },
    },
    mainEntityOfPage: canonicalUrl,
  });
  // `<` escaped so a title/excerpt containing a literal "</script>" (however
  // unlikely from a trusted admin) can never break out of the tag.
  const escaped = json.replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${escaped}</script>`;
}

// A short, plain-text fallback meta description for a post with no excerpt —
// strips the tags body_html already carries rather than re-deriving from raw
// markdown (which this script never sees; BlogPostSerializer never exposes it).
function descriptionFor(post) {
  if (post.excerpt) return post.excerpt;
  const text = post.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 200 ? text.slice(0, 197) + '...' : text;
}

async function fetchAllPosts() {
  const posts = [];
  let url = `${API_BASE}/api/blog-posts/?page_size=50`;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`build-blog: GET ${url} -> ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    posts.push(...data.results);
    url = data.next;
  }
  return posts;
}

function updateSitemap(posts) {
  const sitemapPath = path.join(WEB_BUILD, 'sitemap.xml');
  let xml = fs.readFileSync(sitemapPath, 'utf8');
  const urls = [
    `  <url>\n    <loc>${SITE}/blog/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`,
    // <lastmod> from the real updated_at column — Google doesn't treat this
    // as a ranking signal, but does trust it for recrawl scheduling as long
    // as it's accurate, which this is. Not added to the 5 hand-maintained
    // static URLs above/below (no per-page timestamp tracked for those).
    ...posts.map(
      (post) =>
        `  <url>\n    <loc>${SITE}/blog/${post.slug}/</loc>\n    <lastmod>${post.updated_at}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`
    ),
  ].join('');
  xml = xml.replace('</urlset>', urls + '</urlset>');
  fs.writeFileSync(sitemapPath, xml);
}

async function main() {
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  fs.copyFileSync(path.join(WEB, 'blog.css'), path.join(BLOG_DIR, 'blog.css'));

  const posts = await fetchAllPosts();

  const listTemplate = readTemplate('blog-list.template.html');
  const cardTemplate = readTemplate('blog-card.template.html');
  const postTemplate = readTemplate('blog-post.template.html');

  const cards = posts
    .map((post) =>
      render(cardTemplate, {
        SLUG: post.slug,
        TITLE: escapeHtml(post.title),
        EXCERPT: escapeHtml(descriptionFor(post)),
        PUBLISHED_DATE: formatDate(post.published_at),
        COVER_IMG: post.cover_image_url
          ? `<img class="cover" src="${escapeHtml(post.cover_image_url)}" alt="" loading="lazy" />`
          : '',
      })
    )
    .join('\n');

  fs.writeFileSync(
    path.join(BLOG_DIR, 'index.html'),
    render(listTemplate, {
      TITLE: 'Blog — Spurth',
      DESCRIPTION: 'Notes from the Spurth team on finding people to do things with.',
      CANONICAL: `${SITE}/blog/`,
      OG_IMAGE: DEFAULT_OG_IMAGE,
      CARDS: cards || '<p class="empty">Nothing published yet — check back soon.</p>',
    })
  );

  for (const post of posts) {
    const dir = path.join(BLOG_DIR, post.slug);
    const canonicalUrl = `${SITE}/blog/${post.slug}/`;
    const ogImage = post.og_image_url || DEFAULT_OG_IMAGE;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'index.html'),
      render(postTemplate, {
        TITLE: `${escapeHtml(post.title)} — Spurth Blog`,
        ARTICLE_TITLE: escapeHtml(post.title),
        DESCRIPTION: escapeHtml(descriptionFor(post)),
        CANONICAL: canonicalUrl,
        OG_IMAGE: ogImage,
        PUBLISHED_TIME: post.published_at,
        PUBLISHED_DATE: formatDate(post.published_at),
        AUTHOR_NAME: escapeHtml(post.author_name || 'Spurth'),
        AUTHOR_URL: SITE,
        JSON_LD: buildArticleJsonLd(post, canonicalUrl, ogImage),
        // The article's own hero uses the uncropped original (whatever its
        // native aspect ratio) — cover_image_url is the list page's
        // consistently-cropped thumbnail, a different shape on purpose.
        COVER_HERO: post.cover_image_full_url
          ? `<img class="cover-hero" src="${escapeHtml(post.cover_image_full_url)}" alt="" />`
          : '',
        // Not escaped: body_html is server-rendered markdown, meant to be
        // real HTML in the page. The only author is the trusted admin
        // account (see api/serializers.py's BlogPostSerializer comment) —
        // there's no untrusted-input path here to sanitize against.
        BODY_HTML: post.body_html,
      })
    );
  }

  updateSitemap(posts);

  console.log(`Built ${posts.length} blog page(s): ${posts.map((p) => p.slug).join(', ') || '(none)'}`);
}

main().catch((err) => {
  console.error('build-blog failed:', err);
  process.exit(1);
});
