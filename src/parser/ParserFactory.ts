/**
 * Factory for selecting appropriate parser based on file type
 */

import * as path from 'path';
import { BaseParser } from './BaseParser';
import { MarkdownParser } from './MarkdownParser';
import { PDFParser } from './PDFParser';
import { TXTParser } from './TXTParser';
import { ORGParser } from './ORGParser';

export class ParserFactory {
  private parsers: BaseParser[] = [];
  
  constructor() {
    // Register parsers in order of preference
    this.parsers.push(new MarkdownParser());
    this.parsers.push(new PDFParser());
    this.parsers.push(new TXTParser());
    this.parsers.push(new ORGParser());
  }
  
  /**
   * Get parser for a specific file
   * @param filePath Path to the file
   * @returns Appropriate parser or null if unsupported
   */
  getParser(filePath: string): BaseParser | null {
    const extension = path.extname(filePath).toLowerCase();
    
    for (const parser of this.parsers) {
      if (parser.supports(extension)) {
        return parser;
      }
    }
    
    return null;
  }
  
  /**
   * Get all supported file extensions
   * @returns Array of supported extensions
   */
  getSupportedExtensions(): string[] {
    const extensions = new Set<string>();
    
    for (const parser of this.parsers) {
      parser.getSupportedExtensions().forEach(ext => extensions.add(ext));
    }
    
    return Array.from(extensions);
  }
  
  /**
   * Get glob patterns for all supported file types
   * @returns Array of glob patterns
   */
  getSupportedPatterns(): string[] {
    return this.getSupportedExtensions().map(ext => `**/*${ext}`);
  }
}