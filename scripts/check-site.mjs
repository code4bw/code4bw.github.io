import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const temp = path.join(project, 'Temp');
await mkdir(temp, { recursive: true });
for (const key of ['TEMP', 'TMP', 'TMPDIR']) process.env[key] = temp;
const root = path.join(project, 'docs');
const origin = 'https://code4bw.github.io/';
const failures = [];
const pages = new Map();
const assets = new Set();
const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const decode = text => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const fail = (file, message) => failures.push(`${file}: ${message}`);

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) { fail(filename, 'Symlinks are not supported'); continue; }
    if (entry.isDirectory()) await collect(filename);
    else {
      const relative = path.relative(root, filename).split(path.sep).join('/');
      assets.add(relative);
      if (entry.name.endsWith('.html')) {
        const source = await readFile(filename, 'utf8');
        const clean = source.replace(/<!--[\s\S]*?-->/g, '');
        const tags = [...clean.matchAll(/<\/?([a-z][\w-]*)\b([^>]*?)>/gi)].map(match => {
          const attributes = Object.fromEntries([...match[2].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(a => [a[1].toLowerCase(), decode(a[2] ?? a[3])]));
          return { name: match[1].toLowerCase(), closing: match[0].startsWith('</'), selfClosing: match[0].endsWith('/>'), attributes };
        });
        pages.set(relative, { source, clean, tags, ids: new Set(tags.map(t => t.attributes.id).filter(Boolean)) });
      }
    }
  }
}
await collect(root);

function checkLink(file, value) {
  if (/^(mailto:|tel:|data:)/i.test(value)) return;
  let url;
  try { url = new URL(value, new URL(file, origin)); } catch { fail(file, `Invalid URL ${value}`); return; }
  if (url.origin !== new URL(origin).origin) {
    if (!['https:', 'http:'].includes(url.protocol)) fail(file, `Unsupported URL ${value}`);
    return;
  }
  const target = decodeURIComponent(url.pathname).replace(/^\//, '').replace(/\/$/, '/index.html') || 'index.html';
  if (!assets.has(target)) { fail(file, `Missing target ${value}`); return; }
  if (url.hash && pages.has(target) && !pages.get(target).ids.has(decodeURIComponent(url.hash.slice(1)))) fail(file, `Missing fragment ${value}`);
}

const articles = [];
const indexable = [];
for (const [file, page] of pages) {
  const { source, clean, tags } = page;
  const open = tags.filter(t => !t.closing);
  const meta = key => open.find(t => t.name === 'meta' && (t.attributes.name === key || t.attributes.property === key))?.attributes.content;
  const canonical = open.find(t => t.name === 'link' && t.attributes.rel === 'canonical')?.attributes.href;
  if (!/^<!doctype html>/i.test(source)) fail(file, 'Missing HTML doctype');
  if (!open.some(t => t.name === 'html' && t.attributes.lang === 'ko')) fail(file, 'Missing Korean document language');
  if (!/<title>[^<]+<\/title>/.test(source)) fail(file, 'Missing title');
  if (!meta('description')) fail(file, 'Missing description');
  if (meta('author') !== 'CODE4BW') fail(file, 'Use the public nickname as author');
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(clean)) fail(file, 'Personal email addresses must not be published');
  if (!meta('viewport')) fail(file, 'Missing viewport');
  if (open.filter(t => t.name === 'h1').length !== 1) fail(file, 'Expected one h1');
  if (!open.some(t => t.name === 'main' && t.attributes.id === 'main')) fail(file, 'Missing main landmark');
  if (canonical !== origin + (file === 'index.html' ? '' : file)) fail(file, 'Canonical URL does not match filename');
  if (new Set(open.map(t => t.attributes.id).filter(Boolean)).size !== open.filter(t => t.attributes.id).length) fail(file, 'Duplicate id');

  // These hand-authored pages use explicit closing tags; catch accidental nesting damage.
  const stack = [];
  for (const tag of tags) {
    if (voidTags.has(tag.name) || tag.selfClosing) continue;
    if (tag.closing) {
      if (stack.pop() !== tag.name) fail(file, `Mismatched closing tag </${tag.name}>`);
    } else stack.push(tag.name);
  }
  if (stack.length) fail(file, `Unclosed tags: ${stack.join(', ')}`);
  for (const tag of open) {
    for (const attr of ['href', 'src']) {
      const value = tag.attributes[attr];
      if (!value) continue;
      checkLink(file, value);
      if (/^(mailto:|tel:)/i.test(value)) fail(file, 'Personal contact links must not be published');
      if (/themes\/custom|3rdwavemedia|\.md(?:$|[#?])/i.test(value)) fail(file, `Legacy theme or Markdown link: ${value}`);
    }
    if (tag.name === 'img' && !tag.attributes.alt?.trim()) fail(file, 'Image needs alt text');
    if (Object.keys(tag.attributes).some(a => /^on\w+$/i.test(a))) fail(file, 'Inline event handler');
  }
  if (!meta('robots')?.includes('noindex')) indexable.push(file);
  if (meta('og:type') === 'article') {
    articles.push(file);
    const structured = clean.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    try {
      const data = JSON.parse(structured?.[1] || '');
      if (data['@type'] !== 'BlogPosting' || !data.headline || !data.datePublished || !data.dateModified) fail(file, 'Incomplete article structured data');
      if (data.author?.name !== 'CODE4BW') fail(file, 'Use the public nickname in article structured data');
    } catch { fail(file, 'Invalid article structured data'); }
  }
}
for (const asset of assets) {
  if (/\.(md|py|zip|map)$/.test(asset) || /(^|\/)(content|themes|Temp|drafts)(\/|$)/i.test(asset)) fail(asset, 'Non-public source in docs');
  if (asset.endsWith('.css')) {
    const css = await readFile(path.join(root, asset), 'utf8');
    for (const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) checkLink(asset, match[1]);
  }
}
if (!assets.has('.nojekyll')) fail('docs', 'Missing .nojekyll');
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
const feed = await readFile(path.join(root, 'feeds/all.atom.xml'), 'utf8');
if (!/<author>\s*<name>CODE4BW<\/name>\s*<\/author>/.test(feed)) fail('feeds/all.atom.xml', 'Use the public nickname as feed author');
const home = pages.get('index.html').clean;
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => decode(m[1]));
for (const url of sitemapUrls) checkLink('sitemap.xml', url);
for (const file of indexable) if (!sitemapUrls.includes(origin + (file === 'index.html' ? '' : file))) fail(file, 'Missing sitemap entry');
for (const url of sitemapUrls) {
  const file = url.slice(origin.length) || 'index.html';
  if (!indexable.includes(file)) fail(file, 'Non-indexable page in sitemap');
}
const feedEntries = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => m[1]);
for (const entry of feedEntries) {
  const link = entry.match(/<link\s+href="([^"]+)"/);
  if (!link) fail('feeds/all.atom.xml', 'Entry needs a link');
  else checkLink('feeds/all.atom.xml', decode(link[1]));
}
for (const file of articles) {
  if (!home.includes(`href="${file}" data-entry`)) fail(file, 'Missing searchable home entry');
  if (!feedEntries.some(entry => entry.includes(`href="${origin}${file}"`))) fail(file, 'Missing feed entry');
}
const robots = await readFile(path.join(root, 'robots.txt'), 'utf8');
if (!robots.includes(`Sitemap: ${origin}sitemap.xml`)) fail('robots.txt', 'Missing sitemap URL');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`PASS: ${pages.size} HTML pages, ${articles.length} articles, ${assets.size - pages.size} assets. Local links, fragments, metadata, sitemap, feed, and deployment boundary checked.`);
