"use strict";
/**
 * OpenAI text-embedding-3-large integration for semantic search
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const openai_1 = __importDefault(require("openai"));
class EmbeddingService {
    openai;
    model = 'text-embedding-3-large';
    constructor(apiKey) {
        this.openai = new openai_1.default({
            apiKey: apiKey
        });
    }
    /**
     * Generate embedding for a single text
     */
    async embedText(text) {
        try {
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: text,
                encoding_format: 'float'
            });
            const embedding = response.data[0];
            return {
                text: text,
                embedding: embedding.embedding,
                tokenCount: response.usage.total_tokens
            };
        }
        catch (error) {
            throw new Error(`Failed to generate embedding: ${error}`);
        }
    }
    /**
     * Generate embeddings for multiple texts in batch
     */
    async embedTexts(texts) {
        if (texts.length === 0)
            return [];
        try {
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: texts,
                encoding_format: 'float'
            });
            return response.data.map((embedding, index) => ({
                text: texts[index],
                embedding: embedding.embedding,
                tokenCount: response.usage.total_tokens / texts.length // Approximate per text
            }));
        }
        catch (error) {
            throw new Error(`Failed to generate batch embeddings: ${error}`);
        }
    }
    /**
     * Calculate cosine similarity between two embeddings
     */
    static cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error('Embeddings must have the same dimension');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    /**
     * Generate embeddings for multiple chunks efficiently
     */
    async embedChunks(texts) {
        // Use batch embedding for efficiency
        return this.embedTexts(texts);
    }
    /**
     * Enhanced preprocessing for semantic search queries
     */
    static preprocessQuery(query) {
        // Normalize contractions
        const expanded = query
            .replace(/what's/gi, 'what is')
            .replace(/where's/gi, 'where is')
            .replace(/how's/gi, 'how is')
            .replace(/who's/gi, 'who is')
            .replace(/can't/gi, 'cannot')
            .replace(/won't/gi, 'will not')
            .replace(/don't/gi, 'do not')
            .replace(/doesn't/gi, 'does not');
        // Extract and expand query intent
        const intentKeywords = [];
        // Question type detection
        if (/what|which|describe|explain/i.test(expanded)) {
            intentKeywords.push('definition explanation concept');
        }
        if (/how|steps|process|method/i.test(expanded)) {
            intentKeywords.push('procedure instructions tutorial');
        }
        if (/why|reason|cause|purpose/i.test(expanded)) {
            intentKeywords.push('reasoning motivation purpose');
        }
        if (/when|time|date|schedule/i.test(expanded)) {
            intentKeywords.push('timing schedule temporal');
        }
        if (/where|location|place/i.test(expanded)) {
            intentKeywords.push('location place position');
        }
        // Domain-specific expansions
        if (/code|program|function|class/i.test(expanded)) {
            intentKeywords.push('programming software development');
        }
        if (/document|note|file|text/i.test(expanded)) {
            intentKeywords.push('documentation content information');
        }
        // Combine with original query
        return intentKeywords.length > 0
            ? `${expanded} ${intentKeywords.join(' ')}`
            : expanded;
    }
}
exports.EmbeddingService = EmbeddingService;
//# sourceMappingURL=EmbeddingService.js.map