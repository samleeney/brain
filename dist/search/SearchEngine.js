"use strict";
/**
 * Semantic search engine for knowledge base with parallel multi-phrase optimization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchEngine = void 0;
const VectorStore_1 = require("../embedding/VectorStore");
const EmbeddingService_1 = require("../embedding/EmbeddingService");
class SearchEngine {
    graph;
    notesRoot;
    constructor(graph, notesRoot) {
        this.graph = graph;
        this.notesRoot = notesRoot || '';
    }
    /**
     * Enhanced parallel multi-phrase semantic search
     * Automatically expands queries and searches in parallel for better recall
     */
    async enhancedSearch(query, apiKey, limit = 10, threshold = 0.3, enableMultiPhrase = true) {
        if (!this.notesRoot) {
            return [];
        }
        try {
            if (!enableMultiPhrase) {
                return await this.semanticSearch(query, apiKey, limit, threshold);
            }
            // Generate query variations for parallel search
            const queryVariations = this.generateQueryVariations(query);
            // Perform parallel searches
            const searchPromises = queryVariations.map(variation => this.semanticSearch(variation, apiKey, Math.ceil(limit * 1.5), threshold * 0.8));
            const allResults = await Promise.all(searchPromises);
            const combinedResults = allResults.flat();
            // Deduplicate and rank results
            return this.deduplicateAndRank(combinedResults, limit);
        }
        catch (error) {
            console.error('Enhanced search failed:', error);
            return [];
        }
    }
    /**
     * Comprehensive search for complex research queries
     * Combines multiple search strategies in a single call for maximum efficiency
     */
    async comprehensiveSearch(baseQuery, apiKey, limit = 15, threshold = 0.3) {
        if (!this.notesRoot) {
            return [];
        }
        try {
            // Generate comprehensive query set for research-style queries
            const researchQueries = this.generateResearchQueries(baseQuery);
            // Perform all searches in parallel
            const searchPromises = researchQueries.map(queryInfo => this.semanticSearch(queryInfo.query, apiKey, Math.ceil(limit * 2), threshold * queryInfo.thresholdMultiplier));
            const allResults = await Promise.all(searchPromises);
            const combinedResults = allResults.flat();
            // Advanced deduplication and ranking for research queries
            return this.deduplicateAndRankForResearch(combinedResults, limit);
        }
        catch (error) {
            console.error('Comprehensive search failed:', error);
            return [];
        }
    }
    /**
     * Generate research-focused query variations for comprehensive searches
     */
    generateResearchQueries(baseQuery) {
        const queries = [];
        // Original query (high precision)
        queries.push({ query: baseQuery, thresholdMultiplier: 1.0 });
        // Keyword extraction (medium precision)
        const keywords = this.extractKeywords(baseQuery);
        if (keywords.length > 0) {
            queries.push({
                query: keywords.join(' '),
                thresholdMultiplier: 0.9
            });
        }
        // Synonym expansion (medium precision)
        const expandedQuery = this.expandSynonyms(baseQuery);
        if (expandedQuery !== baseQuery) {
            queries.push({
                query: expandedQuery,
                thresholdMultiplier: 0.9
            });
        }
        // Contextual expansion (broader search)
        const contextualQuery = this.addContextualTerms(baseQuery);
        if (contextualQuery !== baseQuery) {
            queries.push({
                query: contextualQuery,
                thresholdMultiplier: 0.8
            });
        }
        // Temporal expansion (broader search)
        const temporalQuery = this.expandTemporal(baseQuery);
        if (temporalQuery !== baseQuery) {
            queries.push({
                query: temporalQuery,
                thresholdMultiplier: 0.8
            });
        }
        // For complex queries, add specific domain expansions
        if (this.isComplexQuery(baseQuery)) {
            const domainQueries = this.generateDomainSpecificQueries(baseQuery);
            queries.push(...domainQueries);
        }
        return queries;
    }
    /**
     * Check if this is a complex research query that needs domain-specific expansion
     */
    isComplexQuery(query) {
        const complexPatterns = [
            /\b(holiday|vacation|trip|travel).*\b(year|time|when|where)\b/i,
            /\b(work|project|research).*\b(history|timeline|progress)\b/i,
            /\b(learn|study|education).*\b(about|topic|subject)\b/i,
            /\b(meeting|discussion|call).*\b(with|about|regarding)\b/i
        ];
        return complexPatterns.some(pattern => pattern.test(query));
    }
    /**
     * Generate domain-specific query variations for complex searches
     */
    generateDomainSpecificQueries(baseQuery) {
        const domainQueries = [];
        // Travel/Holiday domain
        if (/\b(holiday|vacation|trip|travel|skiing|beach|camping)\b/i.test(baseQuery)) {
            domainQueries.push({ query: `${baseQuery} booking accommodation flight hotel`, thresholdMultiplier: 0.7 }, { query: `${baseQuery} photos memories experience`, thresholdMultiplier: 0.7 }, { query: `${baseQuery} 2020 2021 2022 2023 2024 2025`, thresholdMultiplier: 0.6 });
        }
        // Work/Research domain
        if (/\b(work|project|research|paper|study|meeting)\b/i.test(baseQuery)) {
            domainQueries.push({ query: `${baseQuery} progress status update deadline`, thresholdMultiplier: 0.7 }, { query: `${baseQuery} notes discussion ideas`, thresholdMultiplier: 0.7 });
        }
        // Learning domain
        if (/\b(learn|study|course|tutorial|programming|code)\b/i.test(baseQuery)) {
            domainQueries.push({ query: `${baseQuery} documentation example tutorial`, thresholdMultiplier: 0.7 }, { query: `${baseQuery} notes summary key points`, thresholdMultiplier: 0.7 });
        }
        return domainQueries;
    }
    /**
     * Advanced deduplication and ranking specifically for research queries
     */
    deduplicateAndRankForResearch(results, limit) {
        // Deduplicate by chunkId with weighted scoring
        const uniqueResults = new Map();
        for (const result of results) {
            const existing = uniqueResults.get(result.chunkId);
            // Calculate weighted score based on similarity and content type
            const contentTypeBoost = this.getContentTypeBoost(result);
            const weightedScore = result.similarity * contentTypeBoost;
            if (!existing || weightedScore > existing.score) {
                uniqueResults.set(result.chunkId, {
                    ...result,
                    score: weightedScore
                });
            }
        }
        // Sort by weighted score and group by note for better result distribution
        const sortedResults = Array.from(uniqueResults.values())
            .sort((a, b) => b.score - a.score);
        // Ensure diverse results across different notes
        return this.diversifyResults(sortedResults, limit);
    }
    /**
     * Boost certain content types that are more valuable for research
     */
    getContentTypeBoost(result) {
        // Boost headings and titles as they're often more informative
        if (result.chunkType === 'heading' || result.chunkType === 'title') {
            return 1.2;
        }
        // Boost content with dates/times for timeline queries
        if (/\b(202[0-5]|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(result.snippet)) {
            return 1.1;
        }
        return 1.0;
    }
    /**
     * Ensure result diversity across different notes to avoid clustering
     */
    diversifyResults(results, limit) {
        const diverseResults = [];
        const notesSeen = new Set();
        const maxPerNote = Math.ceil(limit * 0.4); // Max 40% from any single note
        const noteChunkCount = new Map();
        for (const result of results) {
            if (diverseResults.length >= limit)
                break;
            const chunkCount = noteChunkCount.get(result.notePath) || 0;
            // Include if we haven't seen this note yet, or if we haven't exceeded the per-note limit
            if (!notesSeen.has(result.notePath) || chunkCount < maxPerNote) {
                diverseResults.push(result);
                notesSeen.add(result.notePath);
                noteChunkCount.set(result.notePath, chunkCount + 1);
            }
        }
        // If we still have room, fill with remaining high-scoring results
        if (diverseResults.length < limit) {
            for (const result of results) {
                if (diverseResults.length >= limit)
                    break;
                if (!diverseResults.some(r => r.chunkId === result.chunkId)) {
                    diverseResults.push(result);
                }
            }
        }
        return diverseResults;
    }
    /**
     * Generate query variations for improved search recall
     */
    generateQueryVariations(query) {
        const variations = new Set();
        // Original query
        variations.add(query);
        // Keyword extraction - just the important words
        const keywords = this.extractKeywords(query);
        if (keywords.length > 0) {
            variations.add(keywords.join(' '));
        }
        // Synonym expansion for common terms
        const expandedQuery = this.expandSynonyms(query);
        if (expandedQuery !== query) {
            variations.add(expandedQuery);
        }
        // Context expansion - add related terms
        const contextualQuery = this.addContextualTerms(query);
        if (contextualQuery !== query) {
            variations.add(contextualQuery);
        }
        // Temporal expansion for date-related queries
        const temporalQuery = this.expandTemporal(query);
        if (temporalQuery !== query) {
            variations.add(temporalQuery);
        }
        return Array.from(variations);
    }
    /**
     * Extract important keywords from query, removing stop words
     */
    extractKeywords(query) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
            'above', 'below', 'between', 'among', 'this', 'that', 'these', 'those', 'i',
            'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours'
        ]);
        return query.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .filter(word => /^[a-zA-Z0-9]+$/.test(word)); // Only alphanumeric
    }
    /**
     * Expand query with synonyms for better recall
     */
    expandSynonyms(query) {
        const synonymMap = {
            'ski': ['skiing', 'snow', 'winter', 'alpine', 'slopes', 'powder'],
            'skiing': ['ski', 'snow', 'winter', 'alpine', 'slopes', 'powder'],
            'trip': ['vacation', 'holiday', 'travel', 'journey', 'visit'],
            'vacation': ['trip', 'holiday', 'travel', 'getaway'],
            'holiday': ['vacation', 'trip', 'travel', 'break'],
            'work': ['job', 'career', 'project', 'task'],
            'learn': ['study', 'education', 'training', 'course'],
            'code': ['programming', 'development', 'software', 'coding'],
            'programming': ['code', 'development', 'software', 'coding'],
            'note': ['notes', 'documentation', 'memo', 'record'],
            'meeting': ['call', 'discussion', 'session', 'conference']
        };
        let expandedQuery = query;
        for (const [word, synonyms] of Object.entries(synonymMap)) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            if (regex.test(query)) {
                // Add one most relevant synonym
                expandedQuery += ` ${synonyms[0]}`;
            }
        }
        return expandedQuery;
    }
    /**
     * Add contextual terms based on query content
     */
    addContextualTerms(query) {
        const contextMap = {
            'ski': ['mountain', 'resort', 'austria', 'italy', 'france', 'switzerland'],
            'travel': ['booking', 'flight', 'hotel', 'accommodation'],
            'work': ['project', 'meeting', 'deadline', 'task'],
            'research': ['paper', 'study', 'analysis', 'experiment'],
            'code': ['github', 'project', 'function', 'bug', 'feature']
        };
        let contextualQuery = query;
        for (const [keyword, contexts] of Object.entries(contextMap)) {
            if (query.toLowerCase().includes(keyword)) {
                // Add most relevant context term
                contextualQuery += ` ${contexts[0]}`;
                break;
            }
        }
        return contextualQuery;
    }
    /**
     * Expand temporal queries with related time terms
     */
    expandTemporal(query) {
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;
        const nextYear = currentYear + 1;
        let expandedQuery = query;
        // Add year variations for temporal queries
        if (/\b(this year|last year|next year)\b/i.test(query)) {
            expandedQuery += ` ${currentYear} ${lastYear}`;
        }
        // Add month context for seasonal activities
        if (/\b(ski|skiing|snow|winter)\b/i.test(query)) {
            expandedQuery += ' december january february march april';
        }
        if (/\b(summer|beach|vacation)\b/i.test(query)) {
            expandedQuery += ' june july august september';
        }
        return expandedQuery;
    }
    /**
     * Deduplicate results and rank by relevance
     */
    deduplicateAndRank(results, limit) {
        // Deduplicate by chunkId
        const uniqueResults = new Map();
        for (const result of results) {
            const existing = uniqueResults.get(result.chunkId);
            if (!existing || result.similarity > existing.similarity) {
                uniqueResults.set(result.chunkId, result);
            }
        }
        // Sort by similarity and limit results
        return Array.from(uniqueResults.values())
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }
    /**
     * Original semantic similarity search - finds relevant chunks using embeddings
     */
    async semanticSearch(query, apiKey, limit = 10, threshold = 0.3) {
        if (!this.notesRoot) {
            return [];
        }
        try {
            const vectorStore = new VectorStore_1.VectorStore(this.notesRoot);
            const embeddingService = new EmbeddingService_1.EmbeddingService(apiKey);
            const results = await vectorStore.findSimilar(query, embeddingService, limit, threshold);
            return results.map(result => ({
                notePath: result.document.metadata.notePath,
                chunkId: result.document.id,
                similarity: result.similarity,
                snippet: result.snippet,
                headingContext: result.document.metadata.headingContext,
                chunkType: result.document.metadata.chunkType
            }));
        }
        catch (error) {
            console.error('Semantic search failed:', error);
            return [];
        }
    }
}
exports.SearchEngine = SearchEngine;
//# sourceMappingURL=SearchEngine.js.map