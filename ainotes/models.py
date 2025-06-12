"""Core data models for AINodes."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional, Set
from enum import Enum
from pathlib import Path


class LinkType(Enum):
    """Types of links between notes."""
    WIKI = "wiki"          # [[note-name]]
    MARKDOWN = "markdown"  # [text](file.md)
    TAG = "tag"           # #tag-name


@dataclass
class Heading:
    """Represents a heading in a markdown file."""
    level: int          # 1-6 for # to ######
    text: str          # Heading text
    line_number: int   # Line number in file
    slug: str          # URL-friendly version for anchoring


@dataclass
class Link:
    """Represents a link between notes."""
    source_path: str      # Absolute path of source note
    target_path: Optional[str]  # Absolute path of target note (None if broken)
    link_type: LinkType   # Type of link
    link_text: str        # Display text of link
    context: str          # Surrounding sentence/paragraph
    line_number: int      # Line number in source file
    is_broken: bool = False  # True if target doesn't exist


@dataclass
class Note:
    """Represents a single markdown note."""
    path: str                    # Absolute file path
    relative_path: str           # Path relative to notes root
    title: str                   # Filename or first # heading
    headings: List[Heading] = field(default_factory=list)  # All headings in order
    outgoing_links: List[Link] = field(default_factory=list)  # Links FROM this note
    tags: Set[str] = field(default_factory=set)  # All #tags in the note
    frontmatter: Dict = field(default_factory=dict)  # YAML frontmatter if present
    last_modified: Optional[datetime] = None  # File modification time
    word_count: int = 0  # Approximate word count
    

@dataclass 
class GraphNode:
    """Node in the knowledge graph."""
    note: Note
    incoming_links: List[Link] = field(default_factory=list)  # Links TO this note
    in_degree: int = 0  # Number of incoming links
    out_degree: int = 0  # Number of outgoing links
    cluster_id: Optional[int] = None  # Assigned cluster ID
    centrality_score: float = 0.0  # Graph centrality measure


@dataclass
class KnowledgeGraph:
    """The complete knowledge graph."""
    nodes: Dict[str, GraphNode] = field(default_factory=dict)  # Path -> GraphNode mapping
    clusters: List[Set[str]] = field(default_factory=list)  # List of note clusters
    hub_nodes: List[str] = field(default_factory=list)  # Paths of hub notes
    orphan_nodes: List[str] = field(default_factory=list)  # Paths of unconnected notes
    broken_links: List[Link] = field(default_factory=list)  # All broken links
    last_updated: Optional[datetime] = None  # Last graph build time


@dataclass
class SearchResult:
    """Result from a search operation."""
    note_path: str
    score: float
    match_type: str  # 'text', 'path', 'tag', 'heading'
    context: Optional[str] = None
    line_number: Optional[int] = None
    graph_node: Optional[GraphNode] = None