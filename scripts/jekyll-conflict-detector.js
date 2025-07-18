#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function findJekyllConflicts(directory) {
    const conflicts = [];
    
    // Liquidテンプレート構文のパターン
    const liquidPatterns = [
        /\{\{.*?\}\}/g,  // {{ variable }}
        /\{%.*?%\}/g,    // {% tag %}
        /\{\-.*?\-\}/g   // {- liquid -}
    ];
    
    // Markdownファイルを再帰的に検索
    function findMarkdownFiles(dir) {
        const files = [];
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && item !== 'node_modules') {
                files.push(...findMarkdownFiles(fullPath));
            } else if (item.endsWith('.md')) {
                files.push(fullPath);
            }
        });
        
        return files;
    }
    
    const files = findMarkdownFiles(directory);
    
    files.forEach(file => {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
                liquidPatterns.forEach(pattern => {
                    const matches = line.match(pattern);
                    if (matches) {
                        matches.forEach(match => {
                            conflicts.push({
                                file: file,
                                line: index + 1,
                                match: match,
                                context: line.trim()
                            });
                        });
                    }
                });
            });
        } catch (error) {
            console.warn(`Warning: Could not read file ${file}: ${error.message}`);
        }
    });
    
    return conflicts;
}

// メイン処理
const conflicts = findJekyllConflicts('src');

if (conflicts.length > 0) {
    console.log('🚨 Jekyll Liquid構文の競合が検出されました:');
    console.log('');
    
    conflicts.forEach(conflict => {
        console.log(`📄 ${conflict.file}:${conflict.line}`);
        console.log(`   ${conflict.match}`);
        console.log(`   Context: ${conflict.context}`);
        console.log('');
    });
    
    console.log('💡 これらの構文は {% raw %} と {% endraw %} で囲むか、エスケープしてください。');
    process.exit(1);
} else {
    console.log('✅ Jekyll Liquid構文の競合は検出されませんでした。');
}