/**
 * Semantic search engine with FileRegistry integration
 */
import { VectorStore } from '../embedding/VectorStore';
export interface SearchResult {
    fileId: string;
    filePath: string;
    displayName: string;
    chunkId: string;
    similarity: number;
    snippet: string;
    headingContext: string[];
    chunkType: string;
}
export declare class SearchEngine {
    private vectorStore;
    constructor(vectorStore: VectorStore);
    /**
     * Enhanced parallel multi-phrase semantic search
     */
    enhancedSearch(query: string, apiKey: string, limit?: number, threshold?: number, enableMultiPhrase?: boolean): Promise<SearchResult[]>;
    /**
     * Basic semantic search
     */
    private semanticSearch;
    /**
     * Comprehensive research search using multiple strategies
     */
    comprehensiveResearch(query: string, apiKey: string, limit?: number, threshold?: number): Promise<SearchResult[]>;
    /**
     * Generate query variations for multi-phrase search
     */
    private generateQueryVariations;
    /**
     * Extract meaningful phrases from query
     */
    private extractPhrases;
    /**
     * Expand common acronyms
     */
    private expandAcronyms;
    /**
     * Add synonyms for common terms
     */
    private addSynonyms;
    /**
     * Generate sub-queries from longer queries
     */
    private generateSubQueries;
    /**
     * Generate contextual query variations
     */
    private generateContextualQueries;
}
//# sourceMappingURL=SearchEngine.d.ts.map