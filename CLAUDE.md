# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `npm run build` - Compile TypeScript to JavaScript in dist/
- `npm run dev` - Run TypeScript CLI directly with ts-node
- `npm run watch` - Watch mode for development

### Testing
- `python tests/test_basic.py` - Run Python tests (legacy implementation)
- No TypeScript test suite exists yet

### Installation
- `npm install` - Install dependencies
- `npm run build` - Build before testing CLI functionality

## Architecture Overview

Brain is a dual-implementation knowledge base navigation tool for LLMs:

### Core Implementation (TypeScript/Node.js) - Primary
Located in `src/`:
- **CLI Interface**: `src/cli/index.ts` - Commander.js-based CLI with comprehensive subcommands
- **Graph Builder**: `src/graph/GraphBuilder.ts` - Constructs knowledge graph from markdown files
- **Search Engine**: `src/search/SearchEngine.ts` - Multi-strategy search (content, filename, tags)
- **LLM Formatter**: `src/formatters/LLMFormatter.ts` - Formats output optimized for LLM consumption
- **Cache Manager**: `src/cache/CacheManager.ts` - JSON-based persistence for performance
- **Types**: `src/models/types.ts` - TypeScript interfaces for graph nodes, links, etc.

### Legacy Implementation (Python)
Located in `ainotes/`:
- Contains Python implementation with similar architecture
- Has virtual environment in `ainotes/venv/`
- Use TypeScript version for active development

### Key Architectural Concepts

1. **Knowledge Graph Model**: Each markdown file becomes a node, with wiki-style links (`[[note]]`) and markdown links creating directed edges
2. **Dual Organization**: Understands both hierarchical folder structure and flat wiki-style linking
3. **Multi-Strategy Search**: Combines content search, filename matching, and graph traversal
4. **LLM-Optimized Output**: Dense, structured text format designed for efficient token usage
5. **Caching Strategy**: Incremental updates with file modification time tracking

### CLI Command Structure
The tool provides Unix-like commands familiar to developers:
- `brain overview` - High-level knowledge base summary with hubs and clusters
- `brain search <query>` - Multi-strategy search across content and metadata
- `brain read <path>` - Display note with full context and connections
- `brain ls [path]` - Directory-style listing with link counts
- `brain grep <pattern>` - Regex content search
- `brain glob <pattern>` - File pattern matching
- `brain related <path>` - Find notes connected to given note
- `brain cache clear/rebuild/stats` - Cache management

### Target Use Case
Designed for LLM agents to maintain persistent awareness of user's markdown knowledge base. The agent loads the overview at session start, then uses contextual search when user queries relate to documented knowledge.

## Development Notes

- Uses CommonJS modules (not ES modules) - see tsconfig.json
- All source files use TypeScript strict mode
- Cache stored in user's notes directory as `.brain-cache.json`
- Supports both wiki links `[[note]]` and markdown links `[text](path.md)`
- Link resolution handles exact matches, partial matches, and case-insensitive fallbacks