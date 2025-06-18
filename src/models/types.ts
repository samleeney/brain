/**
 * Core data models for AINodes TypeScript implementation
 */

export enum LinkType {
  WIKI = 'wiki',          // [[note-name]]
  MARKDOWN = 'markdown'   // [text](file.md)
}

export interface Heading {
  level: number;        // 1-6 for # to ######
  text: string;         // Heading text
  lineNumber: number;   // Line number in file
  slug: string;         // URL-friendly version for anchoring
}

export interface Link {
  sourcePath: string;      // Absolute path of source note
  targetPath: string | null;  // Absolute path of target note (null if broken)
  linkType: LinkType;     // Type of link
  linkText: string;       // Display text of link
  context: string;        // Surrounding sentence/paragraph
  lineNumber: number;     // Line number in source file
  isBroken: boolean;      // True if target doesn't exist
}

export interface Note {
  path: string;                    // Absolute file path
  relativePath: string;            // Path relative to notes root
  title: string;                   // Filename or first # heading
  headings: Heading[];             // All headings in order
  outgoingLinks: Link[];           // Links FROM this note
  tags: Set<string>;               // All #tags in the note
  frontmatter: Record<string, any>; // YAML frontmatter if present
  lastModified: Date | null;       // File modification time
  wordCount: number;               // Approximate word count
  chunks?: Chunk[];                // Semantic chunks of the note
}

export interface Chunk {
  id: string;                      // Unique chunk identifier
  content: string;                 // Chunk text content
  startLine: number;               // Starting line in source file
  endLine: number;                 // Ending line in source file
  headingContext: string[];        // Hierarchical heading path
  chunkType: ChunkType;            // Type of content chunk
  embedding?: number[];            // Vector embedding if available
}

export enum ChunkType {
  TITLE = 'title',                 // Title + first paragraph
  HEADING_SECTION = 'heading',     // Content under a heading
  PARAGRAPH = 'paragraph'          // Natural paragraph break
}

export interface GraphNode {
  note: Note;
  incomingLinks: Link[];     // Links TO this note
  inDegree: number;          // Number of incoming links
  outDegree: number;         // Number of outgoing links
  clusterId: number | null;  // Assigned cluster ID
  centralityScore: number;   // Graph centrality measure
}

export interface KnowledgeGraph {
  nodes: Map<string, GraphNode>;  // Path -> GraphNode mapping
  clusters: Set<string>[];        // List of note clusters
  hubNodes: string[];             // Paths of hub notes
  orphanNodes: string[];          // Paths of unconnected notes
  brokenLinks: Link[];            // All broken links
  lastUpdated: Date | null;       // Last graph build time
}


export interface CacheMetadata {
  version: string;
  created: string;
  notesRoot: string;
  notesCount: number;
  fileTimestamps: Record<string, number>;
  overview?: string;
}