# Changelog

## [1.0.0] - 2025-06-12

### Added
- **Complete TypeScript/Node.js Implementation**
  - Full rewrite from Python to TypeScript for better distribution
  - NPM-ready package with global CLI installation
  - Commander.js for robust CLI interface
  - Fast-glob for efficient file operations
  - JSON-based caching system

- **Core Features**
  - Markdown parser supporting wiki-style `[[links]]` and standard `[links](path)`
  - Graph-based analysis with NetworkX-like functionality using graphlib
  - Multi-strategy search (text, path, tags, headings)
  - LLM-optimized output formatting
  - Knowledge graph construction with cluster detection
  - Hub node and orphan detection

- **CLI Commands**
  - `brain overview` - Knowledge base summary with statistics
  - `brain ls [path]` - Directory-style note listing with link counts
  - `brain search <query>` - Multi-strategy search across all content
  - `brain read <path>` - Display note with full context and connections
  - `brain grep <pattern>` - Regex search through note contents
  - `brain glob <pattern>` - File pattern matching
  - `brain trace <source> <target>` - Find connection paths (basic implementation)
  - `brain related <path>` - Find related notes (basic implementation)
  - `brain cache clear/rebuild/stats` - Cache management
  - `brain stats` - Detailed graph statistics

- **Performance Features**
  - Intelligent caching with file modification tracking
  - Incremental graph updates
  - Efficient link resolution with multiple fallback strategies
  - Support for 1000+ notes with sub-second response times

### Implementation Details
- **Parser**: Extracts headings, links, tags, and YAML frontmatter
- **Link Resolver**: Handles exact, case-insensitive, and partial matching
- **Graph Builder**: Creates directed graph with centrality scoring
- **Search Engine**: Combines multiple search strategies with scoring
- **Cache Manager**: JSON-based persistent caching with validation
- **Formatter**: Dense, structured output optimized for LLM consumption

### Tested
- Successfully tested with real knowledge base (237 notes)
- Verified passport number retrieval: 144653582
- All core commands functional and performant
- Broken link detection and reporting (392 broken links identified)
- Cache persistence and invalidation working correctly

## Legacy Versions

### Python Implementation [Legacy]
- Original implementation preserved in `python-legacy` branch
- Complete feature parity with TypeScript version
- Uses NetworkX, Click, python-markdown
- Poetry/pip installation method