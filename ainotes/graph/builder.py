"""Graph construction from parsed notes."""

from pathlib import Path
from typing import List, Dict, Set
from datetime import datetime
import networkx as nx

from ..models import Note, Link, GraphNode, KnowledgeGraph
from ..parser.markdown import MarkdownParser
from ..parser.links import LinkResolver


class GraphBuilder:
    """Builds knowledge graph from markdown notes."""
    
    def __init__(self, notes_root: Path):
        self.notes_root = notes_root
        self.parser = MarkdownParser()
        self.link_resolver = LinkResolver(notes_root)
    
    def build_graph(self, file_paths: List[Path] = None) -> KnowledgeGraph:
        """Build complete knowledge graph from notes."""
        if file_paths is None:
            file_paths = list(self.notes_root.rglob("*.md"))
            # Filter out hidden files
            file_paths = [p for p in file_paths 
                         if not any(part.startswith('.') for part in p.parts)]
        
        # Parse all notes
        notes = {}
        all_links = []
        
        for file_path in file_paths:
            try:
                note = self.parser.parse_file(file_path, self.notes_root)
                notes[note.path] = note
                
                # Resolve links
                for link in note.outgoing_links:
                    resolved_link = self.link_resolver.resolve_link(link)
                    all_links.append(resolved_link)
                
            except Exception as e:
                print(f"Warning: Failed to parse {file_path}: {e}")
                continue
        
        # Build graph nodes
        graph_nodes = {}
        for path, note in notes.items():
            graph_nodes[path] = GraphNode(note=note)
        
        # Process links and build connections
        broken_links = []
        for link in all_links:
            if link.is_broken or link.target_path not in graph_nodes:
                broken_links.append(link)
                continue
            
            # Add to target node's incoming links
            target_node = graph_nodes[link.target_path]
            target_node.incoming_links.append(link)
        
        # Calculate degrees
        for node in graph_nodes.values():
            node.in_degree = len(node.incoming_links)
            node.out_degree = len(node.note.outgoing_links)
        
        # Build NetworkX graph for algorithms
        nx_graph = self._build_networkx_graph(graph_nodes, all_links)
        
        # Detect clusters
        clusters = self._detect_clusters(nx_graph)
        
        # Assign cluster IDs to nodes
        for cluster_id, cluster_nodes in enumerate(clusters):
            for node_path in cluster_nodes:
                if node_path in graph_nodes:
                    graph_nodes[node_path].cluster_id = cluster_id
        
        # Calculate centrality scores
        self._calculate_centrality(nx_graph, graph_nodes)
        
        # Identify hub nodes and orphans
        hub_nodes = self._find_hub_nodes(graph_nodes)
        orphan_nodes = self._find_orphan_nodes(graph_nodes)
        
        return KnowledgeGraph(
            nodes=graph_nodes,
            clusters=clusters,
            hub_nodes=hub_nodes,
            orphan_nodes=orphan_nodes,
            broken_links=broken_links,
            last_updated=datetime.now()
        )
    
    def _build_networkx_graph(self, nodes: Dict[str, GraphNode], 
                             links: List[Link]) -> nx.DiGraph:
        """Build NetworkX directed graph for algorithms."""
        G = nx.DiGraph()
        
        # Add nodes
        for path in nodes.keys():
            G.add_node(path)
        
        # Add edges
        for link in links:
            if not link.is_broken and link.target_path in nodes:
                G.add_edge(link.source_path, link.target_path)
        
        return G
    
    def _detect_clusters(self, graph: nx.DiGraph) -> List[Set[str]]:
        """Detect clusters/communities in the graph."""
        # Convert to undirected for community detection
        undirected = graph.to_undirected()
        
        if len(undirected) == 0:
            return []
        
        try:
            # Use connected components as basic clustering
            # For more advanced clustering, could use networkx.community
            clusters = [set(component) for component in 
                       nx.connected_components(undirected)]
            
            # Filter out single-node clusters
            clusters = [cluster for cluster in clusters if len(cluster) > 1]
            
            return clusters
        except Exception:
            # Fallback to no clustering
            return []
    
    def _calculate_centrality(self, graph: nx.DiGraph, 
                            nodes: Dict[str, GraphNode]):
        """Calculate centrality scores for nodes."""
        if len(graph) == 0:
            return
        
        try:
            # Calculate PageRank centrality
            pagerank = nx.pagerank(graph, alpha=0.85, max_iter=100)
            
            for path, score in pagerank.items():
                if path in nodes:
                    nodes[path].centrality_score = score
                    
        except (nx.NetworkXError, nx.PowerIterationFailedConvergence):
            # Fallback to degree centrality
            for path, node in nodes.items():
                total_degree = node.in_degree + node.out_degree
                node.centrality_score = total_degree / max(1, len(nodes) - 1)
    
    def _find_hub_nodes(self, nodes: Dict[str, GraphNode], 
                       top_n: int = 10) -> List[str]:
        """Find most connected hub nodes."""
        # Sort by combination of degree and centrality
        sorted_nodes = sorted(
            nodes.items(),
            key=lambda x: (x[1].in_degree + x[1].out_degree, x[1].centrality_score),
            reverse=True
        )
        
        # Return top N paths, but only if they have significant connections
        hubs = []
        for path, node in sorted_nodes[:top_n]:
            if node.in_degree + node.out_degree >= 2:  # At least 2 connections
                hubs.append(path)
        
        return hubs
    
    def _find_orphan_nodes(self, nodes: Dict[str, GraphNode]) -> List[str]:
        """Find nodes with no connections."""
        orphans = []
        for path, node in nodes.items():
            if node.in_degree == 0 and node.out_degree == 0:
                orphans.append(path)
        return orphans
    
    def update_graph(self, graph: KnowledgeGraph, 
                    changed_files: List[Path],
                    removed_files: List[Path] = None) -> KnowledgeGraph:
        """Update graph incrementally for changed files."""
        # Remove deleted files
        if removed_files:
            for file_path in removed_files:
                path_str = str(file_path)
                if path_str in graph.nodes:
                    del graph.nodes[path_str]
            
            # Update link resolver index
            self.link_resolver.update_index(removed_files=removed_files)
        
        # Parse changed files
        new_nodes = {}
        all_new_links = []
        
        for file_path in changed_files:
            try:
                note = self.parser.parse_file(file_path, self.notes_root)
                new_nodes[note.path] = GraphNode(note=note)
                
                # Resolve links
                for link in note.outgoing_links:
                    resolved_link = self.link_resolver.resolve_link(link)
                    all_new_links.append(resolved_link)
                    
            except Exception as e:
                print(f"Warning: Failed to parse {file_path}: {e}")
                continue
        
        # Update graph with new nodes
        graph.nodes.update(new_nodes)
        
        # Update link resolver index
        if changed_files:
            self.link_resolver.update_index(added_files=changed_files)
        
        # Recalculate affected connections
        # This is a simplified update - for full accuracy, should rebuild affected subgraph
        for link in all_new_links:
            if not link.is_broken and link.target_path in graph.nodes:
                target_node = graph.nodes[link.target_path]
                # Remove old links from this source
                target_node.incoming_links = [
                    l for l in target_node.incoming_links 
                    if l.source_path != link.source_path
                ]
                # Add new link
                target_node.incoming_links.append(link)
        
        # Recalculate degrees and basic metrics
        for node in graph.nodes.values():
            node.in_degree = len(node.incoming_links)
            node.out_degree = len(node.note.outgoing_links)
        
        graph.last_updated = datetime.now()
        
        return graph