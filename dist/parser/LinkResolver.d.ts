/**
 * Link resolution for markdown and wiki-style links
 */
import { Link } from '../models/types';
export declare class LinkResolver {
    private notesRoot;
    private fileIndex;
    constructor(notesRoot: string);
    initialize(): Promise<void>;
    private buildFileIndex;
    resolveLink(link: Link): Promise<Link>;
    private resolveWikiLink;
    private resolveMarkdownLink;
    private fileExists;
    updateIndex(addedFiles?: string[], removedFiles?: string[]): Promise<void>;
}
//# sourceMappingURL=LinkResolver.d.ts.map