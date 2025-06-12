"""Multi-strategy search engine for knowledge base."""

import re
from pathlib import Path
from typing import List, Dict, Set
import fnmatch

from ..models import KnowledgeGraph, SearchResult


class SearchEngine:
    """Implements various search strategies."""
    
    def __init__(self, graph: KnowledgeGraph):
        self.graph = graph
    
    def search(self, query: str, limit: int = 50) -> List[SearchResult]:
        """Combined search across all strategies."""
        results = []
        
        # 1. Text search (content matching)
        text_results = self.search_text(query)
        results.extend(text_results)
        
        # 2. Path search (filename matching)
        path_results = self.search_paths(query)
        results.extend(path_results)
        
        # 3. Tag search
        tag_results = self.search_tags(query)
        results.extend(tag_results)
        
        # 4. Title/heading search
        heading_results = self.search_headings(query)
        results.extend(heading_results)
        
        # Merge and score results
        merged_results = self._merge_results(results)
        
        # Sort by score and limit
        merged_results.sort(key=lambda x: x.score, reverse=True)
        return merged_results[:limit]
    
    def search_text(self, pattern: str) -> List[SearchResult]:
        """Search note contents with regex."""
        results = []
        
        try:
            # Compile regex pattern (case-insensitive by default)
            regex = re.compile(pattern, re.IGNORECASE | re.MULTILINE)
        except re.error:
            # If regex compilation fails, treat as literal string
            escaped_pattern = re.escape(pattern)
            regex = re.compile(escaped_pattern, re.IGNORECASE | re.MULTILINE)
        
        for node in self.graph.nodes.values():
            try:
                # Read file content
                content = Path(node.note.path).read_text(encoding='utf-8')
                
                # Find all matches
                matches = list(regex.finditer(content))
                if matches:
                    # Calculate score based on number of matches
                    score = len(matches) * 1.0
                    
                    # Get first match context
                    first_match = matches[0]
                    context = self._extract_match_context(content, first_match)
                    line_number = content[:first_match.start()].count('\n') + 1
                    
                    results.append(SearchResult(
                        note_path=node.note.path,
                        score=score,
                        match_type='text',
                        context=context,
                        line_number=line_number,
                        graph_node=node
                    ))
                    
            except (UnicodeDecodeError, FileNotFoundError):
                continue
        
        return results
    
    def search_paths(self, query: str) -> List[SearchResult]:
        """Search note paths/filenames."""
        results = []
        query_lower = query.lower()
        
        for node in self.graph.nodes.values():
            path = Path(node.note.path)
            
            # Check filename match
            filename_score = 0
            if query_lower in path.stem.lower():
                # Exact match in filename gets high score
                if query_lower == path.stem.lower():
                    filename_score = 10.0
                else:
                    filename_score = 5.0
            
            # Check path components
            path_score = 0
            for part in path.parts:
                if query_lower in part.lower():
                    path_score += 1.0
            
            total_score = filename_score + path_score
            if total_score > 0:
                results.append(SearchResult(
                    note_path=node.note.path,
                    score=total_score,
                    match_type='path',
                    context=f"Path: {node.note.relative_path}",
                    graph_node=node
                ))
        
        return results
    
    def search_tags(self, query: str) -> List[SearchResult]:
        """Search note tags."""
        results = []
        query_lower = query.lower()
        
        # Remove # if present in query
        if query_lower.startswith('#'):
            query_lower = query_lower[1:]
        
        for node in self.graph.nodes.values():
            matching_tags = []
            for tag in node.note.tags:
                if query_lower in tag.lower():
                    matching_tags.append(tag)
            
            if matching_tags:
                # Score based on exact vs partial matches
                score = sum(3.0 if query_lower == tag.lower() else 1.0 
                           for tag in matching_tags)
                
                context = f"Tags: {', '.join(f'#{tag}' for tag in matching_tags)}"
                
                results.append(SearchResult(
                    note_path=node.note.path,
                    score=score,
                    match_type='tag',
                    context=context,
                    graph_node=node
                ))
        
        return results
    
    def search_headings(self, query: str) -> List[SearchResult]:
        """Search note headings."""
        results = []
        query_lower = query.lower()
        
        for node in self.graph.nodes.values():
            matching_headings = []
            
            # Check note title
            if query_lower in node.note.title.lower():
                score = 5.0 if query_lower == node.note.title.lower() else 2.0
                matching_headings.append((node.note.title, score, 0))
            
            # Check all headings
            for heading in node.note.headings:
                if query_lower in heading.text.lower():
                    score = 3.0 if query_lower == heading.text.lower() else 1.0
                    matching_headings.append((heading.text, score, heading.line_number))
            
            if matching_headings:
                # Use highest scoring heading
                best_heading = max(matching_headings, key=lambda x: x[1])
                heading_text, score, line_num = best_heading
                
                context = f"Heading: {heading_text}"
                
                results.append(SearchResult(
                    note_path=node.note.path,
                    score=score,
                    match_type='heading',
                    context=context,
                    line_number=line_num if line_num > 0 else None,
                    graph_node=node
                ))
        
        return results
    
    def glob_search(self, pattern: str) -> List[str]:
        """Find files matching glob patterns."""
        matching_paths = []
        
        for node in self.graph.nodes.values():
            path = Path(node.note.path)
            
            # Check against relative path
            if fnmatch.fnmatch(node.note.relative_path, pattern):
                matching_paths.append(node.note.path)
            
            # Also check against just filename
            elif fnmatch.fnmatch(path.name, pattern):
                matching_paths.append(node.note.path)
        
        return sorted(matching_paths)
    
    def grep_search(self, pattern: str, context_lines: int = 2) -> List[Dict]:
        """Search file contents with grep-like output."""
        results = []
        
        try:
            regex = re.compile(pattern, re.IGNORECASE | re.MULTILINE)
        except re.error:
            escaped_pattern = re.escape(pattern)
            regex = re.compile(escaped_pattern, re.IGNORECASE | re.MULTILINE)
        
        for node in self.graph.nodes.values():
            try:
                content = Path(node.note.path).read_text(encoding='utf-8')
                lines = content.split('\n')
                
                for line_num, line in enumerate(lines, 1):
                    if regex.search(line):
                        # Extract context lines
                        start_line = max(0, line_num - context_lines - 1)
                        end_line = min(len(lines), line_num + context_lines)
                        context = lines[start_line:end_line]
                        
                        results.append({
                            'file': node.note.relative_path,
                            'line_number': line_num,
                            'line': line.strip(),
                            'context': context
                        })
                        
            except (UnicodeDecodeError, FileNotFoundError):
                continue
        
        return results
    
    def _merge_results(self, results: List[SearchResult]) -> List[SearchResult]:
        """Merge results from different search strategies."""
        # Group by note path
        grouped = {}
        for result in results:
            path = result.note_path
            if path not in grouped:
                grouped[path] = []
            grouped[path].append(result)
        
        # Merge results for each note
        merged = []
        for path, path_results in grouped.items():
            if len(path_results) == 1:
                merged.append(path_results[0])
            else:
                # Combine scores and contexts
                total_score = sum(r.score for r in path_results)
                match_types = [r.match_type for r in path_results]
                contexts = [r.context for r in path_results if r.context]
                
                # Boost score for multiple match types
                if len(set(match_types)) > 1:
                    total_score *= 1.5
                
                merged_result = SearchResult(
                    note_path=path,
                    score=total_score,
                    match_type='+'.join(sorted(set(match_types))),
                    context=' | '.join(contexts[:3]),  # Limit context length
                    graph_node=path_results[0].graph_node
                )
                merged.append(merged_result)
        
        return merged
    
    def _extract_match_context(self, content: str, match: re.Match, 
                              context_chars: int = 100) -> str:
        """Extract context around a regex match."""
        start = max(0, match.start() - context_chars)
        end = min(len(content), match.end() + context_chars)
        
        context = content[start:end]
        context = ' '.join(context.split())  # Normalize whitespace
        
        # Add ellipsis if truncated
        if start > 0:
            context = '...' + context
        if end < len(content):
            context = context + '...'
        
        return context