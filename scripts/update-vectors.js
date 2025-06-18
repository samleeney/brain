#!/usr/bin/env node

/**
 * Manual vector store update script for Brain MCP
 * Usage: node scripts/update-vectors.js [--clear]
 */

const { GraphBuilder } = require('../dist/graph/GraphBuilder');
const { CacheManager } = require('../dist/cache/CacheManager');
const { VectorStore } = require('../dist/embedding/VectorStore');
const { EmbeddingService } = require('../dist/embedding/EmbeddingService');
const fs = require('fs');
const path = require('path');

async function updateVectors(clearFirst = false) {
  try {
    // Load config
    const configPath = path.join(process.env.HOME || '~', '.brain', 'config.json');
    if (!fs.existsSync(configPath)) {
      console.error('❌ Brain config not found. Run brain-setup first.');
      process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const vaultPath = config.vaultPath;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY environment variable not set');
      process.exit(1);
    }

    console.log('🧠 Brain Vector Store Update');
    console.log(`📂 Vault: ${vaultPath}`);
    console.log('');

    // Initialize services
    const cacheManager = new CacheManager(vaultPath);
    const vectorStore = new VectorStore(vaultPath);
    const embeddingService = new EmbeddingService(apiKey);

    if (clearFirst) {
      console.log('🗑️  Clearing existing vectors...');
      vectorStore.clear();
      await vectorStore.saveToDisk();
    }

    // Build graph
    console.log('📊 Building knowledge graph...');
    const graphBuilder = new GraphBuilder(vaultPath);
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
        console.error(`❌ Failed to update ${node.note.relativePath}: ${error.message}`);
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
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const clearFirst = args.includes('--clear');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Brain Vector Store Update Script

Usage:
  node scripts/update-vectors.js [options]

Options:
  --clear    Clear all existing vectors before updating
  --help     Show this help message

Environment Variables:
  OPENAI_API_KEY    Required for embedding generation

Examples:
  node scripts/update-vectors.js          # Update changed files only
  node scripts/update-vectors.js --clear  # Clear and rebuild all vectors
  `);
  process.exit(0);
}

// Run the update
updateVectors(clearFirst);