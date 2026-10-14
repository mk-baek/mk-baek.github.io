// Fetch link previews (title, description, image, site name) for Library items
// and save them in content/library-previews.json, so the site never calls other
// websites while it is built or viewed. No API key; it reads each page's public
// Open Graph / meta tags, the same data a chat app uses for a link preview.
//
//   npm run library:previews            fetch previews for links that don't have one yet
//   npm run library:previews -- --all   refresh every link
//
// Anything you write in the Library item itself (title, publisher, image) wins over the preview.
import fs from 'node:fs';
import path from 'node:path';

const CACHE = path.join('content', 'library-previews.json');
const refreshAll = process.argv.includes('--all');
const dirs = ['content/library', 'drafts/library'];

const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};

const urls = new Set();
for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    const m = text.match(/^url:\s*["']?([^"'\s]+)["']?\s*$/m);
    if (m) urls.add(m[1]);
  }
}

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();

function meta(html, ...names) {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`,
      'i',
    );
    const m = html.match(re);
    const v = m && (m[1] ?? m[2]);
    if (v) return decode(v);
  }
  return undefined;
}

async function preview(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (link preview for mk-baek.github.io)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('html')) return { title: decodeURIComponent(path.basename(new URL(url).pathname)) };
  const html = (await res.text()).slice(0, 400_000);
  const title = meta(html, 'og:title', 'twitter:title') ?? decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '');
  let image = meta(html, 'og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src');
  if (image) image = new URL(image, res.url).href;
  if (image && !image.startsWith('https://')) image = undefined; // only secure images on an https site
  return {
    title: title || undefined,
    description: meta(html, 'og:description', 'twitter:description', 'description'),
    image,
    siteName: meta(html, 'og:site_name', 'application-name'),
  };
}

let fetched = 0;
let failed = 0;
for (const url of urls) {
  if (cache[url] && !refreshAll) continue;
  try {
    const p = await preview(url);
    cache[url] = { ...p, fetchedAt: new Date().toISOString().slice(0, 10) };
    fetched++;
    console.log(`✓ ${url}\n  ${p.title ?? '(no title)'}`);
  } catch (err) {
    failed++;
    console.warn(`✗ ${url}\n  ${err.message} — the card will use what you wrote in the Library file and a generated image.`);
  }
}

// keep only links that still exist in the Library
for (const url of Object.keys(cache)) if (!urls.has(url)) delete cache[url];

const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(CACHE, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`\nPreviews: ${fetched} fetched, ${failed} failed, ${Object.keys(sorted).length} saved in ${CACHE}.`);
