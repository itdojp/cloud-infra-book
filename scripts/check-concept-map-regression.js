#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TMP_PARENT = path.join(ROOT, '.codex-local', 'tmp');
fs.mkdirSync(TMP_PARENT, { recursive: true });
const suiteRoot = fs.mkdtempSync(path.join(TMP_PARENT, 'concept-map-regression-'));
const checker = path.join(ROOT, 'scripts', 'check-concept-map.js');

function shouldCopy(source) {
  const parts = path.resolve(source).split(path.sep);
  return !parts.includes('_site') && !parts.includes('.jekyll-cache');
}

if (shouldCopy(path.join(ROOT, 'docs', '_site'))
  || shouldCopy(path.join(ROOT, 'docs', '.jekyll-cache'))
  || shouldCopy(path.join(ROOT, 'docs', '_site', 'index.html'))) {
  throw new Error('build artifact copy filter must reject directory entries and descendants');
}

function copyBaseline(target) {
  fs.mkdirSync(target, { recursive: true });
  for (const relativePath of ['book-config.json', 'package.json', 'src', 'docs']) {
    fs.cpSync(path.join(ROOT, relativePath), path.join(target, relativePath), {
      recursive: true,
      filter: shouldCopy,
    });
  }
}

function mutateText(root, relativePath, needle, replacement) {
  const file = path.join(root, relativePath);
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) throw new Error(relativePath + ': fixture needle missing: ' + needle);
  fs.writeFileSync(file, text.replace(needle, replacement || ''));
}

const cases = [
  ['concept map gate disconnected from npm test', (root) => {
    const file = path.join(root, 'package.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.scripts.test = data.scripts.test.replace('npm run check:concept-map && ', '');
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }],
  ['missing flag', (root) => {
    const file = path.join(root, 'book-config.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.ux.modules.conceptMap = false;
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }],
  ['missing source page', (root) => fs.rmSync(path.join(root, 'src/concept-map'), { recursive: true })],
  ['missing public route', (root) => fs.rmSync(path.join(root, 'docs/concept-map'), { recursive: true })],
  ['missing top route', (root) => mutateText(root, 'docs/index.md', '(concept-map/)', '(regression/)')],
  ['missing navigation route', (root) => mutateText(root, 'docs/_data/navigation.yml', 'path: /concept-map/', 'path: /regression/')],
  ['missing asset', (root) => fs.rmSync(path.join(root, 'docs/assets/images/diagrams/introduction/cloud-infra-mindmap.svg'))],
  ['missing accessibility metadata', (root) => mutateText(root, 'docs/assets/images/diagrams/introduction/cloud-infra-mindmap.svg', '<desc>', '<metadata>')],
  ['missing direct chapter link', (root) => mutateText(root, 'docs/concept-map/index.md', '../chapter-chapter01/index.md', '../regression/index.md')],
  ['source/public mismatch', (root) => mutateText(root, 'src/concept-map/index.md', '図の代替説明', '代替説明')],
  ['duplicate inline page navigation', (root) => fs.appendFileSync(
    path.join(root, 'docs/concept-map/index.md'),
    '\n{% include page-navigation.html %}\n',
  )],
];

try {
  let passed = 0;
  for (const [name, mutate] of cases) {
    const fixture = path.join(suiteRoot, 'case-' + passed);
    copyBaseline(fixture);
    mutate(fixture);
    const result = spawnSync(process.execPath, [checker, '--root', fixture], { encoding: 'utf8' });
    if (result.status === 0) throw new Error(name + ': checker unexpectedly passed');
    passed += 1;
  }
  console.log('Concept map negative regression passed: ' + passed + '/' + cases.length + '.');
} finally {
  fs.rmSync(suiteRoot, { recursive: true, force: true });
  try {
    if (fs.readdirSync(TMP_PARENT).length === 0) fs.rmdirSync(TMP_PARENT);
    const local = path.dirname(TMP_PARENT);
    if (fs.existsSync(local) && fs.readdirSync(local).length === 0) fs.rmdirSync(local);
  } catch (_) {}
}
