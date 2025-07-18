#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Jekyll Liquid syntax conflict fixer
 * This script handles all types of Jekyll conflicts comprehensively
 */

function fixAllJekyllConflicts(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Fix Python/PowerShell/Shell script blocks containing {{ }}
  // Pattern: code blocks with template-like syntax
  content = content.replace(/```(\w+)?\s*\n([\s\S]*?)```/g, (match, lang, code) => {
    if (code.includes('{{') || code.includes('}}')) {
      // Wrap code block content in raw tags
      return '```' + (lang || '') + '\n{% raw %}' + code + '{% endraw %}\n```';
    }
    return match;
  });
  
  // 2. Fix inline code with {{ }} that's not in code blocks
  content = content.replace(/`([^`]*\{\{[^}]*\}\}[^`]*)`/g, (match, code) => {
    return '`{% raw %}' + code + '{% endraw %}`';
  });
  
  // 3. Fix template variables in YAML/configuration examples
  content = content.replace(/([ \t]*[-*]?\s*\w+:\s*)`?\{\{([^}]+)\}\}`?/g, (match, prefix, variable) => {
    return prefix + '`{{ ' + variable + ' }}`';
  });
  
  // 4. Fix GitHub Actions workflow syntax
  content = content.replace(/\$\{\{ ([^}]+) \}\}/g, '`${{ $1 }}`');
  
  // 5. Fix Ansible template variables
  content = content.replace(/(?<!`)\{\{ ([^}]+) \}\}(?!`)/g, '`{{ $1 }}`');
  
  // 6. Fix Jekyll template tags
  content = content.replace(/(?<!`)\{% ([^}]+) %\}(?!`)/g, '`{% $1 %}`');
  
  // 7. Clean up multiple backticks
  content = content.replace(/``+/g, '`');
  
  // 8. Fix already escaped patterns
  content = content.replace(/`\$\{\{ ([^}]+) \}\}`/g, '`${{ $1 }}`');
  content = content.replace(/`\{\{ ([^}]+) \}\}`/g, '`{{ $1 }}`');
  content = content.replace(/`\{% ([^}]+) %\}`/g, '`{% $1 %}`');
  
  // 9. Fix specific problematic patterns from error logs
  content = content.replace(/lookup\('env',\s*'([^']+)'\)\s*\|\s*default\('([^']+)',\s*true\)/g, 
    "lookup('env', '$1') | default('$2', true)");
  
  // 10. Fix PowerShell script blocks specifically
  content = content.replace(/(\w+_script\s*=\s*f?"""\s*[\s\S]*?)\{\{([\s\S]*?)\}\}([\s\S]*?""")/g, 
    (match, before, inside, after) => {
      return before + '{% raw %}{{' + inside + '}}{% endraw %}' + after;
    });
  
  return content;
}

function processFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  const originalContent = fs.readFileSync(filePath, 'utf8');
  const fixedContent = fixAllJekyllConflicts(filePath);
  
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

// Process all chapter directories
const docsDir = path.join(__dirname, '../docs');
if (fs.existsSync(docsDir)) {
  console.log('🔧 Comprehensive Jekyll conflict fixing...');
  processDirectory(docsDir);
} else {
  console.log('❌ docs directory not found');
}

console.log('✅ Comprehensive Jekyll conflict fixing complete');