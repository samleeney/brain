# New feature for Brain: Multi-format File Support
## General goal
Create a `brain add` command in the CLI that can index various file types (PDF, TXT, ORG, MD) from specified directories. This extends Brain's capabilities beyond markdown files to create a comprehensive knowledge base from diverse document formats.

## Architecture Overview

### Current State
Brain currently only indexes markdown files through this pipeline:
```
File Discovery (*.md) → MarkdownParser → ChunkingService → EmbeddingService → VectorStore
```

### Proposed Architecture
Extend the pipeline to support multiple file types:
```
File Discovery (*.md|*.pdf|*.txt|*.org) → Parser Factory → Format-specific Parser → ChunkingService → EmbeddingService → VectorStore
```

### Key Architectural Changes

1. **Parser Abstraction**
   - Create `BaseParser` interface with common methods
   - Implement format-specific parsers that output standard `Note` structure
   - Add `ParserFactory` to select appropriate parser by file extension

2. **File Discovery Enhancement**
   - Modify `GraphBuilder.buildGraph()` to accept configurable file patterns
   - Add file type filtering and validation

3. **CLI Integration**
   - Add `brain add <path>` command with options for file type selection
   - Add `brain remove <path>` for removing indexed files
   - Support recursive directory scanning

## Detailed Implementation Plan

### Phase 1: Parser Infrastructure

1. **Create Parser Abstraction** (`src/parser/BaseParser.ts`)
   ```typescript
   interface BaseParser {
     parse(filePath: string, content: string): Promise<Note>
     supports(extension: string): boolean
   }
   ```

2. **Implement Format-Specific Parsers**
   - `PDFParser`: Use `pdf-parse` to extract text, detect sections by formatting
   - `TXTParser`: Split by paragraphs, use heuristics for structure detection
   - `ORGParser`: Parse org-mode syntax (*, **, *** headings, [[links]], :tags:)
   - Keep existing `MarkdownParser` but adapt to new interface

3. **Create Parser Factory** (`src/parser/ParserFactory.ts`)
   - Maps file extensions to appropriate parsers
   - Provides unified interface for file processing

### Phase 2: File Discovery & Processing

4. **Enhance File Discovery**
   - Modify `src/services/GraphBuilder.ts` to accept file patterns
   - Add configurable file type support:
     ```typescript
     const SUPPORTED_EXTENSIONS = ['.md', '.pdf', '.txt', '.org']
     const FILE_PATTERNS = SUPPORTED_EXTENSIONS.map(ext => `**/*${ext}`)
     ```

5. **Update Processing Pipeline**
   - Modify `updateEmbeddings()` to use ParserFactory
   - Ensure consistent `Note` output regardless of input format
   - Preserve existing chunking and embedding logic

### Phase 3: Chunking Strategies

6. **Format-Specific Chunking Rules** (`src/parser/ChunkingStrategies.ts`)
   ```typescript
   interface ChunkingStrategy {
     chunk(content: string, metadata: any): Chunk[]
   }
   ```
   - **Markdown**: Existing logic (by heading if large, otherwise whole doc)
   - **PDF**: Detect sections by font size/style changes, chunk by major sections
   - **TXT**: Smart paragraph grouping, aim for ~500-1000 word chunks
   - **ORG**: Similar to markdown but respect org-mode heading syntax

### Phase 4: CLI Implementation

7. **Add `brain add` and `brain remove` Commands** (`src/cli/brain.ts`)
   ```bash
   brain add <path>           # Add files from path
   brain add .               # Add from current directory
   brain add -t pdf,txt      # Only specific file types
   brain remove <path>       # Remove files from index
   ```

8. **Command Implementation**
   - Resolve absolute paths
   - Validate file types
   - Call existing update/clear logic with new parameters
   - Show progress for large directories

### Phase 5: Data Management

9. **Index Tracking**
   - Store source file type in vector metadata
   - Track indexed paths for removal support
   - Update `.brain-vectors.json` schema to include file type

10. **Remove Functionality**
    - Filter vectors by file path prefix
    - Clean up orphaned embeddings
    - Update cache accordingly

### Phase 6: Testing & Documentation

11. **Testing Strategy**
    - Unit tests for each parser
    - Integration tests for full pipeline
    - Test data: sample PDFs, TXTs, ORG files

12. **Documentation Updates**
    - Update README with new `brain add` usage
    - Add examples for each file type
    - Document chunking strategies

### Phase 7: Final Steps

13. **Code Review & Cleanup**
    - Ensure consistent error handling
    - Add comprehensive logging
    - Update TypeScript types

14. **Deployment**
    - Create feature branch
    - Test fresh install
    - Verify all file types work correctly

## Open Questions & Clarifications Needed

1. **PDF Handling**
   - Should we preserve formatting information (bold, italic)?
   - How to handle images and tables in PDFs?
   - Maximum file size limits?

2. **Chunking Strategies**
   - Should chunk sizes be configurable per file type?
   - How to handle very large files (>10MB)?
   - Should we preserve document structure in metadata?

3. **CLI Behavior**
   - Should `brain add` be incremental by default or require a flag?
   - How to handle duplicate files (same content, different locations)?
   - Progress reporting for large operations?

4. **Vector Storage**
   - Should we tag vectors with source file type for filtered search?
   - How to handle file updates (re-index automatically)?
   - Storage optimization for large document sets?

5. **Error Handling**
   - How to handle corrupted PDFs or unparseable files?
   - Should we skip errors and continue, or stop on first error?
   - Logging verbosity levels?

## Dependencies to Add

```json
{
  "pdf-parse": "^1.1.1",    // For PDF text extraction
  "org-mode-parser": "^0.1.0" // If available, otherwise custom
}
```

## Estimated Effort

- Parser infrastructure: 2-3 days
- File type implementations: 3-4 days
- CLI integration: 1-2 days
- Testing & documentation: 2-3 days
- **Total: ~10-12 days**

## Implementation Notes for Developer

### Getting Started
1. Clone the repo and run `npm install`
2. Run `npm test` to ensure existing tests pass
3. Create feature branch: `git checkout -b feature/multi-format-support`

### Development Workflow
1. Start with parser abstraction (Phase 1)
2. Implement one parser at a time, test thoroughly
3. Integrate with CLI after parsers work
4. Use existing test infrastructure, add new test files

### Key Files to Modify
- `src/parser/` - Add new parsers here
- `src/services/GraphBuilder.ts` - Update file discovery
- `src/cli/brain.ts` - Add new command
- `src/models/types.ts` - May need to extend types

### Testing Approach
- Create `test-files/` directory with sample PDFs, TXTs, ORGs
- Write unit tests for each parser
- Integration test the full pipeline
- Manual testing with real document collections

### Common Pitfalls to Avoid
- Don't break existing markdown functionality
- Maintain backwards compatibility with existing vector stores
- Handle edge cases (empty files, huge files, corrupted files)
- Preserve the incremental update capability

### Success Criteria
- All existing tests still pass
- New file types are indexed correctly
- `brain add` command works as specified
- Performance remains acceptable for large document sets
- Clean code with proper error handling
