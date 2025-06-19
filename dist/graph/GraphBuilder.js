"use strict";
/**
 * Graph construction from parsed notes
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphBuilder = void 0;
const fs = __importStar(require("fs"));
const fast_glob_1 = __importDefault(require("fast-glob"));
const graphlib_1 = require("graphlib");
const MarkdownParser_1 = require("../parser/MarkdownParser");
const LinkResolver_1 = require("../parser/LinkResolver");
const ChunkingService_1 = require("../parser/ChunkingService");
class GraphBuilder {
    notesRoot;
    parser;
    linkResolver;
    constructor(notesRoot) {
        this.notesRoot = notesRoot;
        this.parser = new MarkdownParser_1.MarkdownParser();
        this.linkResolver = new LinkResolver_1.LinkResolver(notesRoot);
    }
    async buildGraph(filePaths) {
        // Initialize link resolver
        await this.linkResolver.initialize();
        if (!filePaths) {
            filePaths = await (0, fast_glob_1.default)('**/*.md', {
                cwd: this.notesRoot,
                absolute: true,
                ignore: ['**/node_modules/**', '**/.*/**']
            });
        }
        // Parse all notes
        const nodes = new Map();
        const allLinks = [];
        for (const filePath of filePaths) {
            try {
                const note = await this.parser.parseFile(filePath, this.notesRoot);
                // Generate semantic chunks for the note
                const content = fs.readFileSync(filePath, 'utf-8');
                note.chunks = ChunkingService_1.ChunkingService.createChunks(content, note.title, note.headings, note.path);
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
            }
            catch (error) {
                console.warn(`Warning: Failed to parse ${filePath}: ${error}`);
                continue;
            }
        }
        // Process links and build connections
        const brokenLinks = [];
        for (const link of allLinks) {
            if (link.isBroken || !link.targetPath || !nodes.has(link.targetPath)) {
                brokenLinks.push(link);
                continue;
            }
            // Add to target node's incoming links
            const targetNode = nodes.get(link.targetPath);
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
    buildGraphLibGraph(nodes, links) {
        const graph = new graphlib_1.Graph({ directed: true });
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
    detectClusters(graph, nodes) {
        // Simple connected components detection
        // For more advanced clustering, could implement Louvain algorithm
        const visited = new Set();
        const clusters = [];
        // Convert to undirected for component detection
        const undirected = new graphlib_1.Graph({ directed: false });
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
                const component = new Set();
                this.dfsComponent(undirected, node, visited, component);
                // Only include clusters with more than one node
                if (component.size > 1) {
                    clusters.push(component);
                }
            }
        }
        return clusters;
    }
    dfsComponent(graph, node, visited, component) {
        visited.add(node);
        component.add(node);
        const neighbors = graph.neighbors(node) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                this.dfsComponent(graph, neighbor, visited, component);
            }
        }
    }
    calculateCentrality(graph, nodes) {
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
    findHubNodes(nodes, topN = 10) {
        // Sort by combination of degree and centrality
        const sortedNodes = Array.from(nodes.entries())
            .sort(([, a], [, b]) => {
            const scoreA = a.inDegree + a.outDegree + a.centralityScore;
            const scoreB = b.inDegree + b.outDegree + b.centralityScore;
            return scoreB - scoreA;
        });
        const hubs = [];
        for (const [path, node] of sortedNodes.slice(0, topN)) {
            // Only include nodes with significant connections
            if (node.inDegree + node.outDegree >= 2) {
                hubs.push(path);
            }
        }
        return hubs;
    }
    findOrphanNodes(nodes) {
        const orphans = [];
        for (const [path, node] of nodes.entries()) {
            if (node.inDegree === 0 && node.outDegree === 0) {
                orphans.push(path);
            }
        }
        return orphans;
    }
    async updateGraph(graph, changedFiles, removedFiles = []) {
        // Remove deleted files
        for (const filePath of removedFiles) {
            graph.nodes.delete(filePath);
        }
        // Update link resolver index
        if (removedFiles.length > 0) {
            await this.linkResolver.updateIndex([], removedFiles);
        }
        // Parse changed files
        const newLinks = [];
        for (const filePath of changedFiles) {
            try {
                const note = await this.parser.parseFile(filePath, this.notesRoot);
                // Generate semantic chunks for the note
                const content = fs.readFileSync(filePath, 'utf-8');
                note.chunks = ChunkingService_1.ChunkingService.createChunks(content, note.title, note.headings, note.path);
                const newNode = {
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
            }
            catch (error) {
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
                    const targetNode = graph.nodes.get(link.targetPath);
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
exports.GraphBuilder = GraphBuilder;
//# sourceMappingURL=GraphBuilder.js.map