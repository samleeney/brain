"""Graph algorithms for analyzing note relationships."""

from typing import List, Dict, Set, Optional
import networkx as nx
from pathlib import Path

from ..models import KnowledgeGraph, GraphNode


class GraphAnalyzer:
    """Analyzes the knowledge graph structure."""
    
    def __init__(self, graph: KnowledgeGraph):
        self.graph = graph
        self.nx_graph = self._build_networkx_graph()
    
    def _build_networkx_graph(self) -> nx.DiGraph:
        """Build NetworkX graph from knowledge graph."""
        G = nx.DiGraph()
        
        # Add nodes
        for path in self.graph.nodes.keys():
            G.add_node(path)
        
        # Add edges
        for node in self.graph.nodes.values():
            for link in node.note.outgoing_links:
                if not link.is_broken and link.target_path in self.graph.nodes:
                    G.add_edge(link.source_path, link.target_path)
        
        return G
    
    def find_shortest_paths(self, source: str, target: str, 
                          max_paths: int = 3) -> List[List[str]]:
        """Find shortest paths between two notes."""
        if source not in self.nx_graph or target not in self.nx_graph:
            return []
        
        try:
            # Find all shortest paths
            paths = list(nx.all_shortest_paths(self.nx_graph, source, target))
            return paths[:max_paths]
        except nx.NetworkXNoPath:
            return []
    
    def find_related_notes(self, note_path: str, max_results: int = 20) -> List[Dict]:
        """Find notes related to the given note."""
        if note_path not in self.graph.nodes:
            return []
        
        node = self.graph.nodes[note_path]
        related = []
        
        # 1. Direct connections
        direct_connections = self._find_direct_connections(node)
        related.extend(direct_connections)
        
        # 2. Same cluster members
        cluster_members = self._find_cluster_members(node)
        related.extend(cluster_members)
        
        # 3. Structural similarity
        structurally_similar = self._find_structurally_similar(node)
        related.extend(structurally_similar)
        
        # 4. Tag similarity
        tag_similar = self._find_tag_similar(node)
        related.extend(tag_similar)
        
        # Remove duplicates and the original note
        seen = {note_path}
        unique_related = []
        for item in related:
            if item['path'] not in seen:
                seen.add(item['path'])
                unique_related.append(item)
        
        # Score and sort
        scored_related = self._score_related_notes(unique_related, node)
        return sorted(scored_related, key=lambda x: x['score'], reverse=True)[:max_results]
    
    def _find_direct_connections(self, node: GraphNode) -> List[Dict]:
        """Find directly connected notes."""
        connections = []
        
        # Outgoing links
        for link in node.note.outgoing_links:
            if not link.is_broken and link.target_path in self.graph.nodes:
                connections.append({
                    'path': link.target_path,
                    'type': 'direct',
                    'reason': 'this links to',
                    'score': 5.0
                })
        
        # Incoming links
        for link in node.incoming_links:
            connections.append({
                'path': link.source_path,
                'type': 'direct',
                'reason': 'links to this',
                'score': 5.0
            })
        
        return connections
    
    def _find_cluster_members(self, node: GraphNode) -> List[Dict]:
        """Find notes in the same cluster."""
        if node.cluster_id is None:
            return []
        
        cluster_members = []
        cluster = self.graph.clusters[node.cluster_id]
        
        for member_path in cluster:
            if member_path != node.note.path:
                cluster_members.append({
                    'path': member_path,
                    'type': 'cluster',
                    'reason': f'same cluster #{node.cluster_id}',
                    'score': 3.0
                })
        
        return cluster_members
    
    def _find_structurally_similar(self, node: GraphNode) -> List[Dict]:
        """Find notes with similar link patterns."""
        similar = []
        
        # Get outgoing targets
        node_targets = {link.target_path for link in node.note.outgoing_links 
                       if not link.is_broken}
        
        if not node_targets:
            return similar
        
        for other_path, other_node in self.graph.nodes.items():
            if other_path == node.note.path:
                continue
            
            other_targets = {link.target_path for link in other_node.note.outgoing_links 
                           if not link.is_broken}
            
            if not other_targets:
                continue
            
            # Calculate Jaccard similarity
            intersection = len(node_targets & other_targets)
            union = len(node_targets | other_targets)
            
            if intersection > 0 and union > 0:
                similarity = intersection / union
                if similarity >= 0.2:  # Threshold for similarity
                    similar.append({
                        'path': other_path,
                        'type': 'similar',
                        'reason': f'{intersection} shared links',
                        'score': similarity * 2.0
                    })
        
        return similar
    
    def _find_tag_similar(self, node: GraphNode) -> List[Dict]:
        """Find notes with similar tags."""
        if not node.note.tags:
            return []
        
        similar = []
        
        for other_path, other_node in self.graph.nodes.items():
            if other_path == node.note.path or not other_node.note.tags:
                continue
            
            # Calculate tag overlap
            shared_tags = node.note.tags & other_node.note.tags
            if shared_tags:
                overlap_ratio = len(shared_tags) / len(node.note.tags | other_node.note.tags)
                
                similar.append({
                    'path': other_path,
                    'type': 'tags',
                    'reason': f'shared tags: {", ".join(shared_tags)}',
                    'score': len(shared_tags) * 1.5
                })
        
        return similar
    
    def _score_related_notes(self, related: List[Dict], node: GraphNode) -> List[Dict]:
        """Add additional scoring factors to related notes."""
        for item in related:
            related_node = self.graph.nodes.get(item['path'])
            if not related_node:
                continue
            
            # Boost score for hub nodes
            if item['path'] in self.graph.hub_nodes:
                item['score'] *= 1.3
            
            # Boost score for highly connected notes
            connections = related_node.in_degree + related_node.out_degree
            if connections > 5:
                item['score'] *= 1.2
            
            # Boost score for notes in same directory
            node_dir = Path(node.note.path).parent
            related_dir = Path(related_node.note.path).parent
            if node_dir == related_dir:
                item['score'] *= 1.1
        
        return related
    
    def detect_communities(self) -> List[Set[str]]:
        """Detect communities/clusters in the graph using advanced algorithms."""
        if len(self.nx_graph) < 3:
            return []
        
        try:
            # Convert to undirected for community detection
            undirected = self.nx_graph.to_undirected()
            
            # Use Louvain algorithm if available
            try:
                import networkx.algorithms.community as nx_comm
                communities = nx_comm.greedy_modularity_communities(undirected)
                return [set(community) for community in communities if len(community) > 1]
            except ImportError:
                # Fallback to connected components
                components = nx.connected_components(undirected)
                return [set(component) for component in components if len(component) > 1]
                
        except Exception:
            return []
    
    def calculate_centrality_metrics(self) -> Dict[str, Dict[str, float]]:
        """Calculate various centrality metrics for all nodes."""
        metrics = {}
        
        if len(self.nx_graph) == 0:
            return metrics
        
        try:
            # Degree centrality
            degree_cent = nx.degree_centrality(self.nx_graph)
            
            # PageRank
            pagerank = nx.pagerank(self.nx_graph, alpha=0.85, max_iter=100)
            
            # Betweenness centrality (expensive, so limit to smaller graphs)
            if len(self.nx_graph) < 100:
                betweenness = nx.betweenness_centrality(self.nx_graph)
            else:
                betweenness = {node: 0.0 for node in self.nx_graph.nodes()}
            
            # Combine metrics
            for node in self.nx_graph.nodes():
                metrics[node] = {
                    'degree_centrality': degree_cent.get(node, 0.0),
                    'pagerank': pagerank.get(node, 0.0),
                    'betweenness_centrality': betweenness.get(node, 0.0)
                }
                
        except (nx.NetworkXError, Exception):
            # Fallback to basic degree counting
            for node in self.nx_graph.nodes():
                degree = self.nx_graph.degree(node)
                total_nodes = len(self.nx_graph)
                metrics[node] = {
                    'degree_centrality': degree / max(1, total_nodes - 1),
                    'pagerank': 1.0 / max(1, total_nodes),
                    'betweenness_centrality': 0.0
                }
        
        return metrics
    
    def find_bridge_nodes(self) -> List[str]:
        """Find nodes that bridge different parts of the graph."""
        if len(self.nx_graph) < 3:
            return []
        
        try:
            # Find articulation points in undirected version
            undirected = self.nx_graph.to_undirected()
            bridges = list(nx.articulation_points(undirected))
            return bridges
        except Exception:
            return []
    
    def get_graph_statistics(self) -> Dict:
        """Get overall graph statistics."""
        stats = {
            'total_nodes': len(self.graph.nodes),
            'total_edges': sum(len(node.note.outgoing_links) for node in self.graph.nodes.values()),
            'avg_degree': 0.0,
            'density': 0.0,
            'num_clusters': len(self.graph.clusters),
            'num_hubs': len(self.graph.hub_nodes),
            'num_orphans': len(self.graph.orphan_nodes),
            'num_broken_links': len(self.graph.broken_links)
        }
        
        if stats['total_nodes'] > 0:
            stats['avg_degree'] = stats['total_edges'] / stats['total_nodes']
        
        if stats['total_nodes'] > 1:
            max_possible_edges = stats['total_nodes'] * (stats['total_nodes'] - 1)
            stats['density'] = stats['total_edges'] / max_possible_edges
        
        return stats