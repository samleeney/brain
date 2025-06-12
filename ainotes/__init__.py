"""
AINodes - Knowledge Base Navigation Tool for LLMs

A command-line tool designed to help Large Language Models (LLMs) efficiently 
navigate and understand markdown-based knowledge bases by building a graph of 
connections between notes and providing optimized search interfaces.
"""

__version__ = "0.1.0"

# Main exports
from .models import Note, Link, Heading, KnowledgeGraph, GraphNode, LinkType, SearchResult

__all__ = [
    "Note",
    "Link", 
    "Heading",
    "KnowledgeGraph",
    "GraphNode",
    "LinkType",
    "SearchResult",
    "__version__",
]