export interface FileRecord {
    id: string;
    absolutePath: string;
    displayName: string;
    fileType: string;
    dateAdded: Date;
    lastModified: Date;
    fileSize: number;
    contentHash?: string;
}
export interface ChunkRecord {
    id: string;
    fileId: string;
    chunkIndex: number;
    chunkContent: string;
    vectorStoreKey: string;
    embedding?: number[];
}
export declare class FileRegistry {
    private db;
    private dbPath;
    constructor(configDir: string);
    initialize(): Promise<void>;
    private createTables;
    addFile(absolutePath: string, displayName: string, fileType: string): Promise<FileRecord>;
    addChunk(fileId: string, chunkIndex: number, chunkContent: string): Promise<ChunkRecord>;
    getFileByPath(absolutePath: string): Promise<FileRecord | null>;
    getFileByDisplayName(displayName: string): Promise<FileRecord | null>;
    getFileById(id: string): Promise<FileRecord | null>;
    getChunkByVectorKey(vectorStoreKey: string): Promise<ChunkRecord | null>;
    getChunksByFileId(fileId: string): Promise<ChunkRecord[]>;
    removeFile(fileId: string): Promise<void>;
    getAllFiles(): Promise<FileRecord[]>;
    updateFileModified(fileId: string, lastModified: Date): Promise<void>;
    private rowToFileRecord;
    private rowToChunkRecord;
    close(): Promise<void>;
}
//# sourceMappingURL=FileRegistry.d.ts.map