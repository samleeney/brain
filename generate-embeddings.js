#!/usr/bin/env node

/**
 * Manual script to generate embeddings for the brain knowledge base
 */

const { GraphBuilder } = require('./dist/graph/GraphBuilder');
const { CacheManager } = require('./dist/cache/CacheManager');
const fs = require('fs');
const path = require('path');

async function generateEmbeddings() {
  try {
    // Load config
    const configPath = '/home/sam/vaults/main/brain-mcp-config.json';
    if (!fs.existsSync(configPath)) {
      console.error('Config file not found:', configPath);
      process.exit(1);
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log('🧠 Generating embeddings for brain knowledge base...');
    console.log('Notes root:', config.notesRoot);
    
    // Build graph
    console.log('📊 Building knowledge graph...');
    const graphBuilder = new GraphBuilder(config.notesRoot);
    const graph = await graphBuilder.buildGraph();
    console.log(`Built graph with ${Object.keys(graph.nodes).length} nodes`);
    
    // Generate embeddings
    console.log('🔍 Generating embeddings...');
    const cacheManager = new CacheManager(config.notesRoot);
    await cacheManager.buildVectorEmbeddings(graph, config.openaiApiKey);
    
    console.log('✅ Embeddings generated successfully!');
    console.log('Vector store saved to:', path.join(config.notesRoot, '.brain-vectors.json'));
    
  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
    process.exit(1);
  }
}

generateEmbeddings();