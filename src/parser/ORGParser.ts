/**
 * Org-mode parser for extracting structure from .org files
 */

import * as path from 'path';
import * as fs from 'fs';
import { BaseParser } from './BaseParser';
import { Note, Heading, Link, LinkType } from '../models/types';

export class ORGParser implements BaseParser {
  async parse(filePath: string, content: string | Buffer, notesRoot: string): Promise<Note> {
    // Convert Buffer to string if needed
    const textContent = typeof content === 'string' ? content : content.toString('utf-8');
    
    // Extract title from #+TITLE directive or filename
    const title = this.extractTitle(textContent) || path.basename(filePath, path.extname(filePath));
    
    // Extract headings
    const headings = this.extractHeadings(textContent);
    
    // Extract links
    const outgoingLinks = this.extractLinks(textContent, filePath);
    
    // Extract tags
    const tags = this.extractTags(textContent);
    
    // Calculate word count (excluding org syntax)
    const cleanContent = this.cleanOrgSyntax(textContent);
    const wordCount = cleanContent.split(/\s+/).filter(word => word.length > 0).length;
    
    // Get file modification time
    const stats = await fs.promises.stat(filePath);
    const lastModified = stats.mtime;
    
    // Calculate relative path
    const relativePath = path.relative(notesRoot, filePath);
    
    // Extract metadata from org directives
    const frontmatter = this.extractMetadata(textContent);
    
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
  
  private extractTitle(content: string): string | null {
    const titleMatch = content.match(/^#\+TITLE:\s*(.+)$/im);
    return titleMatch ? titleMatch[1].trim() : null;
  }
  
  private extractHeadings(content: string): Heading[] {
    const headings: Heading[] = [];
    const lines = content.split('\n');
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      
      // Match org headings: *, **, ***, etc.
      const headingMatch = line.match(/^(\*+)\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        let text = headingMatch[2].trim();
        
        // Remove org-specific syntax from heading text
        // Remove TODO/DONE keywords
        text = text.replace(/^(TODO|DONE|NEXT|WAITING|SOMEDAY)\s+/, '');
        // Remove priority indicators [#A], [#B], [#C]
        text = text.replace(/\[#[ABC]\]\s*/, '');
        // Remove trailing tags :tag1:tag2:
        text = text.replace(/\s+:[\w:]+:$/, '').trim();
        
        headings.push({
          level: Math.min(level, 6),
          text,
          lineNumber,
          slug: this.createSlug(text)
        });
      }
    }
    
    return headings;
  }
  
  private extractLinks(content: string, sourcePath: string): Link[] {
    const links: Link[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, lineIndex) => {
      // Pattern 1: [[link][description]] or [[link]]
      const orgLinkPattern = /\[\[([^\]]+)\](?:\[([^\]]+)\])?\]/g;
      let match;
      
      while ((match = orgLinkPattern.exec(line)) !== null) {
        const target = match[1];
        const description = match[2] || target;
        
        // Skip external URLs for now
        if (!target.startsWith('http://') && !target.startsWith('https://') && 
            !target.startsWith('file://') && !target.startsWith('mailto:')) {
          links.push({
            sourcePath,
            targetPath: null,
            linkType: LinkType.WIKI,
            linkText: target,
            context: this.extractContext(line, match.index, match.index + match[0].length),
            lineNumber: lineIndex + 1,
            isBroken: false
          });
        }
      }
      
      // Pattern 2: Plain URLs
      const urlPattern = /https?:\/\/[^\s<>"\{\}\|\^\[\]`]+/g;
      while ((match = urlPattern.exec(line)) !== null) {
        let url = match[0];
        
        // Remove trailing punctuation
        url = url.replace(/[.,;!?]+$/, '');
        
        links.push({
          sourcePath,
          targetPath: null,
          linkType: LinkType.MARKDOWN,
          linkText: url,
          context: this.extractContext(line, match.index, match.index + url.length),
          lineNumber: lineIndex + 1,
          isBroken: false
        });
      }
    });
    
    return links;
  }
  
  private extractTags(content: string): Set<string> {
    const tags = new Set<string>();
    
    // Pattern 1: Heading tags :tag1:tag2:
    const headingTagPattern = /^\*+\s+.*?:([\w:]+):$/gm;
    let match;
    
    while ((match = headingTagPattern.exec(content)) !== null) {
      const tagString = match[1];
      const headingTags = tagString.split(':').filter(tag => tag.length > 0);
      headingTags.forEach(tag => tags.add(tag));
    }
    
    // Pattern 2: File-level tags #+TAGS: tag1 tag2 tag3
    const fileTagPattern = /^#\+TAGS:\s*(.+)$/im;
    const fileTagMatch = content.match(fileTagPattern);
    if (fileTagMatch) {
      const fileTags = fileTagMatch[1].split(/\s+/).filter(tag => tag.length > 0);
      fileTags.forEach(tag => tags.add(tag));
    }
    
    // Pattern 3: Hashtags in text #tag
    const hashtagPattern = /(?:^|(?<=\s))#([a-zA-Z0-9_-]+)/g;
    while ((match = hashtagPattern.exec(content)) !== null) {
      tags.add(match[1]);
    }
    
    return tags;
  }
  
  private extractMetadata(content: string): Record<string, any> {
    const frontmatter: Record<string, any> = {};
    
    // Extract org directives
    const directivePattern = /^#\+(\w+):\s*(.+)$/gm;
    let match;
    
    while ((match = directivePattern.exec(content)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2].trim();
      
      // Handle special cases
      switch (key) {
        case 'tags':
          frontmatter.tags = value.split(/\s+/);
          break;
        case 'date':
        case 'created':
        case 'modified':
          // Try to parse as date
          try {
            frontmatter[key] = new Date(value);
          } catch {
            frontmatter[key] = value;
          }
          break;
        default:
          frontmatter[key] = value;
      }
    }
    
    return frontmatter;
  }
  
  private cleanOrgSyntax(content: string): string {
    let cleaned = content;
    
    // Remove org directives
    cleaned = cleaned.replace(/^#\+\w+:.*$/gm, '');
    
    // Remove drawer content (:PROPERTIES: ... :END:)
    cleaned = cleaned.replace(/:PROPERTIES:\s*\n(?:.*\n)*?:END:\s*\n/g, '');
    
    // Convert org links to plain text
    cleaned = cleaned.replace(/\[\[([^\]]+)\](?:\[([^\]]+)\])?\]/g, (match, target, description) => {
      return description || target;
    });
    
    // Remove org markup
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1'); // *bold*
    cleaned = cleaned.replace(/\/([^/]+)\//g, '$1'); // /italic/
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1'); // _underline_
    cleaned = cleaned.replace(/=([^=]+)=/g, '$1'); // =code=
    cleaned = cleaned.replace(/~([^~]+)~/g, '$1'); // ~verbatim~
    
    // Remove heading stars
    cleaned = cleaned.replace(/^\*+\s+/gm, '');
    
    return cleaned;
  }
  
  private extractContext(line: string, matchStart: number, matchEnd: number, contextChars: number = 50): string {
    const start = Math.max(0, matchStart - contextChars);
    const end = Math.min(line.length, matchEnd + contextChars);
    
    let context = line.slice(start, end);
    context = context.replace(/\s+/g, ' ').trim();
    
    if (start > 0) context = '...' + context;
    if (end < line.length) context = context + '...';
    
    return context;
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
    return ['.org'];
  }
}