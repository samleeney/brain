import * as path from 'path';
import * as fs from 'fs';
import { SearchEngine } from '../src/search/SearchEngine';
import { GraphBuilder } from '../src/graph/GraphBuilder';
import { VectorStore } from '../src/embedding/VectorStore';

// Mock VectorStore to use test embeddings
jest.mock('../src/embedding/VectorStore');

describe('SearchEngine', () => {
  const testNotesPath = path.join(__dirname, '../test-notes');
  let searchEngine: SearchEngine;
  let graph: any;

  beforeAll(async () => {
    const graphBuilder = new GraphBuilder(testNotesPath);
    graph = await graphBuilder.buildGraph();
    
    // Create search engine with graph and notes root path
    searchEngine = new SearchEngine(graph, testNotesPath);

    // Load test embeddings
    const testEmbeddings = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'test-embeddings.json'), 'utf-8')
    );

    // Mock VectorStore methods
    const mockVectorStore = VectorStore as jest.MockedClass<typeof VectorStore>;
    mockVectorStore.prototype.findSimilar = jest.fn().mockImplementation(async (query: string) => {
      // Simple mock similarity results based on query
      const results = [];
      
      if (query.includes('machine learning')) {
        results.push({
          document: {
            id: 'ml-fundamentals#title',
            metadata: {
              notePath: path.join(testNotesPath, 'machine-learning-fundamentals.md'),
              headingContext: ['Machine Learning Fundamentals'],
              chunkType: 'title'
            }
          },
          similarity: 0.9,
          snippet: 'Machine learning is about teaching computers to learn patterns...'
        });
      }
      
      if (query.includes('neural')) {
        results.push({
          document: {
            id: 'neural-networks#title',
            metadata: {
              notePath: path.join(testNotesPath, 'neural-networks.md'),
              headingContext: ['Neural Networks'],
              chunkType: 'title'
            }
          },
          similarity: 0.8,
          snippet: 'Neural networks are inspired by biological neurons...'
        });
      }
      
      return results;
    });
  });

  test('should initialize with graph', () => {
    expect(searchEngine).toBeDefined();
  });

  test('should handle search queries', () => {
    // Test that SearchEngine exists and has expected methods
    expect(typeof searchEngine.semanticSearch).toBe('function');
    expect(typeof searchEngine.enhancedSearch).toBe('function');
    expect(typeof searchEngine.comprehensiveSearch).toBe('function');
  });

  test('should find machine learning content', async () => {
    const results = await searchEngine.semanticSearch('machine learning fundamentals', 'mock-api-key', 10, 0.1);
    
    // Should return mocked results
    expect(results.length).toBeGreaterThan(0);
    
    const mlResult = results.find(r => r.notePath.includes('machine-learning-fundamentals.md'));
    expect(mlResult).toBeDefined();
    expect(mlResult?.similarity).toBeGreaterThan(0.5);
  });

  test('should find neural network content', async () => {
    const results = await searchEngine.semanticSearch('neural networks', 'mock-api-key', 10, 0.1);
    
    expect(results.length).toBeGreaterThan(0);
    
    const neuralResult = results.find(r => r.notePath.includes('neural-networks.md'));
    expect(neuralResult).toBeDefined();
    expect(neuralResult?.snippet.toLowerCase()).toContain('neural');
  });
});