# AINodes Technical Implementation Details

## Data Models

### Core Data Structures

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict, Optional, Set
from enum import Enum

class LinkType(Enum):
    WIKI = "wiki"          # [[note-name]]
    MARKDOWN = "markdown"  # [text](file.md)
    TAG = "tag"           # #tag-name

@dataclass
class Heading:
    """Represents a heading in a markdown file"""
    level: int          # 1-6 for # to ######
    text: str          # Heading text
    line_number: int   # Line number in file
    slug: str          # URL-friendly version for anchoring

@dataclass
class Link:
    """Represents a link between notes"""
    source_path: str      # Absolute path of source note
    target_path: str      # Absolute path of target note (None if broken)
    link_type: LinkType   # Type of link
    link_text: str        # Display text of link
    context: str          # Surrounding sentence/paragraph
    line_number: int      # Line number in source file
    is_broken: bool       # True if target doesn't exist

@dataclass
class Note:
    """Represents a single markdown note"""
    path: str                    # Absolute file path
    relative_path: str           # Path relative to notes root
    title: str                   # Filename or first # heading
    headings: List[Heading]      # All headings in order
    outgoing_links: List[Link]   # Links FROM this note
    tags: Set[str]              # All #tags in the note
    frontmatter: Dict           # YAML frontmatter if present
    last_modified: datetime     # File modification time
    word_count: int            # Approximate word count
    
@dataclass 
class GraphNode:
    """Node in the knowledge graph"""
    note: Note
    incoming_links: List[Link]   # Links TO this note
    in_degree: int              # Number of incoming links
    out_degree: int             # Number of outgoing links
    cluster_id: Optional[int]   # Assigned cluster ID
    centrality_score: float     # Graph centrality measure

@dataclass
class KnowledgeGraph:
    """The complete knowledge graph"""
    nodes: Dict[str, GraphNode]  # Path -> GraphNode mapping
    clusters: List[Set[str]]     # List of note clusters
    hub_nodes: List[str]         # Paths of hub notes
    orphan_nodes: List[str]      # Paths of unconnected notes
    broken_links: List[Link]     # All broken links
    last_updated: datetime       # Last graph build time
```

## Parsing Implementation

### Markdown Parser

```python
import re
from pathlib import Path

class MarkdownParser:
    """Parses markdown files to extract structure and links"""
    
    # Regex patterns
    WIKI_LINK_PATTERN = r'\[\[([^\]]+)\]\]'
    MD_LINK_PATTERN = r'\[([^\]]+)\]\(([^)]+)\)'
    TAG_PATTERN = r'#([a-zA-Z0-9_-]+)'
    HEADING_PATTERN = r'^(#{1,6})\s+(.+)$'
    
    def parse_file(self, file_path: Path) -> Note:
        """Parse a single markdown file"""
        # Implementation details:
        # 1. Read file content
        # 2. Extract frontmatter if present
        # 3. Parse headings line by line
        # 4. Extract all links with context
        # 5. Extract tags
        # 6. Build Note object
        
    def extract_link_context(self, content: str, match_pos: int) -> str:
        """Extract surrounding sentence for link context"""
        # Find sentence boundaries before and after link
        # Return the complete sentence containing the link
        
    def resolve_wiki_link(self, link_text: str, source_path: Path) -> Path:
        """Resolve [[wiki-link]] to actual file path"""
        # 1. Check if link contains path separator
        # 2. Try exact match with .md extension
        # 3. Try case-insensitive match
        # 4. Try partial match in same directory
        # 5. Try partial match globally
```

### Link Resolution Algorithm

```python
class LinkResolver:
    """Resolves different link types to absolute paths"""
    
    def __init__(self, notes_root: Path):
        self.notes_root = notes_root
        self.file_index = self._build_file_index()
    
    def _build_file_index(self) -> Dict[str, List[Path]]:
        """Build index of all markdown files for fast lookup"""
        index = {}
        for md_file in self.notes_root.rglob("*.md"):
            name = md_file.stem.lower()
            if name not in index:
                index[name] = []
            index[name].append(md_file)
        return index
    
    def resolve_link(self, link: str, source_file: Path) -> Optional[Path]:
        """Resolve any link type to absolute path"""
        # Handle different link formats
        # Return None if link cannot be resolved
