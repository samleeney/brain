/**
 * Intelligent chunking service for markdown content
 * Creates semantic chunks optimized for embedding and retrieval
 */
import { Chunk, Heading } from '../models/types';
export interface ChunkingOptions {
    maxChunkSize: number;
    overlapSize: number;
    preserveHeadings: boolean;
    minChunkSize: number;
}
export declare class ChunkingService {
    private static readonly DEFAULT_OPTIONS;
    /**
     * Generate semantic chunks from markdown content
     */
    static createChunks(content: string, title: string, headings: Heading[], notePath: string, options?: Partial<ChunkingOptions>): Chunk[];
    /**
     * Create a title chunk with context
     */
    private static createTitleChunk;
    /**
     * Create chunks based on heading structure
     */
    private static createHeadingChunks;
    /**
     * Create chunks based on paragraph boundaries
     */
    private static createParagraphChunks;
    /**
     * Split large sections into manageable chunks
     */
    private static splitLargeSection;
    /**
     * Build hierarchical heading context
     */
    private static buildHeadingContext;
    /**
     * Extract overlap content from end of chunk
     */
    private static extractOverlap;
    /**
     * Remove duplicate or very similar chunks
     */
    private static deduplicateChunks;
    /**
     * Calculate simple string similarity (Jaccard index)
     */
    private static calculateStringSimilarity;
    /**
     * Estimate number of lines in text
     */
    private static estimateLines;
    /**
     * Estimate lines needed for overlap content
     */
    private static estimateOverlapLines;
}
//# sourceMappingURL=ChunkingService.d.ts.map