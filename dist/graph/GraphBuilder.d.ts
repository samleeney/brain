/**
 * Graph construction from parsed notes
 */
import { KnowledgeGraph } from '../models/types';
export declare class GraphBuilder {
    private notesRoot;
    private parserFactory;
    private linkResolver;
    private supportedPatterns;
    constructor(notesRoot: string);
    buildGraph(filePaths?: string[]): Promise<KnowledgeGraph>;
    private buildGraphLibGraph;
    private detectClusters;
    private dfsComponent;
    private calculateCentrality;
    private findHubNodes;
    private findOrphanNodes;
    updateGraph(graph: KnowledgeGraph, changedFiles: string[], removedFiles?: string[]): Promise<KnowledgeGraph>;
}
//# sourceMappingURL=GraphBuilder.d.ts.map