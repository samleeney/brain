/**
 * Output formatters optimized for LLM consumption
 */
import { KnowledgeGraph, GraphNode } from '../models/types';
export declare class LLMFormatter {
    formatOverview(graph: KnowledgeGraph): string;
    formatLs(graph: KnowledgeGraph, dirPath?: string): string;
    formatNoteRead(node: GraphNode, content?: string): string;
    formatSemanticSearchResults(results: Array<{
        notePath: string;
        chunkId: string;
        similarity: number;
        snippet: string;
        headingContext: string[];
        chunkType: string;
    }>, graph: KnowledgeGraph): string;
    formatRelatedNotes(related: Array<{
        path: string;
        type: string;
        reason: string;
    }>, graph: KnowledgeGraph): string;
}
//# sourceMappingURL=LLMFormatter.d.ts.map