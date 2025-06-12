/**
 * Multi-strategy search engine for knowledge base
 */

import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeGraph, SearchResult } from '../models/types';

export class SearchEngine {
  private graph: KnowledgeGraph;

  constructor(graph: KnowledgeGraph) {
    this.graph = graph;
  }

  search(query: string, limit: number = 50): SearchResult[] {
    const results: SearchResult[] = [];

    // 1. Text search (content matching)
    results.push(...this.searchText(query));

    // 2. Path search (filename matching)
    results.push(...this.searchPaths(query));

    // 3. Tag search
    results.push(...this.searchTags(query));

    // 4. Title/heading search
    results.push(...this.searchHeadings(query));

    // Merge and score results
    const mergedResults = this.mergeResults(results);

    // Sort by score and limit
    mergedResults.sort((a, b) => b.score - a.score);
    return mergedResults.slice(0, limit);
  }

  searchText(pattern: string): SearchResult[] {
    const results: SearchResult[] = [];

    let regex: RegExp;
    try {
      // Compile regex pattern (case-insensitive by default)
      regex = new RegExp(pattern, 'gi');
    } catch (error) {
      // If regex compilation fails, treat as literal string
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escapedPattern, 'gi');
    }

    for (const node of this.graph.nodes.values()) {
      try {
        // Read file content
        const content = fs.readFileSync(node.note.path, 'utf-8');

        // Find all matches
        const matches = Array.from(content.matchAll(regex));
        if (matches.length > 0) {
          // Calculate score based on number of matches
          const score = matches.length * 1.0;

          // Get first match context
          const firstMatch = matches[0];
          const context = this.extractMatchContext(content, firstMatch);
          const lineNumber = content.substring(0, firstMatch.index!).split('\n').length;

          results.push({
            notePath: node.note.path,
            score,
            matchType: 'text',
            context,
            lineNumber,
            graphNode: node
          });
        }
      } catch (error) {
        continue;
      }
    }

