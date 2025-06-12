"""
Search implementation module for AINodes.

This module provides various search strategies:
- Content search using regex
- Filename pattern matching
- Tag-based search
- Graph-aware search with connectivity scoring
"""

from .engine import SearchEngine

__all__ = ["SearchEngine"]