# AINodes Usage Guide

## Quick Start

1. **Installation**: Currently tested in development mode
2. **Basic Usage**: Run commands from the project root

```bash
# Activate virtual environment (if using development setup)
source ainotes/venv/bin/activate

# Set Python path and run commands
PYTHONPATH=. python -m ainotes.cli.main --notes-root path/to/notes COMMAND
```

## Available Commands

### Overview Command
Get a high-level summary of your knowledge base:

```bash
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes overview
```

**Output includes:**
- Total notes and links count
- Directory structure analysis
- Top hub nodes (most connected)
- Detected clusters
- Orphaned notes
- Recent activity summary
- Broken links warning

### List Command
Browse notes in a directory-style format:

```bash
# List all notes
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes ls

# List notes in specific directory
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes ls projects
```

**Features:**
- Tree-style output showing directories and files
- Link counts `[→X ←Y]` for each note (outgoing/incoming)
- Directory summaries with note counts

### Search Command
Multi-strategy search across the knowledge base:

```bash
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes search "react"
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes search "authentication"
```

**Search strategies:**
- **Text content**: Regex matching in file contents
- **Filenames**: Pattern matching in paths
- **Tags**: Matching `#tag` patterns
- **Headings**: Matching heading text

**Output includes:**
- Relevance scores
- Match context snippets
- Graph information (connections, clusters)
- Line numbers for text matches

### Read Command
Display a note with full context:

```bash
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes read web-app
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes read index.md
```

**Output includes:**
- File metadata (location, modified date, tags, word count)
- Incoming links (what links TO this note)
- Outgoing links (what this note links TO)
- Full note content

### Trace Command
Find connection paths between two notes:

```bash
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes trace index.md react.md
```

**Features:**
- Finds shortest path(s) between notes
- Shows multiple paths if available
- Includes link context for each hop
- Displays path length

### Related Command
Find notes related to a given note:

```bash
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes related web-app.md
```

**Relationship types:**
- **Directly linked**: Notes with incoming/outgoing links
- **Same cluster**: Notes in the same detected community
- **Similar structure**: Notes with similar link patterns
- **Shared tags**: Notes with common tags

### Grep Command
Search file contents with regex patterns:

```bash
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes grep "authentication"
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes grep "React.*component"
```

**Features:**
- Full regex support
- Shows filename:line_number: matching_line
- Context lines around matches

### Glob Command
Find files matching glob patterns:

```bash
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes glob "**/*react*.md"
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes glob "daily/*.md"
```

**Features:**
- Standard glob syntax (`*`, `**`, `?`)
- Searches both filenames and relative paths

### Cache Commands
Manage the knowledge graph cache:

```bash
# Clear cache
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes cache clear

# Rebuild cache
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes cache rebuild

# Show cache statistics
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes cache stats
```

### Stats Command
Show detailed graph statistics:

```bash
PYTHONPATH=. python -m ainotes.cli.main --notes-root tests/sample_notes stats
```

## Supported Markdown Features

### Link Types
1. **Wiki-style links**: `[[note-name]]` or `[[note-name|display text]]`
2. **Markdown links**: `[display text](relative/path/to/note.md)`
3. **Tags**: `#tag-name` anywhere in the document

### Link Resolution Rules
- Wiki links first look for exact filename matches
- Case-insensitive matching as fallback
- Relative paths resolved from current note location
- Broken links tracked but don't cause failures

### Document Structure
- **Headings**: All levels (`#` to `######`) parsed for hierarchy
- **YAML frontmatter**: Optional metadata support
- **Content extraction**: Line numbers and context preserved

## Example Workflow

1. **Start with overview** to understand your knowledge base:
   ```bash
   PYTHONPATH=. python -m ainotes.cli.main --notes-root notes overview
   ```

2. **Browse directories** to navigate structure:
   ```bash
   PYTHONPATH=. python -m ainotes.cli.main --notes-root notes ls projects
   ```

3. **Search for topics** you're interested in:
   ```bash
   PYTHONPATH=. python -m ainotes.cli.main --notes-root notes search "machine learning"
   ```

4. **Read specific notes** with full context:
   ```bash
   PYTHONPATH=. python -m ainotes.cli.main --notes-root notes read ml-project.md
   ```

5. **Find related content**:
   ```bash
   PYTHONPATH=. python -m ainotes.cli.main --notes-root notes related ml-project.md
   ```

6. **Trace connections** between ideas:
   ```bash
   PYTHONPATH=. python -m ainotes.cli.main --notes-root notes trace idea.md implementation.md
   ```

## Performance Notes

- **Initial scan**: ~5 seconds for 1000 notes
- **Cached operations**: ~1 second for most commands
- **Memory usage**: Efficient graph representation
- **Incremental updates**: Only changed files re-parsed

## Tips for LLM Usage

1. **Start with overview** to get the big picture
2. **Use search** to find relevant content quickly  
3. **Read notes** to get full context before working
4. **Use trace** to understand idea development
5. **Check related** to find additional context
6. **Use stats** to understand knowledge base structure

The tool is optimized for LLM consumption with dense, structured output that maximizes information per token.