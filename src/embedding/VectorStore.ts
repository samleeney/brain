/**
 * Vector storage and similarity search for note embeddings with FileRegistry integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { EmbeddingService } from './EmbeddingService';
import { Chunk } from '../models/types';
import { FileRegistry, FileRecord, ChunkRecord } from '../storage/FileRegistry';

export interface VectorDocument {
  vectorKey: string;    // UUID-based key for vector store
  fileId: string;       // Reference to file in registry
  content: string;      // Text content that was embedded
  embedding: number[];  // Vector embedding
  metadata: {
    chunkType: string;    // Type of content chunk
    headingContext: string[]; // Hierarchical heading path
    startLine: number;
    endLine: number;
    chunkIndex: number;
  };
}

export interface SimilarityResult {
  document: VectorDocument;
  file: FileRecord;
  similarity: number;
  snippet: string;
}

export class VectorStore {
  private documents: Map<string, VectorDocument> = new Map();
  private filePath: string;
  private fileRegistry: FileRegistry;

  constructor(configDir: string, fileRegistry: FileRegistry) {
    this.filePath = path.join(configDir, '.brain-vectors-v2.json');
    this.fileRegistry = fileRegistry;
    this.loadFromDisk();
  }

  /**
   * Add embeddings for file chunks
   */
  async addFileChunks(
    fileRecord: FileRecord,
    chunks: Chunk[],
    embeddingService: EmbeddingService
  ): Promise<void> {
    console.log(`  📝 Processing ${chunks.length} chunks for ${fileRecord.displayName}`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Add chunk to database
      const chunkRecord = await this.fileRegistry.addChunk(
        fileRecord.id,
        i,
        chunk.content
      );

      // Generate embedding
      const embeddingResult = await embeddingService.embedText(chunk.content);
      const embedding = embeddingResult.embedding;

      // Create vector document
      const vectorDoc: VectorDocument = {
        vectorKey: chunkRecord.vectorStoreKey,
        fileId: fileRecord.id,
        content: chunk.content,
        embedding,
        metadata: {
          chunkType: chunk.chunkType.toString(),
          headingContext: chunk.headingContext || [],
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          chunkIndex: i
        }
      };

      this.documents.set(chunkRecord.vectorStoreKey, vectorDoc);
    }
  }

  /**
   * Search for similar content with FileRegistry integration
   */
  async search(
    query: string,
    embeddingService: EmbeddingService,
    topK: number = 10,
    threshold: number = 0.7
  ): Promise<SimilarityResult[]> {
    const queryResult = await embeddingService.embedText(query);
    const queryEmbedding = queryResult.embedding;
    const results: SimilarityResult[] = [];

    // Calculate similarities for all documents
    for (const [vectorKey, doc] of this.documents.entries()) {
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      
      if (similarity >= threshold) {
        // Get file information from registry
        const fileRecord = await this.fileRegistry.getFileById(doc.fileId);
        
        if (fileRecord) {
          results.push({
            document: doc,
            file: fileRecord,
            similarity,
            snippet: this.createSnippet(doc.content, query)
          });
        }
      }
    }

    // Sort by similarity and return top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Remove all chunks for a file
   */
  async removeFile(fileId: string): Promise<void> {
    // Get all chunks for this file
    const chunks = await this.fileRegistry.getChunksByFileId(fileId);
    
    // Remove from vector store
    for (const chunk of chunks) {
      this.documents.delete(chunk.vectorStoreKey);
    }
    
    // Remove from database
    await this.fileRegistry.removeFile(fileId);
  }

  /**
   * Get document by vector key
   */
  async getDocumentByKey(vectorKey: string): Promise<VectorDocument | null> {
    return this.documents.get(vectorKey) || null;
  }

  /**
   * Check if file has been indexed
   */
  async hasFile(absolutePath: string): Promise<boolean> {
    const fileRecord = await this.fileRegistry.getFileByPath(absolutePath);
    return fileRecord !== null;
  }

  /**
   * Get file's last indexed time
   */
  async getFileLastIndexed(absolutePath: string): Promise<Date | null> {
    const fileRecord = await this.fileRegistry.getFileByPath(absolutePath);
    return fileRecord ? fileRecord.dateAdded : null;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Create a snippet from content around query terms
   */
  private createSnippet(content: string, query: string, maxLength: number = 200): string {
    const words = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    // Find the first occurrence of any query word
    let bestIndex = -1;
    for (const word of words) {
      const index = contentLower.indexOf(word);
      if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index;
      }
    }

    if (bestIndex === -1) {
      // No query words found, return start of content
      return content.length <= maxLength
        ? content
        : content.substring(0, maxLength) + '...';
    }

    // Extract snippet around the found word
    const start = Math.max(0, bestIndex - 50);
    const end = Math.min(content.length, bestIndex + maxLength - 50);
    
    let snippet = content.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    return snippet;
  }

  /**
   * Save vector store to disk
   */
  async saveToDisk(): Promise<void> {
    const data = {
      version: 2,
      documents: Array.from(this.documents.entries()).map(([key, doc]) => ({
        key,
        ...doc
      }))
    };

    await fs.promises.writeFile(
      this.filePath,
      JSON.stringify(data, null, 2)
    );
  }

  /**
   * Load vector store from disk
   */
  private loadFromDisk(): void {
    if (!fs.existsSync(this.filePath)) {
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      
      if (data.version === 2 && data.documents) {
        this.documents.clear();
        for (const doc of data.documents) {
          const { key, ...docData } = doc;
          this.documents.set(key, docData);
        }
      }
    } catch (error) {
      console.error('Failed to load vector store:', error);
    }
  }

  /**
   * Get statistics about the vector store
   */
  async getStats(): Promise<{
    totalDocuments: number;
    totalFiles: number;
    totalSize: number;
  }> {
    const files = await this.fileRegistry.getAllFiles();
    const totalSize = Array.from(this.documents.values())
      .reduce((sum, doc) => sum + doc.embedding.length * 4, 0); // 4 bytes per float

    return {
      totalDocuments: this.documents.size,
      totalFiles: files.length,
      totalSize
    };
  }
}