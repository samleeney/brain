#!/usr/bin/env node
/**
 * Brain MCP Server - Semantic knowledge base access
 */
export declare class BrainMCPServer {
    private mcpServer;
    private searchEngine;
    private graphBuilder;
    private cacheManager;
    private formatter;
    private vaultPath;
    private graph;
    private vectorStore;
    private embeddingService;
    private apiKey;
    constructor();
    private initialize;
    private registerTools;
    run(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map