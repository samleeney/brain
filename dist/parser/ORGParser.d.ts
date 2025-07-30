/**
 * Org-mode parser for extracting structure from .org files
 */
import { BaseParser } from './BaseParser';
import { Note } from '../models/types';
export declare class ORGParser implements BaseParser {
    parse(filePath: string, content: string | Buffer, notesRoot: string): Promise<Note>;
    private extractTitle;
    private extractHeadings;
    private extractLinks;
    private extractTags;
    private extractMetadata;
    private cleanOrgSyntax;
    private extractContext;
    private createSlug;
    supports(extension: string): boolean;
    getSupportedExtensions(): string[];
}
//# sourceMappingURL=ORGParser.d.ts.map