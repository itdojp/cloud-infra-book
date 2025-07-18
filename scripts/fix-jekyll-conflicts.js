#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix Jekyll Liquid syntax conflicts in markdown files
 * This script properly escapes template variables that conflict with Jekyll Liquid syntax
 */

function fixJekyllConflicts(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Strategy: Replace problematic template variables with backtick-escaped versions
  // This preserves readability while preventing Jekyll from interpreting them
  
  let fixedContent = content;
  
  // Fix GitHub Actions template variables like ${{ secrets.GITHUB_TOKEN }}
  fixedContent = fixedContent.replace(/\$\{\{ ([^}]+) \}\}/g, '`${{ $1 }}`');
  
  // Fix Ansible template variables like {{ app_name }}
  fixedContent = fixedContent.replace(/(?<!`)\{\{ ([^}]+) \}\}(?!`)/g, '`{{ $1 }}`');
  
  // Fix template variables with special characters like {{ imagebuilder:buildDate }}
  fixedContent = fixedContent.replace(/\{\{ ([^}]+:[^}]+) \}\}/g, '`{{ $1 }}`');
  
  // Remove existing {% raw %} and {% endraw %} tags that are causing conflicts
  fixedContent = fixedContent.replace(/\{% raw %\}/g, '');
  fixedContent = fixedContent.replace(/\{% endraw %\}/g, '');
  
  // Fix remaining Liquid template tags
  fixedContent = fixedContent.replace(/\{% ([^}]+) %\}/g, '`{% $1 %}`');
  
  // Clean up multiple backticks
  fixedContent = fixedContent.replace(/``+/g, '`');
  
  // Fix cases where backticks are already present
  fixedContent = fixedContent.replace(/`\$\{\{ ([^}]+) \}\}`/g, '`${{ $1 }}`');
  fixedContent = fixedContent.replace(/`\{\{ ([^}]+) \}\}`/g, '`{{ $1 }}`');
  
  return fixedContent;
}

function processFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  const originalContent = fs.readFileSync(filePath, 'utf8');
  const fixedContent = fixJekyllConflicts(filePath);
  
  if (originalContent !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent);
    console.log(`✅ Fixed conflicts in: ${filePath}`);
  } else {
    console.log(`⚪ No conflicts found in: ${filePath}`);
  }
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file === 'index.md') {
      processFile(filePath);
    }
  });
}

// Process docs directory
const docsDir = path.join(__dirname, '../docs');
if (fs.existsSync(docsDir)) {
  console.log('🔧 Fixing Jekyll conflicts in docs directory...');
  processDirectory(docsDir);
} else {
  console.log('❌ docs directory not found');
}

console.log('✅ Jekyll conflict fixing complete');