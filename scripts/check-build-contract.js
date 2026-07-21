#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  console.error(`❌ Build contract check failed: ${message}`);
  process.exit(1);
}

const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};

if (pkg.main !== 'docs/index.md') {
  fail('package.json main must identify the canonical docs entry page.');
}

if (scripts.build !== 'bundle exec jekyll build --source docs --destination docs/_site') {
  fail('package.json scripts.build must build only docs through Bundler.');
}

if (scripts['build:safe'] !== 'npm run build') {
  fail('package.json scripts.build:safe must remain a compatibility alias for scripts.build.');
}

const pagesWorkflow = read('.github/workflows/pages.yml')
  .replace(/\\\r?\n\s*/g, ' ')
  .replace(/\s+/g, ' ');
if (!pagesWorkflow.includes('npm run build -- --baseurl')) {
  fail('Pages must use the docs-only npm build entry point and add only the base URL.');
}

if (pagesWorkflow.includes('bundle exec jekyll build --source docs')) {
  fail('Pages must not bypass the npm build entry point.');
}

if (scripts.start !== 'bundle exec jekyll serve --source docs --destination docs/_site --livereload') {
  fail('package.json scripts.start must serve only the canonical docs surface.');
}

if (scripts.deploy !== 'gh-pages -d docs/_site') {
  fail('package.json scripts.deploy must publish the canonical docs build output.');
}

const claude = read('CLAUDE.md');
const readme = read('README.md');
for (const [name, content] of [['CLAUDE.md', claude], ['README.md', readme]]) {
  if (!content.includes('npm run build') || !content.includes('Gemfile.lock')) {
    fail(`${name} must document the Bundler-managed npm build entry point.`);
  }
}

if (!/bundle(?: _[^_]+_)? install/.test(readme)) {
  fail('README.md must install the locked Ruby dependencies before the local build.');
}

if (claude.includes('Safe build with bundle exec')) {
  fail('CLAUDE.md still describes build:safe as a separate production build.');
}

console.log('✅ Build scripts, Pages workflow, and development documentation share the Bundler-managed entry point.');
