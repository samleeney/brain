/**
 * Plain text parser for extracting structure from text files
 */
import { BaseParser } from './BaseParser';
import { Note } from '../models/types';
export declare class TXTParser implements BaseParser {
    parse(filePath: string, content: string | Buffer, notesRoot: string): Promise<Note>;
    private extractHeadings;
    private extractLinks;
    private extractTags;
    private extractMetadata;
    private createSlug;
    supports(extension: string): boolean;
    getSupportedExtensions(): string[];
}
//# sourceMappingURL=TXTParser.d.ts.map