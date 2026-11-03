import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import { parse } from 'yaml';
import { checkSite } from './check-site.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const temp = path.join(project, 'Temp');
await mkdir(temp, { recursive: true });
for (const key of ['TEMP', 'TMP', 'TMPDIR']) process.env[key] = temp;
const origin = 'https://code4bw.github.io/';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const render = (template, values) => template.replace(/\{\{([a-z_]+)\}\}/g, (_, key) => {
  if (!(key in values)) throw new Error(`Unknown template field: ${key}`);
  return String(values[key]);
});
const tagId = tag => `tag-${Buffer.from(tag).toString('hex')}`;
const displayDate = date => date.slice(0, 10).replaceAll('-', '.');
const timestamp = date => `${date.slice(0, 10)}T${date.slice(11, 16) || '00:00'}:00+09:00`;
const slugPattern = /^[a-z0-9][a-z0-9_-]*$/;
const readText = async filename => (await readFile(filename, 'utf8')).replaceAll('\r\n', '\n');

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Source symlinks are not supported: ${filename}`);
    if (entry.isDirectory()) result.push(...await files(filename));
    else result.push(filename);
  }
  return result.sort();
}

async function readSource(filename) {
  const source = await readText(filename);
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`Missing YAML front matter: ${filename}`);
  const metadata = parse(match[1]);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error(`Invalid metadata: ${filename}`);
  return { ...Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key.toLowerCase(), value])), body: match[2], source: filename };
}

function validateDate(value, source) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?$/.test(value)) throw new Error(`Invalid date in ${source}`);
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || !Number.isFinite(Date.parse(timestamp(value)))) throw new Error(`Invalid date in ${source}`);
}

function normalizeArticle(item, topics) {
  if (item.status !== 'published' && item.status !== 'draft') throw new Error(`Use Status: published or draft in ${item.source}`);
  if (item.status === 'draft') return null;
  if (!item.title || !item.summary || !item.body.trim() || !slugPattern.test(item.slug || '')) throw new Error(`Published articles need a title, summary, body and unique ASCII slug: ${item.source}`);
  if (item.authors && item.authors !== 'CODE4BW') throw new Error(`Use Authors: CODE4BW in ${item.source}`);
  validateDate(item.date, item.source);
  item.modified ||= item.date;
  validateDate(item.modified, item.source);
  item.tags ||= [];
  item.topics ||= [];
  if (!Array.isArray(item.tags) || !item.tags.every(tag => typeof tag === 'string') || !Array.isArray(item.topics) || !item.topics.every(id => topics.some(topic => topic.id === id))) throw new Error(`Invalid tags or Topics in ${item.source}`);
  if (item.category !== 'BLOGPOST' && item.category !== 'PROJECT') throw new Error(`Use Category: BLOGPOST or PROJECT in ${item.source}`);
  return { ...item, file: `${item.slug}.html`, kind: item.category === 'PROJECT' ? 'project' : 'post', excerpt: item.excerpt || item.summary };
}

function renderArticle(item, sourceRoot, articlesBySource) {
  const md = new MarkdownIt({ linkify: true });
  const imageRenderer = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, index, options, env, self) => {
    if (tokens[index].children?.length) return imageRenderer(tokens, index, options, env, self);
    tokens[index].attrSet('alt', `${item.title} 관련 이미지`);
    return self.renderToken(tokens, index, options);
  };
  const tokens = md.parse(item.body, {});
  const headings = tokens.filter(token => token.type === 'heading_open');
  const baseLevel = headings.length ? Math.min(...headings.map(token => Number(token.tag.slice(1)))) : 2;
  const toc = [];
  let section = 0;
  const localUrl = href => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) return href;
    const url = new URL(href, `https://content.local/${path.relative(sourceRoot, item.source).split(path.sep).map(encodeURIComponent).join('/')}`);
    const relative = decodeURIComponent(url.pathname).slice(1);
    if (relative.endsWith('.md')) {
      const target = articlesBySource.get(path.resolve(sourceRoot, relative));
      if (!target) throw new Error(`Link to missing or unpublished article: ${href} in ${item.source}`);
      return target.file + url.search + url.hash;
    }
    if (relative.startsWith('assets/')) return relative + url.search + url.hash;
    return href;
  };
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === 'heading_open' || token.type === 'heading_close') {
      token.tag = `h${Math.min(6, Math.max(2, Number(token.tag.slice(1)) - baseLevel + 2))}`;
      if (token.type === 'heading_open') {
        token.attrSet('id', `section-${++section}`);
        if (token.tag === 'h2') toc.push(`<a href="#section-${section}">${escape(tokens[index + 1].content)}</a>`);
      }
    }
    for (const child of token.children || []) {
      if (child.type === 'image') {
        child.attrSet('src', localUrl(child.attrGet('src')));
        child.attrSet('loading', 'lazy');
        child.attrSet('decoding', 'async');
      }
      if (child.type === 'link_open') child.attrSet('href', localUrl(child.attrGet('href')));
    }
  }
  const plainText = tokens.filter(token => ['inline', 'fence', 'code_block'].includes(token.type)).map(token => token.type === 'inline'
    ? (token.children || []).filter(child => ['text', 'code_inline'].includes(child.type)).map(child => child.content).join(' ')
    : token.content).join(' ');
  return { ...item, html: md.renderer.render(tokens, md.options, {}), toc: toc.join(''), minutes: Math.max(1, Math.round(plainText.length / 500)) };
}

