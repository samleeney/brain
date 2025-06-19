/**
 * Markdown parser for extracting structure and links from notes
 */
import { Note } from '../models/types';
export declare class MarkdownParser {
    private wikiLinkPattern;
    private mdLinkPattern;
    private tagPattern;
    parseFile(filePath: string, notesRoot: string): Promise<Note>;
    private extractHeadings;
    private extractLinks;
    private extractTags;
    private extractContext;
    private createSlug;
}
//# sourceMappingURL=MarkdownParser.d.ts.map