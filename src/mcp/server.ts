#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { SearchEngine } from '../search/SearchEngine';
import { GraphBuilder } from '../graph/GraphBuilder';
import { CacheManager } from '../cache/CacheManager';
import { LLMFormatter } from '../formatters/LLMFormatter';
import { KnowledgeGraph } from '../models/types';
import path from 'path';
import fs from 'fs/promises';
import { VectorStore } from '../embedding/VectorStore';
import { EmbeddingService } from '../embedding/EmbeddingService';

// Tool parameter schemas - use raw shape for MCP SDK
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
  notePath: z.string().describe('Path to the note to read (relative to vault root)')
};

const OverviewSchema = {
  depth: z.number().min(1).max(5).default(3).describe('Depth of analysis for the knowledge graph')
};

const RelatedSchema = {
  notePath: z.string().describe('Path to the note to find related notes for'),
  maxResults: z.number().min(1).max(20).default(5).describe('Maximum number of related notes to return')
};

const ListSchema = {
  directory: z.string().optional().describe('Directory path relative to vault root (optional)')
};

/**
 * Brain MCP Server - Semantic knowledge base access
 */
export class BrainMCPServer {
  private mcpServer: McpServer;
  private searchEngine: SearchEngine | null = null;
  private graphBuilder: GraphBuilder | null = null;
  private cacheManager: CacheManager | null = null;
  private formatter: LLMFormatter;
  private vaultPath: string = '';
  private graph: KnowledgeGraph | null = null;
  private vectorStore: VectorStore | null = null;
  private embeddingService: EmbeddingService | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.mcpServer = new McpServer({
      name: 'brain-mcp-server',
      version: '1.0.0'
    });
    this.formatter = new LLMFormatter();
    this.registerTools();
  }

  private async initialize() {
    // Load configuration
    const configPath = path.join(process.env.HOME || '~', '.brain', 'config.json');
    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      this.vaultPath = config.vaultPath;

      // Initialize services
      this.cacheManager = new CacheManager(this.vaultPath);
      this.graphBuilder = new GraphBuilder(this.vaultPath);
      
      // Build initial graph
      this.graph = await this.graphBuilder.buildGraph();

      // Initialize search engine with graph
      this.searchEngine = new SearchEngine(this.graph, this.vaultPath);
      
      // Initialize embedding service and vector store if API key is available
      this.apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
      if (this.apiKey) {
        this.embeddingService = new EmbeddingService(this.apiKey);
        this.vectorStore = new VectorStore(this.vaultPath);
        
        // Generate embeddings for all chunks if they exist
        const allChunks = Array.from(this.graph.nodes.values()).flatMap(node => 
          node.note.chunks || []
        );
        
        if (allChunks.length > 0) {
          console.error(`Generating embeddings for ${allChunks.length} chunks...`);
          // TODO: Implement batch embedding generation in VectorStore
        }
      }
    } catch (error) {
      console.error('Failed to initialize Brain MCP Server:', error);
      throw error;
    }
  }

  private registerTools() {
    // Register brain_search tool
    this.mcpServer.tool(
      'brain_search',
      'Search through knowledge base using enhanced parallel semantic similarity with automatic query expansion',
      SearchSchema,
      async (params) => {
        if (!this.searchEngine || !this.graph) {
          throw new Error('Search engine not initialized');
        }

        if (!this.apiKey) {
          throw new Error('OpenAI API key not configured. Please run setup or set OPENAI_API_KEY environment variable.');
        }

        const results = await this.searchEngine.enhancedSearch(
          params.query,
          this.apiKey,
          params.maxResults,
          params.threshold,
          params.enableMultiPhrase
        );

        return {
          content: [
            {
              type: 'text',
              text: this.formatter.formatSemanticSearchResults(results, this.graph)
            }
          ]
        };
      }
    );

    // Register brain_research tool for comprehensive searches
    this.mcpServer.tool(
      'brain_research',
      'Comprehensive research search using multiple strategies in parallel for complex queries',
      ComprehensiveSearchSchema,
      async (params) => {
        if (!this.searchEngine || !this.graph) {
          throw new Error('Search engine not initialized');
        }

        if (!this.apiKey) {
          throw new Error('OpenAI API key not configured. Please run setup or set OPENAI_API_KEY environment variable.');
        }

        const results = await this.searchEngine.comprehensiveSearch(
          params.query,
          this.apiKey,
          params.maxResults,
          params.threshold
        );

        return {
          content: [
            {
              type: 'text',
              text: this.formatter.formatSemanticSearchResults(results, this.graph)
            }
          ]
        };
      }
    );

    // Register brain_read tool
    this.mcpServer.tool(
      'brain_read',
      'Read a specific note from the knowledge base',
      ReadSchema,
      async (params) => {
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
        const content = await fs.readFile(node.note.path, 'utf-8');

        return {
          content: [
            {
              type: 'text',
              text: this.formatter.formatNoteRead(node, content)
            }
          ]
        };
      }
    );

    // Register brain_overview tool
    this.mcpServer.tool(
      'brain_overview',
      'Get a high-level overview of the knowledge base structure',
      OverviewSchema,
      async (params) => {
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
      }
    );

    // Register brain_related tool
    this.mcpServer.tool(
      'brain_related',
      'Find notes related to a specific note',
      RelatedSchema,
      async (params) => {
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
        const related: Array<{ path: string; type: string; reason: string }> = [];
        
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
      }
    );

    // Register brain_list tool
    this.mcpServer.tool(
      'brain_list',
      'List notes in a directory or the entire vault',
      ListSchema,
      async (params) => {
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
      }
    );
  }

  async run() {
    // Initialize services first
    await this.initialize();

    // Create transport and connect
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);

    console.error('Brain MCP server running on stdio');
  }
}

// Main entry point - using CommonJS style check
if (require.main === module) {
  const server = new BrainMCPServer();
  server.run().catch(console.error);
}