/**
 * Intelligent chunking service for markdown content
 * Creates semantic chunks optimized for embedding and retrieval
 */

import { Chunk, ChunkType, Heading } from '../models/types';

export interface ChunkingOptions {
  maxChunkSize: number;      // Maximum characters per chunk
  overlapSize: number;       // Overlap between chunks
  preserveHeadings: boolean; // Keep heading structure
  minChunkSize: number;      // Minimum viable chunk size
}

export class ChunkingService {
  private static readonly DEFAULT_OPTIONS: ChunkingOptions = {
    maxChunkSize: 1500,
    overlapSize: 150,
    preserveHeadings: true,
    minChunkSize: 100
  };

  /**
   * Generate semantic chunks from markdown content
   */
  static createChunks(
    content: string,
    title: string,
    headings: Heading[],
    notePath: string,
    options: Partial<ChunkingOptions> = {}
  ): Chunk[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const chunks: Chunk[] = [];
    const lines = content.split('\n');

    // Create title chunk (title + first meaningful paragraph)
    const titleChunk = this.createTitleChunk(content, title, notePath);
    if (titleChunk) {
      chunks.push(titleChunk);
    }

    // Create heading-based chunks
    if (opts.preserveHeadings && headings.length > 0) {
      chunks.push(...this.createHeadingChunks(lines, headings, notePath, opts));
    } else {
      // Fallback to paragraph-based chunking
      chunks.push(...this.createParagraphChunks(lines, notePath, opts));
    }

    return this.deduplicateChunks(chunks, opts);
  }

  /**
   * Create a title chunk with context
   */
  private static createTitleChunk(content: string, title: string, notePath: string): Chunk | null {
    const lines = content.split('\n');
    let firstParagraph = '';
    let endLine = 0;

    // Skip frontmatter and empty lines
    let startLine = 0;
    while (startLine < lines.length && (lines[startLine].trim() === '' || lines[startLine].trim() === '---')) {
      startLine++;
    }

    // Skip title line if it exists
    if (startLine < lines.length && lines[startLine].startsWith('#')) {
      startLine++;
    }

    // Collect first meaningful paragraph
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') {
        if (firstParagraph.trim().length > 0) {
          endLine = i;
          break;
        }
        continue;
      }
      
      firstParagraph += line + ' ';
      
