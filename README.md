# Brain - Knowledge Base Navigation Tool for LLMs

Brain is a command-line tool designed to help Large Language Models (LLMs) efficiently navigate and understand markdown-based knowledge bases. It parses markdown files, builds a graph of connections between notes, and provides a search interface optimized for LLM consumption.

## 🤖 Quick Start for Claude Code

**For Claude Code users:** Brain allows you to give Claude intelligent access to your markdown notes. Here's how to get started:

### 1. Install Brain
```bash
# Claude can run this command for you
npm install -g brain
```

### 2. Tell Claude about your notes
```
Claude, I have my notes stored in ~/vault. Use the brain tool to explore them:

brain --notes-root ~/vault overview
```

### 3. Ask Claude to search and analyze
```
Claude, find all my notes about machine learning:
brain --notes-root ~/vault search "machine learning"

Then read the most relevant one:
brain --notes-root ~/vault read [note-path-from-search]
```

### 4. Let Claude navigate relationships
```
Claude, show me what's related to my project-ideas note:
brain --notes-root ~/vault related project-ideas.md

And trace how my ideas connect to my implementations:
brain --notes-root ~/vault trace ideas.md implementation.md
```

## 🎯 Key Commands for LLM Agents

### Essential Navigation
```bash
# Get complete knowledge base overview - START HERE
brain --notes-root ~/notes overview

# Search across all content, filenames, tags
brain --notes-root ~/notes search "your query"

# Read specific note with full context and connections
brain --notes-root ~/notes read note-name.md

# List notes in directory structure
brain --notes-root ~/notes ls [optional-path]
```

### Advanced Discovery
```bash
# Find related notes (direct links, clusters, similar topics)
brain --notes-root ~/notes related note-name.md

# Trace connection paths between any two notes
brain --notes-root ~/notes trace source.md target.md

# Pattern-based file finding
brain --notes-root ~/notes glob "**/*pattern*.md"

# Regex content search
brain --notes-root ~/notes grep "regex-pattern"
```

## ✨ Features

- **🔗 Dual Organization**: Understands both hierarchical folders and graph-based wiki-style links
- **🔍 Multi-Strategy Search**: Text content, filenames, tags, and graph navigation
- **🤖 LLM-Optimized**: Dense, structured output designed for efficient token usage
- **📊 Graph Analysis**: Detects hubs, clusters, orphaned notes, and connection paths
- **⚡ High Performance**: Handles 1000+ notes with intelligent caching
- **🔄 Live Updates**: Incremental updates when files change

## 💡 Why Brain + Claude Code?

Brain transforms how Claude Code can work with your knowledge base:

- **🎯 Contextual Understanding**: Instead of reading files one by one, Claude gets the full relationship map
- **🔍 Intelligent Search**: Claude can find exactly what it needs across your entire knowledge base
- **🧠 Graph Navigation**: Claude understands how your ideas connect and can trace thought processes
- **⚡ Efficient Token Usage**: Dense, structured output minimizes context consumption
- **🔄 Real-time Discovery**: Claude can explore relationships and discover relevant notes dynamically

## 📦 Installation

```bash
# LLM agents can run this directly
npm install -g brain

# Or use without installation
npx brain --notes-root ~/notes overview
```

## 📋 Usage Patterns for LLM Agents

### Pattern 1: Knowledge Base Exploration
```bash
# 1. Start with overview to understand structure
brain --notes-root ~/vault overview

# 2. Search for specific topics
brain --notes-root ~/vault search "topic"

# 3. Read relevant notes with full context
brain --notes-root ~/vault read [found-note.md]

# 4. Explore connections
brain --notes-root ~/vault related [found-note.md]
```

### Pattern 2: Research Assistance
```bash
# Find all notes on a research topic
brain --notes-root ~/vault search "research query"

# Trace how concepts developed over time
brain --notes-root ~/vault trace initial-idea.md final-paper.md

# Find related research and references
brain --notes-root ~/vault related research-topic.md
```

### Pattern 3: Project Context Building
```bash
# Get project overview
brain --notes-root ~/vault glob "**/project-name*.md"

# Find project-related notes
brain --notes-root ~/vault search "project-name"

# Understand project connections
brain --notes-root ~/vault related project-main.md
```

## 🔧 Cache Management

Brain uses intelligent caching for performance. LLM agents should know:

```bash
# Check cache status
brain --notes-root ~/notes cache stats

# Rebuild if notes have changed significantly
brain --notes-root ~/notes cache rebuild

# Clear cache if having issues
brain --notes-root ~/notes cache clear
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

## 🚀 Advanced LLM Usage Tips

### For Claude Code Specifically:
1. **Always start with `overview`** - gives you the complete knowledge base structure
2. **Use `search` before `read`** - find the most relevant notes first
3. **Leverage `related`** - discover connections you might miss
4. **Use `trace`** - understand how ideas evolved or connect
5. **Check `cache stats`** - ensure you're working with fresh data

### Sample Claude Code Session:
```
User: "Help me find information about my machine learning projects"

Claude: I'll explore your knowledge base to find ML-related content.

brain --notes-root ~/vault overview
brain --notes-root ~/vault search "machine learning"
brain --notes-root ~/vault related [most-relevant-result]

Based on your knowledge base, I found several ML projects. Let me read the main one:

brain --notes-root ~/vault read projects/ml-classifier.md

Now I can see this connects to your data processing notes. Let me trace that connection:

brain --notes-root ~/vault trace projects/ml-classifier.md data/preprocessing.md
```

## 🔗 Links

- **Repository**: https://github.com/samleeney/brain
- **Issues**: https://github.com/samleeney/brain/issues
- **NPM Package**: https://www.npmjs.com/package/brain

---

*Built for LLMs, by LLMs - Optimized for Claude Code*