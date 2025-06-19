"use strict";
/**
 * Cache management for persistent graph storage
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const fast_glob_1 = __importDefault(require("fast-glob"));
const VectorStore_1 = require("../embedding/VectorStore");
const EmbeddingService_1 = require("../embedding/EmbeddingService");
class CacheManager {
    notesRoot;
    cacheDir;
    cacheFile;
    metadataFile;
    CACHE_VERSION = '1.0';
    constructor(notesRoot) {
        this.notesRoot = notesRoot;
        this.cacheDir = path.join(os.homedir(), '.brain', 'cache');
        // Create cache file names based on notes root path
        const rootHash = crypto.createHash('md5').update(notesRoot).digest('hex').slice(0, 8);
        const baseName = `${path.basename(notesRoot)}_${rootHash}`;
        this.cacheFile = path.join(this.cacheDir, `${baseName}.json`);
        this.metadataFile = path.join(this.cacheDir, `${baseName}.meta.json`);
    }
    async loadCache() {
        if (!fs.existsSync(this.cacheFile) || !fs.existsSync(this.metadataFile)) {
            return null;
        }
        try {
            // Load and verify metadata
            const metadataContent = await fs.promises.readFile(this.metadataFile, 'utf-8');
            const metadata = JSON.parse(metadataContent);
            // Check cache version compatibility
            if (metadata.version !== this.CACHE_VERSION) {
                return null;
            }
            // Check if any files have changed
            const isValid = await this.isCacheValid(metadata);
            if (!isValid) {
                return null;
            }
            // Load the graph
            const graphContent = await fs.promises.readFile(this.cacheFile, 'utf-8');
            const graphData = JSON.parse(graphContent);
            // Reconstruct the graph with proper Map and Set objects
            const graph = {
                nodes: new Map(),
                clusters: [],
                hubNodes: graphData.hubNodes || [],
                orphanNodes: graphData.orphanNodes || [],
                brokenLinks: graphData.brokenLinks || [],
                lastUpdated: graphData.lastUpdated ? new Date(graphData.lastUpdated) : null
            };
            // Reconstruct nodes Map
            if (graphData.nodes) {
                for (const [path, nodeData] of Object.entries(graphData.nodes)) {
                    const typedNodeData = nodeData;
                    const node = {
                        ...typedNodeData,
                        note: {
                            ...typedNodeData.note,
                            tags: new Set(typedNodeData.note.tags),
                            lastModified: typedNodeData.note.lastModified ? new Date(typedNodeData.note.lastModified) : null
                        }
                    };
                    graph.nodes.set(path, node);
                }
            }
            // Reconstruct clusters
            if (graphData.clusters) {
                graph.clusters = graphData.clusters.map((cluster) => new Set(cluster));
            }
            return graph;
        }
        catch (error) {
            // If any error occurs, cache is invalid
            return null;
        }
    }
    async saveCache(graph, overviewText) {
        try {
            // Ensure cache directory exists
            await fs.promises.mkdir(this.cacheDir, { recursive: true });
            // Create metadata
            const metadata = {
                version: this.CACHE_VERSION,
                created: new Date().toISOString(),
                notesRoot: this.notesRoot,
                notesCount: graph.nodes.size,
                fileTimestamps: await this.getFileTimestamps(),
                overview: overviewText
            };
            // Prepare graph data for serialization
            const graphData = {
                nodes: Object.fromEntries(Array.from(graph.nodes.entries()).map(([path, node]) => [
                    path,
                    {
                        ...node,
                        note: {
                            ...node.note,
                            tags: Array.from(node.note.tags),
                            lastModified: node.note.lastModified?.toISOString()
                        }
                    }
                ])),
                clusters: graph.clusters.map(cluster => Array.from(cluster)),
                hubNodes: graph.hubNodes,
                orphanNodes: graph.orphanNodes,
                brokenLinks: graph.brokenLinks,
                lastUpdated: graph.lastUpdated?.toISOString()
            };
            // Save graph
            await fs.promises.writeFile(this.cacheFile, JSON.stringify(graphData, null, 2));
            // Save metadata
            await fs.promises.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2));
        }
        catch (error) {
            // If saving fails, clean up partial files
            await this.clearCache();
            throw error;
        }
    }
    async clearCache() {
        try {
            if (fs.existsSync(this.cacheFile)) {
                await fs.promises.unlink(this.cacheFile);
            }
            if (fs.existsSync(this.metadataFile)) {
                await fs.promises.unlink(this.metadataFile);
            }
        }
        catch (error) {
            // Ignore errors when cleaning up
        }
    }
    async getCachedOverview() {
        if (!fs.existsSync(this.metadataFile)) {
            return null;
        }
        try {
            const metadataContent = await fs.promises.readFile(this.metadataFile, 'utf-8');
            const metadata = JSON.parse(metadataContent);
            // Check cache version compatibility
            if (metadata.version !== this.CACHE_VERSION) {
                return null;
            }
            // Check if cache is still valid
            const isValid = await this.isCacheValid(metadata);
            if (!isValid) {
                return null;
            }
            return metadata.overview || null;
        }
        catch (error) {
            return null;
        }
    }
    async getCacheStats() {
        if (!fs.existsSync(this.cacheFile) || !fs.existsSync(this.metadataFile)) {
            return null;
        }
        try {
            // Load metadata
            const metadataContent = await fs.promises.readFile(this.metadataFile, 'utf-8');
            const metadata = JSON.parse(metadataContent);
            // Get file size
            const stats = await fs.promises.stat(this.cacheFile);
            const sizeMb = stats.size / (1024 * 1024);
            return {
                cacheFile: this.cacheFile,
                sizeMb,
                lastUpdated: metadata.created || 'Unknown',
                notesCount: metadata.notesCount || 0,
                version: metadata.version || 'Unknown'
            };
        }
        catch (error) {
            return null;
        }
    }
    async isCacheValid(metadata) {
        const cachedTimestamps = metadata.fileTimestamps || {};
        const currentTimestamps = await this.getFileTimestamps();
        // Check if any files were added or removed
        const cachedPaths = new Set(Object.keys(cachedTimestamps));
        const currentPaths = new Set(Object.keys(currentTimestamps));
        if (cachedPaths.size !== currentPaths.size) {
            return false;
        }
        for (const path of cachedPaths) {
            if (!currentPaths.has(path)) {
                return false;
            }
        }
        // Check if any files were modified
        for (const [filePath, cachedTimestamp] of Object.entries(cachedTimestamps)) {
            const currentTimestamp = currentTimestamps[filePath];
            if (currentTimestamp !== cachedTimestamp) {
                return false;
            }
        }
        return true;
    }
    /**
     * Build vector embeddings for all notes that need updating
     */
    async buildVectorEmbeddings(graph, apiKey) {
        if (!apiKey) {
            throw new Error('OpenAI API key is required for vector embeddings');
        }
        const vectorStore = new VectorStore_1.VectorStore(this.notesRoot);
        const embeddingService = new EmbeddingService_1.EmbeddingService(apiKey);
        console.error('Building vector embeddings...');
        let processed = 0;
        const total = graph.nodes.size;
        for (const [notePath, node] of graph.nodes.entries()) {
            try {
                // Check if note needs re-embedding
                if (node.note.lastModified && vectorStore.needsReembedding(notePath, node.note.lastModified)) {
                    // Use existing chunks from the note
                    if (node.note.chunks && node.note.chunks.length > 0) {
                        await vectorStore.addNoteChunks(notePath, node.note.title, node.note.chunks, node.note.relativePath, node.note.lastModified, node.note.wordCount, embeddingService);
                    }
                    processed++;
                    if (processed % 10 === 0) {
                        console.error(`Embedded ${processed}/${total} notes...`);
                    }
                }
            }
            catch (error) {
                console.error(`Failed to embed ${node.note.relativePath}: ${error}`);
            }
        }
        // Save vector store to disk
        await vectorStore.saveToDisk();
        if (processed > 0) {
            console.error(`✅ Embedded ${processed} notes`);
        }
        else {
            console.error('✅ All embeddings up to date');
        }
    }
    /**
     * Load configuration from MCP config file
     */
    async loadConfig() {
        // Load from MCP config file (single source of truth)
        const mcpConfigPath = path.join(this.notesRoot, 'brain-mcp-config.json');
        if (!fs.existsSync(mcpConfigPath)) {
            // Clean up any legacy config files
            await this.cleanupLegacyConfigs();
            return null;
        }
        try {
            const configContent = await fs.promises.readFile(mcpConfigPath, 'utf-8');
            const mcpConfig = JSON.parse(configContent);
            // Convert MCP config format to expected format
            return {
                vaultPath: mcpConfig.notesRoot || this.notesRoot,
                mode: 'mcp',
                openaiApiKey: mcpConfig.openaiApiKey,
                vectorSearch: true
            };
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Clean up legacy configuration files
     */
    async cleanupLegacyConfigs() {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const configDir = path.join(homeDir, '.brain-config');
        const vaultHash = crypto.createHash('md5').update(this.notesRoot).digest('hex').slice(0, 8);
        const configPath = path.join(configDir, `${path.basename(this.notesRoot)}_${vaultHash}.json`);
        const legacyConfigPath = path.join(this.notesRoot, '.brain-config.json');
        try {
            // Remove legacy configs if they exist
            if (fs.existsSync(configPath)) {
                await fs.promises.unlink(configPath);
            }
            if (fs.existsSync(legacyConfigPath)) {
                await fs.promises.unlink(legacyConfigPath);
            }
        }
        catch (error) {
            // Ignore cleanup errors
        }
    }
    /**
     * Get vector search instance
     */
    getVectorStore() {
        return new VectorStore_1.VectorStore(this.notesRoot);
    }
    async getFileTimestamps() {
        const timestamps = {};
        try {
            const files = await (0, fast_glob_1.default)('**/*.md', {
                cwd: this.notesRoot,
                absolute: false,
                ignore: ['**/node_modules/**', '**/.*/**']
            });
            for (const file of files) {
                try {
                    const fullPath = path.join(this.notesRoot, file);
                    const stats = await fs.promises.stat(fullPath);
                    timestamps[file] = stats.mtime.getTime();
                }
                catch (error) {
                    continue;
                }
            }
        }
        catch (error) {
            // Handle cases where notes_root doesn't exist
        }
        return timestamps;
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=CacheManager.js.map