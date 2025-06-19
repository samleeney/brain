"use strict";
/**
 * Link resolution for markdown and wiki-style links
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
exports.LinkResolver = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fast_glob_1 = __importDefault(require("fast-glob"));
const types_1 = require("../models/types");
class LinkResolver {
    notesRoot;
    fileIndex = new Map();
    constructor(notesRoot) {
        this.notesRoot = notesRoot;
    }
    async initialize() {
        await this.buildFileIndex();
    }
    async buildFileIndex() {
        // Find all markdown files
        const files = await (0, fast_glob_1.default)('**/*.md', {
            cwd: this.notesRoot,
            absolute: true,
            ignore: ['**/node_modules/**', '**/.*/**']
        });
        this.fileIndex.clear();
        for (const file of files) {
            const stem = path.basename(file, '.md');
            const stemLower = stem.toLowerCase();
            // Add to exact match index
            if (!this.fileIndex.has(stem)) {
                this.fileIndex.set(stem, []);
            }
            this.fileIndex.get(stem).push(file);
            // Add to lowercase index if different
            if (stemLower !== stem) {
                if (!this.fileIndex.has(stemLower)) {
                    this.fileIndex.set(stemLower, []);
                }
                this.fileIndex.get(stemLower).push(file);
            }
        }
    }
    async resolveLink(link) {
        const sourcePath = link.sourcePath;
        let targetPath = null;
        if (link.linkType === types_1.LinkType.WIKI) {
            targetPath = await this.resolveWikiLink(link.linkText, sourcePath);
        }
        else if (link.linkType === types_1.LinkType.MARKDOWN) {
            targetPath = await this.resolveMarkdownLink(link.linkText, sourcePath);
        }
        // Update link with resolved path
        link.targetPath = targetPath;
        link.isBroken = !targetPath || !(await this.fileExists(targetPath));
        return link;
    }
    async resolveWikiLink(linkText, sourcePath) {
        const cleanLinkText = linkText.trim();
        // Strategy 1: Check if link contains path separator (subfolder reference)
        if (cleanLinkText.includes('/')) {
            // Try as relative path from source
            const sourceDir = path.dirname(sourcePath);
            const relativeTarget = path.resolve(sourceDir, `${cleanLinkText}.md`);
            if (await this.fileExists(relativeTarget)) {
                return relativeTarget;
            }
            // Try as absolute path from notes root
            const absoluteTarget = path.resolve(this.notesRoot, `${cleanLinkText}.md`);
            if (await this.fileExists(absoluteTarget)) {
                return absoluteTarget;
            }
        }
        // Strategy 2: Exact match in index
        const exactMatches = this.fileIndex.get(cleanLinkText);
        if (exactMatches && exactMatches.length > 0) {
            // Prefer file in same directory
            const sourceDir = path.dirname(sourcePath);
            const sameDir = exactMatches.find(p => path.dirname(p) === sourceDir);
            if (sameDir) {
                return sameDir;
            }
            // Otherwise return first match
            return exactMatches[0];
        }
        // Strategy 3: Case-insensitive match
        const lowerMatches = this.fileIndex.get(cleanLinkText.toLowerCase());
        if (lowerMatches && lowerMatches.length > 0) {
            const sourceDir = path.dirname(sourcePath);
            const sameDir = lowerMatches.find(p => path.dirname(p) === sourceDir);
            if (sameDir) {
                return sameDir;
            }
            return lowerMatches[0];
        }
        // Strategy 4: Partial match in same directory
        const sourceDir = path.dirname(sourcePath);
        const dirFiles = await (0, fast_glob_1.default)('*.md', { cwd: sourceDir, absolute: true });
        const lowerLinkText = cleanLinkText.toLowerCase();
        for (const file of dirFiles) {
            const stem = path.basename(file, '.md');
            if (stem.toLowerCase().includes(lowerLinkText)) {
                return file;
            }
        }
        // Strategy 5: Partial match globally
        for (const [stem, paths] of this.fileIndex.entries()) {
            if (stem.toLowerCase().includes(lowerLinkText)) {
                return paths[0];
            }
        }
        return null;
    }
    async resolveMarkdownLink(linkText, sourcePath) {
        // Handle anchor links
        if (linkText.startsWith('#')) {
            return sourcePath; // Link to same file
        }
        const sourceDir = path.dirname(sourcePath);
        // Try as-is (might already have .md extension)
        const target = path.resolve(sourceDir, linkText);
        if (await this.fileExists(target) && target.endsWith('.md')) {
            return target;
        }
        // Try adding .md extension
        const targetWithMd = path.resolve(sourceDir, `${linkText}.md`);
        if (await this.fileExists(targetWithMd)) {
            return targetWithMd;
        }
        // Try without .md extension if it was included
        if (linkText.endsWith('.md')) {
            const baseName = linkText.slice(0, -3);
            const targetBase = path.resolve(sourceDir, baseName);
            if (await this.fileExists(targetBase)) {
                return targetBase;
            }
        }
        // Handle relative paths with ../
        try {
            const resolved = path.resolve(sourceDir, linkText);
            // Check if resolved path is within notes root
            const relativePath = path.relative(this.notesRoot, resolved);
            if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
                if (await this.fileExists(resolved)) {
                    return resolved;
                }
                // Try with .md extension
                const resolvedMd = `${resolved}.md`;
                if (await this.fileExists(resolvedMd)) {
                    return resolvedMd;
                }
            }
        }
        catch (error) {
            // Ignore path resolution errors
        }
        return null;
    }
    async fileExists(filePath) {
        try {
            await fs.promises.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    async updateIndex(addedFiles = [], removedFiles = []) {
        // Remove deleted files
        for (const file of removedFiles) {
            const stem = path.basename(file, '.md');
            const stemLower = stem.toLowerCase();
            const exactMatches = this.fileIndex.get(stem);
            if (exactMatches) {
                const filtered = exactMatches.filter(p => p !== file);
                if (filtered.length === 0) {
                    this.fileIndex.delete(stem);
                }
                else {
                    this.fileIndex.set(stem, filtered);
                }
            }
            const lowerMatches = this.fileIndex.get(stemLower);
            if (lowerMatches) {
                const filtered = lowerMatches.filter(p => p !== file);
                if (filtered.length === 0) {
                    this.fileIndex.delete(stemLower);
                }
                else {
                    this.fileIndex.set(stemLower, filtered);
                }
            }
        }
        // Add new files
        for (const file of addedFiles) {
            const stem = path.basename(file, '.md');
            const stemLower = stem.toLowerCase();
            if (!this.fileIndex.has(stem)) {
                this.fileIndex.set(stem, []);
            }
            const exactMatches = this.fileIndex.get(stem);
            if (!exactMatches.includes(file)) {
                exactMatches.push(file);
            }
            if (stemLower !== stem) {
                if (!this.fileIndex.has(stemLower)) {
                    this.fileIndex.set(stemLower, []);
                }
                const lowerMatches = this.fileIndex.get(stemLower);
                if (!lowerMatches.includes(file)) {
                    lowerMatches.push(file);
                }
            }
        }
    }
}
exports.LinkResolver = LinkResolver;
//# sourceMappingURL=LinkResolver.js.map