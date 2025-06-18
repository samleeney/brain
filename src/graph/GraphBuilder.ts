/**
 * Graph construction from parsed notes
 */

import * as fs from 'fs';
import * as path from 'path';
import glob from 'fast-glob';
import { Graph } from 'graphlib';
import { Note, Link, GraphNode, KnowledgeGraph } from '../models/types';
import { MarkdownParser } from '../parser/MarkdownParser';
import { LinkResolver } from '../parser/LinkResolver';
import { ChunkingService } from '../parser/ChunkingService';

export class GraphBuilder {
  private notesRoot: string;
  private parser: MarkdownParser;
  private linkResolver: LinkResolver;

  constructor(notesRoot: string) {
    this.notesRoot = notesRoot;
    this.parser = new MarkdownParser();
    this.linkResolver = new LinkResolver(notesRoot);
  }

  async buildGraph(filePaths?: string[]): Promise<KnowledgeGraph> {
    // Initialize link resolver
    await this.linkResolver.initialize();

    if (!filePaths) {
      filePaths = await glob('**/*.md', {
        cwd: this.notesRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/.*/**']
      });
    }

    // Parse all notes
    const nodes = new Map<string, GraphNode>();
    const allLinks: Link[] = [];

    for (const filePath of filePaths!) {
      try {
        const note = await this.parser.parseFile(filePath, this.notesRoot);
        
        // Generate semantic chunks for the note
        const content = fs.readFileSync(filePath, 'utf-8');
        note.chunks = ChunkingService.createChunks(
          content,
          note.title,
          note.headings,
          note.path
        );
        
        nodes.set(note.path, {
          note,
          incomingLinks: [],
          inDegree: 0,
          outDegree: 0,
          clusterId: null,
          centralityScore: 0
        });

        // Resolve links
        for (const link of note.outgoingLinks) {
          const resolvedLink = await this.linkResolver.resolveLink(link);
          allLinks.push(resolvedLink);
        }
      } catch (error) {
        console.warn(`Warning: Failed to parse ${filePath}: ${error}`);
        continue;
      }
    }

    // Process links and build connections
    const brokenLinks: Link[] = [];
    for (const link of allLinks) {
      if (link.isBroken || !link.targetPath || !nodes.has(link.targetPath)) {
        brokenLinks.push(link);
        continue;
      }

      // Add to target node's incoming links
      const targetNode = nodes.get(link.targetPath)!;
      targetNode.incomingLinks.push(link);
    }

    // Calculate degrees
    for (const node of nodes.values()) {
      node.inDegree = node.incomingLinks.length;
      node.outDegree = node.note.outgoingLinks.length;
    }

    // Build graph for algorithms
    const graph = this.buildGraphLibGraph(nodes, allLinks);

    // Detect clusters
    const clusters = this.detectClusters(graph, nodes);

    // Assign cluster IDs to nodes
    clusters.forEach((cluster, clusterId) => {
      for (const nodePath of cluster) {
        const node = nodes.get(nodePath);
        if (node) {
          node.clusterId = clusterId;
        }
      }
    });

    // Calculate centrality scores
    this.calculateCentrality(graph, nodes);

    // Identify hub nodes and orphans
    const hubNodes = this.findHubNodes(nodes);
    const orphanNodes = this.findOrphanNodes(nodes);

    return {
      nodes,
      clusters,
      hubNodes,
      orphanNodes,
      brokenLinks,
      lastUpdated: new Date()
    };
  }

  private buildGraphLibGraph(nodes: Map<string, GraphNode>, links: Link[]): Graph {
    const graph = new Graph({ directed: true });

    // Add nodes
    for (const path of nodes.keys()) {
      graph.setNode(path);
    }

    // Add edges
    for (const link of links) {
      if (!link.isBroken && link.targetPath && nodes.has(link.targetPath)) {
        graph.setEdge(link.sourcePath, link.targetPath);
      }
    }

    return graph;
  }

  private detectClusters(graph: Graph, nodes: Map<string, GraphNode>): Set<string>[] {
    // Simple connected components detection
    // For more advanced clustering, could implement Louvain algorithm
    const visited = new Set<string>();
    const clusters: Set<string>[] = [];

    // Convert to undirected for component detection
    const undirected = new Graph({ directed: false });
    
    // Copy nodes
    for (const node of graph.nodes()) {
      undirected.setNode(node);
    }
    
    // Copy edges as undirected
    for (const edge of graph.edges()) {
      undirected.setEdge(edge.v, edge.w);
    }

    for (const node of undirected.nodes()) {
      if (!visited.has(node)) {
        const component = new Set<string>();
        this.dfsComponent(undirected, node, visited, component);
        
        // Only include clusters with more than one node
        if (component.size > 1) {
          clusters.push(component);
        }
      }
    }

    return clusters;
  }

  private dfsComponent(graph: Graph, node: string, visited: Set<string>, component: Set<string>): void {
    visited.add(node);
    component.add(node);

    const neighbors = graph.neighbors(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfsComponent(graph, neighbor, visited, component);
      }
    }
  }

  private calculateCentrality(graph: Graph, nodes: Map<string, GraphNode>): void {
    if (graph.nodeCount() === 0) {
      return;
    }

    // Simple degree centrality calculation
    // For more advanced metrics, could implement PageRank, betweenness centrality
    const maxDegree = Math.max(...Array.from(nodes.values()).map(n => n.inDegree + n.outDegree));
    
    for (const [path, node] of nodes.entries()) {
      const totalDegree = node.inDegree + node.outDegree;
      node.centralityScore = maxDegree > 0 ? totalDegree / maxDegree : 0;
    }
  }

  private findHubNodes(nodes: Map<string, GraphNode>, topN: number = 10): string[] {
    // Sort by combination of degree and centrality
    const sortedNodes = Array.from(nodes.entries())
      .sort(([, a], [, b]) => {
        const scoreA = a.inDegree + a.outDegree + a.centralityScore;
        const scoreB = b.inDegree + b.outDegree + b.centralityScore;
        return scoreB - scoreA;
      });

    const hubs: string[] = [];
    for (const [path, node] of sortedNodes.slice(0, topN)) {
      // Only include nodes with significant connections
      if (node.inDegree + node.outDegree >= 2) {
        hubs.push(path);
      }
    }

    return hubs;
  }

  private findOrphanNodes(nodes: Map<string, GraphNode>): string[] {
    const orphans: string[] = [];
    for (const [path, node] of nodes.entries()) {
      if (node.inDegree === 0 && node.outDegree === 0) {
        orphans.push(path);
      }
    }
    return orphans;
  }

  async updateGraph(
    graph: KnowledgeGraph,
    changedFiles: string[],
    removedFiles: string[] = []
  ): Promise<KnowledgeGraph> {
    // Remove deleted files
    for (const filePath of removedFiles) {
      graph.nodes.delete(filePath);
    }

    // Update link resolver index
    if (removedFiles.length > 0) {
      await this.linkResolver.updateIndex([], removedFiles);
    }

    // Parse changed files
    const newLinks: Link[] = [];
    for (const filePath of changedFiles) {
      try {
        const note = await this.parser.parseFile(filePath, this.notesRoot);
        
        // Generate semantic chunks for the note
        const content = fs.readFileSync(filePath, 'utf-8');
        note.chunks = ChunkingService.createChunks(
          content,
          note.title,
          note.headings,
          note.path
        );
        
        const newNode: GraphNode = {
          note,
          incomingLinks: [],
          inDegree: 0,
          outDegree: 0,
          clusterId: null,
          centralityScore: 0
        };

        graph.nodes.set(note.path, newNode);

        // Resolve links
        for (const link of note.outgoingLinks) {
          const resolvedLink = await this.linkResolver.resolveLink(link);
          newLinks.push(resolvedLink);
        }
      } catch (error) {
        console.warn(`Warning: Failed to parse ${filePath}: ${error}`);
        continue;
      }
    }

    // Update link resolver index
    if (changedFiles.length > 0) {
      await this.linkResolver.updateIndex(changedFiles, []);
    }

    // Recalculate affected connections
    // Clear all incoming links and recalculate
    for (const node of graph.nodes.values()) {
      node.incomingLinks = [];
    }

    // Rebuild all incoming links
    for (const node of graph.nodes.values()) {
      for (const link of node.note.outgoingLinks) {
        if (!link.isBroken && link.targetPath && graph.nodes.has(link.targetPath)) {
          const targetNode = graph.nodes.get(link.targetPath)!;
          targetNode.incomingLinks.push(link);
        }
      }
    }

    // Recalculate degrees
    for (const node of graph.nodes.values()) {
      node.inDegree = node.incomingLinks.length;
      node.outDegree = node.note.outgoingLinks.length;
    }

    graph.lastUpdated = new Date();
    return graph;
  }
}