#!/usr/bin/env node

/**
 * Test semantic search with the generated embeddings
 */

const { SearchEngine } = require('./dist/search/SearchEngine');
const { GraphBuilder } = require('./dist/graph/GraphBuilder');
const fs = require('fs');

async function testSearch() {
  try {
    // Load config
    const configPath = '/home/sam/vaults/main/brain-mcp-config.json';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    // Build graph
    const graphBuilder = new GraphBuilder(config.notesRoot);
    const graph = await graphBuilder.buildGraph();
    
    // Create search engine
    const searchEngine = new SearchEngine(graph, config.notesRoot);
    
    // Test skiing search
    console.log('🔍 Testing search for "skiing"...');
    const results = await searchEngine.semanticSearch('skiing', config.openaiApiKey, 5, 0.3);
    
    console.log(`Found ${results.length} results:`);
    results.forEach((result, i) => {
      console.log(`\n${i + 1}. ${result.notePath} (similarity: ${result.similarity.toFixed(3)})`);
      console.log(`   Type: ${result.chunkType}`);
      console.log(`   Context: ${result.headingContext.join(' > ')}`);
      console.log(`   Snippet: ${result.snippet.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('❌ Search failed:', error);
  }
}

testSearch();