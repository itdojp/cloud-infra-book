#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  console.error(`❌ Navigation contract check failed: ${message}`);
  process.exit(1);
}

const expectedPaths = [
  '/introduction/',
  ...Array.from({ length: 11 }, (_, index) => `/chapter-chapter${String(index + 1).padStart(2, '0')}/`),
  '/concept-map/',
  '/appendices/',
];

const navigation = read('docs/_data/navigation.yml');
const actualPaths = [...navigation.matchAll(/^\s*path:\s*(\S+)\s*$/gm)].map((match) => match[1]);

if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
  fail(`docs navigation order differs: expected ${JSON.stringify(expectedPaths)}, got ${JSON.stringify(actualPaths)}`);
}

for (const route of expectedPaths) {
  const indexPath = path.join(root, 'docs', route.slice(1), 'index.md');
  if (!fs.existsSync(indexPath)) {
    fail(`navigation route has no source page: ${route}`);
  }
}

const sidebar = read('docs/_includes/sidebar-nav.html');
const pageNavigation = read('docs/_includes/page-navigation.html');

if (!sidebar.includes('site.data.navigation')) {
  fail('sidebar must derive its links from docs navigation data.');
}

for (const section of ['introduction', 'chapters', 'resources', 'appendices']) {
  if (!sidebar.includes(`navigation.${section}`)) {
    fail(`sidebar does not render navigation.${section}.`);
  }
  if (!pageNavigation.includes(`navigation.${section}`)) {
    fail(`previous/next navigation does not include navigation.${section}.`);
  }
}

for (const [name, content] of [['sidebar', sidebar], ['previous/next navigation', pageNavigation]]) {
  if (/\/src\/(?:chapter-[1-6]|introduction\/preface|appendices\/)/.test(content)) {
    fail(`${name} still contains a legacy root-build route.`);
  }
}

for (const removedSurface of ['_config.yml', '_includes', '_layouts', 'assets']) {
  if (fs.existsSync(path.join(root, removedSurface))) {
    fail(`unsupported root Jekyll surface still exists: ${removedSurface}`);
  }
}

console.log(`✅ Docs-only navigation contract passed (${expectedPaths.length} ordered routes).`);
