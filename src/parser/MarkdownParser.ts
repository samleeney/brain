/**
 * Markdown parser for extracting structure and links from notes
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import { Note, Link, Heading, LinkType } from '../models/types';

export class MarkdownParser {
  private wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
  private mdLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  private tagPattern = /(?:^|(?<=\s))#([a-zA-Z0-9_-]+)/g;
  private headingPattern = /^(#{1,6})\s+(.+)$/gm;
  
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt();
  }

  async parseFile(filePath: string, notesRoot: string): Promise<Note> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    
    // Parse frontmatter
    const { data: frontmatter, content: mainContent } = matter(content);
    
    // Extract headings
    const headings = this.extractHeadings(mainContent);
    
    // Extract title (first heading or filename)
    const title = headings.length > 0 ? headings[0].text : path.basename(filePath, '.md');
    
    // Extract links
    const outgoingLinks = this.extractLinks(mainContent, filePath);
    
    // Extract tags
    const tags = this.extractTags(mainContent);
    
    // Calculate word count
    const wordCount = mainContent.split(/\s+/).length;
    
    // Get file modification time
    const stats = await fs.promises.stat(filePath);
    const lastModified = stats.mtime;
    
    // Calculate relative path
    const relativePath = path.relative(notesRoot, filePath);
    
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
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const slug = this.createSlug(text);
        
        headings.push({
          level,
          text,
          lineNumber: index + 1,
          slug
        });
      }
    });
    
    return headings;
  }

  private extractLinks(content: string, sourcePath: string): Link[] {
    const links: Link[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, lineIndex) => {
      // Extract wiki-style links
      let match;
      const wikiRegex = new RegExp(this.wikiLinkPattern);
      while ((match = wikiRegex.exec(line)) !== null) {
        const linkText = match[1];
        // Handle alias syntax [[target|display]]
        const [target] = linkText.includes('|') ? linkText.split('|', 2) : [linkText, linkText];
        
        const context = this.extractContext(content, match.index, match.index + match[0].length);
        
        links.push({
          sourcePath,
          targetPath: null, // Will be resolved later
          linkType: LinkType.WIKI,
          linkText: target.trim(),
          context,
          lineNumber: lineIndex + 1,
          isBroken: false
        });
      }
      
      // Extract markdown links
      const mdRegex = new RegExp(this.mdLinkPattern);
      while ((match = mdRegex.exec(line)) !== null) {
        const display = match[1];
        const target = match[2];
        
        // Skip external URLs
        if (target.startsWith('http://') || target.startsWith('https://') || 
            target.startsWith('ftp://') || target.startsWith('mailto:')) {
          continue;
        }
        
        const context = this.extractContext(content, match.index, match.index + match[0].length);
        
        links.push({
          sourcePath,
          targetPath: null, // Will be resolved later
          linkType: LinkType.MARKDOWN,
          linkText: target,
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
    let match;
    const regex = new RegExp(this.tagPattern);
    
    while ((match = regex.exec(content)) !== null) {
      tags.add(match[1]);
    }
    
    return tags;
  }

  private extractContext(content: string, matchStart: number, matchEnd: number, contextChars: number = 100): string {
    // Find context boundaries
    const start = Math.max(0, matchStart - contextChars);
    const end = Math.min(content.length, matchEnd + contextChars);
    
    let context = content.slice(start, end);
    
    // Normalize whitespace
    context = context.replace(/\s+/g, ' ').trim();
    
    // Add ellipsis if truncated
    if (start > 0) {
      context = '...' + context;
    }
    if (end < content.length) {
      context = context + '...';
    }
    
    return context;
  }

  private createSlug(text: string): string {
    // Remove special characters and convert to lowercase
    let slug = text.toLowerCase().replace(/[^\w\s-]/g, '');
    // Replace spaces with hyphens
    slug = slug.replace(/[-\s]+/g, '-');
    return slug.replace(/^-+|-+$/g, ''); // Trim hyphens
  }
}