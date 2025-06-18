#!/usr/bin/env node

/**
 * Brain CLI - Main command interface for Brain MCP
 * Usage: brain <command> [options]
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { GraphBuilder } from '../graph/GraphBuilder';
import { CacheManager } from '../cache/CacheManager';
import { VectorStore } from '../embedding/VectorStore';
import { EmbeddingService } from '../embedding/EmbeddingService';

const program = new Command();

interface BrainConfig {
  vaultPath: string;
  openaiApiKey?: string;
}

async function loadConfig(): Promise<BrainConfig> {
  const configPath = path.join(process.env.HOME || '~', '.brain', 'config.json');
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ Brain config not found. Run brain setup first.');
    process.exit(1);
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return {
      vaultPath: config.vaultPath,
      openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY
    };
  } catch (error) {
    console.error('❌ Failed to load Brain config:', error);
    process.exit(1);
  }
}

async function updateVectors(clear: boolean = false): Promise<void> {
  try {
    const config = await loadConfig();
    
    if (!config.openaiApiKey) {
      console.error('❌ OpenAI API key not found. Set OPENAI_API_KEY environment variable or run brain setup.');
      process.exit(1);
    }

    console.log('🧠 Brain Vector Store Update');
    console.log(`📂 Vault: ${config.vaultPath}`);
    console.log('');

    // Initialize services
    const cacheManager = new CacheManager(config.vaultPath);
    const vectorStore = new VectorStore(config.vaultPath);
    const embeddingService = new EmbeddingService(config.openaiApiKey);

    if (clear) {
      console.log('🗑️  Clearing existing vectors...');
      vectorStore.clear();
      await vectorStore.saveToDisk();
    }

    // Build graph
    console.log('📊 Building knowledge graph...');
    const graphBuilder = new GraphBuilder(config.vaultPath);
    const graph = await graphBuilder.buildGraph();

    console.log(`✅ Found ${graph.nodes.size} notes`);

    // Update vector embeddings
    console.log('🔄 Updating vector embeddings...');
    let updated = 0;
    let skipped = 0;

    for (const [notePath, node] of graph.nodes.entries()) {
      try {
        // Check if note needs re-embedding
        if (node.note.lastModified && vectorStore.needsReembedding(notePath, node.note.lastModified)) {
          if (node.note.chunks && node.note.chunks.length > 0) {
            await vectorStore.addNoteChunks(
              notePath,
              node.note.title,
              node.note.chunks,
              node.note.relativePath,
              node.note.lastModified,
              node.note.wordCount,
              embeddingService
            );
            updated++;
            
            if (updated % 5 === 0) {
              console.log(`  📝 Updated ${updated} notes...`);
            }
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Failed to update ${node.note.relativePath}: ${(error as Error).message}`);
      }
    }

    // Save vector store
    await vectorStore.saveToDisk();

    console.log('');
    console.log('✅ Vector store update complete!');
    console.log(`📈 Updated: ${updated} notes`);
    console.log(`⏭️  Skipped: ${skipped} notes (already up to date)`);
    
    const stats = vectorStore.getStats();
    console.log(`📊 Total: ${stats.totalNotes} notes, ${stats.totalChunks} chunks`);

  } catch (error) {
    console.error('❌ Update failed:', (error as Error).message);
    process.exit(1);
  }
}

async function showStatus(): Promise<void> {
  try {
    const config = await loadConfig();
    
    console.log('🧠 Brain Status');
    console.log('');
    
    // Check vault
    console.log(`📂 Vault: ${config.vaultPath}`);
    console.log(`✅ Config: ${fs.existsSync(config.vaultPath) ? 'Valid' : '❌ Directory not found'}`);
    
    // Check API key
    console.log(`🔑 OpenAI API: ${config.openaiApiKey ? '✅ Configured' : '❌ Missing'}`);
    
    // Check vector store
    const vectorStore = new VectorStore(config.vaultPath);
    const stats = vectorStore.getStats();
    
    if (stats.totalNotes > 0) {
      console.log(`📊 Vector Store: ${stats.totalNotes} notes, ${stats.totalChunks} chunks`);
    } else {
      console.log('📊 Vector Store: ❌ Empty - run brain update');
    }

    // Check graph cache
    const cacheManager = new CacheManager(config.vaultPath);
    const cacheStats = await cacheManager.getCacheStats();
    
    if (cacheStats) {
      console.log(`💾 Cache: ${cacheStats.notesCount} notes (${cacheStats.sizeMb.toFixed(1)}MB)`);
    } else {
      console.log('💾 Cache: ❌ Empty');
    }

  } catch (error) {
    console.error('❌ Status check failed:', (error as Error).message);
    process.exit(1);
  }
}

// Set up CLI commands
program
  .name('brain')
  .description('Brain MCP - Semantic knowledge base for your markdown notes')
  .version('1.0.0');

program
  .command('setup')
  .description('Interactive setup for Brain MCP server')
  .action(async () => {
    console.log('🧠 Running Brain setup...');
    // Import and run the existing setup script
    const { spawn } = await import('child_process');
    const setupPath = path.join(__dirname, '../setup.js');
    const child = spawn('node', [setupPath], { stdio: 'inherit' });
    
    child.on('close', (code) => {
      process.exit(code || 0);
    });
  });

program
  .command('update')
  .description('Update vector embeddings for changed files')
  .option('--clear', 'Clear all vectors and rebuild from scratch')
  .action(async (options) => {
    await updateVectors(options.clear);
  });

program
  .command('status')
  .description('Show Brain configuration and status')
  .action(async () => {
    await showStatus();
  });

program
  .command('clear')
  .description('Clear and rebuild all vector embeddings')
  .action(async () => {
    await updateVectors(true);
  });

// Parse command line arguments
program.parse();