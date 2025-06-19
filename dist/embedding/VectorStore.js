"use strict";
/**
 * Vector storage and similarity search for note embeddings
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
exports.VectorStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const EmbeddingService_1 = require("./EmbeddingService");
class VectorStore {
    documents = new Map();
    filePath;
    constructor(notesRoot) {
        this.filePath = path.join(notesRoot, '.brain-vectors.json');
        this.loadFromDisk();
    }
    /**
     * Add embeddings for note chunks
     */
    async addNoteChunks(notePath, title, chunks, relativePath, lastModified, wordCount, embeddingService) {
        const documents = [];
        // Generate embeddings for all chunks
        const chunkTexts = chunks.map(chunk => chunk.content);
        const embeddings = await embeddingService.embedChunks(chunkTexts);
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = embeddings[i];
            documents.push({
                id: chunk.id,
                title: title,
                content: chunk.content,
                embedding: embedding.embedding,
                metadata: {
                    notePath,
                    relativePath,
                    lastModified,
                    wordCount,
                    chunkType: chunk.chunkType,
                    headingContext: chunk.headingContext,
                    startLine: chunk.startLine,
                    endLine: chunk.endLine
                }
            });
        }
        this.documents.set(notePath, documents);
    }
    /**
     * Remove embeddings for a note
     */
    removeNote(notePath) {
        this.documents.delete(notePath);
    }
    /**
     * Find similar chunks using semantic similarity
     */
    async findSimilar(query, embeddingService, limit = 5, threshold = 0.3) {
        // Preprocess query for better matching
        const processedQuery = EmbeddingService_1.EmbeddingService.preprocessQuery(query);
        // Generate query embedding
        const queryResult = await embeddingService.embedText(processedQuery);
        const queryEmbedding = queryResult.embedding;
        const allResults = [];
        // Calculate similarity with all chunks
        for (const documents of this.documents.values()) {
            for (const doc of documents) {
                const similarity = EmbeddingService_1.EmbeddingService.cosineSimilarity(queryEmbedding, doc.embedding);
                // Apply chunk-type boosting
                let boostedSimilarity = similarity;
                if (doc.metadata.chunkType === 'title') {
                    boostedSimilarity *= 1.2; // Title chunks are often important
                }
                else if (doc.metadata.chunkType === 'heading') {
                    boostedSimilarity *= 1.1; // Heading sections are structured
                }
                if (boostedSimilarity >= threshold) {
                    allResults.push({ doc, similarity: boostedSimilarity });
                }
            }
        }
        // Sort by similarity and take top results
        allResults.sort((a, b) => b.similarity - a.similarity);
        const topResults = allResults.slice(0, limit);
        // Convert to SimilarityResult format
        return topResults.map(result => {
            const doc = result.doc;
            // Create contextual snippet
            let snippet = doc.content.length > 200
                ? doc.content.substring(0, 200) + '...'
                : doc.content;
            // Add heading context if available
            if (doc.metadata.headingContext.length > 0) {
                const context = doc.metadata.headingContext.join(' > ');
                snippet = `[${context}] ${snippet}`;
            }
            return {
                document: doc,
                similarity: result.similarity,
                snippet
            };
        });
    }
    /**
     * Get all note paths that have embeddings
     */
    getIndexedNotes() {
        return Array.from(this.documents.keys());
    }
    /**
     * Check if a note needs re-embedding (file modified since last embedding)
     */
    needsReembedding(notePath, lastModified) {
        const documents = this.documents.get(notePath);
        if (!documents || documents.length === 0) {
            return true;
        }
        const storedDate = documents[0].metadata.lastModified;
        return lastModified > storedDate;
    }
    /**
     * Get statistics about the vector store
     */
    getStats() {
        const totalNotes = this.documents.size;
        const totalChunks = Array.from(this.documents.values())
            .reduce((sum, docs) => sum + docs.length, 0);
        return {
            totalNotes,
            totalChunks,
            averageChunksPerNote: totalNotes > 0 ? totalChunks / totalNotes : 0
        };
    }
    /**
     * Save vector store to disk
     */
    async saveToDisk() {
        const data = {
            version: '1.0',
            created: new Date().toISOString(),
            documents: Object.fromEntries(this.documents)
        };
        await fs.promises.writeFile(this.filePath, JSON.stringify(data, null, 2));
    }
    /**
     * Load vector store from disk
     */
    loadFromDisk() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
                if (data.documents) {
                    this.documents = new Map();
                    for (const [notePath, docs] of Object.entries(data.documents)) {
                        // Convert stored dates back to Date objects
                        const documents = docs.map(doc => ({
                            ...doc,
                            metadata: {
                                ...doc.metadata,
                                lastModified: new Date(doc.metadata.lastModified)
                            }
                        }));
                        this.documents.set(notePath, documents);
                    }
                }
            }
        }
        catch (error) {
            console.error('Failed to load vector store:', error);
            this.documents = new Map();
        }
    }
    /**
     * Clear all embeddings
     */
    clear() {
        this.documents.clear();
    }
    /**
     * Export vector store data for debugging
     */
    export() {
        return {
            documents: Object.fromEntries(this.documents),
            stats: this.getStats()
        };
    }
}
exports.VectorStore = VectorStore;
//# sourceMappingURL=VectorStore.js.map