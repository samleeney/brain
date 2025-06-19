/**
 * Vector storage and similarity search for note embeddings
 */
import { EmbeddingService } from './EmbeddingService';
import { Chunk } from '../models/types';
export interface VectorDocument {
    id: string;
    title: string;
    content: string;
    embedding: number[];
    metadata: {
        notePath: string;
        relativePath: string;
        lastModified: Date;
        wordCount: number;
        chunkType: string;
        headingContext: string[];
        startLine: number;
        endLine: number;
    };
}
export interface SimilarityResult {
    document: VectorDocument;
    similarity: number;
    snippet: string;
}
export declare class VectorStore {
    private documents;
    private filePath;
    constructor(notesRoot: string);
    /**
     * Add embeddings for note chunks
     */
    addNoteChunks(notePath: string, title: string, chunks: Chunk[], relativePath: string, lastModified: Date, wordCount: number, embeddingService: EmbeddingService): Promise<void>;
    /**
     * Remove embeddings for a note
     */
    removeNote(notePath: string): void;
    /**
     * Find similar chunks using semantic similarity
     */
    findSimilar(query: string, embeddingService: EmbeddingService, limit?: number, threshold?: number): Promise<SimilarityResult[]>;
    /**
     * Get all note paths that have embeddings
     */
    getIndexedNotes(): string[];
    /**
     * Check if a note needs re-embedding (file modified since last embedding)
     */
    needsReembedding(notePath: string, lastModified: Date): boolean;
    /**
     * Get statistics about the vector store
     */
    getStats(): {
        totalNotes: number;
        totalChunks: number;
        averageChunksPerNote: number;
    };
    /**
     * Save vector store to disk
     */
    saveToDisk(): Promise<void>;
    /**
     * Load vector store from disk
     */
    private loadFromDisk;
    /**
     * Clear all embeddings
     */
    clear(): void;
    /**
     * Export vector store data for debugging
     */
    export(): any;
}
//# sourceMappingURL=VectorStore.d.ts.map