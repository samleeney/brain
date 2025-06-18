# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `npm run build` - Compile TypeScript to JavaScript in dist/
- `npm run setup` - Run the setup script to configure Brain MCP server
- `npm run server` - Start the MCP server (usually called by Claude Desktop)
- `npm run dev-setup` - Run setup script with ts-node for development
- `npm run dev-server` - Run MCP server with ts-node for development

### Installation
- `npm install` - Install dependencies
- `npm run build` - Build before using the MCP server

## Architecture Overview

Brain MCP Server provides semantic knowledge base access for Claude Desktop via Model Context Protocol:

### Core Implementation (TypeScript/Node.js)
Located in `src/`:
- **MCP Server**: `src/mcp/server.ts` - Model Context Protocol server with native Claude Desktop tools
- **Setup Script**: `src/setup.ts` - Interactive configuration utility for Brain MCP server
- **Graph Builder**: `src/graph/GraphBuilder.ts` - Constructs knowledge graph with intelligent chunking
- **Search Engine**: `src/search/SearchEngine.ts` - Semantic similarity search using OpenAI embeddings
- **Chunking Service**: `src/parser/ChunkingService.ts` - Intelligent content chunking for better embedding precision
- **Embedding Service**: `src/embedding/EmbeddingService.ts` - OpenAI text-embedding-3-large integration
- **Vector Store**: `src/embedding/VectorStore.ts` - Efficient similarity search over content chunks
- **LLM Formatter**: `src/formatters/LLMFormatter.ts` - Formats output optimized for LLM consumption
- **Cache Manager**: `src/cache/CacheManager.ts` - Manages graph cache and vector embeddings
- **Types**: `src/models/types.ts` - TypeScript interfaces for graph nodes, chunks, and embeddings

### Key Architectural Concepts

1. **MCP Integration**: Native Claude Desktop tools through Model Context Protocol
2. **Knowledge Graph Model**: Each markdown file becomes a node, with wiki-style links (`[[note]]`) and markdown links creating directed edges
3. **Intelligent Chunking**: Content is split into semantic chunks (title, headings, paragraphs) with hierarchical context preserved
4. **Semantic Search**: Uses OpenAI embeddings to find content similarity rather than keyword matching
5. **Chunk-Level Precision**: Returns specific relevant sections instead of entire documents
6. **Native Tool Experience**: Tools appear as built-in Claude Desktop capabilities
7. **Persistent Embeddings**: Vector store with incremental updates for performance

### MCP Tools Provided
Native tools available in Claude Desktop:
- `brain_search` - Semantic similarity search with configurable thresholds
- `brain_read` - Display note with full context and connections
- `brain_overview` - High-level knowledge base summary
- `brain_related` - Find notes connected to given note
- `brain_list` - Directory-style listing with metadata

### Target Use Case
Designed to integrate seamlessly with Claude Desktop, allowing natural language access to user's markdown knowledge base. Claude can automatically search, read, and navigate notes as part of natural conversation without manual commands.

## Development Notes

- Uses CommonJS modules (not ES modules) - see tsconfig.json
- All source files use TypeScript strict mode
- Cache stored in user's notes directory as `.brain-cache.json`
- Supports both wiki links `[[note]]` and markdown links `[text](path.md)`
- Link resolution handles exact matches, partial matches, and case-insensitive fallbacks