/**
 * Base parser interface for all file parsers
 */
import { Note } from '../models/types';
export interface BaseParser {
    /**
     * Parse a file and extract structured content
     * @param filePath Absolute path to the file
     * @param content File content as string or Buffer
     * @param notesRoot Root directory of the notes vault
     * @returns Parsed note structure
     */
    parse(filePath: string, content: string | Buffer, notesRoot: string): Promise<Note>;
    /**
     * Check if this parser supports the given file extension
     * @param extension File extension including dot (e.g., '.md', '.pdf')
     * @returns True if parser can handle this file type
     */
    supports(extension: string): boolean;
    /**
     * Get supported file extensions
     * @returns Array of supported extensions (e.g., ['.md', '.markdown'])
     */
    getSupportedExtensions(): string[];
}
//# sourceMappingURL=BaseParser.d.ts.map