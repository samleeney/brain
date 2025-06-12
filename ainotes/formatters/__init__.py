"""
Output formatting module for AINodes.

This module provides formatters for different output types:
- Terminal output with consistent styling
- LLM-optimized dense text format
- Structured data representations
- Visual markers and hierarchy
"""

from .output import LLMFormatter

__all__ = ["LLMFormatter"]