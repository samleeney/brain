import { SearchEngine, SearchResult } from '../src/search/SearchEngine';
import { VectorStore, VectorDocument, SimilarityResult } from '../src/embedding/VectorStore';
import { FileRegistry, FileRecord } from '../src/storage/FileRegistry';
import { EmbeddingService } from '../src/embedding/EmbeddingService';

// Mock dependencies
jest.mock('../src/embedding/VectorStore');
jest.mock('../src/storage/FileRegistry');
jest.mock('../src/embedding/EmbeddingService');

describe('SearchEngine V2', () => {
  let searchEngine: SearchEngine;
  let mockVectorStore: jest.Mocked<VectorStore>;
  let mockFileRegistry: jest.Mocked<FileRegistry>;
  let mockEmbeddingService: jest.Mocked<EmbeddingService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockFileRegistry = new FileRegistry('/test/config') as jest.Mocked<FileRegistry>;
    mockVectorStore = new VectorStore('/test/config', mockFileRegistry) as jest.Mocked<VectorStore>;
    mockEmbeddingService = new EmbeddingService('test-api-key') as jest.Mocked<EmbeddingService>;

    // Create search engine with mocked dependencies
    searchEngine = new SearchEngine(mockVectorStore);
  });

  describe('enhancedSearch', () => {
    it('should perform basic semantic search when multi-phrase is disabled', async () => {
      // Mock data
      const mockFile: FileRecord = {
        id: 'file-123',
        absolutePath: '/test/notes/reach-antenna.md',
        displayName: 'REACH Antenna Design',
        fileType: 'markdown',
        fileSize: 1000,
        lastModified: new Date(),
        dateAdded: new Date()
      };

      const mockDocument: VectorDocument = {
        vectorKey: 'vec-123',
        fileId: 'file-123',
        content: 'The REACH telescope uses a hexagonal antenna array optimized for 21-cm observations.',
        embedding: [0.1, 0.2, 0.3],
        metadata: {
          chunkType: 'paragraph',
          headingContext: ['# REACH Antenna Design', '## Hexagonal Array'],
          startLine: 10,
          endLine: 15,
          chunkIndex: 0
        }
      };

      const mockSearchResult: SimilarityResult = {
        document: mockDocument,
        file: mockFile,
        similarity: 0.85,
        snippet: 'The REACH telescope uses a hexagonal antenna array...'
      };

      // Mock the search method
      mockVectorStore.search.mockResolvedValue([mockSearchResult]);

      // Perform search
      const results = await searchEngine.enhancedSearch(
        'REACH hexagonal antenna',
        'test-api-key',
        10,
        0.7,
        false // disable multi-phrase
      );

      // Verify results
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        fileId: 'file-123',
        filePath: '/test/notes/reach-antenna.md',
        displayName: 'REACH Antenna Design',
        chunkId: 'vec-123',
        similarity: 0.85,
        chunkType: 'paragraph'
      });

      // Verify vectorStore.search was called correctly
      expect(mockVectorStore.search).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.search).toHaveBeenCalledWith(
        'REACH hexagonal antenna',
        expect.any(EmbeddingService),
        10,
        0.7
      );
    });

    it('should perform parallel multi-phrase search when enabled', async () => {
      // Mock data for multiple results
      const mockFiles: FileRecord[] = [
        {
          id: 'file-1',
          absolutePath: '/test/notes/reach-antenna.md',
          displayName: 'REACH Antenna Design',
          fileType: 'markdown',
          fileSize: 1000,
          lastModified: new Date(),
          dateAdded: new Date()
        },
        {
          id: 'file-2',
          absolutePath: '/test/notes/cosmic-dawn.md',
          displayName: 'Cosmic Dawn Theory',
          fileType: 'markdown',
          fileSize: 2000,
          lastModified: new Date(),
          dateAdded: new Date()
        }
      ];

      const mockDocuments: VectorDocument[] = [
        {
          vectorKey: 'vec-1',
          fileId: 'file-1',
          content: 'REACH uses hexagonal antenna arrays',
          embedding: [0.1, 0.2, 0.3],
          metadata: {
            chunkType: 'paragraph',
            headingContext: ['# REACH Design'],
            startLine: 1,
            endLine: 5,
            chunkIndex: 0
          }
        },
        {
          vectorKey: 'vec-2',
          fileId: 'file-2',
          content: 'Cosmic dawn 21-cm signal detection',
          embedding: [0.4, 0.5, 0.6],
          metadata: {
            chunkType: 'paragraph',
            headingContext: ['# Theory'],
            startLine: 10,
            endLine: 15,
            chunkIndex: 0
          }
        }
      ];

      const mockSearchResults: SimilarityResult[][] = [
        // Results for first query variation
        [{
          document: mockDocuments[0],
          file: mockFiles[0],
          similarity: 0.9,
          snippet: 'REACH uses hexagonal...'
        }],
        // Results for second query variation
        [{
          document: mockDocuments[1],
          file: mockFiles[1],
          similarity: 0.8,
          snippet: 'Cosmic dawn 21-cm...'
        }]
      ];

      // Mock search to return different results for different queries
      // The search engine will generate query variations, so we need to handle multiple calls
      let callCount = 0;
      mockVectorStore.search.mockImplementation(async () => {
        // Return alternating results to simulate different query variations finding different documents
        return callCount++ % 2 === 0 ? mockSearchResults[0] : mockSearchResults[1];
      });

      // Perform search
      const results = await searchEngine.enhancedSearch(
        'REACH cosmic dawn',
        'test-api-key',
        10,
        0.7,
        true // enable multi-phrase
      );

      // Verify parallel searches were performed (at least 2 for query variations)
      expect(mockVectorStore.search.mock.calls.length).toBeGreaterThanOrEqual(2);
      
      // Verify results contain both documents
      expect(results.length).toBeGreaterThanOrEqual(2);
      const fileIds = results.map(r => r.fileId);
      expect(fileIds).toContain('file-1');
      expect(fileIds).toContain('file-2');
    });

    it('should handle search errors gracefully', async () => {
      // Mock search to throw error
      mockVectorStore.search.mockRejectedValue(new Error('Embedding service error'));

      // Expect search to throw
      await expect(
        searchEngine.enhancedSearch('test query', 'test-api-key')
      ).rejects.toThrow('Embedding service error');
    });

    it('should deduplicate results in multi-phrase search', async () => {
      // Mock same document returned from multiple searches
      const mockFile: FileRecord = {
        id: 'file-1',
        absolutePath: '/test/notes/reach.md',
        displayName: 'REACH Overview',
        fileType: 'markdown',
        fileSize: 1000,
        lastModified: new Date(),
        dateAdded: new Date()
      };

      const mockDocument: VectorDocument = {
        vectorKey: 'vec-same',
        fileId: 'file-1',
        content: 'REACH telescope for cosmic dawn detection',
        embedding: [0.1, 0.2, 0.3],
        metadata: {
          chunkType: 'paragraph',
          headingContext: ['# Overview'],
          startLine: 1,
          endLine: 5,
          chunkIndex: 0
        }
      };

      const result1: SimilarityResult = {
        document: mockDocument,
        file: mockFile,
        similarity: 0.85,
        snippet: 'REACH telescope...'
      };

      const result2: SimilarityResult = {
        document: mockDocument,
        file: mockFile,
        similarity: 0.90, // Higher similarity
        snippet: 'REACH telescope...'
      };

      // Mock search to return same document with different similarities
      let searchCallCount = 0;
      mockVectorStore.search.mockImplementation(async () => {
        // First call returns lower similarity, second returns higher
        return searchCallCount++ === 0 ? [result1] : [result2];
      });

      // Perform search
      const results = await searchEngine.enhancedSearch(
        'REACH telescope',
        'test-api-key',
        10,
        0.7,
        true
      );

      // Should only have one result with the higher similarity
      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0.90);
    });
  });

  describe('comprehensiveResearch', () => {
    it('should perform multiple search strategies', async () => {
      // Mock successful searches
      mockVectorStore.search.mockResolvedValue([]);

      // Perform comprehensive research
      const results = await searchEngine.comprehensiveResearch(
        'REACH antenna bayesian analysis',
        'test-api-key',
        15,
        0.3
      );

      // Should perform multiple searches
      expect(mockVectorStore.search.mock.calls.length).toBeGreaterThan(3);
      
      // Check that different query variations were used
      const queries = mockVectorStore.search.mock.calls.map(call => call[0]);
      expect(queries).toContain('REACH antenna bayesian analysis');
      expect(queries.some(q => q.includes('REACH'))).toBe(true);
      expect(queries.some(q => q.includes('antenna'))).toBe(true);
      expect(queries.some(q => q.includes('bayesian'))).toBe(true);
    });
  });
});