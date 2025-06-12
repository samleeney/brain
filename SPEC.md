# Brain - Knowledge Base Navigation Tool for LLMs

## Project Overview

Brain is a command-line tool designed to help Large Language Models (LLMs) efficiently navigate and understand a user's markdown-based knowledge base. The tool parses markdown files, builds a graph of connections between notes, and provides a search interface optimized for LLM consumption.

## Problem Statement

LLMs like Claude, ChatGPT, and others need to understand the structure and relationships within a user's collection of markdown notes. Currently, LLMs must read through many files sequentially without understanding how ideas connect. This tool solves that by:

1. Building a graph of connections between notes based on links
2. Providing efficient search across both file structure and content
3. Presenting information in a format optimized for LLM understanding
4. Allowing navigation similar to how LLMs explore codebases

## Core Concept

The tool treats a collection of markdown notes like a codebase, providing familiar commands (ls, grep, read) while adding graph-aware features that understand how notes link to each other, similar to how Obsidian or Roam Research work.

## Key Features

### 1. Dual Organization Understanding
- **Hierarchical**: Respects folder structure (e.g., `/projects/web/react.md`)
- **Graph-based**: Understands wiki-style links between any notes (e.g., `[[related-note]]`)

### 2. Multiple Search Strategies
- **Path patterns**: Find notes by filename patterns
- **Content search**: Search text within notes using regex
- **Graph navigation**: Find connections between notes
- **Structural search**: Find hub notes, clusters, and orphaned notes

### 3. LLM-Optimized Output
- Dense, structured text format
- Contextual information included with all results
- Efficient use of tokens
- Clear relationship mapping

## Technical Requirements

### Supported Markdown Features

1. **Headings**: Parse all levels (`#`, `##`, `###`, etc.) to understand document structure
2. **Wiki-style links**: `[[note-name]]` or `[[note-name|display text]]`
3. **Markdown links**: `[display text](relative/path/to/note.md)`
4. **Tags**: `#tag-name` anywhere in the document
5. **Frontmatter**: Optional YAML frontmatter support

### Link Resolution Rules

1. Wiki links `[[note-name]]` should:
   - First look for exact filename match `note-name.md`
   - Then search for partial matches
   - Handle case-insensitive matching
   - Support optional display text after pipe `|`