    return results;
  }

  searchPaths(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const node of this.graph.nodes.values()) {
      const filePath = path.parse(node.note.path);

      // Check filename match
      let filenameScore = 0;
      if (filePath.name.toLowerCase().includes(queryLower)) {
        // Exact match in filename gets high score
        if (queryLower === filePath.name.toLowerCase()) {
          filenameScore = 10.0;
        } else {
          filenameScore = 5.0;
        }
      }

      // Check path components
      let pathScore = 0;
      const pathParts = node.note.relativePath.split(path.sep);
      for (const part of pathParts) {
        if (part.toLowerCase().includes(queryLower)) {
          pathScore += 1.0;
        }
      }

      const totalScore = filenameScore + pathScore;
      if (totalScore > 0) {
        results.push({
          notePath: node.note.path,
          score: totalScore,
          matchType: 'path',
          context: `Path: ${node.note.relativePath}`,
          graphNode: node
        });
      }
    }

    return results;
  }

  searchTags(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    let queryLower = query.toLowerCase();

    // Remove # if present in query
    if (queryLower.startsWith('#')) {
      queryLower = queryLower.slice(1);
    }

    for (const node of this.graph.nodes.values()) {
      const matchingTags: string[] = [];
      for (const tag of node.note.tags) {
        if (tag.toLowerCase().includes(queryLower)) {
          matchingTags.push(tag);
        }
      }

      if (matchingTags.length > 0) {
        // Score based on exact vs partial matches
        const score = matchingTags.reduce((total, tag) => {
          return total + (queryLower === tag.toLowerCase() ? 3.0 : 1.0);
        }, 0);

        const context = `Tags: ${matchingTags.map(tag => `#${tag}`).join(', ')}`;

        results.push({
          notePath: node.note.path,
          score,
          matchType: 'tag',
          context,
          graphNode: node
        });
      }
    }

    return results;
  }

  searchHeadings(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const node of this.graph.nodes.values()) {
      const matchingHeadings: Array<{ text: string; score: number; lineNumber: number }> = [];

      // Check note title
      if (node.note.title.toLowerCase().includes(queryLower)) {
        const score = queryLower === node.note.title.toLowerCase() ? 5.0 : 2.0;
        matchingHeadings.push({ text: node.note.title, score, lineNumber: 0 });
      }

      // Check all headings
      for (const heading of node.note.headings) {
        if (heading.text.toLowerCase().includes(queryLower)) {
          const score = queryLower === heading.text.toLowerCase() ? 3.0 : 1.0;
          matchingHeadings.push({ 
            text: heading.text, 
            score, 
            lineNumber: heading.lineNumber 
          });
        }
      }

      if (matchingHeadings.length > 0) {
        // Use highest scoring heading
        const bestHeading = matchingHeadings.reduce((best, current) => 
          current.score > best.score ? current : best
        );

        const context = `Heading: ${bestHeading.text}`;

        results.push({
          notePath: node.note.path,
          score: bestHeading.score,
          matchType: 'heading',
          context,
          lineNumber: bestHeading.lineNumber > 0 ? bestHeading.lineNumber : undefined,
          graphNode: node
        });
      }
    }

    return results;
  }

  globSearch(pattern: string): string[] {
    const matchingPaths: string[] = [];

    // Simple glob-like matching
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\[([^\]]+)\]/g, '[$1]');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');

    for (const node of this.graph.nodes.values()) {
      // Check against relative path
      if (regex.test(node.note.relativePath)) {
        matchingPaths.push(node.note.path);
      }
      // Also check against just filename
      else if (regex.test(path.basename(node.note.path))) {
        matchingPaths.push(node.note.path);
      }
    }

    return matchingPaths.sort();
  }

  grepSearch(pattern: string, contextLines: number = 2): Array<{
    file: string;
    lineNumber: number;
    line: string;
    context: string[];
  }> {
    const results: Array<{
      file: string;
      lineNumber: number;
      line: string;
      context: string[];
    }> = [];

    let regex: RegExp;
    try {
      regex = new RegExp(pattern, 'gi');
    } catch (error) {
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escapedPattern, 'gi');
    }

    for (const node of this.graph.nodes.values()) {
      try {
        const content = fs.readFileSync(node.note.path, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, lineIndex) => {
          if (regex.test(line)) {
            // Extract context lines
            const startLine = Math.max(0, lineIndex - contextLines);
            const endLine = Math.min(lines.length, lineIndex + contextLines + 1);
            const context = lines.slice(startLine, endLine);

            results.push({
              file: node.note.relativePath,
              lineNumber: lineIndex + 1,
              line: line.trim(),
              context
            });
          }
        });
      } catch (error) {
        continue;
      }
    }

    return results;
  }

  private mergeResults(results: SearchResult[]): SearchResult[] {
    // Group by note path
    const grouped = new Map<string, SearchResult[]>();
    
    for (const result of results) {
      const path = result.notePath;
      if (!grouped.has(path)) {
        grouped.set(path, []);
      }
      grouped.get(path)!.push(result);
    }

    // Merge results for each note
    const merged: SearchResult[] = [];
    
    for (const [path, pathResults] of grouped.entries()) {
      if (pathResults.length === 1) {
        merged.push(pathResults[0]);
      } else {
        // Combine scores and contexts
        const totalScore = pathResults.reduce((sum, r) => sum + r.score, 0);
        const matchTypes = pathResults.map(r => r.matchType);
        const contexts = pathResults.map(r => r.context).filter(Boolean) as string[];

        // Boost score for multiple match types
        const finalScore = new Set(matchTypes).size > 1 ? totalScore * 1.5 : totalScore;

        const mergedResult: SearchResult = {
          notePath: path,
          score: finalScore,
          matchType: Array.from(new Set(matchTypes)).sort().join('+'),
          context: contexts.slice(0, 3).join(' | '), // Limit context length
          graphNode: pathResults[0].graphNode
        };
        merged.push(mergedResult);
      }
    }

    return merged;
  }

  private extractMatchContext(content: string, match: RegExpMatchArray, contextChars: number = 100): string {
    const start = Math.max(0, (match.index || 0) - contextChars);
    const end = Math.min(content.length, (match.index || 0) + match[0].length + contextChars);

    let context = content.slice(start, end);
    context = context.replace(/\s+/g, ' ').trim(); // Normalize whitespace

    // Add ellipsis if truncated
    if (start > 0) {
      context = '...' + context;
    }
    if (end < content.length) {
      context = context + '...';
    }

    return context;
  }
}