/**
 * Semantic search engine for knowledge base
 */

import { KnowledgeGraph } from '../models/types';
import { VectorStore } from '../embedding/VectorStore';
import { EmbeddingService } from '../embedding/EmbeddingService';

export class SearchEngine {
  private graph: KnowledgeGraph;
  private notesRoot: string;

  constructor(graph: KnowledgeGraph, notesRoot?: string) {
    this.graph = graph;
    this.notesRoot = notesRoot || '';
  }

  /**
   * Semantic similarity search - finds relevant chunks using embeddings
   */
  async semanticSearch(
    query: string,
    apiKey: string,
    limit: number = 10,
    threshold: number = 0.3
  ): Promise<Array<{
    notePath: string;
    chunkId: string;
    similarity: number;
    snippet: string;
    headingContext: string[];
    chunkType: string;
  }>> {
    if (!this.notesRoot) {
      return [];
    }

    try {
      const vectorStore = new VectorStore(this.notesRoot);
      const embeddingService = new EmbeddingService(apiKey);
      
      const results = await vectorStore.findSimilar(query, embeddingService, limit, threshold);
      
      return results.map(result => ({
        notePath: result.document.metadata.notePath,
        chunkId: result.document.id,
        similarity: result.similarity,
        snippet: result.snippet,
        headingContext: result.document.metadata.headingContext,
        chunkType: result.document.metadata.chunkType
      }));
    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  }

}