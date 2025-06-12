"""Link resolution for markdown and wiki-style links."""

from pathlib import Path
from typing import Dict, List, Optional
import os

from ..models import Link, LinkType


class LinkResolver:
    """Resolves different link types to absolute paths."""
    
    def __init__(self, notes_root: Path):
        self.notes_root = notes_root
        self.file_index = self._build_file_index()
    
    def _build_file_index(self) -> Dict[str, List[Path]]:
        """Build index of all markdown files for fast lookup."""
        index = {}
        
        # Find all markdown files
        for md_file in self.notes_root.rglob("*.md"):
            # Skip hidden files and directories
            if any(part.startswith('.') for part in md_file.parts):
                continue
            
            # Index by stem (filename without extension)
            stem = md_file.stem
            stem_lower = stem.lower()
            
            # Add to exact match index
            if stem not in index:
                index[stem] = []
            index[stem].append(md_file)
            
            # Add to lowercase index if different
            if stem_lower != stem:
                if stem_lower not in index:
                    index[stem_lower] = []
                index[stem_lower].append(md_file)
        
        return index
    
    def resolve_link(self, link: Link) -> Link:
        """Resolve a link to its target path."""
        source_path = Path(link.source_path)
        
        if link.link_type == LinkType.WIKI:
            target_path = self._resolve_wiki_link(link.link_text, source_path)
        elif link.link_type == LinkType.MARKDOWN:
            target_path = self._resolve_markdown_link(link.link_text, source_path)
        else:
            target_path = None
        
        # Update link with resolved path
        link.target_path = str(target_path) if target_path else None
        link.is_broken = target_path is None or not target_path.exists()
        
        return link
    
    def _resolve_wiki_link(self, link_text: str, source_path: Path) -> Optional[Path]:
        """Resolve [[wiki-link]] to actual file path."""
        # Remove any leading/trailing whitespace
        link_text = link_text.strip()
        
        # Strategy 1: Check if link contains path separator (subfolder reference)
        if '/' in link_text:
            # Try as relative path from source
            relative_target = source_path.parent / f"{link_text}.md"
            if relative_target.exists():
                return relative_target
            
            # Try as absolute path from notes root
            absolute_target = self.notes_root / f"{link_text}.md"
            if absolute_target.exists():
                return absolute_target
        
        # Strategy 2: Exact match in index
        if link_text in self.file_index:
            candidates = self.file_index[link_text]
            if candidates:
                # Prefer file in same directory
                same_dir = [c for c in candidates if c.parent == source_path.parent]
                if same_dir:
                    return same_dir[0]
                # Otherwise return first match
                return candidates[0]
        
        # Strategy 3: Case-insensitive match
        link_lower = link_text.lower()
        if link_lower in self.file_index:
            candidates = self.file_index[link_lower]
            if candidates:
                # Prefer file in same directory
                same_dir = [c for c in candidates if c.parent == source_path.parent]
                if same_dir:
                    return same_dir[0]
                return candidates[0]
        
        # Strategy 4: Partial match in same directory
        source_dir = source_path.parent
        for file in source_dir.glob("*.md"):
            if link_lower in file.stem.lower():
                return file
        
        # Strategy 5: Partial match globally (expensive, use sparingly)
        for stem, paths in self.file_index.items():
            if link_lower in stem.lower():
                return paths[0]
        
        return None
    
    def _resolve_markdown_link(self, link_text: str, source_path: Path) -> Optional[Path]:
        """Resolve markdown link [text](path) to actual file path."""
        # Handle anchor links
        if link_text.startswith('#'):
            return source_path  # Link to same file
        
        source_dir = source_path.parent
        
        # Try as-is (might already have .md extension)
        target = source_dir / link_text
        if target.exists() and target.suffix == '.md':
            return target
        
        # Try adding .md extension
        target_with_md = source_dir / f"{link_text}.md"
        if target_with_md.exists():
            return target_with_md
        
        # Try without .md extension if it was included
        if link_text.endswith('.md'):
            base_name = link_text[:-3]
            target_base = source_dir / base_name
            if target_base.exists():
                return target_base
        
        # Handle relative paths with ../
        try:
            resolved = source_dir / link_text
            resolved = resolved.resolve()
            
            # Check if resolved path is within notes root
            if self.notes_root in resolved.parents or resolved == self.notes_root:
                if resolved.exists():
                    return resolved
                
                # Try with .md extension
                resolved_md = resolved.with_suffix('.md')
                if resolved_md.exists():
                    return resolved_md
        except (ValueError, OSError):
            pass
        
        return None
    
    def update_index(self, added_files: List[Path] = None, 
                    removed_files: List[Path] = None):
        """Update file index with changes."""
        # Remove deleted files
        if removed_files:
            for file in removed_files:
                stem = file.stem
                stem_lower = stem.lower()
                
                if stem in self.file_index:
                    self.file_index[stem] = [
                        p for p in self.file_index[stem] if p != file
                    ]
                    if not self.file_index[stem]:
                        del self.file_index[stem]
                
                if stem_lower in self.file_index:
                    self.file_index[stem_lower] = [
                        p for p in self.file_index[stem_lower] if p != file
                    ]
                    if not self.file_index[stem_lower]:
                        del self.file_index[stem_lower]
        
        # Add new files
        if added_files:
            for file in added_files:
                stem = file.stem
                stem_lower = stem.lower()
                
                if stem not in self.file_index:
                    self.file_index[stem] = []
                if file not in self.file_index[stem]:
                    self.file_index[stem].append(file)
                
                if stem_lower != stem:
                    if stem_lower not in self.file_index:
                        self.file_index[stem_lower] = []
                    if file not in self.file_index[stem_lower]:
                        self.file_index[stem_lower].append(file)