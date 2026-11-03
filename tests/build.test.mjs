import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from '../scripts/build.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const temp = path.join(project, 'Temp');
await mkdir(temp, { recursive: true });
for (const key of ['TEMP', 'TMP', 'TMPDIR']) process.env[key] = temp;
const text = (root, file) => readFile(path.join(root, file), 'utf8');
const update = (root, file, value) => writeFile(path.join(root, file), value);

async function fixture(t) {
  const root = await mkdtemp(path.join(temp, 'build-test-'));
  t.after(async () => {
    assert.ok(path.resolve(root).startsWith(temp + path.sep));
    await rm(root, { recursive: true, force: true });
  });
  await cp(path.join(project, 'content'), path.join(root, 'content'), { recursive: true });
  await cp(path.join(project, 'templates'), path.join(root, 'templates'), { recursive: true });
  return root;
}

test('generates published pages and deterministic output without draft-only assets', async t => {
  const root = await fixture(t);
  const result = await buildSite(root);
  assert.equal(result.articles, 5);
  assert.equal(result.pages, 12);
  assert.match(await text(root, 'public/index.html'), /NOTES &amp; PROJECTS \/ 05/);
  assert.match(await text(root, 'public/project04.html'), /application\/ld\+json/);
  assert.match(await text(root, 'public/404.html'), /href="\/assets\/site.css"/);
  assert.ok(!(await readdir(path.join(root, 'public/assets/imgs'))).includes('binary_code.png'));
  assert.ok(!(await readdir(path.join(root, 'public'))).includes('computer_data_inst.html'));
  await buildSite(root, { check: true });
});

test('source edits update articles, and a new article updates links, counts, assets, tags and feeds', async t => {
  const root = await fixture(t);
  await buildSite(root);
  const source = 'content/posts/CPU의 구조 및 동작.md';
  const originalOutput = await text(root, 'public/cpu_structure_and_function.html');
  await update(root, source, (await text(root, source)).replace('Title: CPU 구조 및 동작', 'Title: CPU 구조와 동작 원리'));
  await assert.rejects(buildSite(root, { check: true }), /stale/);
  assert.equal(await text(root, 'public/cpu_structure_and_function.html'), originalOutput);
  await update(root, 'content/posts/new.md', `---
Status: published
Title: 새 원본 테스트
Date: 2024-01-01
Modified: 2026-11-03
Category: BLOGPOST
Authors: CODE4BW
Slug: new-source-test
Summary: 새 글을 원본에서 추가합니다.
tags: [새태그]
Topics: [systems]
Image: /assets/imgs/binary_code.png
---
## 원본에서 생성
[기존 글](<CPU의 구조 및 동작.md>)

|항목|값|
|---|---|
|테스트|완료|

\`\`\`python
print("<source>")
\`\`\`
`);
  await buildSite(root);
  const html = await text(root, 'public/new-source-test.html');
  assert.match(html, /href="cpu_structure_and_function.html"/);
  assert.match(html, /id="section-1"/);
  assert.match(html, /&lt;source&gt;/);
  assert.match(html, /<table>/);
  assert.match(await text(root, 'public/index.html'), /NOTES &amp; PROJECTS \/ 06/);
  assert.match(await text(root, 'public/cpu_structure_and_function.html'), /CPU 구조와 동작 원리/);
  assert.match(await text(root, 'public/tags.html'), /새태그/);
  assert.match(await text(root, 'public/feeds/all.atom.xml'), /new-source-test.html/);
  assert.match(await text(root, 'public/sitemap.xml'), /new-source-test.html/);
  assert.deepEqual(await readFile(path.join(root, 'public/assets/imgs/binary_code.png')), await readFile(path.join(root, 'content/assets/imgs/binary_code.png')));
  await buildSite(root, { check: true });
});

test('unpublishing removes the page, project entry, feed entry and unused assets', async t => {
  const root = await fixture(t);
  await buildSite(root);
  const file = 'content/project/project04.md';
  await update(root, file, (await text(root, file)).replace('Status: published', 'Status: draft'));
  await buildSite(root);
  assert.ok(!(await readdir(path.join(root, 'public'))).includes('project04.html'));
  assert.doesNotMatch(await text(root, 'public/index.html'), /href="project04.html"/);
  assert.doesNotMatch(await text(root, 'public/portfolio.html'), /href="project04.html"/);
  assert.doesNotMatch(await text(root, 'public/feeds/all.atom.xml'), /project04.html/);
  assert.ok(!(await readdir(path.join(root, 'public/assets/imgs'))).some(file => file.startsWith('pr04_')));
  assert.ok((await text(root, 'content/project/project04.md')).includes('Status: draft'));
});

test('invalid links, privacy failures, duplicate paths and malformed metadata keep the last valid output', async t => {
  const root = await fixture(t);
  await buildSite(root);
  const source = 'content/project/project04.md';
  const original = await text(root, source);
  const home = await text(root, 'public/index.html');
  for (const [body, expected] of [
    [original + '\n![missing](../assets/imgs/missing.png)\n', /ENOENT/],
    [original + '\n[초안](../posts/컴퓨터가%20다루는%20정보.md)\n', /unpublished/],
    [original + '\ncontact@example.com\n', /email addresses/],
    [original.replace('Slug: project04', 'Slug: ../escape'), /ASCII slug/],
    [original.replace('Slug: project04', 'Slug: index'), /Duplicate output path/],
    [original.replace('Date: 2025-04-28', 'Date: 2025-02-30'), /Invalid date/],
    [original.replace('Authors: CODE4BW', 'Authors: Example Person'), /Authors: CODE4BW/],
  ]) {
    await update(root, source, body);
    await assert.rejects(buildSite(root), expected);
    assert.equal(await text(root, 'public/index.html'), home);
  }
  await update(root, source, original);
  await update(root, 'public/manual-edit.html', '<p>Manual orphan file</p>');
  await assert.rejects(buildSite(root, { check: true }), /file list is stale/);
  await buildSite(root);
  assert.ok(!(await readdir(path.join(root, 'public'))).includes('manual-edit.html'));
});
