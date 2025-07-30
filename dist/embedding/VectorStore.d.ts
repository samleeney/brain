/**
 * Vector storage and similarity search for note embeddings with FileRegistry integration
 */
import { EmbeddingService } from './EmbeddingService';
import { Chunk } from '../models/types';
import { FileRegistry, FileRecord } from '../storage/FileRegistry';
export interface VectorDocument {
    vectorKey: string;
    fileId: string;
    content: string;
    embedding: number[];
    metadata: {
        chunkType: string;
        headingContext: string[];
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
export declare class VectorStore {
    private documents;
    private filePath;
    private fileRegistry;
    constructor(configDir: string, fileRegistry: FileRegistry);
    /**
     * Add embeddings for file chunks
     */
    addFileChunks(fileRecord: FileRecord, chunks: Chunk[], embeddingService: EmbeddingService): Promise<void>;
    /**
     * Search for similar content with FileRegistry integration
     */
    search(query: string, embeddingService: EmbeddingService, topK?: number, threshold?: number): Promise<SimilarityResult[]>;
    /**
     * Remove all chunks for a file
     */
    removeFile(fileId: string): Promise<void>;
    /**
     * Get document by vector key
     */
    getDocumentByKey(vectorKey: string): Promise<VectorDocument | null>;
    /**
     * Check if file has been indexed
     */
    hasFile(absolutePath: string): Promise<boolean>;
    /**
     * Get file's last indexed time
     */
    getFileLastIndexed(absolutePath: string): Promise<Date | null>;
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Create a snippet from content around query terms
     */
    private createSnippet;
    /**
     * Save vector store to disk
     */
    saveToDisk(): Promise<void>;
    /**
     * Load vector store from disk
     */
    private loadFromDisk;
    /**
     * Get statistics about the vector store
     */
    getStats(): Promise<{
        totalDocuments: number;
        totalFiles: number;
        totalSize: number;
    }>;
}
//# sourceMappingURL=VectorStore.d.ts.map