/**
 * Core data models for AINodes TypeScript implementation
 */
export declare enum LinkType {
    WIKI = "wiki",// [[note-name]]
    MARKDOWN = "markdown"
}
export interface Heading {
    level: number;
    text: string;
    lineNumber: number;
    slug: string;
}
export interface Link {
    sourcePath: string;
    targetPath: string | null;
    linkType: LinkType;
    linkText: string;
    context: string;
    lineNumber: number;
    isBroken: boolean;
}
export interface Note {
    path: string;
    relativePath: string;
    title: string;
    headings: Heading[];
    outgoingLinks: Link[];
    tags: Set<string>;
    frontmatter: Record<string, any>;
    lastModified: Date | null;
    wordCount: number;
    chunks?: Chunk[];
}
export interface Chunk {
    id: string;
    content: string;
    startLine: number;
    endLine: number;
    headingContext: string[];
    chunkType: ChunkType;
    embedding?: number[];
}
export declare enum ChunkType {
    TITLE = "title",// Title + first paragraph
    HEADING_SECTION = "heading",// Content under a heading
    PARAGRAPH = "paragraph"
}
export interface GraphNode {
    note: Note;
    incomingLinks: Link[];
    inDegree: number;
    outDegree: number;
    clusterId: number | null;
    centralityScore: number;
}
export interface KnowledgeGraph {
    nodes: Map<string, GraphNode>;
    clusters: Set<string>[];
    hubNodes: string[];
    orphanNodes: string[];
    brokenLinks: Link[];
    lastUpdated: Date | null;
}
export interface CacheMetadata {
    version: string;
    created: string;
    notesRoot: string;
    notesCount: number;
    fileTimestamps: Record<string, number>;
    overview?: string;
}
//# sourceMappingURL=types.d.ts.map