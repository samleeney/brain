"use strict";
/**
 * Vector storage and similarity search for note embeddings with FileRegistry integration
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStoreV2 = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class VectorStoreV2 {
    documents = new Map();
    filePath;
    fileRegistry;
    constructor(configDir, fileRegistry) {
        this.filePath = path.join(configDir, '.brain-vectors-v2.json');
        this.fileRegistry = fileRegistry;
        this.loadFromDisk();
    }
    /**
     * Add embeddings for file chunks
     */
    async addFileChunks(fileRecord, chunks, embeddingService) {
        console.log(`  📝 Processing ${chunks.length} chunks for ${fileRecord.displayName}`);
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            // Add chunk to database
            const chunkRecord = await this.fileRegistry.addChunk(fileRecord.id, i, chunk.content);
            // Generate embedding
            const embeddingResult = await embeddingService.embedText(chunk.content);
            const embedding = embeddingResult.embedding;
            // Create vector document
            const vectorDoc = {
                vectorKey: chunkRecord.vectorStoreKey,
                fileId: fileRecord.id,
                content: chunk.content,
                embedding,
                metadata: {
                    chunkType: chunk.chunkType.toString(),
                    headingContext: chunk.headingContext || [],
                    startLine: chunk.startLine,
                    endLine: chunk.endLine,
                    chunkIndex: i
                }
            };
            this.documents.set(chunkRecord.vectorStoreKey, vectorDoc);
        }
    }
    /**
     * Search for similar content with FileRegistry integration
     */
    async search(query, embeddingService, topK = 10, threshold = 0.7) {
        const queryResult = await embeddingService.embedText(query);
        const queryEmbedding = queryResult.embedding;
        const results = [];
        // Calculate similarities for all documents
        for (const [vectorKey, doc] of this.documents.entries()) {
            const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
            if (similarity >= threshold) {
                // Get file information from registry
                const fileRecord = await this.fileRegistry.getFileById(doc.fileId);
                if (fileRecord) {
                    results.push({
                        document: doc,
                        file: fileRecord,
                        similarity,
                        snippet: this.createSnippet(doc.content, query)
                    });
                }
            }
        }
        // Sort by similarity and return top K
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
    }
    /**
     * Remove all chunks for a file
     */
    async removeFile(fileId) {
        // Get all chunks for this file
        const chunks = await this.fileRegistry.getChunksByFileId(fileId);
        // Remove from vector store
        for (const chunk of chunks) {
            this.documents.delete(chunk.vectorStoreKey);
        }
        // Remove from database
        await this.fileRegistry.removeFile(fileId);
    }
    /**
     * Get document by vector key
     */
    async getDocumentByKey(vectorKey) {
        return this.documents.get(vectorKey) || null;
    }
    /**
     * Check if file has been indexed
     */
    async hasFile(absolutePath) {
        const fileRecord = await this.fileRegistry.getFileByPath(absolutePath);
        return fileRecord !== null;
    }
    /**
     * Get file's last indexed time
     */
    async getFileLastIndexed(absolutePath) {
        const fileRecord = await this.fileRegistry.getFileByPath(absolutePath);
        return fileRecord ? fileRecord.dateAdded : null;
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (normA * normB);
    }
    /**
     * Create a snippet from content around query terms
     */
    createSnippet(content, query, maxLength = 200) {
        const words = query.toLowerCase().split(/\s+/);
        const contentLower = content.toLowerCase();
        // Find the first occurrence of any query word
        let bestIndex = -1;
        for (const word of words) {
            const index = contentLower.indexOf(word);
            if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
                bestIndex = index;
            }
        }
        if (bestIndex === -1) {
            // No query words found, return start of content
            return content.length <= maxLength
                ? content
                : content.substring(0, maxLength) + '...';
        }
        // Extract snippet around the found word
        const start = Math.max(0, bestIndex - 50);
        const end = Math.min(content.length, bestIndex + maxLength - 50);
        let snippet = content.substring(start, end);
        if (start > 0)
            snippet = '...' + snippet;
        if (end < content.length)
            snippet = snippet + '...';
        return snippet;
    }
    /**
     * Save vector store to disk
     */
    async saveToDisk() {
        const data = {
            version: 2,
            documents: Array.from(this.documents.entries()).map(([key, doc]) => ({
                key,
                ...doc
            }))
        };
        await fs.promises.writeFile(this.filePath, JSON.stringify(data, null, 2));
    }
    /**
     * Load vector store from disk
     */
    loadFromDisk() {
        if (!fs.existsSync(this.filePath)) {
            return;
        }
        try {
            const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
            if (data.version === 2 && data.documents) {
                this.documents.clear();
                for (const doc of data.documents) {
                    const { key, ...docData } = doc;
                    this.documents.set(key, docData);
                }
            }
        }
        catch (error) {
            console.error('Failed to load vector store:', error);
        }
    }
    /**
     * Get statistics about the vector store
     */
    async getStats() {
        const files = await this.fileRegistry.getAllFiles();
        const totalSize = Array.from(this.documents.values())
            .reduce((sum, doc) => sum + doc.embedding.length * 4, 0); // 4 bytes per float
        return {
            totalDocuments: this.documents.size,
            totalFiles: files.length,
            totalSize
        };
    }
}
exports.VectorStoreV2 = VectorStoreV2;
//# sourceMappingURL=VectorStoreV2.js.map