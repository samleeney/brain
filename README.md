# Brain - Knowledge Base Navigation Tool for LLMs

Brain is a command-line tool designed to help Large Language Models (LLMs) efficiently navigate and understand markdown-based knowledge bases. It parses markdown files, builds a graph of connections between notes, and provides a search interface optimized for LLM consumption.

## 🚀 Quick Start

```bash
# Install globally
npm install -g brain

# Navigate your knowledge base
brain --notes-root ~/notes overview
brain --notes-root ~/notes search "machine learning"
brain --notes-root ~/notes read project-ideas.md
```

## ✨ Features

- **🔗 Dual Organization**: Understands both hierarchical folders and graph-based wiki-style links
- **🔍 Multi-Strategy Search**: Text content, filenames, tags, and graph navigation
- **🤖 LLM-Optimized**: Dense, structured output designed for efficient token usage
- **📊 Graph Analysis**: Detects hubs, clusters, orphaned notes, and connection paths
- **⚡ High Performance**: Handles 1000+ notes with intelligent caching
- **🔄 Live Updates**: Incremental updates when files change

## 📦 Installation

### NPM (Recommended)
```bash
# Install globally for CLI usage
npm install -g brain

# Or run directly without installation
npx brain --notes-root ~/notes overview
```

### From Source
```bash
git clone https://github.com/samleeney/brain.git
cd brain
npm install
npm run build
node dist/cli/index.js --notes-root ~/notes overview
```

## 🎯 Commands

### Core Navigation
```bash
# Get knowledge base overview
brain --notes-root ~/notes overview

# List notes like a file system
brain --notes-root ~/notes ls
brain --notes-root ~/notes ls projects/

# Read a specific note with full context
brain --notes-root ~/notes read note-name.md
```

### Search & Discovery
```bash
# Multi-strategy search
brain --notes-root ~/notes search "artificial intelligence"

# Regex content search
brain --notes-root ~/notes grep "TODO|FIXME"

# File pattern matching
brain --notes-root ~/notes glob "**/*react*.md"

# Find related notes
brain --notes-root ~/notes related project-ideas.md

# Trace connections between notes
brain --notes-root ~/notes trace idea.md implementation.md
```

### Performance & Maintenance
```bash
# Cache management
brain --notes-root ~/notes cache stats
brain --notes-root ~/notes cache rebuild
brain --notes-root ~/notes cache clear

# Graph statistics
brain --notes-root ~/notes stats
```

## 📝 Supported Markdown

### Link Types
- **Wiki links**: `[[note-name]]` or `[[note-name|display text]]`
- **Markdown links**: `[display text](relative/path/to/note.md)`
- **Tags**: `#tag-name` anywhere in the document

### Document Structure
- **Headings**: All levels (`#` to `######`) for hierarchy
- **YAML frontmatter**: Optional metadata support
- **Content analysis**: Word counts, modification dates

### Link Resolution
- Exact filename matching
- Case-insensitive fallbacks
- Partial name matching
- Relative path resolution
- Broken link detection

## 🔧 Example Output

### Overview
```
=== KNOWLEDGE BASE OVERVIEW ===
Total Notes: 237 | Links: 180 | Last Updated: 2025-06-12
Structure: Mixed (15% in folders, 85% flat files)

TOP HUBS (most connected):
1. "Project Ideas" (45 connections)
2. "Daily Notes Index" (23 connections)

CLUSTERS DETECTED:
- "Research Papers" (67 notes)
- "Project Documentation" (34 notes)

ORPHANED NOTES: 12 notes with no connections
WARNING: 5 broken links detected
```

### Search Results
```
SEARCH RESULTS (3 matches):

1. projects/ai-research.md
   - Match: heading+text (score: 15.2)
   - Context: # AI Research Project Machine learning approaches...
   - Graph: 12 connections, Cluster: #2

2. notes/machine-learning.md
   - Match: tag+text (score: 8.5)
   - Context: Deep learning fundamentals #machine-learning
   - Graph: 8 connections
```

## 🏗️ Architecture

Brain is built with modern TypeScript and optimized for performance:

- **Parser**: Extracts structure and links from markdown files
- **Graph**: Builds knowledge graph with NetworkX-like algorithms
- **Search**: Multi-strategy search with relevance scoring  
- **Cache**: JSON-based persistence with change detection
- **CLI**: Commander.js for robust command-line interface

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions welcome! Please see our [contributing guidelines](CONTRIBUTING.md).

## 🔗 Links

- **Repository**: https://github.com/samleeney/brain
- **Issues**: https://github.com/samleeney/brain/issues
- **NPM Package**: https://www.npmjs.com/package/brain

---

*Built for LLMs, by LLMs (with human guidance)*