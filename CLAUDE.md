# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Test
- `npm run build` - Compile TypeScript to dist/ directory
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode

### Production Scripts
- `npm run setup` - Interactive setup for Brain MCP configuration
- `npm run server` - Run compiled MCP server
- `brain setup` - CLI setup command (after global install)
- `brain status` - Show configuration and system status
- `brain update` - Update vector embeddings for changed files
- `brain clear` - Rebuild all vector embeddings from scratch

## Architecture Overview

Brain is a Model Context Protocol (MCP) server that provides semantic search capabilities for markdown note collections. The system transforms markdown files into a searchable knowledge base using embeddings and graph analysis.

### Core Components

**Entry Points:**
- `src/mcp/server.ts` - Main MCP server providing brain_* tools to Claude Code
- `src/cli/brain.ts` - CLI interface for setup and maintenance
- `src/setup.ts` - Interactive configuration utility

**Data Processing Pipeline:**
1. `MarkdownParser` - Parses markdown files, extracts metadata, headings, links
2. `ChunkingService` - Splits notes into semantic chunks for embedding
3. `GraphBuilder` - Creates knowledge graph from parsed notes and links
4. `EmbeddingService` - Generates OpenAI embeddings for chunks
5. `VectorStore` - Stores and searches embeddings for similarity matching

**Search System:**
- `SearchEngine` - Multi-strategy semantic search with query expansion
- Supports parallel multi-phrase searches and comprehensive research queries
- Automatic query variation generation for improved recall

**MCP Tools Provided:**
- `brain_search` - Enhanced semantic search with parallel strategies
- `brain_research` - Comprehensive multi-strategy search for complex queries
- `brain_read` - Read specific notes with full content
- `brain_overview` - Knowledge base structure summary
- `brain_related` - Find notes connected via links
- `brain_list` - Browse notes by directory

### Key Data Models

**Note Structure:**
- Notes contain metadata (title, headings, links, tags, frontmatter)
- Split into semantic chunks for embedding
- Tracked with modification timestamps for incremental updates

**Knowledge Graph:**
- Nodes represent notes with incoming/outgoing link relationships
- Calculates metrics like centrality scores and cluster assignments
- Identifies hub nodes and orphaned notes

**Vector Storage:**
- Chunks embedded using OpenAI's text-embedding-3-small model
- Stored in `.brain-vectors.json` with metadata for incremental updates
- Supports similarity search with configurable thresholds

### Configuration

Brain uses `~/.brain/config.json` for configuration:
- `vaultPath` - Root directory of markdown notes
- `openaiApiKey` - Optional API key (can use OPENAI_API_KEY env var)

Cache and vectors stored in notes directory:
- `.brain-cache.json` - Parsed note metadata and graph cache
- `.brain-vectors.json` - Vector embeddings for semantic search

### Testing Strategy

Tests use Jest with ts-jest preset. Test files located in `tests/` directory:
- Integration tests for core components
- Mock data in `test-notes/` directory
- Setup file configures 30s timeout for embedding operations

### Development Notes

- Uses CommonJS modules (`type: "commonjs"` in package.json)
- TypeScript compiled to ES2022 target
- OpenAI API key required for semantic search functionality
- Supports incremental updates - only re-embeds modified notes
- MCP server runs on stdio transport for Claude Code integration

### Development Workflow

Simple development process:
- `npm run build` - Build TypeScript
- `npm test` - Run test suite

### Release Process

Automated publishing via GitHub Actions:

1. **Create Release**: Use the release script
   ```bash
   ./scripts/release.sh [patch|minor|major]
   ```

2. **Automated Pipeline**: When you push a version tag (v1.0.0, etc.), GitHub Actions will:
   - Run tests
   - Build the project
   - Publish to npm registry
   - Create GitHub release with tarball asset

3. **Manual Release**: Alternatively, create tags manually:
   ```bash
   npm version patch  # or minor/major
   git push origin main --tags
   ```

**Setup Requirements**:
- `NPM_TOKEN` secret in GitHub repository settings
- GitHub Actions enabled

### Claude Code Integration

Add to Claude Code using:
```bash
claude mcp add brain node /absolute/path/to/brain/dist/mcp/server.js
```

For development, rebuild and Claude Code will use updated version:
```bash
npm run build  # Updates dist/mcp/server.js
```