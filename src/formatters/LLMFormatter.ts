/**
 * Output formatters optimized for LLM consumption
 */

import * as path from 'path';
import { KnowledgeGraph, GraphNode } from '../models/types';

export class LLMFormatter {
  formatOverview(graph: KnowledgeGraph): string {
    const totalNotes = graph.nodes.size;
    if (totalNotes === 0) {
      return 'KNOWLEDGE BASE: Empty';
    }

    const output: string[] = [];
    output.push('=== KNOWLEDGE BASE OVERVIEW ===');
    
    // Basic stats
    const validLinks = Array.from(graph.nodes.values()).reduce((sum, node) => sum + node.note.outgoingLinks.filter(l => !l.isBroken).length, 0);
    output.push(`${totalNotes} notes | ${validLinks} links | Vector search enabled\n`);

    // Topic clusters by directory structure  
    const topicClusters = new Map<string, { count: number; keyNotes: string[] }>();
    for (const node of graph.nodes.values()) {
      const dir = path.dirname(node.note.relativePath);
      const topic = dir === '.' ? 'root' : dir.split('/')[0];
      
      if (!topicClusters.has(topic)) {
        topicClusters.set(topic, { count: 0, keyNotes: [] });
      }
      
      const cluster = topicClusters.get(topic)!;
      cluster.count++;
      
      // Track highly connected notes (>10 connections)
      const connections = node.inDegree + node.outDegree;
      if (connections > 10) {
        cluster.keyNotes.push(node.note.title);
      }
    }

    // Display topic areas
    output.push('TOPIC AREAS:');
    for (const [topic, data] of Array.from(topicClusters.entries()).sort((a, b) => b[1].count - a[1].count)) {
      const keyNotesSummary = data.keyNotes.length > 0 ? ` (key: ${data.keyNotes.slice(0, 2).join(', ')}${data.keyNotes.length > 2 ? '...' : ''})` : '';
      output.push(`• ${topic}: ${data.count} notes${keyNotesSummary}`);
    }

    // Top hub notes
    const topHubs = Array.from(graph.nodes.values())
      .sort((a, b) => (b.inDegree + b.outDegree) - (a.inDegree + a.outDegree))
      .slice(0, 3);
    
    if (topHubs.length > 0) {
      output.push('\nKEY HUBS:');
      for (const node of topHubs) {
        const connections = node.inDegree + node.outDegree;
        output.push(`• ${node.note.title} (${connections} connections)`);
      }
    }

    // Recent activity  
    const now = new Date();
    const recentNotes = Array.from(graph.nodes.values())
      .filter(node => {
        if (!node.note.lastModified) return false;
        const daysAgo = (now.getTime() - node.note.lastModified.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 3;
      })
      .sort((a, b) => (b.note.lastModified?.getTime() || 0) - (a.note.lastModified?.getTime() || 0))
      .slice(0, 3);

    if (recentNotes.length > 0) {
      output.push('\nRECENT UPDATES:');
      for (const node of recentNotes) {
        const daysAgo = Math.floor((now.getTime() - (node.note.lastModified?.getTime() || 0)) / (1000 * 60 * 60 * 24));
        const timeStr = daysAgo === 0 ? 'today' : `${daysAgo}d ago`;
        output.push(`• ${node.note.title} (${timeStr})`);
      }
    }

    // Usage instructions
    output.push('\nROUTING:');
    output.push('• brain check "<query>" - Check if knowledge base is relevant');
    output.push('• brain search "<query>" - Traditional search if relevant');

    return output.join('\n');
  }

  formatLs(graph: KnowledgeGraph, dirPath: string = ''): string {
    const output: string[] = [];
    
    // Group notes by directory
    const dirs = new Map<string, GraphNode[]>();
    const files = new Map<string, GraphNode>();
    
    for (const node of graph.nodes.values()) {
      let relativePath = node.note.relativePath;
      
      // Filter by requested path
      if (dirPath) {
        if (!relativePath.startsWith(dirPath)) {
          continue;
        }
        // Adjust relative path
        relativePath = path.relative(dirPath, relativePath);
      }
      
      const pathParts = relativePath.split(path.sep);
      if (pathParts.length === 1) {
        // File in current directory
        files.set(relativePath, node);
      } else {
        // File in subdirectory
        const subdir = pathParts[0];
        if (!dirs.has(subdir)) {
          dirs.set(subdir, []);
        }
        dirs.get(subdir)!.push(node);
      }
    }
    
    // Display path header
    const displayPath = dirPath ? `/${dirPath}` : '/';
    output.push(displayPath);
    
    // Display subdirectories
    for (const [dirname, dirNodes] of Array.from(dirs.entries()).sort()) {
      const noteCount = dirNodes.length;
      output.push(`├── ${dirname}/ (${noteCount} notes)`);
      
      // Show sample files in directory
      const sortedNodes = dirNodes.sort((a, b) => a.note.title.localeCompare(b.note.title));
      for (let i = 0; i < Math.min(3, sortedNodes.length); i++) {
        const node = sortedNodes[i];
        const filename = path.basename(node.note.relativePath);
        output.push(`│   ├── ${filename} [→${node.outDegree} ←${node.inDegree}]`);
      }
      
      if (dirNodes.length > 3) {
        output.push(`│   └── ... and ${dirNodes.length - 3} more`);
      }
    }
    
    // Display files in current directory
    for (const [filename, node] of Array.from(files.entries()).sort()) {
      output.push(`└── ${filename} [→${node.outDegree} ←${node.inDegree}]`);
    }
    
    if (dirs.size === 0 && files.size === 0) {
      output.push('(empty)');
    }
    
    output.push('\n[→X ←Y] means X outgoing links, Y incoming links');
    
    return output.join('\n');
  }


  formatNoteRead(node: GraphNode, content?: string): string {
    const output: string[] = [];

    // Header with metadata
    output.push(`=== ${node.note.relativePath} ===`);
    output.push(`Location: ${node.note.path}`);

    if (node.note.lastModified) {
      output.push(`Modified: ${node.note.lastModified.toISOString().replace('T', ' ').split('.')[0]}`);
    }

    if (node.note.tags.size > 0) {
      const tagsStr = Array.from(node.note.tags).sort().map(tag => `#${tag}`).join(' ');
      output.push(`Tags: ${tagsStr}`);
    }

    output.push(`Words: ${node.note.wordCount}`);

    // Incoming links
    if (node.incomingLinks.length > 0) {
      output.push(`\nINCOMING LINKS (${node.incomingLinks.length}):`);
      for (let i = 0; i < Math.min(10, node.incomingLinks.length); i++) {
        const link = node.incomingLinks[i];
        const sourcePath = path.basename(link.sourcePath);
        const truncatedContext = link.context.slice(0, 50) + '...';
        output.push(`← "${sourcePath}" ("${truncatedContext}")`);
      }

      if (node.incomingLinks.length > 10) {
        output.push(`   ... and ${node.incomingLinks.length - 10} more`);
      }
    }

    // Outgoing links
    const validOutgoing = node.note.outgoingLinks.filter(l => !l.isBroken);
    if (validOutgoing.length > 0) {
      output.push(`\nOUTGOING LINKS (${validOutgoing.length}):`);
      for (let i = 0; i < Math.min(10, validOutgoing.length); i++) {
        const link = validOutgoing[i];
        if (link.targetPath) {
          const targetPath = path.basename(link.targetPath);
          const truncatedContext = link.context.slice(0, 50) + '...';
          output.push(`→ "${targetPath}" ("${truncatedContext}")`);
        }
      }
    }

    // Content
    if (content !== undefined) {
      output.push('\nCONTENT:');
      output.push('-'.repeat(40));
      output.push(content);
    }

    return output.join('\n');
  }


  formatSemanticSearchResults(results: Array<{
    notePath: string;
    chunkId: string;
    similarity: number;
    snippet: string;
    headingContext: string[];
    chunkType: string;
  }>, graph: KnowledgeGraph): string {
    if (results.length === 0) {
      return 'No relevant content found. Try lowering the similarity threshold with the -t option.';
    }

    const output: string[] = [];
    output.push('=== SEMANTIC SEARCH RESULTS ===\n');

    // Group results by note to avoid duplicates
    const resultsByNote = new Map<string, typeof results>();
    for (const result of results) {
      if (!resultsByNote.has(result.notePath)) {
        resultsByNote.set(result.notePath, []);
      }
      resultsByNote.get(result.notePath)!.push(result);
    }

    let resultCount = 0;
    for (const [notePath, noteResults] of resultsByNote.entries()) {
      if (resultCount >= results.length) break;
      
      const node = graph.nodes.get(notePath);
      const noteTitle = node ? node.note.title : path.basename(notePath);
      const relativePath = node ? node.note.relativePath : notePath;
      
      // Sort by similarity and take best chunk
      const bestResult = noteResults.sort((a, b) => b.similarity - a.similarity)[0];
      
      output.push(`📄 ${noteTitle}`);
      output.push(`   Path: ${relativePath}`);
      output.push(`   Similarity: ${(bestResult.similarity * 100).toFixed(1)}%`);
      
      if (bestResult.headingContext.length > 0) {
        output.push(`   Section: ${bestResult.headingContext.join(' > ')}`);
      }
      
      output.push(`   Content: ${bestResult.snippet}`);
      
      // Show additional chunks if they're significantly relevant
      const additionalChunks = noteResults.slice(1).filter(r => r.similarity > 0.4);
      if (additionalChunks.length > 0) {
        output.push(`   + ${additionalChunks.length} more relevant section(s)`);
      }
      
      output.push('');
      resultCount++;
    }

    if (resultsByNote.size === 0) {
      return 'No content found above the similarity threshold. Try using a lower threshold with -t option.';
    }

    return output.join('\n');
  }

  formatRelatedNotes(related: Array<{ path: string; type: string; reason: string }>, graph: KnowledgeGraph): string {
    if (related.length === 0) {
      return 'No related notes found.';
    }

    const output: string[] = [];
    output.push('RELATED NOTES:\n');

    // Group by relationship type
    const byType = new Map<string, Array<{ path: string; reason: string }>>();
    for (const item of related) {
      if (!byType.has(item.type)) {
        byType.set(item.type, []);
      }
      byType.get(item.type)!.push({ path: item.path, reason: item.reason });
    }

    // Display each type
    const typeOrder = ['direct', 'cluster', 'similar', 'tags'];
    const typeNames = {
      direct: 'DIRECTLY LINKED',
      cluster: 'SAME CLUSTER',
      similar: 'SIMILAR STRUCTURE',
      tags: 'SHARED TAGS'
    };

    for (const relType of typeOrder) {
      if (byType.has(relType)) {
        const items = byType.get(relType)!;
        output.push(`${typeNames[relType as keyof typeof typeNames]}:`);

        for (let i = 0; i < Math.min(5, items.length); i++) {
          const item = items[i];
          const node = graph.nodes.get(item.path);
          const title = node ? node.note.title : path.basename(item.path);

          if (item.reason) {
            output.push(`- ${title} (${item.reason})`);
          } else {
            output.push(`- ${title}`);
          }
        }

        if (items.length > 5) {
          output.push(`  ... and ${items.length - 5} more`);
        }
        output.push('');
      }
    }

    return output.join('\n');
  }
}