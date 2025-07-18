#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix complex Jekyll Liquid syntax conflicts
 * Handles nested template variables and complex expressions
 */

function fixComplexJekyllConflicts(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix complex GitHub Actions template variables
  // Pattern: ${{ secrets[format('AWS_{0}_ROLE', matrix.environment)] }}
  content = content.replace(/\$\{\{ secrets\[format\('([^']+)', ([^)]+)\)\] \}\}/g, (match, p1, p2) => {
    return "`${{ secrets[format('" + p1 + "', " + p2 + ")] }}`";
  });
  
  // Fix other complex nested patterns
  content = content.replace(/\$\{\{ ([^}]*\[format\([^}]*\)[^}]*) \}\}/g, '`${{ $1 }}`');
  
  // Fix remaining unescaped patterns
  content = content.replace(/(?<!`)\$\{\{ ([^}]+) \}\}(?!`)/g, '`${{ $1 }}`');
  
  // Fix any remaining {{ }} patterns that aren't already escaped
  content = content.replace(/(?<!`)\{\{ ([^}]+) \}\}(?!`)/g, '`{{ $1 }}`');
  
  // Fix any remaining {% %} patterns that aren't already escaped
  content = content.replace(/(?<!`)\{% ([^}]+) %\}(?!`)/g, '`{% $1 %}`');
  
  // Clean up double backticks
  content = content.replace(/``+/g, '`');
  
  // Fix cases where content is already properly escaped
  content = content.replace(/`\$\{\{ ([^}]+) \}\}`/g, '`${{ $1 }}`');
  content = content.replace(/`\{\{ ([^}]+) \}\}`/g, '`{{ $1 }}`');
  content = content.replace(/`\{% ([^}]+) %\}`/g, '`{% $1 %}`');
  
  return content;
}

// Process the problematic file
const chapterPath = path.join(__dirname, '../docs/chapter-chapter10/index.md');
console.log('Fixing complex Jekyll conflicts in chapter 10...');

const originalContent = fs.readFileSync(chapterPath, 'utf8');
const fixedContent = fixComplexJekyllConflicts(chapterPath);

if (originalContent !== fixedContent) {
  fs.writeFileSync(chapterPath, fixedContent);
  console.log('✅ Fixed complex Jekyll conflicts in chapter 10');
} else {
  console.log('⚪ No complex conflicts found in chapter 10');
}

console.log('✅ Complex Jekyll conflict fixing complete');