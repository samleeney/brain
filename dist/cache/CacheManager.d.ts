/**
 * Cache management for persistent graph storage
 */
import { KnowledgeGraph } from '../models/types';
import { VectorStore } from '../embedding/VectorStore';
export declare class CacheManager {
    private notesRoot;
    private cacheDir;
    private cacheFile;
    private metadataFile;
    private readonly CACHE_VERSION;
    constructor(notesRoot: string);
    loadCache(): Promise<KnowledgeGraph | null>;
    saveCache(graph: KnowledgeGraph, overviewText?: string): Promise<void>;
    clearCache(): Promise<void>;
    getCachedOverview(): Promise<string | null>;
    getCacheStats(): Promise<{
        cacheFile: string;
        sizeMb: number;
        lastUpdated: string;
        notesCount: number;
        version: string;
    } | null>;
    private isCacheValid;
    /**
     * Build vector embeddings for all notes that need updating
     */
    buildVectorEmbeddings(graph: KnowledgeGraph, apiKey: string): Promise<void>;
    /**
     * Load configuration from MCP config file
     */
    loadConfig(): Promise<{
        vaultPath: string;
        mode: string;
        openaiApiKey?: string;
        vectorSearch?: boolean;
    } | null>;
    /**
     * Clean up legacy configuration files
     */
    private cleanupLegacyConfigs;
    /**
     * Get vector search instance
     */
    getVectorStore(): VectorStore;
    private getFileTimestamps;
}
//# sourceMappingURL=CacheManager.d.ts.map