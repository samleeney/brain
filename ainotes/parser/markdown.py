"""Markdown parser for extracting structure and links from notes."""

import re
from pathlib import Path
from typing import List, Optional, Tuple, Set, Dict
from datetime import datetime
import yaml

from ..models import Note, Link, Heading, LinkType


class MarkdownParser:
    """Parses markdown files to extract structure and links."""
    
    # Regex patterns
    WIKI_LINK_PATTERN = re.compile(r'\[\[([^\]]+)\]\]')
    MD_LINK_PATTERN = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
    TAG_PATTERN = re.compile(r'(?:^|(?<=\s))#([a-zA-Z0-9_-]+)')
    HEADING_PATTERN = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
    FRONTMATTER_PATTERN = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)
    
    def parse_file(self, file_path: Path, notes_root: Path) -> Note:
        """Parse a single markdown file."""
        try:
            content = file_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            # Fallback to system encoding
            content = file_path.read_text()
        
        # Extract frontmatter
        frontmatter = self._extract_frontmatter(content)
        if frontmatter:
            # Remove frontmatter from content for parsing
            content = self.FRONTMATTER_PATTERN.sub('', content, count=1)
        
        # Extract headings
        headings = self._extract_headings(content)
        
        # Extract title (first heading or filename)
        title = headings[0].text if headings else file_path.stem
        
        # Extract links
        outgoing_links = self._extract_links(content, str(file_path))
        
        # Extract tags
        tags = self._extract_tags(content)
        
        # Calculate word count
        word_count = len(content.split())
        
        # Get file modification time
        stat = file_path.stat()
        last_modified = datetime.fromtimestamp(stat.st_mtime)
        
        # Calculate relative path
        try:
            relative_path = str(file_path.relative_to(notes_root))
        except ValueError:
            relative_path = str(file_path)
        
        return Note(
            path=str(file_path),
            relative_path=relative_path,
            title=title,
            headings=headings,
            outgoing_links=outgoing_links,
            tags=tags,
            frontmatter=frontmatter or {},
            last_modified=last_modified,
            word_count=word_count
        )
    
    def _extract_frontmatter(self, content: str) -> Optional[Dict]:
        """Extract YAML frontmatter from content."""
        match = self.FRONTMATTER_PATTERN.match(content)
        if match:
            try:
                return yaml.safe_load(match.group(1))
            except yaml.YAMLError:
                return None
        return None
    
    def _extract_headings(self, content: str) -> List[Heading]:
        """Extract all headings from content."""
        headings = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            match = self.HEADING_PATTERN.match(line.strip())
            if match:
                level = len(match.group(1))
                text = match.group(2).strip()
                slug = self._create_slug(text)
                headings.append(Heading(
                    level=level,
                    text=text,
                    line_number=line_num,
                    slug=slug
                ))
        
        return headings
    
    def _extract_links(self, content: str, source_path: str) -> List[Link]:
        """Extract all links from content."""
        links = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Extract wiki-style links
            for match in self.WIKI_LINK_PATTERN.finditer(line):
                link_text = match.group(1)
                # Handle alias syntax [[target|display]]
                if '|' in link_text:
                    target, display = link_text.split('|', 1)
                else:
                    target = display = link_text
                
                context = self._extract_context(content, match.start(), match.end())
                links.append(Link(
                    source_path=source_path,
                    target_path=None,  # Will be resolved later
                    link_type=LinkType.WIKI,
                    link_text=target.strip(),
                    context=context,
                    line_number=line_num,
                    is_broken=False
                ))
            
            # Extract markdown links
            for match in self.MD_LINK_PATTERN.finditer(line):
                display = match.group(1)
                target = match.group(2)
                
                # Skip external URLs
                if target.startswith(('http://', 'https://', 'ftp://', 'mailto:')):
                    continue
                
                context = self._extract_context(content, match.start(), match.end())
                links.append(Link(
                    source_path=source_path,
                    target_path=None,  # Will be resolved later
                    link_type=LinkType.MARKDOWN,
                    link_text=target,
                    context=context,
                    line_number=line_num,
                    is_broken=False
                ))
        
        return links
    
    def _extract_tags(self, content: str) -> Set[str]:
        """Extract all tags from content."""
        tags = set()
        for match in self.TAG_PATTERN.finditer(content):
            tags.add(match.group(1))
        return tags
    
    def _extract_context(self, content: str, match_start: int, match_end: int, 
                        context_chars: int = 100) -> str:
        """Extract surrounding context for a match."""
        # Find sentence boundaries
        start = max(0, match_start - context_chars)
        end = min(len(content), match_end + context_chars)
        
        # Try to find complete sentence
        context = content[start:end]
        
        # Clean up context
        context = ' '.join(context.split())  # Normalize whitespace
        
        # Add ellipsis if truncated
        if start > 0:
            context = '...' + context
        if end < len(content):
            context = context + '...'
        
        return context
    
    def _create_slug(self, text: str) -> str:
        """Create URL-friendly slug from heading text."""
        # Remove special characters and convert to lowercase
        slug = re.sub(r'[^\w\s-]', '', text.lower())
        # Replace spaces with hyphens
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')