/**
 * Semantic search engine for knowledge base with parallel multi-phrase optimization
 */
import { KnowledgeGraph } from '../models/types';
export interface SearchResult {
    notePath: string;
    chunkId: string;
    similarity: number;
    snippet: string;
    headingContext: string[];
    chunkType: string;
}
export declare class SearchEngine {
    private graph;
    private notesRoot;
    constructor(graph: KnowledgeGraph, notesRoot?: string);
    /**
     * Enhanced parallel multi-phrase semantic search
     * Automatically expands queries and searches in parallel for better recall
     */
    enhancedSearch(query: string, apiKey: string, limit?: number, threshold?: number, enableMultiPhrase?: boolean): Promise<SearchResult[]>;
    /**
     * Comprehensive search for complex research queries
     * Combines multiple search strategies in a single call for maximum efficiency
     */
    comprehensiveSearch(baseQuery: string, apiKey: string, limit?: number, threshold?: number): Promise<SearchResult[]>;
    /**
     * Generate research-focused query variations for comprehensive searches
     */
    private generateResearchQueries;
    /**
     * Check if this is a complex research query that needs domain-specific expansion
     */
    private isComplexQuery;
    /**
     * Generate domain-specific query variations for complex searches
     */
    private generateDomainSpecificQueries;
    /**
     * Advanced deduplication and ranking specifically for research queries
     */
    private deduplicateAndRankForResearch;
    /**
     * Boost certain content types that are more valuable for research
     */
    private getContentTypeBoost;
    /**
     * Ensure result diversity across different notes to avoid clustering
     */
    private diversifyResults;
    /**
     * Generate query variations for improved search recall
     */
    private generateQueryVariations;
    /**
     * Extract important keywords from query, removing stop words
     */
    private extractKeywords;
    /**
     * Expand query with synonyms for better recall
     */
    private expandSynonyms;
    /**
     * Add contextual terms based on query content
     */
    private addContextualTerms;
    /**
     * Expand temporal queries with related time terms
     */
    private expandTemporal;
    /**
     * Deduplicate results and rank by relevance
     */
    private deduplicateAndRank;
    /**
     * Original semantic similarity search - finds relevant chunks using embeddings
     */
    semanticSearch(query: string, apiKey: string, limit?: number, threshold?: number): Promise<SearchResult[]>;
}
//# sourceMappingURL=SearchEngine.d.ts.map