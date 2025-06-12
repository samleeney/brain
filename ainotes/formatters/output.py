"""Output formatters optimized for LLM consumption."""

from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

from ..models import KnowledgeGraph, SearchResult, GraphNode


class LLMFormatter:
    """Formats output optimized for LLM consumption."""
    
    def format_overview(self, graph: KnowledgeGraph) -> str:
        """Format knowledge base overview."""
        total_notes = len(graph.nodes)
        if total_notes == 0:
            return "=== KNOWLEDGE BASE OVERVIEW ===\nNo notes found."
        
        # Calculate statistics
        total_links = sum(len(node.note.outgoing_links) for node in graph.nodes.values())
        valid_links = total_links - len(graph.broken_links)
        
        # Directory structure analysis
        dirs = set()
        flat_files = 0
        for node in graph.nodes.values():
            path = Path(node.note.relative_path)
            if len(path.parts) > 1:
                dirs.add(str(path.parent))
            else:
                flat_files += 1
        
        folder_percent = int((len(dirs) * 100) / max(1, total_notes))
        flat_percent = int((flat_files * 100) / max(1, total_notes))
        
        # Recent activity
        now = datetime.now()
        today_count = 0
        week_count = 0
        
        for node in graph.nodes.values():
            if node.note.last_modified:
                days_ago = (now - node.note.last_modified).days
                if days_ago == 0:
                    today_count += 1
                if days_ago <= 7:
                    week_count += 1
        
        output = []
        output.append("=== KNOWLEDGE BASE OVERVIEW ===")
        output.append(f"Total Notes: {total_notes} | Links: {valid_links} | Last Updated: {now.strftime('%Y-%m-%d')}")
        
        if dirs:
            output.append(f"Structure: Mixed ({folder_percent}% in folders, {flat_percent}% flat files)")
        else:
            output.append("Structure: Flat (all files in root)")
        
        # Top hubs
        if graph.hub_nodes:
            output.append("\nTOP HUBS (most connected):")
            for i, hub_path in enumerate(graph.hub_nodes[:5], 1):
                if hub_path in graph.nodes:
                    node = graph.nodes[hub_path]
                    connections = node.in_degree + node.out_degree
                    title = node.note.title
                    output.append(f'{i}. "{title}" ({connections} connections)')
        
        # Clusters
        if graph.clusters:
            output.append("\nCLUSTERS DETECTED:")
            for i, cluster in enumerate(graph.clusters[:3], 1):
                cluster_size = len(cluster)
                # Get a representative name from the cluster
                sample_node = next(iter(cluster))
                if sample_node in graph.nodes:
                    cluster_dir = Path(graph.nodes[sample_node].note.relative_path).parent
                    cluster_name = cluster_dir.name if cluster_dir.name != '.' else 'Root'
                else:
                    cluster_name = f"Cluster {i}"
                output.append(f'- "{cluster_name}" ({cluster_size} notes)')
        
        # Orphaned notes
        if graph.orphan_nodes:
            orphan_count = len(graph.orphan_nodes)
            output.append(f"\nORPHANED NOTES: {orphan_count} notes with no connections")
        
        # Recent activity
        if today_count > 0 or week_count > 0:
            output.append("\nRECENT ACTIVITY:")
            if today_count > 0:
                output.append(f"- Modified today: {today_count} notes")
            if week_count > today_count:
                output.append(f"- This week: {week_count} notes")
        
        # Broken links warning
        if graph.broken_links:
            output.append(f"\nWARNING: {len(graph.broken_links)} broken links detected")
        
        return '\n'.join(output)
    
    def format_ls(self, graph: KnowledgeGraph, path: str = "") -> str:
        """Format directory listing."""
        output = []
        
        # Group notes by directory
        dirs = {}
        files = {}
        
        for node in graph.nodes.values():
            rel_path = Path(node.note.relative_path)
            
            # Filter by requested path
            if path:
                if not str(rel_path).startswith(path):
                    continue
                # Adjust relative path
                try:
                    rel_path = rel_path.relative_to(path)
                except ValueError:
                    continue
            
            if len(rel_path.parts) == 1:
                # File in current directory
                files[str(rel_path)] = node
            else:
                # File in subdirectory
                subdir = rel_path.parts[0]
                if subdir not in dirs:
                    dirs[subdir] = []
                dirs[subdir].append(node)
        
        # Display path header
        display_path = f"/{path}" if path else "/"
        output.append(f"{display_path}")
        
        # Display subdirectories
        for dirname in sorted(dirs.keys()):
            dir_nodes = dirs[dirname]
            note_count = len(dir_nodes)
            output.append(f"├── {dirname}/ ({note_count} notes)")
            
            # Show sample files in directory
            for node in sorted(dir_nodes, key=lambda x: x.note.title)[:3]:
                in_links = node.in_degree
                out_links = node.out_degree
                filename = Path(node.note.relative_path).name
                output.append(f"│   ├── {filename} [→{out_links} ←{in_links}]")
            
            if len(dir_nodes) > 3:
                output.append(f"│   └── ... and {len(dir_nodes) - 3} more")
        
        # Display files in current directory
        for filename in sorted(files.keys()):
            node = files[filename]
            in_links = node.in_degree
            out_links = node.out_degree
            output.append(f"└── {filename} [→{out_links} ←{in_links}]")
        
        if not dirs and not files:
            output.append("(empty)")
        
        output.append(f"\n[→X ←Y] means X outgoing links, Y incoming links")
        
        return '\n'.join(output)
    
    def format_search_results(self, results: List[SearchResult]) -> str:
        """Format search results with context."""
        if not results:
            return "No results found."
        
        output = []
        output.append(f"SEARCH RESULTS ({len(results)} matches):\n")
        
        for i, result in enumerate(results, 1):
            node = result.graph_node
            rel_path = node.note.relative_path if node else result.note_path
            
            output.append(f"{i}. {rel_path}")
            output.append(f"   - Match: {result.match_type} (score: {result.score:.1f})")
            
            if result.context:
                output.append(f"   - Context: {result.context}")
                
            if result.line_number:
                output.append(f"   - Line: {result.line_number}")
            
            if node:
                connections = node.in_degree + node.out_degree
                if connections > 0:
                    output.append(f"   - Graph: {connections} connections")
                
                if node.cluster_id is not None:
                    output.append(f"   - Cluster: #{node.cluster_id}")
            
            output.append("")  # Empty line between results
        
        return '\n'.join(output)
    
    def format_note_read(self, node: GraphNode, content: str = None) -> str:
        """Format note with full context."""
        output = []
        
        # Header with metadata
        output.append(f"=== {node.note.relative_path} ===")
        output.append(f"Location: {node.note.path}")
        
        if node.note.last_modified:
            output.append(f"Modified: {node.note.last_modified.strftime('%Y-%m-%d %H:%M:%S')}")
        
        if node.note.tags:
            tags_str = ' '.join(f'#{tag}' for tag in sorted(node.note.tags))
            output.append(f"Tags: {tags_str}")
        
        output.append(f"Words: {node.note.word_count}")
        
        # Incoming links
        if node.incoming_links:
            output.append(f"\nINCOMING LINKS ({len(node.incoming_links)}):")
            for link in node.incoming_links[:10]:  # Limit to prevent overflow
                source_path = Path(link.source_path).name
                output.append(f'← "{source_path}" ("{link.context[:50]}...")')
            
            if len(node.incoming_links) > 10:
                output.append(f"   ... and {len(node.incoming_links) - 10} more")
        
        # Outgoing links
        if node.note.outgoing_links:
            valid_outgoing = [l for l in node.note.outgoing_links if not l.is_broken]
            if valid_outgoing:
                output.append(f"\nOUTGOING LINKS ({len(valid_outgoing)}):")
                for link in valid_outgoing[:10]:
                    if link.target_path:
                        target_path = Path(link.target_path).name
                        output.append(f'→ "{target_path}" ("{link.context[:50]}...")')
        
        # Content
        if content is None:
            try:
                content = Path(node.note.path).read_text(encoding='utf-8')
            except (UnicodeDecodeError, FileNotFoundError):
                content = "[Content could not be read]"
        
        output.append("\nCONTENT:")
        output.append("-" * 40)
        output.append(content)
        
        return '\n'.join(output)
    
    def format_trace_path(self, paths: List[List[str]], graph: KnowledgeGraph) -> str:
        """Format shortest path trace between notes."""
        if not paths:
            return "No path found between the specified notes."
        
        output = []
        
        if len(paths) == 1:
            output.append("SHORTEST PATH:")
        else:
            output.append(f"SHORTEST PATHS ({len(paths)} found):")
        
        for i, path in enumerate(paths, 1):
            if len(paths) > 1:
                output.append(f"\nPath {i} ({len(path)-1} hops):")
            else:
                output.append(f"\n{len(path)-1} hops:")
            
            for j, node_path in enumerate(path):
                node = graph.nodes.get(node_path)
                title = node.note.title if node else Path(node_path).stem
                
                if j == 0:
                    output.append(f"  {title}")
                else:
                    # Find the link between previous and current node
                    prev_node = graph.nodes.get(path[j-1])
                    link_context = ""
                    if prev_node:
                        for link in prev_node.note.outgoing_links:
                            if link.target_path == node_path:
                                link_context = f' ("{link.context[:30]}...")'
                                break
                    
                    output.append(f"  → {title}{link_context}")
        
        return '\n'.join(output)
    
    def format_related_notes(self, related: List[Dict], graph: KnowledgeGraph) -> str:
        """Format related notes output."""
        if not related:
            return "No related notes found."
        
        output = []
        output.append("RELATED NOTES:\n")
        
        # Group by relationship type
        by_type = {}
        for item in related:
            rel_type = item['type']
            if rel_type not in by_type:
                by_type[rel_type] = []
            by_type[rel_type].append(item)
        
        # Display each type
        type_order = ['direct', 'cluster', 'similar', 'tags']
        type_names = {
            'direct': 'DIRECTLY LINKED',
            'cluster': 'SAME CLUSTER', 
            'similar': 'SIMILAR STRUCTURE',
            'tags': 'SHARED TAGS'
        }
        
        for rel_type in type_order:
            if rel_type in by_type:
                items = by_type[rel_type]
                output.append(f"{type_names[rel_type]}:")
                
                for item in items[:5]:  # Limit results per type
                    node_path = item['path']
                    node = graph.nodes.get(node_path)
                    title = node.note.title if node else Path(node_path).stem
                    
                    reason = item.get('reason', '')
                    if reason:
                        output.append(f"- {title} ({reason})")
                    else:
                        output.append(f"- {title}")
                
                if len(items) > 5:
                    output.append(f"  ... and {len(items) - 5} more")
                output.append("")
        
        return '\n'.join(output)
    
    def format_grep_results(self, results: List[Dict]) -> str:
        """Format grep-style search results."""
        if not results:
            return "No matches found."
        
        output = []
        for result in results:
            file_path = result['file']
            line_num = result['line_number']
            line = result['line']
            
            output.append(f"{file_path}:{line_num}: {line}")
        
        return '\n'.join(output)