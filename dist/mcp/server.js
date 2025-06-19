#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrainMCPServer = void 0;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const SearchEngine_1 = require("../search/SearchEngine");
const GraphBuilder_1 = require("../graph/GraphBuilder");
const CacheManager_1 = require("../cache/CacheManager");
const LLMFormatter_1 = require("../formatters/LLMFormatter");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const VectorStore_1 = require("../embedding/VectorStore");
const EmbeddingService_1 = require("../embedding/EmbeddingService");
// Tool parameter schemas - use raw shape for MCP SDK
const SearchSchema = {
    query: zod_1.z.string().describe('Search query for semantic similarity search'),
    maxResults: zod_1.z.number().min(1).max(50).default(10).describe('Maximum number of results to return'),
    threshold: zod_1.z.number().min(0).max(1).default(0.7).describe('Minimum similarity score threshold (0-1)'),
    enableMultiPhrase: zod_1.z.boolean().default(true).describe('Enable parallel multi-phrase search optimization')
};
const ComprehensiveSearchSchema = {
    query: zod_1.z.string().describe('Complex research query for comprehensive multi-strategy search'),
    maxResults: zod_1.z.number().min(1).max(30).default(15).describe('Maximum number of results to return'),
    threshold: zod_1.z.number().min(0).max(1).default(0.3).describe('Base similarity score threshold (0-1)')
};
const ReadSchema = {
    notePath: zod_1.z.string().describe('Path to the note to read (relative to vault root)')
};
const OverviewSchema = {
    depth: zod_1.z.number().min(1).max(5).default(3).describe('Depth of analysis for the knowledge graph')
};
const RelatedSchema = {
    notePath: zod_1.z.string().describe('Path to the note to find related notes for'),
    maxResults: zod_1.z.number().min(1).max(20).default(5).describe('Maximum number of related notes to return')
};
const ListSchema = {
    directory: zod_1.z.string().optional().describe('Directory path relative to vault root (optional)')
};
/**
 * Brain MCP Server - Semantic knowledge base access
 */