      // Stop if we have enough content
      if (firstParagraph.length > 300) {
        endLine = i + 1;
        break;
      }
    }

    if (firstParagraph.trim().length < 50) {
      return null; // Not enough meaningful content
    }

    const titleContent = `${title}\n\n${firstParagraph.trim()}`;
    
    return {
      id: `${notePath}#title`,
      content: titleContent,
      startLine: 0,
      endLine: endLine,
      headingContext: [title],
      chunkType: ChunkType.TITLE
    };
  }

  /**
   * Create chunks based on heading structure
   */
  private static createHeadingChunks(
    lines: string[],
    headings: Heading[],
    notePath: string,
    options: ChunkingOptions
  ): Chunk[] {
    const chunks: Chunk[] = [];
    
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = i + 1 < headings.length ? headings[i + 1] : null;
      
      // Determine section boundaries
      const startLine = heading.lineNumber;
      const endLine = nextHeading ? nextHeading.lineNumber - 1 : lines.length - 1;
      
      // Extract section content
      const sectionLines = lines.slice(startLine, endLine + 1);
      const sectionContent = sectionLines.join('\n').trim();
      
      if (sectionContent.length < options.minChunkSize) {
        continue; // Skip very small sections
      }

      // Build heading context (hierarchical path)
      const headingContext = this.buildHeadingContext(heading, headings);
      
      // If section is small enough, create single chunk
      if (sectionContent.length <= options.maxChunkSize) {
        chunks.push({
          id: `${notePath}#${heading.slug}`,
          content: sectionContent,
          startLine,
          endLine,
          headingContext,
          chunkType: ChunkType.HEADING_SECTION
        });
      } else {
        // Split large sections into sub-chunks
        const subChunks = this.splitLargeSection(
          sectionContent,
          startLine,
          headingContext,
          notePath,
          heading.slug,
          options
        );
        chunks.push(...subChunks);
      }
    }
    
    return chunks;
  }

  /**
   * Create chunks based on paragraph boundaries
   */
  private static createParagraphChunks(
    lines: string[],
    notePath: string,
    options: ChunkingOptions
  ): Chunk[] {
    const chunks: Chunk[] = [];
    let currentChunk = '';
    let chunkStartLine = 0;
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if we hit a natural break (empty line + enough content)
      if (line.trim() === '' && currentChunk.trim().length >= options.minChunkSize) {
        if (currentChunk.length >= options.maxChunkSize) {
          // Save current chunk
          chunks.push({
            id: `${notePath}#para${chunkIndex}`,
            content: currentChunk.trim(),
            startLine: chunkStartLine,
            endLine: i - 1,
            headingContext: [],
            chunkType: ChunkType.PARAGRAPH
          });
          
          // Start new chunk with overlap
          const overlapContent = this.extractOverlap(currentChunk, options.overlapSize);
          currentChunk = overlapContent;
          chunkStartLine = Math.max(0, i - this.estimateOverlapLines(overlapContent));
          chunkIndex++;
        }
      } else {
        currentChunk += line + '\n';
      }
    }

    // Add final chunk if there's content
    if (currentChunk.trim().length >= options.minChunkSize) {
      chunks.push({
        id: `${notePath}#para${chunkIndex}`,
        content: currentChunk.trim(),
        startLine: chunkStartLine,
        endLine: lines.length - 1,
        headingContext: [],
        chunkType: ChunkType.PARAGRAPH
      });
    }

    return chunks;
  }

  /**
   * Split large sections into manageable chunks
   */
  private static splitLargeSection(
    content: string,
    startLine: number,
    headingContext: string[],
    notePath: string,
    headingSlug: string,
    options: ChunkingOptions
  ): Chunk[] {
    const chunks: Chunk[] = [];
    const paragraphs = content.split('\n\n');
    let currentChunk = '';
    let currentStartLine = startLine;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length + 2 > options.maxChunkSize) {
        if (currentChunk.trim().length >= options.minChunkSize) {
          chunks.push({
            id: `${notePath}#${headingSlug}-${chunkIndex}`,
            content: currentChunk.trim(),
            startLine: currentStartLine,
            endLine: currentStartLine + this.estimateLines(currentChunk),
            headingContext,
            chunkType: ChunkType.HEADING_SECTION
          });
          chunkIndex++;
        }
        
        // Start new chunk with overlap
        const overlapContent = this.extractOverlap(currentChunk, options.overlapSize);
        currentChunk = overlapContent + (overlapContent ? '\n\n' : '') + paragraph;
        currentStartLine += this.estimateLines(currentChunk) - this.estimateLines(overlapContent);
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Add final chunk
    if (currentChunk.trim().length >= options.minChunkSize) {
      chunks.push({
        id: `${notePath}#${headingSlug}-${chunkIndex}`,
        content: currentChunk.trim(),
        startLine: currentStartLine,
        endLine: startLine + this.estimateLines(content),
        headingContext,
        chunkType: ChunkType.HEADING_SECTION
      });
    }

    return chunks;
  }

  /**
   * Build hierarchical heading context
   */
  private static buildHeadingContext(currentHeading: Heading, allHeadings: Heading[]): string[] {
    const context: string[] = [];
    
    // Find parent headings
    for (let i = allHeadings.indexOf(currentHeading) - 1; i >= 0; i--) {
      const heading = allHeadings[i];
      if (heading.level < currentHeading.level) {
        context.unshift(heading.text);
        // Stop at immediate parent for this level
        if (heading.level === currentHeading.level - 1) {
          break;
        }
      }
    }
    
    // Add current heading
    context.push(currentHeading.text);
    
    return context;
  }

  /**
   * Extract overlap content from end of chunk
   */
  private static extractOverlap(content: string, overlapSize: number): string {
    if (content.length <= overlapSize) {
      return content;
    }
    
    // Try to break at sentence boundary within overlap
    const overlapText = content.slice(-overlapSize);
    const sentenceEnd = overlapText.lastIndexOf('. ');
    
    if (sentenceEnd > 0 && sentenceEnd > overlapSize * 0.5) {
      return overlapText.slice(sentenceEnd + 2);
    }
    
    return overlapText;
  }

  /**
   * Remove duplicate or very similar chunks
   */
  private static deduplicateChunks(chunks: Chunk[], options: ChunkingOptions): Chunk[] {
    const uniqueChunks: Chunk[] = [];
    
    for (const chunk of chunks) {
      const isDuplicate = uniqueChunks.some(existing => {
        // Skip title chunks in deduplication
        if (chunk.chunkType === ChunkType.TITLE || existing.chunkType === ChunkType.TITLE) {
          return false;
        }
        
        // Check for high similarity (simple string comparison)
        const similarity = this.calculateStringSimilarity(chunk.content, existing.content);
        return similarity > 0.85;
      });
      
      if (!isDuplicate) {
        uniqueChunks.push(chunk);
      }
    }
    
    return uniqueChunks;
  }

  /**
   * Calculate simple string similarity (Jaccard index)
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Estimate number of lines in text
   */
  private static estimateLines(text: string): number {
    return text.split('\n').length;
  }

  /**
   * Estimate lines needed for overlap content
   */
  private static estimateOverlapLines(text: string): number {
    return Math.max(1, text.split('\n').length);
  }
}