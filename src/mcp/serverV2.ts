#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { SearchEngineV2 } from '../search/SearchEngineV2';
import { FileRegistry } from '../storage/FileRegistry';
import { VectorStoreV2 } from '../embedding/VectorStoreV2';
import { LLMFormatter } from '../formatters/LLMFormatter';
import path from 'path';
import fs from 'fs/promises';

// Tool parameter schemas
const SearchSchema = {
  query: z.string().describe('Search query for semantic similarity search'),
  maxResults: z.number().min(1).max(50).default(10).describe('Maximum number of results to return'),
  threshold: z.number().min(0).max(1).default(0.7).describe('Minimum similarity score threshold (0-1)'),
  enableMultiPhrase: z.boolean().default(true).describe('Enable parallel multi-phrase search optimization')
};

const ComprehensiveSearchSchema = {
  query: z.string().describe('Complex research query for comprehensive multi-strategy search'),
  maxResults: z.number().min(1).max(30).default(15).describe('Maximum number of results to return'),
  threshold: z.number().min(0).max(1).default(0.3).describe('Base similarity score threshold (0-1)')
};

const ReadSchema = {
  notePath: z.string().describe('Path to the note to read (can be display name or absolute path)')
};

const OverviewSchema = {
  depth: z.number().min(1).max(5).default(3).describe('Depth of analysis for the knowledge base')
};

const ListSchema = {
  directory: z.string().optional().describe('Filter by directory path (optional)')
};

/**
 * Brain MCP Server V2 - Multi-location file support
 */
export class BrainMCPServerV2 {
  private mcpServer: McpServer;
  private searchEngine: SearchEngineV2 | null = null;
  private fileRegistry: FileRegistry | null = null;
  private vectorStore: VectorStoreV2 | null = null;
  private formatter: LLMFormatter;
  private configDir: string = '';
  private apiKey: string | null = null;

  constructor() {
    this.mcpServer = new McpServer({
      name: 'brain-mcp-server',
      version: '2.0.0'
    });
    this.formatter = new LLMFormatter();
    this.registerTools();
  }

  private async initialize() {
    // Set up configuration directory
    this.configDir = path.join(process.env.HOME || '~', '.brain');
    
    // Load API key from config or environment
    const configPath = path.join(this.configDir, 'config.json');
    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      this.apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    } catch (error) {
      this.apiKey = process.env.OPENAI_API_KEY || null;
    }

    // Initialize file registry
    this.fileRegistry = new FileRegistry(this.configDir);
    await this.fileRegistry.initialize();

    // Initialize vector store
    this.vectorStore = new VectorStoreV2(this.configDir, this.fileRegistry);

    // Initialize search engine
    this.searchEngine = new SearchEngineV2(this.vectorStore);

    console.error('Brain MCP Server V2 initialized with multi-location support');
  }

  private registerTools() {
    // Search tool
    this.mcpServer.tool(
      'brain_search',
      'Search through knowledge base using enhanced parallel semantic similarity with automatic query expansion',
      SearchSchema,
      async (params) => {
        if (!this.searchEngine || !this.apiKey) {
          throw new Error('Brain server not initialized or API key not configured');
        }

        const results = await this.searchEngine.enhancedSearch(
          params.query,
          this.apiKey,
          params.maxResults,
          params.threshold,
          params.enableMultiPhrase
        );

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
      }
    );

    // Comprehensive research tool
    this.mcpServer.tool(
      'brain_research',
      'Comprehensive research search using multiple strategies in parallel for complex queries',
      ComprehensiveSearchSchema,
      async (params) => {
        if (!this.searchEngine || !this.apiKey) {
          throw new Error('Brain server not initialized or API key not configured');
        }

        const results = await this.searchEngine.comprehensiveResearch(
          params.query,
          this.apiKey,
          params.maxResults,
          params.threshold
        );

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
      }
    );

    // Read tool with absolute path support
    this.mcpServer.tool(
      'brain_read',
      'Read a specific note from the knowledge base',
      ReadSchema,
      async (params) => {
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
          const content = await fs.readFile(fileRecord.absolutePath, 'utf-8');
          const formatted = `=== ${fileRecord.displayName} ===\n\n${content}`;
          return { content: [{ type: 'text', text: formatted }] };
        } catch (error) {
          throw new Error(`Failed to read file: ${(error as Error).message}`);
        }
      }
    );

    // Overview tool
    this.mcpServer.tool(
      'brain_overview',
      'Get a high-level overview of the knowledge base structure',
      OverviewSchema,
      async (params) => {
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
          }, {} as Record<string, number>),
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
      }
    );

    // List tool
    this.mcpServer.tool(
      'brain_list',
      'List notes in the knowledge base',
      ListSchema,
      async (params) => {
        if (!this.fileRegistry) {
          throw new Error('Brain server not initialized');
        }

        let files = await this.fileRegistry.getAllFiles();

        // Filter by directory if specified
        if (params.directory) {
          files = files.filter(f => 
            f.displayName.startsWith(params.directory!)
          );
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
        const fileTree = new Map<string, string[]>();
        
        for (const file of files) {
          const parts = file.displayName.split('/');
          const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
          const fileName = parts[parts.length - 1];
          
          if (!fileTree.has(dir)) {
            fileTree.set(dir, []);
          }
          fileTree.get(dir)!.push(fileName);
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
      }
    );
  }

  async start() {
    await this.initialize();
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    console.error('Brain MCP Server V2 connected via stdio');
  }
}

// Start server
const server = new BrainMCPServerV2();
server.start().catch(error => {
  console.error('Server failed to start:', error);
  process.exit(1);
});