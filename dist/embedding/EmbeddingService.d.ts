/**
 * OpenAI text-embedding-3-large integration for semantic search
 */
export interface EmbeddingResult {
    text: string;
    embedding: number[];
    tokenCount: number;
}
export declare class EmbeddingService {
    private openai;
    private model;
    constructor(apiKey: string);
    /**
     * Generate embedding for a single text
     */
    embedText(text: string): Promise<EmbeddingResult>;
    /**
     * Generate embeddings for multiple texts in batch
     */
    embedTexts(texts: string[]): Promise<EmbeddingResult[]>;
    /**
     * Calculate cosine similarity between two embeddings
     */
    static cosineSimilarity(a: number[], b: number[]): number;
    /**
     * Generate embeddings for multiple chunks efficiently
     */
    embedChunks(texts: string[]): Promise<EmbeddingResult[]>;
    /**
     * Enhanced preprocessing for semantic search queries
     */
    static preprocessQuery(query: string): string;
}
//# sourceMappingURL=EmbeddingService.d.ts.map