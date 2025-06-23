/**
 * Plain text parser for extracting structure from text files
 */

import * as path from 'path';
import * as fs from 'fs';
import { BaseParser } from './BaseParser';
import { Note, Heading, Link, LinkType } from '../models/types';

export class TXTParser implements BaseParser {
  async parse(filePath: string, content: string, notesRoot: string): Promise<Note> {
    // Extract title from filename
    const title = path.basename(filePath, path.extname(filePath));
    
    // Extract sections based on text patterns
    const headings = this.extractHeadings(content);
    
    // Extract links (URLs in text)
    const outgoingLinks = this.extractLinks(content, filePath);
    
    // Extract tags (hashtags in text)
    const tags = this.extractTags(content);
    
    // Calculate word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    // Get file modification time
    const stats = await fs.promises.stat(filePath);
    const lastModified = stats.mtime;
    
    // Calculate relative path
    const relativePath = path.relative(notesRoot, filePath);
    
    // Extract metadata from the beginning of the file if it looks like key-value pairs
    const frontmatter = this.extractMetadata(content);
    
    return {
      path: filePath,
      relativePath,
      title,
      headings,
      outgoingLinks,
      tags,
      frontmatter,
      lastModified,
      wordCount
    };
  }
  
  private extractHeadings(content: string): Heading[] {
    const headings: Heading[] = [];
    const lines = content.split('\n');
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Pattern 1: Lines that are underlined with = or -
      if (lineNumber < lines.length) {
        const nextLine = lines[lineNumber] ? lines[lineNumber].trim() : '';
        if (nextLine.length > 0) {
          if (nextLine.match(/^=+$/)) {
            // Underlined with = (level 1)
            headings.push({
              level: 1,
              text: trimmedLine,
              lineNumber,
              slug: this.createSlug(trimmedLine)
            });
            continue;
          } else if (nextLine.match(/^-+$/)) {
            // Underlined with - (level 2)
            headings.push({
              level: 2,
              text: trimmedLine,
              lineNumber,
              slug: this.createSlug(trimmedLine)
            });
            continue;
          }
        }
      }
      
      // Pattern 2: All caps lines that look like headings
      if (trimmedLine.length > 5 && trimmedLine === trimmedLine.toUpperCase() && 
          !/^\d+$/.test(trimmedLine) && trimmedLine.split(/\s+/).length > 1 &&
          trimmedLine.split(/\s+/).length < 10) {
        headings.push({
          level: 1,
          text: trimmedLine,
          lineNumber,
          slug: this.createSlug(trimmedLine)
        });
      }
      // Pattern 3: Lines with numbered sections
      else if (/^(?:\d+\.)+\s+[A-Z]/.test(trimmedLine)) {
        const match = trimmedLine.match(/^((?:\d+\.)+)\s+(.+)$/);
        if (match) {
          const level = Math.min(match[1].split('.').length, 6);
          headings.push({
            level,
            text: match[2],
            lineNumber,
            slug: this.createSlug(match[2])
          });
        }
      }
      // Pattern 4: Lines that start with "Chapter", "Section", etc.
      else if (/^(Chapter|Section|Part|Appendix)\s+\d+[:\s]/i.test(trimmedLine)) {
        headings.push({
          level: 1,
          text: trimmedLine,
          lineNumber,
          slug: this.createSlug(trimmedLine)
        });
      }
      // Pattern 5: Lines that look like Roman numerals
      else if (/^[IVX]+\.\s+[A-Z]/.test(trimmedLine)) {
        headings.push({
          level: 2,
          text: trimmedLine,
          lineNumber,
          slug: this.createSlug(trimmedLine)
        });
      }
      // Pattern 6: Lines with lettered sections
      else if (/^[A-Z]\.\s+[A-Z]/.test(trimmedLine)) {
        headings.push({
          level: 3,
          text: trimmedLine,
          lineNumber,
          slug: this.createSlug(trimmedLine)
        });
      }
    }
    
    return headings;
  }
  
  private extractLinks(content: string, sourcePath: string): Link[] {
    const links: Link[] = [];
    const lines = content.split('\n');
    
    // URL pattern
    const urlPattern = /https?:\/\/[^\s<>"\{\}\|\^\[\]`]+/g;
    
    lines.forEach((line, lineIndex) => {
      let match;
      while ((match = urlPattern.exec(line)) !== null) {
        let url = match[0];
        
        // Remove trailing punctuation
        url = url.replace(/[.,;!?]+$/, '');
        
        // Extract context around the link
        const start = Math.max(0, match.index - 50);
        const end = Math.min(line.length, match.index + url.length + 50);
        let context = line.slice(start, end).trim();
        if (start > 0) context = '...' + context;
        if (end < line.length) context = context + '...';
        
        links.push({
          sourcePath,
          targetPath: null,
          linkType: LinkType.MARKDOWN,
          linkText: url,
          context,
          lineNumber: lineIndex + 1,
          isBroken: false
        });
      }
    });
    
    return links;
  }
  
  private extractTags(content: string): Set<string> {
    const tags = new Set<string>();
    const tagPattern = /(?:^|(?<=\s))#([a-zA-Z0-9_-]+)/g;
    
    let match;
    while ((match = tagPattern.exec(content)) !== null) {
      tags.add(match[1]);
    }
    
    return tags;
  }
  
  private extractMetadata(content: string): Record<string, any> {
    const frontmatter: Record<string, any> = {};
    const lines = content.split('\n');
    
    // Look for key-value pairs at the beginning of the file
    let metadataEndLine = 0;
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Match patterns like "Key: Value" or "Key = Value"
      const keyValueMatch = line.match(/^([A-Za-z][A-Za-z0-9_\s]*)\s*[:=]\s*(.+)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
        const value = keyValueMatch[2].trim();
        frontmatter[key] = value;
        metadataEndLine = i;
      } else if (Object.keys(frontmatter).length > 0) {
        // Stop if we had metadata but now don't match
        break;
      }
    }
    
    return frontmatter;
  }
  
  private createSlug(text: string): string {
    let slug = text.toLowerCase().replace(/[^\w\s-]/g, '');
    slug = slug.replace(/[-\s]+/g, '-');
    return slug.replace(/^-+|-+$/g, '');
  }
  
  supports(extension: string): boolean {
    return this.getSupportedExtensions().includes(extension.toLowerCase());
  }
  
  getSupportedExtensions(): string[] {
    return ['.txt', '.text'];
  }
}