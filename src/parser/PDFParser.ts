/**
 * PDF parser for extracting text and structure from PDF files
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import pdf from 'pdf-parse';
import { BaseParser } from './BaseParser';
import { Note, Heading, Link, LinkType } from '../models/types';

export class PDFParser implements BaseParser {
  async parse(filePath: string, content: string | Buffer, notesRoot: string): Promise<Note> {
    let text: string;
    let pdfInfo: any = {};
    
    try {
      // Try using pdftotext for cleaner text extraction
      text = execSync(`pdftotext -layout "${filePath}" -`, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      });
      
      // Get basic info using pdf-parse for metadata
      const dataBuffer = await fs.promises.readFile(filePath);
      const pdfData = await pdf(dataBuffer, { max: 1 }); // Only parse first page for metadata
      pdfInfo = pdfData.info || {};
    } catch (error) {
      // Fallback to pdf-parse if pdftotext is not available
      console.log('pdftotext not available, falling back to pdf-parse');
      const dataBuffer = await fs.promises.readFile(filePath);
      const pdfData = await pdf(dataBuffer);
      text = pdfData.text;
      pdfInfo = pdfData.info || {};
    }
    
    // Extract title from metadata or filename
    const title = pdfInfo?.Title || path.basename(filePath, path.extname(filePath));
    
    // Extract sections based on text patterns
    const headings = this.extractHeadings(text);
    
    // Extract links (PDFs might contain URLs)
    const outgoingLinks = this.extractLinks(text, filePath);
    
    // Extract tags (if any hashtags are in the text)
    const tags = this.extractTags(text);
    
    // Calculate word count
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    
    // Get file modification time
    const stats = await fs.promises.stat(filePath);
    const lastModified = stats.mtime;
    
    // Calculate relative path
    const relativePath = path.relative(notesRoot, filePath);
    
    // Build metadata from PDF info
    const frontmatter: Record<string, any> = {};
    if (pdfInfo) {
      if (pdfInfo.Title) frontmatter.title = pdfInfo.Title;
      if (pdfInfo.Author) frontmatter.author = pdfInfo.Author;
      if (pdfInfo.Subject) frontmatter.subject = pdfInfo.Subject;
      if (pdfInfo.Keywords) frontmatter.keywords = pdfInfo.Keywords;
      if (pdfInfo.CreationDate) frontmatter.creationDate = pdfInfo.CreationDate;
      if (pdfInfo.ModDate) frontmatter.modificationDate = pdfInfo.ModDate;
    }
    
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
  
  private extractHeadings(text: string): Heading[] {
    const headings: Heading[] = [];
    const lines = text.split('\n');
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();
      
      // Detect potential headings based on patterns
      // Pattern 1: All caps lines with more than 3 words
      if (trimmedLine.length > 10 && trimmedLine === trimmedLine.toUpperCase() && 
          !/^\d+$/.test(trimmedLine) && trimmedLine.split(/\s+/).length > 2) {
        headings.push({
          level: 1,
          text: trimmedLine,
          lineNumber,
          slug: this.createSlug(trimmedLine)
        });
      }
      // Pattern 2: Lines that look like numbered sections (e.g., "1. Introduction", "2.1 Background")
      else if (/^(?:\d+\.)+\s+[A-Z]/.test(trimmedLine)) {
        const match = trimmedLine.match(/^((?:\d+\.)+)\s+(.+)$/);
        if (match) {
          const level = match[1].split('.').length;
          headings.push({
            level: Math.min(level, 6),
            text: match[2],
            lineNumber,
            slug: this.createSlug(match[2])
          });
        }
      }
      // Pattern 3: Lines that start with "Chapter", "Section", etc.
      else if (/^(Chapter|Section|Part)\s+\d+[:\s]/i.test(trimmedLine)) {
        headings.push({
          level: 1,
          text: trimmedLine,
          lineNumber,
          slug: this.createSlug(trimmedLine)
        });
      }
    }
    
    return headings;
  }
  
  private extractLinks(text: string, sourcePath: string): Link[] {
    const links: Link[] = [];
    const lines = text.split('\n');
    
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
          linkType: LinkType.MARKDOWN, // Using markdown type for URLs
          linkText: url,
          context,
          lineNumber: lineIndex + 1,
          isBroken: false
        });
      }
    });
    
    return links;
  }
  
  private extractTags(text: string): Set<string> {
    const tags = new Set<string>();
    const tagPattern = /(?:^|(?<=\s))#([a-zA-Z0-9_-]+)/g;
    
    let match;
    while ((match = tagPattern.exec(text)) !== null) {
      tags.add(match[1]);
    }
    
    return tags;
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
    return ['.pdf'];
  }
}