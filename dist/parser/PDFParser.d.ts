/**
 * PDF parser for extracting text and structure from PDF files
 */
import { BaseParser } from './BaseParser';
import { Note } from '../models/types';
export declare class PDFParser implements BaseParser {
    parse(filePath: string, content: string | Buffer, notesRoot: string): Promise<Note>;
    private extractHeadings;
    private extractLinks;
    private extractTags;
    private createSlug;
    supports(extension: string): boolean;
    getSupportedExtensions(): string[];
}
//# sourceMappingURL=PDFParser.d.ts.map