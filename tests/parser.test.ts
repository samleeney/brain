import { MarkdownParser } from '../src/parser/MarkdownParser';
import { ChunkingService } from '../src/parser/ChunkingService';
import * as fs from 'fs';
import * as path from 'path';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;
  let tempFilePath: string;

  beforeEach(() => {
    parser = new MarkdownParser();
    tempFilePath = path.join(__dirname, 'temp-test.md');
  });

  afterEach(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  test('should parse markdown file', async () => {
    const content = `# Test Title

This is a paragraph with [[wiki-link]] and [markdown link](path.md).

## Section

More content here.`;

    fs.writeFileSync(tempFilePath, content);
    const parsed = await parser.parseFile(tempFilePath, __dirname);
    
    expect(parsed.title).toBe('Test Title');
    expect(parsed.outgoingLinks.length).toBe(2);
    expect(parsed.outgoingLinks[0].linkText).toBe('wiki-link');
    expect(parsed.outgoingLinks[1].linkText).toBe('path.md');
  });

  test('should handle content without title', async () => {
    const content = `This is content without a title.

[[link-target]]`;

    fs.writeFileSync(tempFilePath, content);
    const parsed = await parser.parseFile(tempFilePath, __dirname);
    
    expect(parsed.title).toBe('temp-test');
    expect(parsed.outgoingLinks.length).toBe(1);
  });
});

describe('ChunkingService', () => {
  test('should create chunks with static method', () => {
    const content = `# Main Title

Introduction paragraph with enough content to meet minimum requirements. This paragraph contains sufficient text to create a meaningful chunk that will pass the minimum size requirements.

## Section One

Content for section one with additional text to ensure we meet the minimum chunk size requirements. This section provides detailed information about the topic.

### Subsection

Nested content with more substantial text to create viable chunks. This subsection contains meaningful information that should be captured.

## Section Two

Content for section two with comprehensive details and sufficient length to create proper chunks. This final section rounds out our test content.`;

    const headings = [
      { level: 1, text: 'Main Title', lineNumber: 1, slug: 'main-title' },
      { level: 2, text: 'Section One', lineNumber: 5, slug: 'section-one' },
      { level: 3, text: 'Subsection', lineNumber: 9, slug: 'subsection' },
      { level: 2, text: 'Section Two', lineNumber: 13, slug: 'section-two' }
    ];

    const chunks = ChunkingService.createChunks(content, 'Main Title', headings, 'test.md');
    
    // ChunkingService should create at least a title chunk
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  test('should have title chunk', () => {
    const content = `# Main Title

Introduction paragraph with sufficient content to create a title chunk. This content should be substantial enough to meet the minimum requirements for chunk creation.`;

    const headings = [
      { level: 1, text: 'Main Title', lineNumber: 1, slug: 'main-title' }
    ];

    const chunks = ChunkingService.createChunks(content, 'Main Title', headings, 'test.md');
    
    expect(chunks.length).toBeGreaterThan(0);
    
    // Should have chunks with paragraph type (simplified chunking)
    const firstChunk = chunks[0];
    expect(firstChunk).toBeDefined();
    expect(firstChunk.chunkType).toBe('paragraph');
  });
});