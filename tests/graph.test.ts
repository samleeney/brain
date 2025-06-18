import * as path from 'path';
import { GraphBuilder } from '../src/graph/GraphBuilder';

describe('GraphBuilder', () => {
  const testNotesPath = path.join(__dirname, '../test-notes');
  let graphBuilder: GraphBuilder;

  beforeEach(() => {
    graphBuilder = new GraphBuilder(testNotesPath);
  });

  test('should build graph from test notes', async () => {
    const graph = await graphBuilder.buildGraph();
    
    expect(graph.nodes.size).toBeGreaterThan(0);
    // Remove nodeCount check as it doesn't exist in the interface
  });

  test('should find machine-learning-fundamentals note', async () => {
    const graph = await graphBuilder.buildGraph();
    
    const mlFundamentalsPath = path.join(testNotesPath, 'machine-learning-fundamentals.md');
    const node = graph.nodes.get(mlFundamentalsPath);
    
    expect(node).toBeDefined();
    expect(node?.note.title).toBe('Machine Learning Fundamentals');
  });

  test('should resolve wiki links', async () => {
    const graph = await graphBuilder.buildGraph();
    
    const mlFundamentalsPath = path.join(testNotesPath, 'machine-learning-fundamentals.md');
    const node = graph.nodes.get(mlFundamentalsPath);
    
    expect(node).toBeDefined();
    expect(node?.note.outgoingLinks.length).toBeGreaterThan(0);
    
    // Should have links to clustering-techniques, neural-networks, and practical-applications
    const linkTargets = node?.note.outgoingLinks.map(link => link.linkText);
    expect(linkTargets).toContain('clustering-techniques');
    expect(linkTargets).toContain('neural-networks');
    expect(linkTargets).toContain('practical-applications');
  });

  test('should create bidirectional relationships', async () => {
    const graph = await graphBuilder.buildGraph();
    
    // Check that we have nodes with incoming links
    const nodeWithIncoming = Array.from(graph.nodes.values()).find(node => node.incomingLinks.length > 0);
    expect(nodeWithIncoming).toBeDefined();
  });

  test('should chunk note content', async () => {
    const graph = await graphBuilder.buildGraph();
    
    const mlFundamentalsPath = path.join(testNotesPath, 'machine-learning-fundamentals.md');
    const node = graph.nodes.get(mlFundamentalsPath);
    
    expect(node).toBeDefined();
    expect(node?.note.chunks).toBeDefined();
    expect(node?.note.chunks!.length).toBeGreaterThan(0);
  });
});