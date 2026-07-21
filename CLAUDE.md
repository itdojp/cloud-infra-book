# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Japanese-language technical book project about "クラウドインフラ設計・構築ガイド" (Cloud Infrastructure Design and Implementation Guide). The book provides practical approaches for design, build, and operations of cloud infrastructure, focusing on the principles and decision-making rationale behind implementation choices.

## Repository Structure

This project uses the **book-formatter** system:

```text
cloud-infra-book/
├── docs/                    # Generated output (GitHub Pages)
├── src/                     # Source content
│   ├── introduction/        # Introduction section
│   ├── chapter-chapter01/   # 11 chapters (chapter01-11)
│   ├── chapter-chapter02/
│   ├── ...
│   ├── chapter-chapter11/
│   └── appendices/         # Appendices
├── book-config.json        # Book configuration (book-formatter format)
├── package.json           # Project dependencies and scripts
└── CLAUDE.md             # This file
```

## Writing Philosophy

### Core Approach
- **概念と原理の説明を主体**: Focus on explaining concepts and principles
- **コードは理解を助ける補助として最小限に使用**: Use code minimally, only as aid for understanding
- **設計の背景にある原理原則と実装判断の根拠を丁寧に説明**: Carefully explain design principles and implementation rationale behind configurations

### Differentiation Strategy
- Position between "theory-heavy books" and "operation-manual books"
- Focus on the practical bridge of "how cloud infrastructure engineers actually design and implement systems after understanding concepts"
- Comprehensive coverage of cross-cutting cloud infrastructure challenges

### Content Balance
- 概念説明 30%
- 実装アプローチ 50%
- 運用考慮点 20%

## Key Commands and Workflows

### Development
```bash
npm start                    # Start development server
npm run build               # Build the book with Gemfile.lock through Bundler
npm run build:safe          # Compatibility alias for npm run build
npm run deploy              # Deploy to GitHub Pages
```

`npm run build` is the production build entry point. It must remain Bundler-managed so
that the Jekyll dependency versions in `Gemfile.lock` are used. GitHub Pages invokes
the same entry point with the `docs` source, destination, and base URL as arguments.
Use Ruby 3.3 and Bundler 2.5.22, then run `bundle _2.5.22_ install` before the first
local build in a clean checkout.

### Content Management
```bash
npm run lint                # Check markdown formatting
npm run check-links         # Validate internal links
npm run check-conflicts     # Check for Jekyll Liquid conflicts
npm test                    # Run all tests (lint + links)
```

## Content Guidelines

### Book Structure
- **5 Parts, 11 Chapters** covering cloud infrastructure design and implementation
- **Part I**: 基礎編 (Chapters 1-2) - Fundamentals
- **Part II**: コアサービス編 (Chapters 3-5) - Core Services
- **Part III**: 運用管理編 (Chapters 6-8) - Operations Management
- **Part IV**: 先進技術編 (Chapters 9-10) - Advanced Technologies
- **Part V**: 統合編 (Chapter 11) - Integration

### Writing Style
- **Target Audience**: Cloud infrastructure engineers (1-5 years experience)
- **Language**: Japanese (professional technical writing)
- **Tone**: 対等で探求的な文体 (Equal and exploratory tone)
- **Approach**: Practical implementation with conceptual foundation

### Technical Requirements
- **Format**: Markdown (CommonMark + extensions)
- **Encoding**: UTF-8
- **Line endings**: LF (Unix format)
- **Framework**: book-formatter

## Phase Status

Current project status:
- ✅ Phase 1: 企画立案・価値設計 (Complete - based on existing structure)
- ✅ Phase 2: 構造設計・目次詳細化 (Complete - 11 chapters detailed outline)
- 🔄 Phase 3: 探索的執筆・内容検証 (In Progress - drafts available through Chapter 11)
- ⏳ Phase 4: 構造改善・方針確定 (Pending)
- ⏳ Phase 5: 本格執筆・内容充実 (Pending)
- ⏳ Phase 6: 品質保証・最終調整 (Pending)

## Important Notes

1. **Current Phase**: Phase 3 - Exploratory writing and content validation
2. **AI Model Strategy**: 
   - Rough drafts: Claude 4 Opus (draft content exists)
   - Final drafts: Claude 4 Sonnet (planned)
3. **Existing Content**: Draft chapters 1-11 available in local cloud-infra directory
4. **Key Focus Areas**: 
   - Cloud-native design patterns
   - Multi-cloud considerations
   - Cost optimization strategies
   - Security and compliance
   - Automation and IaC

## Quality Standards

- **Conceptual Clarity**: Focus on why, not just how
- **Practical Value**: Enable readers to successfully design and implement cloud infrastructure
- **Progressive Understanding**: Build knowledge step by step from fundamentals to advanced
- **Minimal Code**: Code examples only when they aid understanding
- **Real-world Context**: Emphasize practical decision-making scenarios

## Contact Information

**Author**: 株式会社アイティードゥ  
**Email**: knowledge@itdo.jp  
**GitHub**: [@itdojp](https://github.com/itdojp)  
**Organization**: 株式会社アイティードゥ