```

## Graph Algorithms

### Cluster Detection

```python
import networkx as nx
from typing import List, Set

class GraphAnalyzer:
    """Analyzes the knowledge graph structure"""
    
    def detect_clusters(self, graph: nx.DiGraph) -> List[Set[str]]:
        """Detect communities/clusters in the graph"""
        # Use Louvain algorithm for community detection
        # Consider both link structure and link weights
        
    def find_hub_nodes(self, graph: nx.DiGraph, top_n: int = 10) -> List[str]:
        """Find most connected nodes"""
        # Calculate various centrality measures:
        # - Degree centrality (most connections)
        # - Betweenness centrality (bridge nodes)
        # - PageRank (importance propagation)
        
    def find_shortest_paths(self, graph: nx.DiGraph, 
                          source: str, target: str) -> List[List[str]]:
        """Find all shortest paths between notes"""
        # Use networkx shortest path algorithms
        # Return multiple paths if they exist
```

### Related Notes Algorithm

```python
def find_related_notes(graph: KnowledgeGraph, note_path: str) -> List[str]:
    """Find notes related to the given note"""
    
    related = []
    node = graph.nodes[note_path]
    
    # 1. Direct connections (immediate neighbors)
    direct = set()
    for link in node.note.outgoing_links:
        direct.add(link.target_path)
    for link in node.incoming_links:
        direct.add(link.source_path)
    
    # 2. Same cluster members
    cluster_members = set()
    if node.cluster_id is not None:
        cluster_members = graph.clusters[node.cluster_id]
    
    # 3. Structural similarity (similar link patterns)
    # Notes that link to similar sets of notes
    
    # 4. Tag similarity
    # Notes sharing multiple tags
    
    # Score and rank all related notes
    return sorted(related, key=lambda x: x.score, reverse=True)
```

## Search Implementation

### Multi-Strategy Search

```python
class SearchEngine:
    """Implements various search strategies"""
    
    def search(self, query: str, graph: KnowledgeGraph) -> List[SearchResult]:
        """Combined search across all strategies"""
        results = []
        
        # 1. Text search (content matching)
        text_results = self.search_text(query, graph)
        
        # 2. Path search (filename matching)
        path_results = self.search_paths(query, graph)
        
        # 3. Tag search
        tag_results = self.search_tags(query, graph)
        
        # 4. Title/heading search
        heading_results = self.search_headings(query, graph)
        
        # Merge and score results
        return self.merge_results([text_results, path_results, 
                                  tag_results, heading_results])
    
    def search_text(self, pattern: str, graph: KnowledgeGraph) -> List[SearchResult]:
        """Search note contents with regex"""
        # Compile regex pattern
        # Search through cached content or files
        # Extract matching lines with context
```

## Caching Strategy

### Cache Structure

```python
class CacheManager:
    """Manages persistent cache of parsed graph"""
    
    CACHE_DIR = Path.home() / ".ainotes" / "cache"
    CACHE_VERSION = "1.0"
    
    def __init__(self, notes_root: Path):
        self.notes_root = notes_root
        self.cache_file = self.CACHE_DIR / f"{notes_root.name}.pickle"
        self.metadata_file = self.CACHE_DIR / f"{notes_root.name}.meta.json"
    
    def load_cache(self) -> Optional[KnowledgeGraph]:
        """Load cached graph if valid"""
        # Check cache version compatibility
        # Verify file modification times
        # Return None if cache invalid
        
    def save_cache(self, graph: KnowledgeGraph):
        """Save graph to cache"""
        # Store pickled graph
        # Store metadata (file mod times, version)
        
    def invalidate_changed_files(self, graph: KnowledgeGraph) -> List[Path]:
        """Check which files changed since cache"""
        # Compare file modification times
        # Return list of changed files
