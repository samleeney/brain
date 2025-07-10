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
      
      if (query.includes('reach') || query.includes('hexagonal') || query.includes('21-cm')) {
        results.push({
          document: {
            id: 'reach-antenna-design#title',
            metadata: {
              notePath: path.join(testNotesPath, 'reach-antenna-design.md'),
              headingContext: ['REACH Antenna Design'],
              chunkType: 'title'
            }
          },
          similarity: 0.9,
          snippet: 'The REACH telescope employs a unique hexagonal array of bow-tie dipole antennas...'
        });
      }
      
      if (query.includes('cosmic dawn') || query.includes('foreground')) {
        results.push({
          document: {
            id: 'cosmic-dawn-theory#title',
            metadata: {
              notePath: path.join(testNotesPath, 'cosmic-dawn-theory.md'),
              headingContext: ['Cosmic Dawn Theory'],
              chunkType: 'title'
            }
          },
          similarity: 0.8,
          snippet: 'The 21-cm hyperfine transition of neutral hydrogen provides a unique probe...'
        });
      }
      
      if (query.includes('bayesian') || query.includes('pipeline')) {
        results.push({
          document: {
            id: 'bayesian-pipeline#title',
            metadata: {
              notePath: path.join(testNotesPath, 'bayesian-pipeline.md'),
              headingContext: ['REACH Bayesian Analysis Pipeline'],
              chunkType: 'title'
            }
          },
          similarity: 0.85,
          snippet: 'The REACH pipeline uses Bayesian inference to extract the faint 21-cm signal...'
        });
      }
      
      if (query.includes('meeting') || query.includes('collaboration')) {
        results.push({
          document: {
            id: 'meetings/2024-reach-collaboration#title',
            metadata: {
              notePath: path.join(testNotesPath, 'meetings/2024-reach-collaboration.md'),
              headingContext: ['REACH Collaboration Meeting 2024'],
              chunkType: 'title'
            }
          },
          similarity: 0.87,
          snippet: 'Chromatic response: Fully characterised 50-200 MHz...'
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

  test('should find REACH antenna content', async () => {
    const results = await searchEngine.semanticSearch('reach hexagonal antenna array', 'mock-api-key', 10, 0.1);
    
    // Should return mocked results
    expect(results.length).toBeGreaterThan(0);
    
    const reachResult = results.find(r => r.notePath.includes('reach-antenna-design.md'));
    expect(reachResult).toBeDefined();
    expect(reachResult?.similarity).toBeGreaterThan(0.5);
  });

  test('should find cosmic dawn content', async () => {
    const results = await searchEngine.semanticSearch('cosmic dawn 21-cm foreground', 'mock-api-key', 10, 0.1);
    
    expect(results.length).toBeGreaterThan(0);
    
    const cosmicResult = results.find(r => r.notePath.includes('cosmic-dawn-theory.md'));
    expect(cosmicResult).toBeDefined();
    expect(cosmicResult?.snippet.toLowerCase()).toContain('21-cm');
  });

  test('should find REACH collaboration meeting notes', async () => {
    const results = await searchEngine.semanticSearch('reach collaboration meeting bayesian', 'mock-api-key', 10, 0.1);
    
    expect(results.length).toBeGreaterThan(0);
    
    const meetingResult = results.find(r => r.notePath.includes('2024-reach-collaboration.md'));
    expect(meetingResult).toBeDefined();
    expect(meetingResult?.snippet).toContain('Chromatic');
  });
});