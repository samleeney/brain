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
const FileRegistry_1 = require("../storage/FileRegistry");
const VectorStore_1 = require("../embedding/VectorStore");
const LLMFormatter_1 = require("../formatters/LLMFormatter");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
// Tool parameter schemas
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
    notePath: zod_1.z.string().describe('Path to the note to read (can be display name or absolute path)')
};
const OverviewSchema = {
    depth: zod_1.z.number().min(1).max(5).default(3).describe('Depth of analysis for the knowledge base')
};
const ListSchema = {
    directory: zod_1.z.string().optional().describe('Filter by directory path (optional)')
};
/**
 * Brain MCP Server - Multi-location file support
 */
class BrainMCPServer {
    mcpServer;
    searchEngine = null;
    fileRegistry = null;
    vectorStore = null;
    formatter;
    configDir = '';
    apiKey = null;
    constructor() {
        this.mcpServer = new mcp_js_1.McpServer({
            name: 'brain-mcp-server',
            version: '2.0.0'
        });
        this.formatter = new LLMFormatter_1.LLMFormatter();
        this.registerTools();
    }
    async initialize() {
        // Set up configuration directory
        this.configDir = path_1.default.join(process.env.HOME || '~', '.brain');
        // Load API key from config or environment
        const configPath = path_1.default.join(this.configDir, 'config.json');
        try {
            const configData = await promises_1.default.readFile(configPath, 'utf-8');
            const config = JSON.parse(configData);
            this.apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
        }
        catch (error) {
            this.apiKey = process.env.OPENAI_API_KEY || null;
        }
        // Initialize file registry
        this.fileRegistry = new FileRegistry_1.FileRegistry(this.configDir);
        await this.fileRegistry.initialize();
        // Initialize vector store
        this.vectorStore = new VectorStore_1.VectorStore(this.configDir, this.fileRegistry);
        // Initialize search engine
        this.searchEngine = new SearchEngine_1.SearchEngine(this.vectorStore);
        console.error('Brain MCP Server initialized with multi-location support');
    }
    registerTools() {
        // Search tool
        this.mcpServer.tool('brain_search', 'Search through knowledge base using enhanced parallel semantic similarity with automatic query expansion', SearchSchema, async (params) => {
            if (!this.searchEngine || !this.apiKey) {
                throw new Error('Brain server not initialized or API key not configured');
            }
            const results = await this.searchEngine.enhancedSearch(params.query, this.apiKey, params.maxResults, params.threshold, params.enableMultiPhrase);
            if (results.length === 0) {
                return { content: [{
                            type: 'text',
                            text: 'No relevant content found. Try lowering the similarity threshold with the -t option.'
                        }] };
            }
            // Format results manually since we don't have a graph
            let formatted = '=== SEMANTIC SEARCH RESULTS ===\n\n';
            for (const result of results) {
                formatted += `📄 ${result.displayName}\n`;
                formatted += `   Similarity: ${(result.similarity * 100).toFixed(1)}%\n`;
                if (result.headingContext.length > 0) {
                    formatted += `   Context: ${result.headingContext.join(' > ')}\n`;
                }
                formatted += `   ${result.snippet}\n\n`;
            }
            return { content: [{ type: 'text', text: formatted }] };
        });
        // Comprehensive research tool
        this.mcpServer.tool('brain_research', 'Comprehensive research search using multiple strategies in parallel for complex queries', ComprehensiveSearchSchema, async (params) => {
            if (!this.searchEngine || !this.apiKey) {
                throw new Error('Brain server not initialized or API key not configured');
            }
            const results = await this.searchEngine.comprehensiveResearch(params.query, this.apiKey, params.maxResults, params.threshold);
            if (results.length === 0) {
                return { content: [{
                            type: 'text',
                            text: 'No relevant content found. The query may be too specific or the content may not exist in the knowledge base.'
                        }] };
            }
            // Format results manually since we don't have a graph
            let formatted = '=== SEMANTIC SEARCH RESULTS ===\n\n';
            for (const result of results) {
                formatted += `📄 ${result.displayName}\n`;
                formatted += `   Similarity: ${(result.similarity * 100).toFixed(1)}%\n`;
                if (result.headingContext.length > 0) {
                    formatted += `   Context: ${result.headingContext.join(' > ')}\n`;
                }
                formatted += `   ${result.snippet}\n\n`;
            }
            return { content: [{ type: 'text', text: formatted }] };
        });
        // Read tool with absolute path support
        this.mcpServer.tool('brain_read', 'Read a specific note from the knowledge base', ReadSchema, async (params) => {
            if (!this.fileRegistry) {
                throw new Error('Brain server not initialized');
            }
            // Try to find file by display name first
            let fileRecord = await this.fileRegistry.getFileByDisplayName(params.notePath);
            // If not found, try as absolute path
            if (!fileRecord) {
                fileRecord = await this.fileRegistry.getFileByPath(params.notePath);
            }
            if (!fileRecord) {
                throw new Error(`Note not found: ${params.notePath}`);
            }
            // Read the file content
            try {
                const content = await promises_1.default.readFile(fileRecord.absolutePath, 'utf-8');
                const formatted = `=== ${fileRecord.displayName} ===\n\n${content}`;
                return { content: [{ type: 'text', text: formatted }] };
            }
            catch (error) {
                throw new Error(`Failed to read file: ${error.message}`);
            }
        });
        // Overview tool
        this.mcpServer.tool('brain_overview', 'Get a high-level overview of the knowledge base structure', OverviewSchema, async (params) => {
            if (!this.fileRegistry || !this.vectorStore) {
                throw new Error('Brain server not initialized');
            }
            const files = await this.fileRegistry.getAllFiles();
            const stats = await this.vectorStore.getStats();
            const overview = {
                totalFiles: files.length,
                totalChunks: stats.totalDocuments,
                filesByType: files.reduce((acc, file) => {
                    acc[file.fileType] = (acc[file.fileType] || 0) + 1;
                    return acc;
                }, {}),
                recentFiles: files
                    .sort((a, b) => b.dateAdded.getTime() - a.dateAdded.getTime())
                    .slice(0, 10)
                    .map(f => ({ name: f.displayName, added: f.dateAdded.toISOString() }))
            };
            const formatted = `📊 Knowledge Base Overview

📁 Total Files: ${overview.totalFiles}
📄 Total Chunks: ${overview.totalChunks}

📈 Files by Type:
${Object.entries(overview.filesByType)
                .map(([type, count]) => `  • ${type}: ${count}`)
                .join('\n')}

🕐 Recently Added:
${overview.recentFiles
                .map(f => `  • ${f.name} (${new Date(f.added).toLocaleDateString()})`)
                .join('\n')}`;
            return { content: [{ type: 'text', text: formatted }] };
        });
        // List tool
        this.mcpServer.tool('brain_list', 'List notes in the knowledge base', ListSchema, async (params) => {
            if (!this.fileRegistry) {
                throw new Error('Brain server not initialized');
            }
            let files = await this.fileRegistry.getAllFiles();
            // Filter by directory if specified
            if (params.directory) {
                files = files.filter(f => f.displayName.startsWith(params.directory));
            }
            if (files.length === 0) {
                return { content: [{
                            type: 'text',
                            text: params.directory
                                ? `No files found in directory: ${params.directory}`
                                : 'No files found in knowledge base'
                        }] };
            }
            // Group by directory
            const fileTree = new Map();
            for (const file of files) {
                const parts = file.displayName.split('/');
                const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
                const fileName = parts[parts.length - 1];
                if (!fileTree.has(dir)) {
                    fileTree.set(dir, []);
                }
                fileTree.get(dir).push(fileName);
            }
            // Format as tree
            let output = params.directory || '/';
            output += '\n';
            for (const [dir, fileNames] of fileTree) {
                if (dir !== '/') {
                    output += `├── ${dir}/\n`;
                }
                for (const fileName of fileNames.sort()) {
                    const prefix = dir === '/' ? '├── ' : '│   ├── ';
                    output += `${prefix}${fileName}\n`;
                }
            }
            return { content: [{ type: 'text', text: output }] };
        });
    }
    async start() {
        await this.initialize();
        const transport = new stdio_js_1.StdioServerTransport();
        await this.mcpServer.connect(transport);
        console.error('Brain MCP Server V2 connected via stdio');
    }
}
exports.BrainMCPServer = BrainMCPServer;
// Start server
const server = new BrainMCPServer();
server.start().catch(error => {
    console.error('Server failed to start:', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map