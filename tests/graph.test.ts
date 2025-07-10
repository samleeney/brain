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

  test('should find reach-antenna-design note', async () => {
    const graph = await graphBuilder.buildGraph();
    
    const reachAntennaPath = path.join(testNotesPath, 'reach-antenna-design.md');
    const node = graph.nodes.get(reachAntennaPath);
    
    expect(node).toBeDefined();
    expect(node?.note.title).toBe('REACH Antenna Design');
  });

  test('should resolve wiki links', async () => {
    const graph = await graphBuilder.buildGraph();
    
    const reachMeetingPath = path.join(testNotesPath, 'meetings/2024-reach-collaboration.md');
    const node = graph.nodes.get(reachMeetingPath);
    
    expect(node).toBeDefined();
    // Meeting notes should have references to other documents
    expect(node?.note.outgoingLinks).toBeDefined();
  });

  test('should create bidirectional relationships', async () => {
    const graph = await graphBuilder.buildGraph();
    
    // Check that we have nodes with incoming links
    const nodeWithIncoming = Array.from(graph.nodes.values()).find(node => node.incomingLinks.length > 0);
    expect(nodeWithIncoming).toBeDefined();
  });

  test('should chunk note content', async () => {
    const graph = await graphBuilder.buildGraph();
    
    const bayesianPath = path.join(testNotesPath, 'bayesian-pipeline.md');
    const node = graph.nodes.get(bayesianPath);
    
    expect(node).toBeDefined();
    expect(node?.note.chunks).toBeDefined();
    expect(node?.note.chunks!.length).toBeGreaterThan(0);
  });
});