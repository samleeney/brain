/**
 * Factory for selecting appropriate parser based on file type
 */
import { BaseParser } from './BaseParser';
export declare class ParserFactory {
    private parsers;
    constructor();
    /**
     * Get parser for a specific file
     * @param filePath Path to the file
     * @returns Appropriate parser or null if unsupported
     */
    getParser(filePath: string): BaseParser | null;
    /**
     * Get all supported file extensions
     * @returns Array of supported extensions
     */
    getSupportedExtensions(): string[];
    /**
     * Get glob patterns for all supported file types
     * @returns Array of glob patterns
     */
    getSupportedPatterns(): string[];
}
//# sourceMappingURL=ParserFactory.d.ts.map