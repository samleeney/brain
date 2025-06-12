# AINodes Build Plan

## Project Setup and Structure

### Week 1: Foundation and Core Parsing

#### Day 1-2: Project Setup
- [ ] Initialize Python project with poetry/pip
- [ ] Setup project structure:
  ```
  ainotes/
  ├── ainotes/
  │   ├── __init__.py
  │   ├── cli.py           # Main CLI entry point
  │   ├── parser/
  │   │   ├── __init__.py
  │   │   ├── markdown.py  # Markdown parsing logic
  │   │   └── links.py     # Link extraction and resolution
  │   ├── graph/
  │   │   ├── __init__.py
  │   │   ├── builder.py   # Graph construction
  │   │   └── algorithms.py # Graph algorithms (shortest path, clusters)
  │   ├── search/
  │   │   ├── __init__.py
  │   │   ├── text.py      # Text/regex search
  │   │   └── glob.py      # File pattern matching
  │   ├── cache/
  │   │   ├── __init__.py
  │   │   └── manager.py   # Cache management
  │   └── formatters/
  │       ├── __init__.py
  │       └── output.py    # Output formatting for LLMs
  ├── tests/
  ├── docs/
  └── setup.py
  ```
- [ ] Install core dependencies:
  - `click>=8.0` - CLI framework
  - `python-markdown>=3.0` - Markdown parsing
  - `networkx>=2.5` - Graph algorithms
  - `pyyaml>=5.0` - Config files
  - `watchdog>=2.0` - File monitoring

#### Day 3-4: Markdown Parser
- [ ] Implement markdown file parser:
  - [ ] Extract headings with hierarchy levels
  - [ ] Parse wiki-style links `[[note]]`
  - [ ] Parse markdown links `[text](file.md)`
  - [ ] Extract tags `#tag-name`
  - [ ] Parse YAML frontmatter
- [ ] Implement link resolver:
  - [ ] Resolve relative paths
  - [ ] Handle case-insensitive matching
  - [ ] Track broken links
  - [ ] Store link context (surrounding text)

#### Day 5-7: Graph Builder
- [ ] Create Note data model
- [ ] Create Link data model
- [ ] Implement graph builder:
  - [ ] Build directed graph from parsed notes
  - [ ] Calculate node metrics (in/out degree)
  - [ ] Detect bidirectional links
  - [ ] Store metadata with nodes and edges

### Week 2: Search and Navigation

#### Day 8-9: File System Operations
- [ ] Implement `ls` functionality:
  - [ ] Directory traversal
  - [ ] File listing with link counts
  - [ ] Hierarchical display
- [ ] Implement `glob` functionality:
  - [ ] Pattern matching
  - [ ] Recursive search

#### Day 10-11: Text Search
- [ ] Implement `grep` functionality:
  - [ ] Regex pattern matching
  - [ ] Line number tracking
  - [ ] Context extraction
- [ ] Implement combined search:
  - [ ] Merge results from multiple strategies
  - [ ] Score and rank results

#### Day 12-14: Graph Algorithms
- [ ] Implement shortest path finding
- [ ] Implement cluster detection
- [ ] Implement hub node identification
- [ ] Create "related notes" algorithm:
  - [ ] Direct connections
  - [ ] Same cluster membership
  - [ ] Structural similarity

### Week 3: CLI Interface and Commands

#### Day 15-16: Core CLI Structure
- [ ] Setup Click application
- [ ] Implement base command structure
- [ ] Add global options (config file, cache control)
- [ ] Create output formatter base class

#### Day 17-18: Basic Commands
- [ ] Implement `overview` command:
  - [ ] Summary statistics
  - [ ] Hub nodes display
  - [ ] Cluster summary
- [ ] Implement `ls` command:
  - [ ] Path argument handling
  - [ ] Tree-style output
  - [ ] Link count display

#### Day 19-20: Search Commands
- [ ] Implement `search` command:
  - [ ] Multi-strategy search
  - [ ] Result ranking
  - [ ] Context display
- [ ] Implement `grep` command:
  - [ ] Regex support
  - [ ] File filtering
- [ ] Implement `glob` command

#### Day 21: Navigation Commands
- [ ] Implement `read` command:
  - [ ] Full context display
  - [ ] Link information
  - [ ] Metadata display
- [ ] Implement `trace` command:
  - [ ] Path finding
  - [ ] Multiple path display
- [ ] Implement `related` command

### Week 4: Optimization and Polish

#### Day 22-23: Caching System
- [ ] Implement cache manager:
  - [ ] Serialize graph to disk
  - [ ] Track file modifications
  - [ ] Incremental updates
  - [ ] Cache invalidation
- [ ] Add cache commands:
  - [ ] Clear cache
  - [ ] Rebuild cache
  - [ ] Show cache stats

#### Day 24-25: Configuration
- [ ] Implement config file support:
  - [ ] `.ainotes.yml` parsing
  - [ ] Ignore patterns
  - [ ] Custom settings
- [ ] Add configuration validation
- [ ] Support user preferences

#### Day 26-27: Error Handling and Edge Cases
- [ ] Handle circular references
- [ ] Handle large files gracefully
- [ ] Improve error messages
- [ ] Add progress indicators for long operations
- [ ] Handle missing/broken links

#### Day 28: Testing and Documentation
- [ ] Write comprehensive tests:
  - [ ] Unit tests for parsers
  - [ ] Integration tests for commands
  - [ ] Performance tests
- [ ] Create user documentation
- [ ] Add inline help text

## Testing Strategy

### Test Data Structure
Create `tests/sample_notes/`:
```
sample_notes/
├── index.md                 # Hub note with many links
├── projects/
│   ├── web-app.md          # Links to ../learning/react.md
│   └── api.md              # Links to auth subfolder
├── learning/
│   ├── react.md            # Bidirectional link with projects/web-app.md
│   └── python.md           # Isolated note
├── daily/
│   ├── 2024-01-01.md       # Links to various notes
│   └── 2024-01-02.md       # Sequential links
└── orphaned.md             # No links in or out
```

### Test Cases

1. **Parser Tests**:
   - Various link formats
   - Nested headings
   - Special characters in links
   - Broken link handling

2. **Graph Tests**:
   - Shortest path algorithms
   - Cluster detection
   - Circular reference handling

3. **Search Tests**:
   - Regex edge cases
   - Large result sets
   - Empty results

4. **Integration Tests**:
   - Full command workflows
   - Cache persistence
   - File updates

## Development Milestones

1. **Milestone 1** (End of Week 1): Core parsing works, can build graph
2. **Milestone 2** (End of Week 2): All search strategies implemented
3. **Milestone 3** (End of Week 3): All CLI commands functional
4. **Milestone 4** (End of Week 4): Optimized, tested, and documented

## Definition of Done

- [ ] All commands execute in <1 second for 1000 notes
- [ ] 90%+ test coverage
- [ ] Handles all specified edge cases
- [ ] Clear documentation with examples
- [ ] Installable via pip
- [ ] Example knowledge base included
- [ ] LLM-friendly output format verified