class BrainMCPServer {
    mcpServer;
    searchEngine = null;
    graphBuilder = null;
    cacheManager = null;
    formatter;
    vaultPath = '';
    graph = null;
    vectorStore = null;
    embeddingService = null;
    apiKey = null;
    constructor() {
        this.mcpServer = new mcp_js_1.McpServer({
            name: 'brain-mcp-server',
            version: '1.0.0'
        });
        this.formatter = new LLMFormatter_1.LLMFormatter();
        this.registerTools();
    }
    async initialize() {
        // Load configuration
        const configPath = path_1.default.join(process.env.HOME || '~', '.brain', 'config.json');
        try {
            const configData = await promises_1.default.readFile(configPath, 'utf-8');
            const config = JSON.parse(configData);
            this.vaultPath = config.vaultPath;
            // Initialize services
            this.cacheManager = new CacheManager_1.CacheManager(this.vaultPath);
            this.graphBuilder = new GraphBuilder_1.GraphBuilder(this.vaultPath);
            // Build initial graph
            this.graph = await this.graphBuilder.buildGraph();
            // Initialize search engine with graph
            this.searchEngine = new SearchEngine_1.SearchEngine(this.graph, this.vaultPath);
            // Initialize embedding service and vector store if API key is available
            this.apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
            if (this.apiKey) {
                this.embeddingService = new EmbeddingService_1.EmbeddingService(this.apiKey);
                this.vectorStore = new VectorStore_1.VectorStore(this.vaultPath);
                // Generate embeddings for all chunks if they exist
                const allChunks = Array.from(this.graph.nodes.values()).flatMap(node => node.note.chunks || []);
                if (allChunks.length > 0) {
                    console.error(`Generating embeddings for ${allChunks.length} chunks...`);
                    // TODO: Implement batch embedding generation in VectorStore
                }
            }
        }
        catch (error) {
            console.error('Failed to initialize Brain MCP Server:', error);
            throw error;
        }
    }
    registerTools() {
        // Register brain_search tool
        this.mcpServer.tool('brain_search', 'Search through knowledge base using enhanced parallel semantic similarity with automatic query expansion', SearchSchema, async (params) => {
            if (!this.searchEngine || !this.graph) {
                throw new Error('Search engine not initialized');
            }
            if (!this.apiKey) {
                throw new Error('OpenAI API key not configured. Please run setup or set OPENAI_API_KEY environment variable.');
            }
            const results = await this.searchEngine.enhancedSearch(params.query, this.apiKey, params.maxResults, params.threshold, params.enableMultiPhrase);
            return {
                content: [
                    {
                        type: 'text',
                        text: this.formatter.formatSemanticSearchResults(results, this.graph)
                    }
                ]
            };
        });
        // Register brain_research tool for comprehensive searches
        this.mcpServer.tool('brain_research', 'Comprehensive research search using multiple strategies in parallel for complex queries', ComprehensiveSearchSchema, async (params) => {
            if (!this.searchEngine || !this.graph) {
                throw new Error('Search engine not initialized');
            }
            if (!this.apiKey) {
                throw new Error('OpenAI API key not configured. Please run setup or set OPENAI_API_KEY environment variable.');
            }
            const results = await this.searchEngine.comprehensiveSearch(params.query, this.apiKey, params.maxResults, params.threshold);
            return {
                content: [
                    {
                        type: 'text',
                        text: this.formatter.formatSemanticSearchResults(results, this.graph)
                    }
                ]
            };
        });
        // Register brain_read tool
        this.mcpServer.tool('brain_read', 'Read a specific note from the knowledge base', ReadSchema, async (params) => {
            if (!this.graph) {
                throw new Error('Graph not initialized');
            }
            // Find node by relative path
            let node = null;
            for (const [path, graphNode] of this.graph.nodes.entries()) {
                if (graphNode.note.relativePath === params.notePath) {
                    node = graphNode;
                    break;
                }
            }
            if (!node) {
                throw new Error(`Note not found: ${params.notePath}`);
            }
            // Read the actual file content
            const content = await promises_1.default.readFile(node.note.path, 'utf-8');
            return {
                content: [
                    {
                        type: 'text',
                        text: this.formatter.formatNoteRead(node, content)
                    }
                ]
            };
        });
        // Register brain_overview tool
        this.mcpServer.tool('brain_overview', 'Get a high-level overview of the knowledge base structure', OverviewSchema, async (params) => {
            if (!this.graph) {
                throw new Error('Graph not initialized');
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: this.formatter.formatOverview(this.graph)
                    }
                ]
            };
        });
        // Register brain_related tool
        this.mcpServer.tool('brain_related', 'Find notes related to a specific note', RelatedSchema, async (params) => {
            if (!this.graph) {
                throw new Error('Graph not initialized');
            }
            // Find node by relative path
            let node = null;
            for (const [path, graphNode] of this.graph.nodes.entries()) {
                if (graphNode.note.relativePath === params.notePath) {
                    node = graphNode;
                    break;
                }
            }
            if (!node) {
                throw new Error(`Note not found: ${params.notePath}`);
            }
            // Find related notes based on links and structure
            const related = [];
            // Direct outgoing links
            for (const link of node.note.outgoingLinks) {
                if (!link.isBroken && link.targetPath) {
                    related.push({
                        path: link.targetPath,
                        type: 'direct',
                        reason: 'Outgoing link'
                    });
                }
            }
            // Direct incoming links
            for (const link of node.incomingLinks) {
                related.push({
                    path: link.sourcePath,
                    type: 'direct',
                    reason: 'Incoming link'
                });
            }
            // Limit to maxResults
            const limitedRelated = related.slice(0, params.maxResults);
            return {
                content: [
                    {
                        type: 'text',
                        text: this.formatter.formatRelatedNotes(limitedRelated, this.graph)
                    }
                ]
            };
        });
        // Register brain_list tool
        this.mcpServer.tool('brain_list', 'List notes in a directory or the entire vault', ListSchema, async (params) => {
            if (!this.graph) {
                throw new Error('Graph not initialized');
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: this.formatter.formatLs(this.graph, params.directory || '')
                    }
                ]
            };
        });
    }
    async run() {
        // Initialize services first
        await this.initialize();
        // Create transport and connect
        const transport = new stdio_js_1.StdioServerTransport();
        await this.mcpServer.connect(transport);
        console.error('Brain MCP server running on stdio');
    }
}
exports.BrainMCPServer = BrainMCPServer;
// Main entry point - using CommonJS style check
if (require.main === module) {
    const server = new BrainMCPServer();
    server.run().catch(console.error);
}
//# sourceMappingURL=server.js.map