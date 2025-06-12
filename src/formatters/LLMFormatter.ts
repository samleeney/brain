/**
 * Output formatters optimized for LLM consumption
 */

import * as path from 'path';
import { KnowledgeGraph, SearchResult, GraphNode } from '../models/types';

export class LLMFormatter {
  formatOverview(graph: KnowledgeGraph): string {
    const totalNotes = graph.nodes.size;
    if (totalNotes === 0) {
      return '=== KNOWLEDGE BASE OVERVIEW ===\nNo notes found.';
    }

    // Calculate statistics
    const totalLinks = Array.from(graph.nodes.values())
      .reduce((sum, node) => sum + node.note.outgoingLinks.length, 0);
    const validLinks = totalLinks - graph.brokenLinks.length;

    // Directory structure analysis
    const dirs = new Set<string>();
    let flatFiles = 0;
    
    for (const node of graph.nodes.values()) {
      const pathParts = node.note.relativePath.split(path.sep);
      if (pathParts.length > 1) {
        dirs.add(path.dirname(node.note.relativePath));
      } else {
        flatFiles++;
      }
    }

    const folderPercent = Math.round((dirs.size * 100) / Math.max(1, totalNotes));
    const flatPercent = Math.round((flatFiles * 100) / Math.max(1, totalNotes));

    // Recent activity
    const now = new Date();
    let todayCount = 0;
    let weekCount = 0;

    for (const node of graph.nodes.values()) {
      if (node.note.lastModified) {
        const daysAgo = (now.getTime() - node.note.lastModified.getTime()) / (1000 * 60 * 60 * 24);
        if (daysAgo < 1) {
          todayCount++;
        }
        if (daysAgo <= 7) {
          weekCount++;
        }
      }
    }

    const output: string[] = [];
    output.push('=== KNOWLEDGE BASE OVERVIEW ===');
    output.push(`Total Notes: ${totalNotes} | Links: ${validLinks} | Last Updated: ${now.toISOString().split('T')[0]}`);

    if (dirs.size > 0) {
      output.push(`Structure: Mixed (${folderPercent}% in folders, ${flatPercent}% flat files)`);
    } else {
      output.push('Structure: Flat (all files in root)');
    }

    // Top hubs
    if (graph.hubNodes.length > 0) {
      output.push('\nTOP HUBS (most connected):');
      for (let i = 0; i < Math.min(5, graph.hubNodes.length); i++) {
        const hubPath = graph.hubNodes[i];
        const node = graph.nodes.get(hubPath);
        if (node) {
          const connections = node.inDegree + node.outDegree;
          output.push(`${i + 1}. "${node.note.title}" (${connections} connections)`);
        }
      }
    }

    // Clusters
    if (graph.clusters.length > 0) {
      output.push('\nCLUSTERS DETECTED:');
      for (let i = 0; i < Math.min(3, graph.clusters.length); i++) {
        const cluster = graph.clusters[i];
        const clusterSize = cluster.size;
        const sampleNode = Array.from(cluster)[0];
        const node = graph.nodes.get(sampleNode);
        const clusterName = node ? 
          path.dirname(node.note.relativePath) !== '.' ? 
            path.basename(path.dirname(node.note.relativePath)) : 'Root'
          : `Cluster ${i + 1}`;
        output.push(`- "${clusterName}" (${clusterSize} notes)`);
      }
    }

    // Orphaned notes
    if (graph.orphanNodes.length > 0) {
      output.push(`\nORPHANED NOTES: ${graph.orphanNodes.length} notes with no connections`);
    }

    // Recent activity
    if (todayCount > 0 || weekCount > 0) {
      output.push('\nRECENT ACTIVITY:');
      if (todayCount > 0) {
        output.push(`- Modified today: ${todayCount} notes`);
      }
      if (weekCount > todayCount) {
        output.push(`- This week: ${weekCount} notes`);
      }
    }

    // Broken links warning
    if (graph.brokenLinks.length > 0) {
      output.push(`\nWARNING: ${graph.brokenLinks.length} broken links detected`);
    }

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

  formatSearchResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No results found.';
    }

    const output: string[] = [];
    output.push(`SEARCH RESULTS (${results.length} matches):\n`);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const node = result.graphNode;
      const relativePath = node ? node.note.relativePath : result.notePath;

      output.push(`${i + 1}. ${relativePath}`);
      output.push(`   - Match: ${result.matchType} (score: ${result.score.toFixed(1)})`);

      if (result.context) {
        output.push(`   - Context: ${result.context}`);
      }

      if (result.lineNumber) {
        output.push(`   - Line: ${result.lineNumber}`);
      }

      if (node) {
        const connections = node.inDegree + node.outDegree;
        if (connections > 0) {
          output.push(`   - Graph: ${connections} connections`);
        }

        if (node.clusterId !== null) {
          output.push(`   - Cluster: #${node.clusterId}`);
        }
      }

      output.push(''); // Empty line between results
    }

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

  formatGrepResults(results: Array<{ file: string; lineNumber: number; line: string }>): string {
    if (results.length === 0) {
      return 'No matches found.';
    }

    const output: string[] = [];
    for (const result of results) {
      output.push(`${result.file}:${result.lineNumber}: ${result.line}`);
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