```

## Output Formatting

### LLM-Optimized Formatter

```python
class LLMFormatter:
    """Formats output optimized for LLM consumption"""
    
    def format_overview(self, graph: KnowledgeGraph) -> str:
        """Format knowledge base overview"""
        # Use consistent markers and structure
        # Emphasize most important information
        # Keep dense but readable
        
    def format_search_results(self, results: List[SearchResult]) -> str:
        """Format search results with context"""
        # Include relevance scores
        # Show graph context
        # Highlight matches
        
    def format_note_read(self, node: GraphNode, content: str) -> str:
        """Format note with full context"""
        # Show metadata header
        # List connections with context
        # Include content with proper formatting
```

## Performance Optimizations

### Incremental Updates

```python
class IncrementalUpdater:
    """Updates graph incrementally for changed files"""
    
    def update_graph(self, graph: KnowledgeGraph, 
                    changed_files: List[Path]) -> KnowledgeGraph:
        """Update only changed portions of graph"""
        
        for file_path in changed_files:
            # Remove old node and links
            self.remove_node(graph, file_path)
            
            # Parse updated file
            new_note = self.parser.parse_file(file_path)
            
            # Add new node
            self.add_node(graph, new_note)
            
            # Update affected nodes (backlinks)
            self.update_backlinks(graph, new_note)
        
        # Recalculate graph metrics
        self.recalculate_metrics(graph)
        
        return graph
```

### Large File Handling

```python
def read_large_file_preview(file_path: Path, max_lines: int = 100) -> str:
    """Read preview of large files"""
    # Read first N lines
    # Add truncation notice
    # Ensure complete sections
```

## Configuration Schema

```yaml
# .ainotes.yml
version: "1.0"

# Paths to exclude from indexing
exclude_patterns:
  - "*.tmp"
  - ".obsidian/*"
  - "_archive/*"

# Link resolution settings
link_resolution:
  case_sensitive: false
  prefer_exact_match: true
  search_global: true

# Output settings
output:
  max_results: 50
  context_lines: 2
  truncate_content: 1000  # lines

# Performance settings  
performance:
  cache_enabled: true
  incremental_updates: true
  max_file_size_mb: 10

# Custom patterns
custom_patterns:
  # Additional link patterns to recognize
  link_patterns:
    - '\{\{([^}]+)\}\}'  # Dendron-style links
  
  # Additional tag patterns
  tag_patterns:
    - '@([a-zA-Z0-9_-]+)'  # @mentions as tags
```

## Error Handling

### Common Error Scenarios

1. **Broken Links**
   - Track but don't fail
   - Provide `ainotes check-links` command
   - Suggest possible matches

2. **Encoding Issues**
   - Try UTF-8 first
   - Fallback to system encoding
   - Skip binary files

3. **Circular References**
   - Detect during graph building
   - Mark but continue processing
   - Handle in path algorithms

4. **Memory Issues**
   - Stream large files
   - Limit graph algorithm depth
   - Paginate large result sets

## Testing Approach

### Unit Test Examples

```python
def test_wiki_link_parsing():
    """Test wiki-style link extraction"""
    content = "This is a [[test link]] and [[another|with alias]]"
    links = parser.extract_wiki_links(content)
    assert len(links) == 2
    assert links[0].link_text == "test link"
    assert links[1].link_text == "with alias"

def test_circular_reference_handling():
    """Test graph handles circular references"""
    # Create notes A -> B -> C -> A
    # Ensure graph builds without infinite loop
    # Ensure shortest path algorithm terminates

def test_large_knowledge_base_performance():
    """Test performance with 1000+ notes"""
    # Generate test knowledge base
    # Measure command execution times
    # Assert all complete under 1 second
```

This technical specification provides detailed implementation guidance while maintaining flexibility for the developer to make specific technology choices.