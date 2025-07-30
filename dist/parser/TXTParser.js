"use strict";
/**
 * Plain text parser for extracting structure from text files
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
exports.TXTParser = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const types_1 = require("../models/types");
class TXTParser {
    async parse(filePath, content, notesRoot) {
        // Convert Buffer to string if needed
        const textContent = typeof content === 'string' ? content : content.toString('utf-8');
        // Extract title from filename
        const title = path.basename(filePath, path.extname(filePath));
        // Extract sections based on text patterns
        const headings = this.extractHeadings(textContent);
        // Extract links (URLs in text)
        const outgoingLinks = this.extractLinks(textContent, filePath);
        // Extract tags (hashtags in text)
        const tags = this.extractTags(textContent);
        // Calculate word count
        const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
        // Get file modification time
        const stats = await fs.promises.stat(filePath);
        const lastModified = stats.mtime;
        // Calculate relative path
        const relativePath = path.relative(notesRoot, filePath);
        // Extract metadata from the beginning of the file if it looks like key-value pairs
        const frontmatter = this.extractMetadata(textContent);
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
    extractHeadings(content) {
        const headings = [];
        const lines = content.split('\n');
        let lineNumber = 0;
        for (const line of lines) {
            lineNumber++;
            const trimmedLine = line.trim();
            // Skip empty lines
            if (!trimmedLine)
                continue;
            // Pattern 1: Lines that are underlined with = or -
            if (lineNumber < lines.length) {
                const nextLine = lines[lineNumber] ? lines[lineNumber].trim() : '';
                if (nextLine.length > 0) {
                    if (nextLine.match(/^=+$/)) {
                        // Underlined with = (level 1)
                        headings.push({
                            level: 1,
                            text: trimmedLine,
                            lineNumber,
                            slug: this.createSlug(trimmedLine)
                        });
                        continue;
                    }
                    else if (nextLine.match(/^-+$/)) {
                        // Underlined with - (level 2)
                        headings.push({
                            level: 2,
                            text: trimmedLine,
                            lineNumber,
                            slug: this.createSlug(trimmedLine)
                        });
                        continue;
                    }
                }
            }
            // Pattern 2: All caps lines that look like headings
            if (trimmedLine.length > 5 && trimmedLine === trimmedLine.toUpperCase() &&
                !/^\d+$/.test(trimmedLine) && trimmedLine.split(/\s+/).length > 1 &&
                trimmedLine.split(/\s+/).length < 10) {
                headings.push({
                    level: 1,
                    text: trimmedLine,
                    lineNumber,
                    slug: this.createSlug(trimmedLine)
                });
            }
            // Pattern 3: Lines with numbered sections
            else if (/^(?:\d+\.)+\s+[A-Z]/.test(trimmedLine)) {
                const match = trimmedLine.match(/^((?:\d+\.)+)\s+(.+)$/);
                if (match) {
                    const level = Math.min(match[1].split('.').length, 6);
                    headings.push({
                        level,
                        text: match[2],
                        lineNumber,
                        slug: this.createSlug(match[2])
                    });
                }
            }
            // Pattern 4: Lines that start with "Chapter", "Section", etc.
            else if (/^(Chapter|Section|Part|Appendix)\s+\d+[:\s]/i.test(trimmedLine)) {
                headings.push({
                    level: 1,
                    text: trimmedLine,
                    lineNumber,
                    slug: this.createSlug(trimmedLine)
                });
            }
            // Pattern 5: Lines that look like Roman numerals
            else if (/^[IVX]+\.\s+[A-Z]/.test(trimmedLine)) {
                headings.push({
                    level: 2,
                    text: trimmedLine,
                    lineNumber,
                    slug: this.createSlug(trimmedLine)
                });
            }
            // Pattern 6: Lines with lettered sections
            else if (/^[A-Z]\.\s+[A-Z]/.test(trimmedLine)) {
                headings.push({
                    level: 3,
                    text: trimmedLine,
                    lineNumber,
                    slug: this.createSlug(trimmedLine)
                });
            }
        }
        return headings;
    }
    extractLinks(content, sourcePath) {
        const links = [];
        const lines = content.split('\n');
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
                    linkType: types_1.LinkType.MARKDOWN,
                    linkText: url,
                    context,
                    lineNumber: lineIndex + 1,
                    isBroken: false
                });
            }
        });
        return links;
    }
    extractTags(content) {
        const tags = new Set();
        const tagPattern = /(?:^|(?<=\s))#([a-zA-Z0-9_-]+)/g;
        let match;
        while ((match = tagPattern.exec(content)) !== null) {
            tags.add(match[1]);
        }
        return tags;
    }
    extractMetadata(content) {
        const frontmatter = {};
        const lines = content.split('\n');
        // Look for key-value pairs at the beginning of the file
        let metadataEndLine = 0;
        for (let i = 0; i < Math.min(20, lines.length); i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            // Match patterns like "Key: Value" or "Key = Value"
            const keyValueMatch = line.match(/^([A-Za-z][A-Za-z0-9_\s]*)\s*[:=]\s*(.+)$/);
            if (keyValueMatch) {
                const key = keyValueMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
                const value = keyValueMatch[2].trim();
                frontmatter[key] = value;
                metadataEndLine = i;
            }
            else if (Object.keys(frontmatter).length > 0) {
                // Stop if we had metadata but now don't match
                break;
            }
        }
        return frontmatter;
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
        return ['.txt', '.text'];
    }
}
exports.TXTParser = TXTParser;
//# sourceMappingURL=TXTParser.js.map