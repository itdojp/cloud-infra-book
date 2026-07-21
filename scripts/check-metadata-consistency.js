#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function parseYamlScalars(relativePath) {
  const result = {};
  let parent = null;

  for (const line of readText(relativePath).split(/\r?\n/)) {
    const parentMatch = line.match(/^([A-Za-z0-9_-]+):\s*$/);
    if (parentMatch) {
      parent = parentMatch[1];
      continue;
    }

    const nestedMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*(.*)$/);
    if (nestedMatch && parent) {
      const [, key, rawValue] = nestedMatch;
      const value = rawValue.trim();
      if (value && value !== '|' && value !== '>') {
        result[`${parent}.${key}`] = value.replace(/^['"]|['"]$/g, '');
      }
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim();
    if (!value || value === '|' || value === '>') continue;
    parent = null;
    result[key] = value.replace(/^['"]|['"]$/g, '');
  }
  return result;
}

function normalizeUrl(value) {
  if (!value) return '';
  return String(value).replace(/^git\+/, '').replace(/\/+$/, '');
}

function repoInfoFromUrl(url) {
  const match = normalizeUrl(url).match(/github\.com[:/]([^/]+)\/([^/]+)$/);
  if (!match) {
    throw new Error(`Cannot derive GitHub repository from URL: ${url}`);
  }
  return { owner: match[1], name: match[2].replace(/\.git$/, '') };
}

function pagesUrlFor(repo) {
  return repo.name === `${repo.owner}.github.io`
    ? `https://${repo.owner}.github.io/`
    : `https://${repo.owner}.github.io/${repo.name}/`;
}

function expectEqual(errors, label, actual, expected) {
  if (actual !== expected) {
    errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function main() {
  const book = readJson('book-config.json');
  const pkg = readJson('package.json');
  const docsConfig = parseYamlScalars('docs/_config.yml');
  const repo = repoInfoFromUrl(book.repository && book.repository.url);
  const repoFullName = `${repo.owner}/${repo.name}`;
  const repoUrl = `https://github.com/${repoFullName}.git`;
  const repoWebUrl = `https://github.com/${repoFullName}`;
  const pagesUrl = pagesUrlFor(repo);
  const errors = [];

  expectEqual(errors, 'package.name', pkg.name, repo.name);
  expectEqual(errors, 'package.version', pkg.version, book.version);
  expectEqual(errors, 'package.description', pkg.description, book.description);
  expectEqual(errors, 'package.author', pkg.author, book.author);
  expectEqual(errors, 'package.license', pkg.license, book.license);
  expectEqual(errors, 'package.repository.type', pkg.repository && pkg.repository.type, 'git');
  expectEqual(errors, 'package.repository.url', normalizeUrl(pkg.repository && pkg.repository.url), normalizeUrl(repoUrl));
  expectEqual(errors, 'package.homepage', normalizeUrl(pkg.homepage), normalizeUrl(pagesUrl));
  expectEqual(errors, 'package.bugs.url', normalizeUrl(pkg.bugs && pkg.bugs.url), normalizeUrl(`${repoWebUrl}/issues`));

  expectEqual(errors, 'docs/_config.yml.title', docsConfig.title, book.title);
  expectEqual(errors, 'docs/_config.yml.description', docsConfig.description, book.description);
  expectEqual(errors, 'docs/_config.yml.author', docsConfig.author, book.author);
  expectEqual(errors, 'docs/_config.yml.version', docsConfig.version, book.version);
  expectEqual(errors, 'docs/_config.yml.url/baseurl', normalizeUrl(`${docsConfig.url || ''}${docsConfig.baseurl || ''}`), normalizeUrl(pagesUrl));
  expectEqual(errors, 'docs/_config.yml.repository', normalizeUrl(docsConfig.repository), normalizeUrl(repoWebUrl));

  const docsIndex = readText('docs/index.md');
  const docsVersion = (docsIndex.match(/\*\*バージョン\*\*:\s*([^\n]+)/) || [])[1];
  expectEqual(
    errors,
    'docs/index.md version marker',
    docsVersion && docsVersion.trim(),
    book.version,
  );
  expectEqual(
    errors,
    'docs/index.md repository link',
    docsIndex.includes(repoWebUrl),
    true,
  );

  if (errors.length > 0) {
    console.error('❌ Metadata consistency check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log('✅ Metadata is consistent across book-config, package, docs Jekyll config, and docs index.');
}

main();
