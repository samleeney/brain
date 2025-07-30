"use strict";
/**
 * PDF parser for extracting text and structure from PDF files
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
exports.PDFParser = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const types_1 = require("../models/types");
class PDFParser {
    async parse(filePath, content, notesRoot) {
        let text;
        let pdfInfo = {};
        try {
            // Try using pdftotext for cleaner text extraction
            text = (0, child_process_1.execSync)(`pdftotext -layout "${filePath}" -`, {
                encoding: 'utf-8',
                maxBuffer: 50 * 1024 * 1024 // 50MB buffer
            });
            // Get basic info using pdf-parse for metadata
            const dataBuffer = await fs.promises.readFile(filePath);
            const pdfData = await (0, pdf_parse_1.default)(dataBuffer, { max: 1 }); // Only parse first page for metadata
            pdfInfo = pdfData.info || {};
        }
        catch (error) {
            // Fallback to pdf-parse if pdftotext is not available
            console.log('pdftotext not available, falling back to pdf-parse');
            const dataBuffer = await fs.promises.readFile(filePath);
            const pdfData = await (0, pdf_parse_1.default)(dataBuffer);
            text = pdfData.text;
            pdfInfo = pdfData.info || {};
        }
        // Extract title from metadata or filename
        const title = pdfInfo?.Title || path.basename(filePath, path.extname(filePath));
        // Extract sections based on text patterns
        const headings = this.extractHeadings(text);
        // Extract links (PDFs might contain URLs)
        const outgoingLinks = this.extractLinks(text, filePath);
        // Extract tags (if any hashtags are in the text)
        const tags = this.extractTags(text);
        // Calculate word count
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        // Get file modification time
        const stats = await fs.promises.stat(filePath);
        const lastModified = stats.mtime;
        // Calculate relative path
        const relativePath = path.relative(notesRoot, filePath);
        // Build metadata from PDF info
        const frontmatter = {};
        if (pdfInfo) {
            if (pdfInfo.Title)
                frontmatter.title = pdfInfo.Title;
            if (pdfInfo.Author)
                frontmatter.author = pdfInfo.Author;
            if (pdfInfo.Subject)
                frontmatter.subject = pdfInfo.Subject;
            if (pdfInfo.Keywords)
                frontmatter.keywords = pdfInfo.Keywords;
            if (pdfInfo.CreationDate)
                frontmatter.creationDate = pdfInfo.CreationDate;
            if (pdfInfo.ModDate)
                frontmatter.modificationDate = pdfInfo.ModDate;
        }
        return {
            path: filePath,
            relativePath,
            title,
            headings,
            outgoingLinks,
            tags,
            frontmatter,
            lastModified,
            wordCount
        };
    }
    extractHeadings(text) {
        const headings = [];
        const lines = text.split('\n');
        let lineNumber = 0;
        for (const line of lines) {
            lineNumber++;
            const trimmedLine = line.trim();
            // Detect potential headings based on patterns
            // Pattern 1: All caps lines with more than 3 words
            if (trimmedLine.length > 10 && trimmedLine === trimmedLine.toUpperCase() &&
                !/^\d+$/.test(trimmedLine) && trimmedLine.split(/\s+/).length > 2) {
                headings.push({
                    level: 1,
                    text: trimmedLine,
                    lineNumber,
                    slug: this.createSlug(trimmedLine)
                });
            }
            // Pattern 2: Lines that look like numbered sections (e.g., "1. Introduction", "2.1 Background")
            else if (/^(?:\d+\.)+\s+[A-Z]/.test(trimmedLine)) {
                const match = trimmedLine.match(/^((?:\d+\.)+)\s+(.+)$/);
                if (match) {
                    const level = match[1].split('.').length;
                    headings.push({
                        level: Math.min(level, 6),
                        text: match[2],
                        lineNumber,
                        slug: this.createSlug(match[2])
                    });
                }
            }
            // Pattern 3: Lines that start with "Chapter", "Section", etc.
            else if (/^(Chapter|Section|Part)\s+\d+[:\s]/i.test(trimmedLine)) {
                headings.push({
                    level: 1,
                    text: trimmedLine,
                    lineNumber,
                    slug: this.createSlug(trimmedLine)
                });
            }
        }
        return headings;
    }
    extractLinks(text, sourcePath) {
        const links = [];
        const lines = text.split('\n');
        // URL pattern
        const urlPattern = /https?:\/\/[^\s<>"\{\}\|\^\[\]`]+/g;
        lines.forEach((line, lineIndex) => {
            let match;
            while ((match = urlPattern.exec(line)) !== null) {
                let url = match[0];
                // Remove trailing punctuation
                url = url.replace(/[.,;!?]+$/, '');
                // Extract context around the link
                const start = Math.max(0, match.index - 50);
                const end = Math.min(line.length, match.index + url.length + 50);
                let context = line.slice(start, end).trim();
                if (start > 0)
                    context = '...' + context;
                if (end < line.length)
                    context = context + '...';
                links.push({
                    sourcePath,
                    targetPath: null,
                    linkType: types_1.LinkType.MARKDOWN, // Using markdown type for URLs
                    linkText: url,
                    context,
                    lineNumber: lineIndex + 1,
                    isBroken: false
                });
            }
        });
        return links;
    }
    extractTags(text) {
        const tags = new Set();
        const tagPattern = /(?:^|(?<=\s))#([a-zA-Z0-9_-]+)/g;
        let match;
        while ((match = tagPattern.exec(text)) !== null) {
            tags.add(match[1]);
        }
        return tags;
    }
    createSlug(text) {
        let slug = text.toLowerCase().replace(/[^\w\s-]/g, '');
        slug = slug.replace(/[-\s]+/g, '-');
        return slug.replace(/^-+|-+$/g, '');
    }
    supports(extension) {
        return this.getSupportedExtensions().includes(extension.toLowerCase());
    }
    getSupportedExtensions() {
        return ['.pdf'];
    }
}
exports.PDFParser = PDFParser;
//# sourceMappingURL=PDFParser.js.map