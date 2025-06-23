"use strict";
/**
 * Org-mode parser for extracting structure from .org files
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
exports.ORGParser = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const types_1 = require("../models/types");
class ORGParser {
    async parse(filePath, content, notesRoot) {
        // Extract title from #+TITLE directive or filename
        const title = this.extractTitle(content) || path.basename(filePath, path.extname(filePath));
        // Extract headings
        const headings = this.extractHeadings(content);
        // Extract links
        const outgoingLinks = this.extractLinks(content, filePath);
        // Extract tags
        const tags = this.extractTags(content);
        // Calculate word count (excluding org syntax)
        const cleanContent = this.cleanOrgSyntax(content);
        const wordCount = cleanContent.split(/\s+/).filter(word => word.length > 0).length;
        // Get file modification time
        const stats = await fs.promises.stat(filePath);
        const lastModified = stats.mtime;
        // Calculate relative path
        const relativePath = path.relative(notesRoot, filePath);
        // Extract metadata from org directives
        const frontmatter = this.extractMetadata(content);
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
    extractTitle(content) {
        const titleMatch = content.match(/^#\+TITLE:\s*(.+)$/im);
        return titleMatch ? titleMatch[1].trim() : null;
    }
    extractHeadings(content) {
        const headings = [];
        const lines = content.split('\n');
        let lineNumber = 0;
        for (const line of lines) {
            lineNumber++;
            // Match org headings: *, **, ***, etc.
            const headingMatch = line.match(/^(\*+)\s+(.+)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                let text = headingMatch[2].trim();
                // Remove org-specific syntax from heading text
                // Remove TODO/DONE keywords
                text = text.replace(/^(TODO|DONE|NEXT|WAITING|SOMEDAY)\s+/, '');
                // Remove priority indicators [#A], [#B], [#C]
                text = text.replace(/\[#[ABC]\]\s*/, '');
                // Remove trailing tags :tag1:tag2:
                text = text.replace(/\s+:[\w:]+:$/, '').trim();
                headings.push({
                    level: Math.min(level, 6),
                    text,
                    lineNumber,
                    slug: this.createSlug(text)
                });
            }
        }
        return headings;
    }
    extractLinks(content, sourcePath) {
        const links = [];
        const lines = content.split('\n');
        lines.forEach((line, lineIndex) => {
            // Pattern 1: [[link][description]] or [[link]]
            const orgLinkPattern = /\[\[([^\]]+)\](?:\[([^\]]+)\])?\]/g;
            let match;
            while ((match = orgLinkPattern.exec(line)) !== null) {
                const target = match[1];
                const description = match[2] || target;
                // Skip external URLs for now
                if (!target.startsWith('http://') && !target.startsWith('https://') &&
                    !target.startsWith('file://') && !target.startsWith('mailto:')) {
                    links.push({
                        sourcePath,
                        targetPath: null,
                        linkType: types_1.LinkType.WIKI,
                        linkText: target,
                        context: this.extractContext(line, match.index, match.index + match[0].length),
                        lineNumber: lineIndex + 1,
                        isBroken: false
                    });
                }
            }
            // Pattern 2: Plain URLs
            const urlPattern = /https?:\/\/[^\s<>"\{\}\|\^\[\]`]+/g;
            while ((match = urlPattern.exec(line)) !== null) {
                let url = match[0];
                // Remove trailing punctuation
                url = url.replace(/[.,;!?]+$/, '');
                links.push({
                    sourcePath,
                    targetPath: null,
                    linkType: types_1.LinkType.MARKDOWN,
                    linkText: url,
                    context: this.extractContext(line, match.index, match.index + url.length),
                    lineNumber: lineIndex + 1,
                    isBroken: false
                });
            }
        });
        return links;
    }
    extractTags(content) {
        const tags = new Set();
        // Pattern 1: Heading tags :tag1:tag2:
        const headingTagPattern = /^\*+\s+.*?:([\w:]+):$/gm;
        let match;
        while ((match = headingTagPattern.exec(content)) !== null) {
            const tagString = match[1];
            const headingTags = tagString.split(':').filter(tag => tag.length > 0);
            headingTags.forEach(tag => tags.add(tag));
        }
        // Pattern 2: File-level tags #+TAGS: tag1 tag2 tag3
        const fileTagPattern = /^#\+TAGS:\s*(.+)$/im;
        const fileTagMatch = content.match(fileTagPattern);
        if (fileTagMatch) {
            const fileTags = fileTagMatch[1].split(/\s+/).filter(tag => tag.length > 0);
            fileTags.forEach(tag => tags.add(tag));
        }
        // Pattern 3: Hashtags in text #tag
        const hashtagPattern = /(?:^|(?<=\s))#([a-zA-Z0-9_-]+)/g;
        while ((match = hashtagPattern.exec(content)) !== null) {
            tags.add(match[1]);
        }
        return tags;
    }
    extractMetadata(content) {
        const frontmatter = {};
        // Extract org directives
        const directivePattern = /^#\+(\w+):\s*(.+)$/gm;
        let match;
        while ((match = directivePattern.exec(content)) !== null) {
            const key = match[1].toLowerCase();
            const value = match[2].trim();
            // Handle special cases
            switch (key) {
                case 'tags':
                    frontmatter.tags = value.split(/\s+/);
                    break;
                case 'date':
                case 'created':
                case 'modified':
                    // Try to parse as date
                    try {
                        frontmatter[key] = new Date(value);
                    }
                    catch {
                        frontmatter[key] = value;
                    }
                    break;
                default:
                    frontmatter[key] = value;
            }
        }
        return frontmatter;
    }
    cleanOrgSyntax(content) {
        let cleaned = content;
        // Remove org directives
        cleaned = cleaned.replace(/^#\+\w+:.*$/gm, '');
        // Remove drawer content (:PROPERTIES: ... :END:)
        cleaned = cleaned.replace(/:PROPERTIES:\s*\n(?:.*\n)*?:END:\s*\n/g, '');
        // Convert org links to plain text
        cleaned = cleaned.replace(/\[\[([^\]]+)\](?:\[([^\]]+)\])?\]/g, (match, target, description) => {
            return description || target;
        });
        // Remove org markup
        cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1'); // *bold*
        cleaned = cleaned.replace(/\/([^/]+)\//g, '$1'); // /italic/
        cleaned = cleaned.replace(/_([^_]+)_/g, '$1'); // _underline_
        cleaned = cleaned.replace(/=([^=]+)=/g, '$1'); // =code=
        cleaned = cleaned.replace(/~([^~]+)~/g, '$1'); // ~verbatim~
        // Remove heading stars
        cleaned = cleaned.replace(/^\*+\s+/gm, '');
        return cleaned;
    }
    extractContext(line, matchStart, matchEnd, contextChars = 50) {
        const start = Math.max(0, matchStart - contextChars);
        const end = Math.min(line.length, matchEnd + contextChars);
        let context = line.slice(start, end);
        context = context.replace(/\s+/g, ' ').trim();
        if (start > 0)
            context = '...' + context;
        if (end < line.length)
            context = context + '...';
        return context;
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
        return ['.org'];
    }
}
exports.ORGParser = ORGParser;
//# sourceMappingURL=ORGParser.js.map