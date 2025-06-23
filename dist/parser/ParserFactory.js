"use strict";
/**
 * Factory for selecting appropriate parser based on file type
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
exports.ParserFactory = void 0;
const path = __importStar(require("path"));
const MarkdownParser_1 = require("./MarkdownParser");
const PDFParser_1 = require("./PDFParser");
const TXTParser_1 = require("./TXTParser");
const ORGParser_1 = require("./ORGParser");
class ParserFactory {
    parsers = [];
    constructor() {
        // Register parsers in order of preference
        this.parsers.push(new MarkdownParser_1.MarkdownParser());
        this.parsers.push(new PDFParser_1.PDFParser());
        this.parsers.push(new TXTParser_1.TXTParser());
        this.parsers.push(new ORGParser_1.ORGParser());
    }
    /**
     * Get parser for a specific file
     * @param filePath Path to the file
     * @returns Appropriate parser or null if unsupported
     */
    getParser(filePath) {
        const extension = path.extname(filePath).toLowerCase();
        for (const parser of this.parsers) {
            if (parser.supports(extension)) {
                return parser;
            }
        }
        return null;
    }
    /**
     * Get all supported file extensions
     * @returns Array of supported extensions
     */
    getSupportedExtensions() {
        const extensions = new Set();
        for (const parser of this.parsers) {
            parser.getSupportedExtensions().forEach(ext => extensions.add(ext));
        }
        return Array.from(extensions);
    }
    /**
     * Get glob patterns for all supported file types
     * @returns Array of glob patterns
     */
    getSupportedPatterns() {
        return this.getSupportedExtensions().map(ext => `**/*${ext}`);
    }
}
exports.ParserFactory = ParserFactory;
//# sourceMappingURL=ParserFactory.js.map