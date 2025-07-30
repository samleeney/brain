/**
 * Markdown parser for extracting structure and links from notes
 */
import { Note } from '../models/types';
import { BaseParser } from './BaseParser';
export declare class MarkdownParser implements BaseParser {
    private wikiLinkPattern;
    private mdLinkPattern;
    private tagPattern;
    parse(filePath: string, content: string | Buffer, notesRoot: string): Promise<Note>;
    private extractHeadings;
    private extractLinks;
    private extractTags;
    private extractContext;
    private createSlug;
    supports(extension: string): boolean;
    getSupportedExtensions(): string[];
    parseFile(filePath: string, notesRoot: string): Promise<Note>;
}
//# sourceMappingURL=MarkdownParser.d.ts.map