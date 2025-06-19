"use strict";
/**
 * Markdown parser for extracting structure and links from notes
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
exports.MarkdownParser = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const types_1 = require("../models/types");
class MarkdownParser {
    wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
    mdLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    tagPattern = /(?:^|(?<=\s))#([a-zA-Z0-9_-]+)/g;
    async parseFile(filePath, notesRoot) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        // Parse frontmatter
        const { data: frontmatter, content: mainContent } = (0, gray_matter_1.default)(content);
        // Extract headings
        const headings = this.extractHeadings(mainContent);
        // Extract title (first heading or filename)
        const title = headings.length > 0 ? headings[0].text : path.basename(filePath, '.md');
        // Extract links
        const outgoingLinks = this.extractLinks(mainContent, filePath);
        // Extract tags
        const tags = this.extractTags(mainContent);
        // Calculate word count
        const wordCount = mainContent.split(/\s+/).length;
        // Get file modification time
        const stats = await fs.promises.stat(filePath);
        const lastModified = stats.mtime;
        // Calculate relative path
        const relativePath = path.relative(notesRoot, filePath);
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
        lines.forEach((line, index) => {
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                const level = match[1].length;
                const text = match[2].trim();
                const slug = this.createSlug(text);
                headings.push({
                    level,
                    text,
                    lineNumber: index + 1,
                    slug
                });
            }
        });
        return headings;
    }
    extractLinks(content, sourcePath) {
        const links = [];
        const lines = content.split('\n');
        lines.forEach((line, lineIndex) => {
            // Extract wiki-style links
            let match;
            const wikiRegex = new RegExp(this.wikiLinkPattern);
            while ((match = wikiRegex.exec(line)) !== null) {
                const linkText = match[1];
                // Handle alias syntax [[target|display]]
                const [target] = linkText.includes('|') ? linkText.split('|', 2) : [linkText, linkText];
                const context = this.extractContext(content, match.index, match.index + match[0].length);
                links.push({
                    sourcePath,
                    targetPath: null, // Will be resolved later
                    linkType: types_1.LinkType.WIKI,
                    linkText: target.trim(),
                    context,
                    lineNumber: lineIndex + 1,
                    isBroken: false
                });
            }
            // Extract markdown links
            const mdRegex = new RegExp(this.mdLinkPattern);
            while ((match = mdRegex.exec(line)) !== null) {
                const display = match[1];
                const target = match[2];
                // Skip external URLs
                if (target.startsWith('http://') || target.startsWith('https://') ||
                    target.startsWith('ftp://') || target.startsWith('mailto:')) {
                    continue;
                }
                const context = this.extractContext(content, match.index, match.index + match[0].length);
                links.push({
                    sourcePath,
                    targetPath: null, // Will be resolved later
                    linkType: types_1.LinkType.MARKDOWN,
                    linkText: target,
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
        let match;
        const regex = new RegExp(this.tagPattern);
        while ((match = regex.exec(content)) !== null) {
            tags.add(match[1]);
        }
        return tags;
    }
    extractContext(content, matchStart, matchEnd, contextChars = 100) {
        // Find context boundaries
        const start = Math.max(0, matchStart - contextChars);
        const end = Math.min(content.length, matchEnd + contextChars);
        let context = content.slice(start, end);
        // Normalize whitespace
        context = context.replace(/\s+/g, ' ').trim();
        // Add ellipsis if truncated
        if (start > 0) {
            context = '...' + context;
        }
        if (end < content.length) {
            context = context + '...';
        }
        return context;
    }
    createSlug(text) {
        // Remove special characters and convert to lowercase
        let slug = text.toLowerCase().replace(/[^\w\s-]/g, '');
        // Replace spaces with hyphens
        slug = slug.replace(/[-\s]+/g, '-');
        return slug.replace(/^-+|-+$/g, ''); // Trim hyphens
    }
}
exports.MarkdownParser = MarkdownParser;
//# sourceMappingURL=MarkdownParser.js.map