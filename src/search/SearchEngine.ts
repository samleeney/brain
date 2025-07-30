/**
 * Semantic search engine with FileRegistry integration
 */

import { VectorStore } from '../embedding/VectorStore';
import { EmbeddingService } from '../embedding/EmbeddingService';
import { FileRecord } from '../storage/FileRegistry';

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

export class SearchEngine {
  private vectorStore: VectorStore;

  constructor(vectorStore: VectorStore) {
    this.vectorStore = vectorStore;
  }

  /**
   * Enhanced parallel multi-phrase semantic search
   */
  async enhancedSearch(
    query: string,
    apiKey: string,
    limit: number = 10,
    threshold: number = 0.3,
    enableMultiPhrase: boolean = true
  ): Promise<SearchResult[]> {
    try {
      const embeddingService = new EmbeddingService(apiKey);
      
      if (!enableMultiPhrase) {
        return await this.semanticSearch(query, embeddingService, limit, threshold);
      }

      // Generate query variations for parallel search
      const queryVariations = this.generateQueryVariations(query);
      
      // Perform parallel searches
      const searchPromises = queryVariations.map(variation =>
        this.vectorStore.search(variation, embeddingService, limit * 2, threshold)
      );

      const allResults = await Promise.all(searchPromises);
      
      // Combine and deduplicate results
      const combinedResults = new Map<string, SearchResult>();
      
      for (const results of allResults) {
        for (const result of results) {
          const key = result.document.vectorKey;
          
          if (!combinedResults.has(key) || 
              (combinedResults.get(key)!.similarity < result.similarity)) {
            combinedResults.set(key, {
              fileId: result.file.id,
              filePath: result.file.absolutePath,
              displayName: result.file.displayName,
              chunkId: result.document.vectorKey,
              similarity: result.similarity,
              snippet: result.snippet,
              headingContext: result.document.metadata.headingContext,
              chunkType: result.document.metadata.chunkType
            });
          }
        }
      }

      // Sort by similarity and return top results
      return Array.from(combinedResults.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
        
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Basic semantic search
   */
  private async semanticSearch(
    query: string,
    embeddingService: EmbeddingService,
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<SearchResult[]> {
    try {
      const results = await this.vectorStore.search(query, embeddingService, limit, threshold);
      
      return results.map(result => ({
        fileId: result.file.id,
        filePath: result.file.absolutePath,
        displayName: result.file.displayName,
        chunkId: result.document.vectorKey,
        similarity: result.similarity,
        snippet: result.snippet,
        headingContext: result.document.metadata.headingContext,
        chunkType: result.document.metadata.chunkType
      }));
    } catch (error) {
      console.error('Semantic search error:', error);
      throw error;
    }
  }

  /**
   * Comprehensive research search using multiple strategies
   */
  async comprehensiveResearch(
    query: string,
    apiKey: string,
    limit: number = 15,
    threshold: number = 0.3
  ): Promise<SearchResult[]> {
    try {
      const embeddingService = new EmbeddingService(apiKey);
      
      // Generate comprehensive query variations
      const strategies = [
        query, // Original
        this.expandAcronyms(query),
        this.addSynonyms(query),
        ...this.generateSubQueries(query),
        ...this.generateContextualQueries(query)
      ];

      // Remove duplicates
      const uniqueStrategies = [...new Set(strategies.filter(s => s.length > 0))];
      
      // Parallel search with all strategies
      const searchPromises = uniqueStrategies.map(strategy =>
        this.vectorStore.search(strategy, embeddingService, limit * 2, threshold * 0.8)
      );

      const allResults = await Promise.all(searchPromises);
      
      // Advanced result merging with boost for multiple matches
      const resultScores = new Map<string, { result: SearchResult, matchCount: number, maxScore: number }>();
      
      for (const results of allResults) {
        for (const result of results) {
          const key = result.document.vectorKey;
          const existing = resultScores.get(key);
          
          const searchResult: SearchResult = {
            fileId: result.file.id,
            filePath: result.file.absolutePath,
            displayName: result.file.displayName,
            chunkId: result.document.vectorKey,
            similarity: result.similarity,
            snippet: result.snippet,
            headingContext: result.document.metadata.headingContext,
            chunkType: result.document.metadata.chunkType
          };
          
          if (!existing) {
            resultScores.set(key, {
              result: searchResult,
              matchCount: 1,
              maxScore: result.similarity
            });
          } else {
            existing.matchCount++;
            existing.maxScore = Math.max(existing.maxScore, result.similarity);
            // Boost score for multiple matches
            existing.result.similarity = existing.maxScore * (1 + 0.1 * Math.log(existing.matchCount));
          }
        }
      }

      // Convert to array and sort
      return Array.from(resultScores.values())
        .map(({ result }) => result)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
        
    } catch (error) {
      console.error('Comprehensive research error:', error);
      throw error;
    }
  }

  /**
   * Generate query variations for multi-phrase search
   */
  private generateQueryVariations(query: string): string[] {
    const variations = [query];
    
    // Split into phrases/keywords
    const phrases = this.extractPhrases(query);
    
    if (phrases.length > 1) {
      // Individual phrases
      variations.push(...phrases);
      
      // Combinations of phrases
      if (phrases.length <= 4) {
        for (let i = 0; i < phrases.length - 1; i++) {
          for (let j = i + 1; j < phrases.length; j++) {
            variations.push(`${phrases[i]} ${phrases[j]}`);
          }
        }
      }
    }
    
    // Add question variations
    if (!query.includes('?')) {
      variations.push(`What is ${query}?`);
      variations.push(`How does ${query} work?`);
    }
    
    return [...new Set(variations)];
  }

  /**
   * Extract meaningful phrases from query
   */
  private extractPhrases(query: string): string[] {
    // Remove common question words
    const cleaned = query
      .replace(/^(what|how|why|when|where|who|which)\s+/i, '')
      .replace(/\?+$/, '');
    
    // Split by common delimiters but preserve quoted phrases
    const phrases: string[] = [];
    const regex = /"([^"]+)"|'([^']+)'|([^,;:]+)/g;
    let match;
    
    while ((match = regex.exec(cleaned)) !== null) {
      const phrase = (match[1] || match[2] || match[3]).trim();
      if (phrase.length > 2) {
        phrases.push(phrase);
      }
    }
    
    return phrases;
  }

  /**
   * Expand common acronyms
   */
  private expandAcronyms(query: string): string {
    const acronyms: { [key: string]: string } = {
      'reach': 'radio experiment analysing cosmic hydrogen',
      'eor': 'epoch of reionisation',
      'rfi': 'radio frequency interference',
      'edges': 'experiment detect global eor signature',
      'saras': 'shaped antenna radio spectrum',
      'hera': 'hydrogen epoch reionization array',
      'leda': 'large aperture experiment detect dark ages',
      'mwa': 'murchison widefield array',
      'cmb': 'cosmic microwave background',
      'fwhm': 'full width half maximum',
      // Add more as needed
    };
    
    let expanded = query;
    for (const [acronym, full] of Object.entries(acronyms)) {
      const regex = new RegExp(`\\b${acronym}\\b`, 'gi');
      if (regex.test(query)) {
        expanded = query.replace(regex, full);
        break; // Only expand one acronym to avoid over-expansion
      }
    }
    
    return expanded;
  }

  /**
   * Add synonyms for common terms
   */
  private addSynonyms(query: string): string {
    const synonyms: { [key: string]: string[] } = {
      'create': ['build', 'make', 'construct'],
      'delete': ['remove', 'destroy', 'eliminate'],
      'update': ['modify', 'change', 'edit'],
      'fast': ['quick', 'rapid', 'performant'],
      'bug': ['error', 'issue', 'problem'],
      // Add more as needed
    };
    
    for (const [word, syns] of Object.entries(synonyms)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(query)) {
        const synonym = syns[Math.floor(Math.random() * syns.length)];
        return query.replace(regex, synonym);
      }
    }
    
    return query;
  }

  /**
   * Generate sub-queries from longer queries
   */
  private generateSubQueries(query: string): string[] {
    const words = query.split(/\s+/);
    if (words.length <= 3) return [];
    
    const subQueries: string[] = [];
    
    // Sliding window approach
    for (let windowSize = 2; windowSize <= Math.min(4, words.length - 1); windowSize++) {
      for (let i = 0; i <= words.length - windowSize; i++) {
        subQueries.push(words.slice(i, i + windowSize).join(' '));
      }
    }
    
    return subQueries;
  }

  /**
   * Generate contextual query variations
   */
  private generateContextualQueries(query: string): string[] {
    const contexts = [
      `definition of ${query}`,
      `example of ${query}`,
      `${query} implementation`,
      `${query} best practices`,
      `${query} tutorial`
    ];
    
    return contexts.filter(c => c.length < 100); // Avoid overly long queries
  }
}