function row(item) {
  return `<a class="entry-row" href="${item.file}" data-entry data-category="${item.kind}"><div><div class="entry-type">${item.kind === 'project' ? '프로젝트' : '개발 노트'} <span aria-hidden="true">/</span> ${item.tags.filter(tag => tag !== 'POST').map(escape).join(' · ')}</div><h3>${escape(item.title)}</h3><p>${escape(item.excerpt)}</p><div class="entry-meta"><time datetime="${item.date.slice(0, 10)}">${displayDate(item.date)}</time><span>${item.minutes}분 읽기</span></div></div><span class="entry-arrow" aria-hidden="true">↗</span></a>`;
}

function articleHead(item) {
  const data = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: item.title, description: item.summary, datePublished: timestamp(item.date), dateModified: timestamp(item.modified), inLanguage: 'ko', author: { '@type': 'Person', name: 'CODE4BW', url: origin + 'about.html' }, mainEntityOfPage: origin + item.file };
  if (item.image) data.image = new URL(item.image, origin).href;
  return `<meta property="article:published_time" content="${timestamp(item.date)}"><meta property="article:modified_time" content="${timestamp(item.modified)}"><script type="application/ld+json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`;
}

export async function buildSite(root = project, { check = false } = {}) {
  const sourceRoot = path.join(root, 'content');
  const topics = JSON.parse(await readFile(path.join(sourceRoot, 'topics.json'), 'utf8'));
  if (!Array.isArray(topics) || !topics.every(topic => slugPattern.test(topic.id) && topic.title && topic.label) || new Set(topics.map(topic => topic.id)).size !== topics.length) throw new Error('Invalid content/topics.json');
  const layout = await readText(path.join(root, 'templates/layout.html'));
  const articleTemplate = await readText(path.join(root, 'templates/article.html'));
  const records = [];
  for (const filename of await files(sourceRoot)) if (filename.endsWith('.md')) {
    const record = normalizeArticle(await readSource(filename), topics);
    if (record) records.push(record);
  }
  const bySource = new Map(records.map(item => [item.source, item]));
  const articles = records.map(item => renderArticle(item, sourceRoot, bySource)).sort((a, b) => b.date.localeCompare(a.date) || a.file.localeCompare(b.file));
  const output = new Map();
  const indexable = [];
  function put(filename, value) {
    if (output.has(filename)) throw new Error(`Duplicate output path: ${filename}`);
    output.set(filename, Buffer.isBuffer(value) ? value : Buffer.from(value.trim() + '\n'));
  }
  function page(item, body, active = 'logs') {
    const canonical = origin + (item.file === 'index.html' ? '' : item.file);
    const head = `<meta name="twitter:card" content="${item.image ? 'summary_large_image' : 'summary'}">` +
      (item.image ? `<meta property="og:image" content="${escape(new URL(item.image, origin).href)}">` : '') +
      (item.noindex ? '<meta name="robots" content="noindex, follow">' : '') + (item.kind ? articleHead(item) : '');
    const navigation = [['logs', 'index.html', '기록'], ['projects', 'portfolio.html', '프로젝트'], ['topics', 'topics.html', '주제'], ['about', 'about.html', '소개']].map(([key, file, label]) => `<a href="${file}"${key === active ? ' aria-current="page"' : ''}>${label}</a>`).join('');
    let html = render(layout, { title: escape(item.title), description: escape(item.summary), canonical, type: item.kind ? 'article' : 'website', head, navigation, body });
    if (item.file === '404.html') html = html.replace(/(href|src)="(?![a-z]+:|\/|#)([^"]+)"/gi, '$1="/$2"');
    put(item.file, html);
    if (!item.noindex) indexable.push({ file: item.file, modified: item.kind ? item.modified : null });
  }
  for (const item of articles) {
    const parentName = item.kind === 'project' ? '프로젝트' : '기록';
    page(item, render(articleTemplate, {
      parent_url: item.kind === 'project' ? 'portfolio.html' : 'index.html', parent_name: parentName,
      eyebrow: item.kind === 'project' ? 'PROJECT NOTES' : escape(topics.find(topic => topic.id === item.topics[0])?.label || 'DEVELOPMENT NOTE'),
      title: escape(item.title), description: escape(item.summary), date: item.date.slice(0, 10), display_date: displayDate(item.date), modified: displayDate(item.modified), minutes: item.minutes,
      tags: item.tags.filter(tag => tag !== 'POST').map(tag => `<a href="tags.html#${tagId(tag)}">#${escape(tag)}</a>`).join(''), body: item.html, toc: item.toc,
    }), item.kind === 'project' ? 'projects' : 'logs');
  }
  const projects = articles.filter(item => item.kind === 'project');
  const featured = articles.find(item => item.kind === 'post') || articles[0];
  const featuredHtml = featured ? `<a class="featured${featured.image ? '' : ' featured-text'}" href="${featured.file}"><div class="featured-copy"><span class="entry-type">${featured.kind === 'post' ? 'DEVELOPMENT NOTE' : 'PROJECT NOTE'}</span><h3>${escape(featured.title)}</h3><p>${escape(featured.excerpt)}</p><div class="entry-meta"><time datetime="${featured.date.slice(0, 10)}">${displayDate(featured.date)}</time><span>${featured.minutes}분 읽기 ↗</span></div></div>${featured.image ? `<div class="featured-image"><img src="${escape(featured.image.replace(/^\//, ''))}" loading="lazy" alt="${escape(featured.title)} 관련 이미지"></div>` : ''}</a>` : '';
  const projectHtml = projects.map((item, index) => `<a class="project-card" href="${item.file}">${item.image ? `<div class="project-cover"><img src="${escape(item.image.replace(/^\//, ''))}" alt="${escape(item.title)} 화면" loading="lazy"></div>` : ''}<div class="project-card-copy"><div class="entry-type">PROJECT ${String(index + 1).padStart(2, '0')} <span aria-hidden="true">/</span> ${item.tags.map(escape).join(' · ')}</div><h2>${escape(item.title)}</h2><p>${escape(item.excerpt)}</p><div class="entry-meta"><time datetime="${item.date.slice(0, 10)}">${displayDate(item.date)}</time><span>과정 살펴보기 ↗</span></div></div></a>`).join('');
  const topicHtml = topics.map(topic => {
    const items = articles.filter(item => item.topics.includes(topic.id));
    return `<section class="topic-card" id="${topic.id}"><div class="eyebrow">${escape(topic.label)}</div><h2>${escape(topic.title)}</h2><span class="mono">${String(items.length).padStart(2, '0')} RECORDS</span><ul>${items.map(item => `<li><a href="${item.file}">${escape(item.title)} ↗</a></li>`).join('')}</ul></section>`;
  }).join('');
  const tags = [...new Set(articles.flatMap(item => item.tags).filter(tag => tag !== 'POST'))].sort();
  const tagHtml = tags.map(tag => `<section class="topic-card" id="${tagId(tag)}"><h2>#${escape(tag)}</h2><ul>${articles.filter(item => item.tags.includes(tag)).map(item => `<li><a href="${item.file}">${escape(item.title)} ↗</a></li>`).join('')}</ul></section>`).join('');
  for (const filename of await files(path.join(sourceRoot, 'pages'))) {
    if (!filename.endsWith('.html')) throw new Error(`Page sources must be HTML: ${filename}`);
    const item = await readSource(filename);
    item.file = path.basename(filename);
    if (!slugPattern.test(item.file.slice(0, -5)) || !item.title || !item.summary) throw new Error(`Invalid page metadata: ${filename}`);
    page(item, render(item.body, { featured: featuredHtml, entries: articles.map(row).join('\n'), projects: projectHtml, topics: item.file === 'tags.html' ? tagHtml : topicHtml, record_count: String(articles.length).padStart(2, '0'), post_count: String(articles.length - projects.length).padStart(2, '0'), project_count: String(projects.length).padStart(2, '0') }), item.nav);
  }
  const sitemap = indexable.map(({ file, modified }) => `<url><loc>${origin}${file === 'index.html' ? '' : file}</loc>${modified ? `<lastmod>${modified.slice(0, 10)}</lastmod>` : ''}</url>`).join('');
  put('sitemap.xml', `<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap}</urlset>`);
  const latest = articles.map(item => timestamp(item.modified)).sort().at(-1) || '1970-01-01T00:00:00+09:00';
  const entries = articles.map(item => `<entry><title>${escape(item.title)}</title><id>${origin}${item.file}</id><link href="${origin}${item.file}"/><published>${timestamp(item.date)}</published><updated>${timestamp(item.modified)}</updated><summary>${escape(item.excerpt)}</summary></entry>`).join('');
  put('feeds/all.atom.xml', `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>CODE4BW · Engineering Logs</title><id>${origin}</id><updated>${latest}</updated><link href="${origin}"/><link href="${origin}feeds/all.atom.xml" rel="self"/><author><name>CODE4BW</name></author>${entries}</feed>`);
  put('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${origin}sitemap.xml`);
  put('.nojekyll', Buffer.alloc(0));

  // Only copy assets reached by generated pages or another referenced stylesheet.
  const pending = [];
  const assetUrl = (href, from) => {
    const url = new URL(href, new URL(from, origin));
    if (url.origin === new URL(origin).origin && url.pathname.startsWith('/assets/')) pending.push(decodeURIComponent(url.pathname).slice(1));
  };
  for (const [file, data] of output) if (file.endsWith('.html')) {
    const html = data.toString();
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) assetUrl(match[1], file);
    for (const match of html.matchAll(/<meta property="og:image" content="([^"]+)">/g)) assetUrl(match[1], file);
  }
  const assetRoot = path.join(sourceRoot, 'assets');
  while (pending.length) {
    const file = pending.shift();
    if (output.has(file)) continue;
    const filename = path.resolve(sourceRoot, file);
    if (!filename.startsWith(assetRoot + path.sep) || (await lstat(filename)).isSymbolicLink()) throw new Error(`Invalid asset path: ${file}`);
    let data = await readFile(filename);
    if (/\.(css|js|svg|txt|xml)$/i.test(file)) data = Buffer.from(data.toString().replaceAll('\r\n', '\n'));
    put(file, data);
    if (file.endsWith('.css')) for (const match of data.toString().matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) assetUrl(match[1], file);
  }
  const working = await mkdtemp(path.join(temp, 'blog-build-'));
  const staged = path.join(working, 'docs');
  let preserveRecovery = false;
  try {
    for (const [filename, data] of output) {
      const target = path.join(staged, filename);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, data);
    }
    const result = await checkSite(staged);
    const target = path.join(root, 'docs');
    if (check) {
      const existing = await files(target);
      const expected = [...output.keys()].sort();
      const actual = existing.map(file => path.relative(target, file).split(path.sep).join('/')).sort();
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('docs/ file list is stale. Run node scripts/build.mjs');
      for (const [file, data] of output) if (!(await readFile(path.join(target, file))).equals(data)) throw new Error(`${file} is stale. Run node scripts/build.mjs`);
    } else {
      const previous = path.join(working, 'previous');
      let moved = false;
      try { await rename(target, previous); moved = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
      try { await rename(staged, target); } catch (error) {
        if (moved) {
          preserveRecovery = true;
          try { await rename(previous, target); preserveRecovery = false; }
          catch { throw new Error(`Could not restore docs/. Previous output preserved at ${previous}`, { cause: error }); }
        }
        throw error;
      }
    }
    return { ...result, generated: output.size };
  } finally {
    if (!path.resolve(working).startsWith(temp + path.sep)) throw new Error('Temporary output escaped project Temp/');
    if (!preserveRecovery) await rm(working, { recursive: true, force: true });
  }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: node scripts/build.mjs [--check]');
    const result = await buildSite(project, { check: process.argv.includes('--check') });
    console.log(`PASS: ${result.generated} files from content/; ${result.articles} published articles. ${process.argv.includes('--check') ? 'docs/ is up to date.' : 'Updated docs/.'}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
