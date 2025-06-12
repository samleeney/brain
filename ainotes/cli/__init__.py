"""
Command-line interface module for AINodes.

This module implements all CLI commands:
- overview: Display knowledge base summary
- ls: List notes in directory format
- search: Multi-strategy search
- read: Display note with context
- grep: Content search with regex
- glob: Find files by pattern
- trace: Find paths between notes
- related: Find related notes
"""

from .main import cli

__all__ = ["cli"]