2. Markdown links should:
   - Resolve relative paths from the current note's location
   - Handle both `.md` extension and without
   - Ignore external URLs (http://, https://)

3. For all links:
   - Store the context (surrounding sentence)
   - Track line numbers for reference
   - Note if links are broken (target doesn't exist)

### Graph Construction

1. **Nodes**: Each markdown file is a node
2. **Edges**: Each link creates a directed edge
3. **Metadata per node**:
   - File path
   - Title (filename or first # heading)
   - All headings with their hierarchy
   - Tags found in the document
   - Last modified timestamp
   - Link count (incoming/outgoing)

4. **Metadata per edge**:
   - Source file
   - Target file
   - Link text
   - Context (surrounding sentence)
   - Link type (wiki/markdown)

### Performance Requirements

- Handle knowledge bases with 1000+ notes
- Initial scan under 5 seconds for 1000 notes
- Incremental updates when files change
- Search results returned within 1 second
- Cache graph structure between runs

## Command Specifications

### 1. `brain overview`
Display a high-level summary of the knowledge base.

**Output includes:**
- Total number of notes
- Directory structure summary
- Major hub notes (most connected)
- Identified clusters
- Orphaned notes
- Recent modifications

**Example output:**
```
=== KNOWLEDGE BASE OVERVIEW ===
Total Notes: 234 | Last Updated: 2024-12-06
Structure: Mixed (45% in folders, 55% flat files)

TOP HUBS (most connected):
1. "index.md" (87 connections)
2. "project-ideas.md" (45 connections)

CLUSTERS DETECTED:
- "Web Development" (23 notes, highly connected)
- "Daily Notes" (156 notes, time-ordered)

RECENT ACTIVITY:
- Modified today: 3 notes
- This week: 12 notes
```

### 2. `brain ls [path]`
List notes in directory-style format.

**Features:**
- Show files and subdirectories
- Include link counts for each note
- Support for path argument (default: root)

**Example output:**
```
/notes/projects/
├── web-development/ (12 notes)
│   ├── react-app.md [→12 ←5]
│   └── api-design.md [→8 ←15]
└── machine-learning/ (6 notes)
    └── nlp-experiment.md [→3 ←1]

[→X ←Y] means X outgoing links, Y incoming links
```

### 3. `brain search <query>`
Multi-strategy search across the knowledge base.

**Search strategies:**
- Text content matching (regex support)
- Filename matching
- Tag matching
- Combined scoring from all strategies

**Output includes:**
- Matched notes with relevance scores
- Match context snippets
- Graph context (how connected the note is)
- Related notes

**Example output:**
```
QUERY: "authentication"

MATCHES:
1. projects/api/auth-system.md
   - Content match: "JWT authentication implementation"
   - Graph: Hub node (18 connections)
   - Path: Organized in projects folder

2. learning/security/oauth.md
   - Content match: "OAuth authentication flow"
   - Graph: 4 connections
   - Related: links to auth-system.md
```

### 4. `brain read <path>`
Display a note with full context.

**Output includes:**
- Note location and metadata
- Incoming links (what links TO this note)
- Outgoing links (what this note links TO)
- Full note content
- Graph position information

**Example output:**
```
=== projects/react-app.md ===
Location: /notes/projects/react-app.md
Modified: 2024-12-06 10:30:00
Tags: #project #react #frontend

INCOMING LINKS (5):
← "index.md" ("Current projects")
← "daily/2024-12-05.md" ("Worked on React app")

OUTGOING LINKS (12):
→ "learning/react-patterns.md" (3 references)
→ "resources/component-library.md" (1 reference)

CONTENT:
# React Dashboard App
[full content here...]
```

### 5. `brain grep <pattern>`
Search file contents using regex patterns.

**Features:**
- Full regex support
- Show line numbers
- Include context lines
- Option to limit results

**Example output:**
```
projects/api/auth.md:45: implement JWT authentication
projects/api/auth.md:67: authentication middleware for Express
daily/2024-12-01.md:12: fixed authentication bug
```

### 6. `brain glob <pattern>`
Find files matching glob patterns.

**Features:**
- Standard glob syntax (`*`, `**`, `?`)
- Case-insensitive option
- Show matched paths

**Example:**
```
$ brain glob "**/*react*.md"
projects/react-app.md
learning/react-patterns.md
learning/react-hooks.md
```

### 7. `brain trace <source> <target>`
Find connection paths between two notes.

**Output includes:**
- Shortest path(s)
- Alternative paths
- Path context (why notes connect)

**Example output:**
```
TRACE: "idea.md" → "implementation.md"

SHORTEST PATH (3 hops):
idea.md 
  → planning.md ("idea expanded into plan")
  → tasks.md ("planning broken into tasks")  
  → implementation.md ("task implemented")

ALTERNATIVE PATH (4 hops):
idea.md → brainstorm.md → design.md → review.md → implementation.md
```

### 8. `brain related <path>`
Find notes related to the given note.

**Relationship types:**
- Directly linked (incoming/outgoing)
- In same cluster
- Similar directory structure
- Shared tags

**Example output:**
```
RELATED TO: projects/react-app.md

DIRECTLY LINKED:
- learning/react-patterns.md (bidirectional)
- resources/components.md (this links to)

SAME CLUSTER:
- projects/vue-app.md
- projects/frontend-template.md

SIMILAR STRUCTURE:
- projects/python-app.md (sibling project)
```

## Implementation Guidelines

### Data Storage

1. **Cache Strategy**:
   - Store parsed graph in `.ainotes/cache/`
   - Include file modification times
   - Rebuild only changed files
   - Full rebuild option available

2. **Configuration**:
   - Support `.ainotes.yml` config file
   - Allow excluding directories/patterns
   - Custom link patterns
   - Output format preferences

### Error Handling

1. **Broken Links**:
   - Track but don't fail
   - Show in special command
   - Suggest possible matches

2. **Large Files**:
   - Truncate display output
   - Show truncation notice
   - Full content still searchable

3. **Circular References**:
   - Detect and handle gracefully
   - Don't infinite loop
   - Mark in graph display

### Output Formatting

1. **Principles**:
   - Machine-readable but human-understandable
   - Consistent structure across commands
   - Dense information presentation
   - Clear visual hierarchy

2. **Special Markers**:
   - `→` for outgoing links
   - `←` for incoming links
   - `↔` for bidirectional links
   - `[→X ←Y]` for link counts

## Project Structure

```
ainotes/
├── src/
│   ├── parser/          # Markdown parsing
│   ├── graph/           # Graph construction and algorithms
│   ├── search/          # Search implementations  
│   ├── commands/        # CLI command handlers
│   ├── cache/           # Caching logic
│   └── formatters/      # Output formatting
├── tests/
├── docs/
└── examples/
    └── sample-notes/    # Example note structure for testing
```

## Technology Recommendations

### Language Choice
Python 3.8+ recommended for:
- Rich ecosystem of markdown parsers
- NetworkX for graph algorithms
- Click for CLI framework
- Good balance of performance and development speed

### Key Dependencies
- `click` - CLI framework
- `python-markdown` or `mistune` - Markdown parsing
- `networkx` - Graph algorithms
- `watchdog` - File system monitoring
- `pyyaml` - Configuration files
- `rich` - Terminal formatting (optional)

### Alternative Stack (Rust)
If performance is critical:
- `clap` - CLI framework
- `pulldown-cmark` - Markdown parsing
- `petgraph` - Graph algorithms
- `notify` - File system monitoring

## Testing Requirements

1. **Unit Tests**:
   - Markdown parsing edge cases
   - Link resolution
   - Graph algorithms
   - Search functions

2. **Integration Tests**:
   - Full command workflows
   - Cache invalidation
   - Large knowledge base handling

3. **Test Data**:
   - Include sample knowledge base
   - Various link types
   - Nested folders
   - Orphaned notes
   - Circular references

## Success Criteria

1. Commands execute in under 1 second for typical operations
2. Handles 1000+ notes without performance degradation
3. Clear, consistent output format across all commands
4. Graceful handling of edge cases
5. Incremental updates work correctly
6. LLMs can effectively navigate knowledge bases using the tool

## Future Enhancements (Not in MVP)

1. Vector embeddings for semantic search
2. Web UI for visualization
3. Plugin system for custom commands
4. Export to various formats
5. Integration with note-taking apps
6. Real-time monitoring mode