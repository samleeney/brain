/**
 * Vector storage and similarity search for note embeddings
 */

import * as fs from 'fs';
import * as path from 'path';
import { EmbeddingService } from './EmbeddingService';
import { Chunk } from '../models/types';

export interface VectorDocument {
  id: string;           // Unique chunk identifier
  title: string;        // Note title
  content: string;      // Text content that was embedded
  embedding: number[];  // Vector embedding
  metadata: {
    notePath: string;     // Original note path
    relativePath: string;
    lastModified: Date;
    wordCount: number;
    chunkType: string;    // Type of content chunk
    headingContext: string[]; // Hierarchical heading path
    startLine: number;
    endLine: number;
  };
}

export interface SimilarityResult {
  document: VectorDocument;
  similarity: number;
  snippet: string;
}

export class VectorStore {
  private documents: Map<string, VectorDocument[]> = new Map();
  private filePath: string;

  constructor(notesRoot: string) {
    this.filePath = path.join(notesRoot, '.brain-vectors.json');
    this.loadFromDisk();
  }

  /**
   * Add embeddings for note chunks
   */
  async addNoteChunks(
    notePath: string,
    title: string,
    chunks: Chunk[],
    relativePath: string,
    lastModified: Date,
    wordCount: number,
    embeddingService: EmbeddingService
  ): Promise<void> {
    const documents: VectorDocument[] = [];

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map(chunk => chunk.content);
    const embeddings = await embeddingService.embedChunks(chunkTexts);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];

      documents.push({
        id: chunk.id,
        title: title,
        content: chunk.content,
        embedding: embedding.embedding,
        metadata: {
          notePath,
          relativePath,
          lastModified,
          wordCount,
          chunkType: chunk.chunkType,
          headingContext: chunk.headingContext,
          startLine: chunk.startLine,
          endLine: chunk.endLine
        }
      });
    }

    this.documents.set(notePath, documents);
  }

  /**
   * Remove embeddings for a note
   */
  removeNote(notePath: string): void {
    this.documents.delete(notePath);
  }

  /**
   * Find similar chunks using semantic similarity
   */
  async findSimilar(
    query: string,
    embeddingService: EmbeddingService,
    limit: number = 5,
    threshold: number = 0.3
  ): Promise<SimilarityResult[]> {
    // Preprocess query for better matching
    const processedQuery = EmbeddingService.preprocessQuery(query);
    
    // Generate query embedding
    const queryResult = await embeddingService.embedText(processedQuery);
    const queryEmbedding = queryResult.embedding;

    const allResults: Array<{doc: VectorDocument, similarity: number}> = [];

    // Calculate similarity with all chunks
    for (const documents of this.documents.values()) {
      for (const doc of documents) {
        const similarity = EmbeddingService.cosineSimilarity(queryEmbedding, doc.embedding);
        
        // Apply chunk-type boosting
        let boostedSimilarity = similarity;
        if (doc.metadata.chunkType === 'title') {
          boostedSimilarity *= 1.2; // Title chunks are often important
        } else if (doc.metadata.chunkType === 'heading') {
          boostedSimilarity *= 1.1; // Heading sections are structured
        }
        
        if (boostedSimilarity >= threshold) {
          allResults.push({ doc, similarity: boostedSimilarity });
        }
      }
    }

    // Sort by similarity and take top results
    allResults.sort((a, b) => b.similarity - a.similarity);
    const topResults = allResults.slice(0, limit);

    // Convert to SimilarityResult format
    return topResults.map(result => {
      const doc = result.doc;
      
      // Create contextual snippet
      let snippet = doc.content.length > 200 
        ? doc.content.substring(0, 200) + '...'
        : doc.content;
      
      // Add heading context if available
      if (doc.metadata.headingContext.length > 0) {
        const context = doc.metadata.headingContext.join(' > ');
        snippet = `[${context}] ${snippet}`;
      }

      return {
        document: doc,
        similarity: result.similarity,
        snippet
      };
    });
  }

  /**
   * Get all note paths that have embeddings
   */
  getIndexedNotes(): string[] {
    return Array.from(this.documents.keys());
  }

  /**
   * Check if a note needs re-embedding (file modified since last embedding)
   */
  needsReembedding(notePath: string, lastModified: Date): boolean {
    const documents = this.documents.get(notePath);
    if (!documents || documents.length === 0) {
      return true;
    }

    const storedDate = documents[0].metadata.lastModified;
    return lastModified > storedDate;
  }

  /**
   * Get statistics about the vector store
   */
  getStats(): {
    totalNotes: number;
    totalChunks: number;
    averageChunksPerNote: number;
  } {
    const totalNotes = this.documents.size;
    const totalChunks = Array.from(this.documents.values())
      .reduce((sum, docs) => sum + docs.length, 0);
    
    return {
      totalNotes,
      totalChunks,
      averageChunksPerNote: totalNotes > 0 ? totalChunks / totalNotes : 0
    };
  }

  /**
   * Save vector store to disk
   */
  async saveToDisk(): Promise<void> {
    const data = {
      version: '1.0',
      created: new Date().toISOString(),
      documents: Object.fromEntries(this.documents)
    };

    await fs.promises.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Load vector store from disk
   */
  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        
        if (data.documents) {
          this.documents = new Map();
          for (const [notePath, docs] of Object.entries(data.documents)) {
            // Convert stored dates back to Date objects
            const documents = (docs as VectorDocument[]).map(doc => ({
              ...doc,
              metadata: {
                ...doc.metadata,
                lastModified: new Date(doc.metadata.lastModified)
              }
            }));
            this.documents.set(notePath, documents);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load vector store:', error);
      this.documents = new Map();
    }
  }

  /**
   * Clear all embeddings
   */
  clear(): void {
    this.documents.clear();
  }

  /**
   * Export vector store data for debugging
   */
  export(): any {
    return {
      documents: Object.fromEntries(this.documents),
      stats: this.getStats()
    };
  }
}