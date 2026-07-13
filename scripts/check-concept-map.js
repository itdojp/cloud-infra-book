#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseRoot(argv) {
  const at = argv.indexOf('--root');
  if (at === -1) return path.resolve(__dirname, '..');
  if (!argv[at + 1]) throw new Error('--root requires a path');
  return path.resolve(argv[at + 1]);
}

const ROOT = parseRoot(process.argv.slice(2));
const errors = [];

function read(relativePath) {
  const file = path.join(ROOT, relativePath);
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    errors.push(relativePath + ': ' + error.message);
    return '';
  }
}

function count(text, needle) {
  return needle ? text.split(needle).length - 1 : 0;
}

function expect(condition, message) {
  if (!condition) errors.push(message);
}

function stripFrontMatter(text) {
  if (!text.startsWith('---\n')) return text;
  const end = text.indexOf('\n---\n', 4);
  return end === -1 ? text : text.slice(end + 5);
}

function normalizedBody(text) {
  return stripFrontMatter(text)
    .replace('https://itdojp.github.io/cloud-infra-book/assets/images/diagrams/introduction/cloud-infra-mindmap.svg', '__CONCEPT_MAP_ASSET__')
    .replace('../assets/images/diagrams/introduction/cloud-infra-mindmap.svg', '__CONCEPT_MAP_ASSET__')
    .replace('https://itdojp.github.io/cloud-infra-book/appendices/', '__APPENDICES_ROUTE__')
    .replace('../appendices/index.md', '__APPENDICES_ROUTE__');
}

function parseJson(relativePath) {
  const text = read(relativePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(relativePath + ': ' + error.message);
    return {};
  }
}

const book = parseJson('book-config.json');
const pkg = parseJson('package.json');
const modules = (((book || {}).ux || {}).modules || {});
expect(modules.conceptMap === true, 'book-config: conceptMap must be true');

const appendices = ((((book || {}).structure || {}).appendices) || []);
const appendixIds = appendices.map((item) => item.id);
expect(
  JSON.stringify(appendixIds) === JSON.stringify(['concept-map', 'appendices']),
  'book-config: structure.appendices must order concept-map before appendices exactly once',
);

const files = {
  source: read('src/concept-map/index.md'),
  public: read('docs/concept-map/index.md'),
  top: read('docs/index.md'),
  nav: read('docs/_data/navigation.yml'),
  asset: read('docs/assets/images/diagrams/introduction/cloud-infra-mindmap.svg'),
  css: read('docs/assets/css/main.css'),
  appendix: read('docs/appendices/index.md'),
};

expect(
  normalizedBody(files.source) === normalizedBody(files.public),
  'concept map: source/public body mismatch',
);
expect(
  !files.source.includes('{% include page-navigation.html %}')
    && !files.public.includes('{% include page-navigation.html %}'),
  'concept map: page navigation must be supplied once by the book layout',
);
expect(count(files.top, '(concept-map/)') === 1, 'docs/index.md: concept-map route must occur once');
expect(count(files.nav, 'path: /concept-map/') === 1, 'navigation: /concept-map/ must occur once');
expect(count(files.nav, 'path: /appendices/') === 1, 'navigation: /appendices/ must occur once');
expect(
  files.nav.indexOf('path: /concept-map/') < files.nav.indexOf('path: /appendices/'),
  'navigation: concept map must immediately precede appendices in reading order',
);
expect(files.public.includes('order: 14'), 'public concept map: order 14 missing');
expect(files.appendix.includes('order: 15'), 'public appendices: order 15 missing');

const bodyMarkers = [
  '責任共有',
  'identity',
  'network',
  'compute',
  'storage',
  '運用',
  '可用性',
  'DR',
  'cost',
  'IaC',
  'automation',
  '図の代替説明',
];
for (const marker of bodyMarkers) {
  expect(files.source.includes(marker), 'source concept map: marker ' + marker + ' missing');
  expect(files.public.includes(marker), 'public concept map: marker ' + marker + ' missing');
}

const targets = [];
for (let index = 1; index <= 11; index += 1) {
  targets.push('../chapter-chapter' + String(index).padStart(2, '0') + '/index.md');
}
for (const target of targets) {
  expect(count(files.source, '](' + target + ')') === 1, 'source concept map: direct link ' + target + ' must occur once');
  expect(count(files.public, '](' + target + ')') === 1, 'public concept map: direct link ' + target + ' must occur once');
}
const appendixUrl = 'https://itdojp.github.io/cloud-infra-book/appendices/';
expect(count(files.source, '](' + appendixUrl + ')') === 1, 'source concept map: appendix direct link must occur once');
expect(count(files.public, '](../appendices/index.md)') === 1, 'public concept map: local appendix direct link must occur once');

const assetUrl = 'https://itdojp.github.io/cloud-infra-book/assets/images/diagrams/introduction/cloud-infra-mindmap.svg';
expect(count(files.source, '](' + assetUrl + ')') === 1, 'source concept map: accessible map image missing');
expect(
  count(files.public, '](../assets/images/diagrams/introduction/cloud-infra-mindmap.svg)') === 1,
  'public concept map: local accessible map image missing',
);
expect(
  files.source.includes('![クラウドインフラ設計・構築ガイドの概念マップ。'),
  'source concept map: descriptive image alt text missing',
);
expect(
  files.asset.includes('<title>クラウドインフラ設計・構築ガイド 概念マップ</title>'),
  'concept map asset: current title missing',
);
expect(
  /<desc>[^<]*(責任共有)[^<]*(identity)[^<]*(network)[^<]*(compute)[^<]*(storage)[^<]*(DR)[^<]*(cost)[^<]*(IaC)[^<]*(automation)[^<]*<\/desc>/.test(files.asset),
  'concept map asset: descriptive relationship metadata is incomplete',
);
expect(count(files.asset, '<title>') === 1, 'concept map asset: title must occur once');
expect(count(files.asset, '<desc>') === 1, 'concept map asset: desc must occur once');
expect(files.asset.includes('クラウドインフラ設計・構築ガイド - 概念マップ'), 'concept map asset: visible current title missing');
expect(
  /\.page-content img,[\s\S]*max-width:\s*100%;[\s\S]*height:\s*auto;/.test(files.css),
  'main CSS: responsive image max-width/height contract missing',
);

const scripts = (pkg && pkg.scripts) || {};
const testSegments = String(scripts.test || '').split(/\s*&&\s*/);
expect(testSegments.includes('npm run check:concept-map'), 'package.json: npm test must execute check:concept-map');
const gate = String(scripts['check:concept-map'] || '');
expect(
  gate.includes('node scripts/check-concept-map.js')
    && gate.includes('node scripts/check-concept-map-regression.js'),
  'package.json: check:concept-map must execute checker and negative regression',
);

if (errors.length > 0) {
  console.error('Concept map check failed:');
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}
console.log('Concept map check passed: source/public route, accessible asset, 12 direct links, and navigation.');
