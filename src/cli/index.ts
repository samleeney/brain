#!/usr/bin/env node

/**
 * Main CLI interface for AINodes
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import inquirer from 'inquirer';
import { GraphBuilder } from '../graph/GraphBuilder';
import { SearchEngine } from '../search/SearchEngine';
import { LLMFormatter } from '../formatters/LLMFormatter';
import { CacheManager } from '../cache/CacheManager';

const program = new Command();

program
  .name('brain')
  .description('Brain - Knowledge Base Navigation Tool for LLMs')
  .version('1.0.0')
  .option('-r, --notes-root <path>', 'Root directory of notes (default: current directory)', process.cwd())
  .option('--no-cache', 'Disable caching');

interface CliContext {
  notesRoot: string;
  useCache: boolean;
}

// Global context
let context: CliContext;

program.hook('preAction', async (thisCommand) => {
  const options = thisCommand.opts();
  
  context = {
    notesRoot: path.resolve(options.notesRoot),
    useCache: options.cache !== false
  };

  // Verify notes root exists
  if (!fs.existsSync(context.notesRoot)) {
    console.error(`Error: Notes directory '${context.notesRoot}' does not exist.`);
    process.exit(1);
  }
});

program
  .command('init')
  .description('Initialize Brain for your knowledge base')
  .action(async () => {
    try {
      console.log('🧠 Welcome to Brain - Knowledge Base Navigation Tool for LLMs');
      console.log('');
      
      // Ask for vault location
      const { vaultPath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'vaultPath',
          message: 'Where is your knowledge base/vault located?',
          default: process.cwd(),
          validate: (input: string) => {
            const resolvedPath = path.resolve(input);
            if (!fs.existsSync(resolvedPath)) {
              return `Directory '${resolvedPath}' does not exist.`;
            }
            return true;
          }
        }
      ]);

      // Ask for mode
      const { mode } = await inquirer.prompt([
        {
          type: 'list',
          name: 'mode',
          message: 'Which mode do you want to use?',
          choices: [
            {
              name: 'Auto - Brain loads overview automatically when LLM starts session',
              value: 'auto'
            },
            {
              name: 'Call - You manually call Brain commands when needed',
              value: 'call'
            }
          ]
        }
      ]);

      const resolvedVaultPath = path.resolve(vaultPath);
      
      // Create or update config
      const configPath = path.join(resolvedVaultPath, '.brain-config.json');
      const config = {
        vaultPath: resolvedVaultPath,
        mode,
        initialized: true,
        initDate: new Date().toISOString()
      };
      
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
      
      console.log('');
      console.log('✅ Brain initialization complete!');
      console.log('');
      
      // Generate LLM instructions
      const instructions = generateLLMInstructions(resolvedVaultPath, mode);
      console.log('📋 Add these instructions to your LLM\'s knowledge base:');
      console.log('');
      console.log('---START CLAUDE.md CONTENT---');
      console.log(instructions);
      console.log('---END CLAUDE.md CONTENT---');
      console.log('');
      
      // Check if user is using Claude Code
      const { isClaudeCode } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'isClaudeCode',
          message: 'Are you using Claude Code? (We can add this to CLAUDE.md automatically)',
          default: false
        }
      ]);
      
      if (isClaudeCode) {
        const claudeMdPath = path.join(resolvedVaultPath, 'CLAUDE.md');
        let existingContent = '';
        
        if (fs.existsSync(claudeMdPath)) {
          existingContent = await fs.promises.readFile(claudeMdPath, 'utf-8');
          existingContent += '\n\n';
        }
        
        const brainSection = `# Brain Knowledge Base Navigation

${instructions}`;
        
        await fs.promises.writeFile(claudeMdPath, existingContent + brainSection);
        console.log(`✅ Added Brain instructions to ${claudeMdPath}`);
      }
      
      console.log('');
      console.log('🚀 You can now run `brain overview` to see your knowledge base summary');
      
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

program
  .command('overview')
  .description('Display a high-level summary of the knowledge base')
  .action(async () => {
    try {
      const graph = await loadGraph();
      const formatter = new LLMFormatter();
      const output = formatter.formatOverview(graph);
      console.log(output);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ls')
  .description('List notes in directory-style format')
  .argument('[path]', 'Directory path to list', '')
  .action(async (dirPath: string) => {
    try {
      const graph = await loadGraph();
      const formatter = new LLMFormatter();
      const output = formatter.formatLs(graph, dirPath);
      console.log(output);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

program
  .command('search')
  .description('Multi-strategy search across the knowledge base')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Maximum number of results', '20')
  .action(async (query: string, options: { limit: string }) => {
    try {
      const graph = await loadGraph();
      const searchEngine = new SearchEngine(graph);
      const results = searchEngine.search(query, parseInt(options.limit));
      const formatter = new LLMFormatter();
      const output = formatter.formatSearchResults(results);
      console.log(output);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

program
  .command('read')
  .description('Display a note with full context')
  .argument('<path>', 'Note path or partial name')
  .option('--no-content', 'Show metadata only, not content')
  .action(async (notePath: string, options: { content: boolean }) => {
    try {
      const graph = await loadGraph();
      const node = findNote(graph, notePath);
      
      if (!node) {
        console.error(`Note not found: ${notePath}`);
        process.exit(1);
      }

      const formatter = new LLMFormatter();
      const content = options.content !== false ? await fs.promises.readFile(node.note.path, 'utf-8') : undefined;
      const output = formatter.formatNoteRead(node, content);
      console.log(output);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

program
  .command('grep')
  .description('Search file contents using regex patterns')
  .argument('<pattern>', 'Regex pattern to search for')
  .option('-C, --context <number>', 'Lines of context around matches', '2')
  .action(async (pattern: string, options: { context: string }) => {
    try {
      const graph = await loadGraph();
      const searchEngine = new SearchEngine(graph);
      const results = searchEngine.grepSearch(pattern, parseInt(options.context));
      const formatter = new LLMFormatter();
      const output = formatter.formatGrepResults(results);
      console.log(output);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

program
  .command('glob')
  .description('Find files matching glob patterns')
  .argument('<pattern>', 'Glob pattern to match')
  .action(async (pattern: string) => {
    try {
      const graph = await loadGraph();
      const searchEngine = new SearchEngine(graph);
      const results = searchEngine.globSearch(pattern);
      
      if (results.length === 0) {
        console.log('No matching files found.');
        return;
      }

      for (const result of results) {
        const node = graph.nodes.get(result);
        if (node) {
          console.log(node.note.relativePath);
        } else {
          console.log(result);
        }
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

program
  .command('trace')
  .description('Find connection paths between two notes')
  .argument('<source>', 'Source note path or name')
  .argument('<target>', 'Target note path or name')
  .option('--max-paths <number>', 'Maximum number of paths to show', '3')
  .action(async (source: string, target: string, options: { maxPaths: string }) => {
    try {
      const graph = await loadGraph();
      
      const sourceNode = findNote(graph, source);
      const targetNode = findNote(graph, target);
      
      if (!sourceNode) {
        console.error(`Source note not found: ${source}`);
        process.exit(1);
      }
      
      if (!targetNode) {
        console.error(`Target note not found: ${target}`);
        process.exit(1);
      }

      // For now, implement simple path finding
      // In a full implementation, would use proper graph algorithms
      console.log(`TRACE: "${path.basename(sourceNode.note.path)}" → "${path.basename(targetNode.note.path)}"`);
      console.log('\nPath finding not yet implemented in TypeScript version.');
      console.log('Use the Python version for full graph algorithms.');
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

program
  .command('related')
  .description('Find notes related to the given note')
  .argument('<path>', 'Note path or name')
  .option('-l, --limit <number>', 'Maximum number of related notes', '15')
  .action(async (notePath: string, options: { limit: string }) => {
    try {
      const graph = await loadGraph();
      const node = findNote(graph, notePath);
      
      if (!node) {
        console.error(`Note not found: ${notePath}`);
        process.exit(1);
      }

      // Simple related notes based on direct connections
      const related: Array<{ path: string; type: string; reason: string }> = [];
      
      // Direct outgoing links
      for (const link of node.note.outgoingLinks) {
        if (!link.isBroken && link.targetPath) {
          related.push({
            path: link.targetPath,
            type: 'direct',
            reason: 'this links to'
          });
        }
      }
      
      // Direct incoming links
      for (const link of node.incomingLinks) {
        related.push({
          path: link.sourcePath,
          type: 'direct',
          reason: 'links to this'
        });
      }

      const formatter = new LLMFormatter();
      const output = formatter.formatRelatedNotes(related, graph);
      console.log(output);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

// Cache commands
const cacheCommand = program
  .command('cache')
  .description('Cache management commands');

cacheCommand
  .command('clear')
  .description('Clear the cache')
  .action(async () => {
    try {
      const cacheManager = new CacheManager(context.notesRoot);
      await cacheManager.clearCache();
      console.log('Cache cleared.');
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

cacheCommand
  .command('rebuild')
  .description('Rebuild the cache')
  .action(async () => {
    try {
      const cacheManager = new CacheManager(context.notesRoot);
      await cacheManager.clearCache();
      
      console.error('Rebuilding knowledge graph...');
      const builder = new GraphBuilder(context.notesRoot);
      const graph = await builder.buildGraph();
      
      await cacheManager.saveCache(graph);
      console.log('Cache rebuilt.');
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

cacheCommand
  .command('stats')
  .description('Show cache statistics')
  .action(async () => {
    try {
      const cacheManager = new CacheManager(context.notesRoot);
      const stats = await cacheManager.getCacheStats();
      
      if (stats) {
        console.log(`Cache file: ${stats.cacheFile}`);
        console.log(`Cache size: ${stats.sizeMb.toFixed(1)} MB`);
        console.log(`Last updated: ${stats.lastUpdated}`);
        console.log(`Notes cached: ${stats.notesCount}`);
      } else {
        console.log('No cache found.');
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show detailed graph statistics')
  .action(async () => {
    try {
      const graph = await loadGraph();
      
      console.log('=== GRAPH STATISTICS ===');
      console.log(`Total notes: ${graph.nodes.size}`);
      console.log(`Hub nodes: ${graph.hubNodes.length}`);
      console.log(`Orphaned notes: ${graph.orphanNodes.length}`);
      console.log(`Broken links: ${graph.brokenLinks.length}`);
      console.log(`Clusters: ${graph.clusters.length}`);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

async function loadGraph() {
  const cacheManager = new CacheManager(context.notesRoot);
  
  let graph;
  if (context.useCache) {
    graph = await cacheManager.loadCache();
  }
  
  if (!graph) {
    console.error('Building knowledge graph...');
    const builder = new GraphBuilder(context.notesRoot);
    graph = await builder.buildGraph();
    
    if (context.useCache) {
      await cacheManager.saveCache(graph);
    }
  }
  
  return graph;
}

function findNote(graph: any, notePath: string) {
  // First try exact path match
  for (const [path, node] of graph.nodes.entries()) {
    if (path === notePath || node.note.relativePath === notePath) {
      return node;
    }
  }
  
  // Then try partial matches
  const matches = [];
  for (const [path, node] of graph.nodes.entries()) {
    if (path.includes(notePath) || node.note.relativePath.includes(notePath)) {
      matches.push(node);
    }
  }
  
  if (matches.length === 1) {
    return matches[0];
  }
  
  if (matches.length > 1) {
    console.error('Multiple matches found:');
    for (const node of matches) {
      console.error(`  ${node.note.relativePath}`);
    }
    return null;
  }
  
  return null;
}

function generateLLMInstructions(vaultPath: string, mode: string): string {
  const autoInstructions = mode === 'auto' ? `
## Auto Mode Setup

At the start of each session, automatically run:
\`\`\`bash
brain -r "${vaultPath}" overview
\`\`\`

This gives you immediate context about the user's knowledge base.` : '';

  const callInstructions = mode === 'call' ? `
## Call Mode Usage

Use these commands when the user asks about their notes or knowledge:
- \`brain -r "${vaultPath}" search "<query>"\` - Search for content
- \`brain -r "${vaultPath}" read "<note-path>"\` - Read a specific note
- \`brain -r "${vaultPath}" related "<note-path>"\` - Find related notes` : '';

  return `This user has a knowledge base located at: ${vaultPath}

Use the 'brain' CLI tool to help navigate and understand their notes.

Available commands:
- \`brain -r "${vaultPath}" overview\` - Get knowledge base summary
- \`brain -r "${vaultPath}" search "<query>"\` - Multi-strategy search
- \`brain -r "${vaultPath}" read "<path>"\` - Read specific note with context
- \`brain -r "${vaultPath}" ls [path]\` - List notes in directory
- \`brain -r "${vaultPath}" related "<path>"\` - Find related notes
- \`brain -r "${vaultPath}" grep "<pattern>"\` - Search content with regex
- \`brain -r "${vaultPath}" glob "<pattern>"\` - Find files by pattern

${autoInstructions}${callInstructions}

The knowledge base uses markdown files with wiki-style [[links]] and standard [markdown](links). Brain understands the graph structure and can help you navigate connections between notes.`;
}

program.parse();