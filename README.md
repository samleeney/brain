# AINodes - Knowledge Base Navigation Tool for LLMs

AINodes is a command-line tool designed to help Large Language Models (LLMs) efficiently navigate and understand markdown-based knowledge bases. It parses markdown files, builds a graph of connections between notes, and provides a search interface optimized for LLM consumption.

## Features

- **Dual Organization**: Understands both hierarchical folder structure and graph-based wiki-style links
- **Multiple Search Strategies**: Text content, filename patterns, tags, and graph navigation
- **LLM-Optimized Output**: Dense, structured text format designed for efficient token usage
- **Graph Analysis**: Detects hubs, clusters, orphaned notes, and connection paths
- **Caching System**: Fast incremental updates for large knowledge bases
- **Performance**: Handles 1000+ notes efficiently

## Installation

```bash
pip install ainotes
```

## Usage

### Basic Commands

```bash
# Get overview of knowledge base
ainotes overview

# List notes like a file system
ainotes ls [path]

# Search across all strategies
ainotes search "your query"

# Read a specific note with context
ainotes read path/to/note.md

# Find connections between notes
ainotes trace source.md target.md

# Find related notes
ainotes related note.md
```

### Advanced Commands

```bash
# Grep-style text search
ainotes grep "pattern"

# Find files matching patterns
ainotes glob "**/*react*.md"

# Cache management
ainotes cache clear
ainotes cache rebuild
ainotes cache stats
```

## Supported Markdown Features

- **Wiki-style links**: `[[note-name]]` or `[[note-name|display text]]`
- **Markdown links**: `[display text](relative/path/to/note.md)`
- **Tags**: `#tag-name` anywhere in the document
- **Headings**: All levels (`#` to `######`) for document structure
- **YAML frontmatter**: Optional metadata support

## Example Output

```
=== KNOWLEDGE BASE OVERVIEW ===
Total Notes: 234 | Links: 892 | Last Updated: 2024-12-06
Structure: Mixed (65% in folders, 35% flat files)

TOP HUBS (most connected):
1. "index.md" (87 connections)
2. "project-ideas.md" (45 connections)

CLUSTERS DETECTED:
- "Web Development" (23 notes, highly connected)
- "Daily Notes" (156 notes, time-ordered)
```

## Configuration

Create `.ainotes.yml` in your notes directory:

```yaml
exclude_patterns:
  - "*.tmp"
  - ".obsidian/*"
  - "_archive/*"

output:
  max_results: 50
  context_lines: 2
```

## License

MIT License