import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

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

export class FileRegistry {
  private db!: sqlite3.Database;
  private dbPath: string;

  constructor(configDir: string) {
    this.dbPath = path.join(configDir, 'brain-registry.db');
    
    // Ensure config directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Create tables if they don't exist
        this.createTables()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  private async createTables(): Promise<void> {
    const fileTableSql = `
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        absolute_path TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_modified DATETIME NOT NULL,
        file_size INTEGER NOT NULL,
        content_hash TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_files_display_name ON files(display_name);
      CREATE INDEX IF NOT EXISTS idx_files_absolute_path ON files(absolute_path);
    `;

    const chunkTableSql = `
      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_content TEXT NOT NULL,
        vector_store_key TEXT NOT NULL UNIQUE,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_vector_store_key ON chunks(vector_store_key);
    `;

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(fileTableSql, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          this.db.run(chunkTableSql, (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        });
      });
    });
  }

  async addFile(absolutePath: string, displayName: string, fileType: string): Promise<FileRecord> {
    const stats = fs.statSync(absolutePath);
    const fileRecord: FileRecord = {
      id: uuidv4(),
      absolutePath,
      displayName,
      fileType,
      dateAdded: new Date(),
      lastModified: stats.mtime,
      fileSize: stats.size
    };

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO files (id, absolute_path, display_name, file_type, last_modified, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        fileRecord.id,
        fileRecord.absolutePath,
        fileRecord.displayName,
        fileRecord.fileType,
        fileRecord.lastModified.toISOString(),
        fileRecord.fileSize
      ], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(fileRecord);
      });
    });
  }

  async addChunk(fileId: string, chunkIndex: number, chunkContent: string): Promise<ChunkRecord> {
    const chunkRecord: ChunkRecord = {
      id: uuidv4(),
      fileId,
      chunkIndex,
      chunkContent,
      vectorStoreKey: `${fileId}#chunk-${chunkIndex}`
    };

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO chunks (id, file_id, chunk_index, chunk_content, vector_store_key)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        chunkRecord.id,
        chunkRecord.fileId,
        chunkRecord.chunkIndex,
        chunkRecord.chunkContent,
        chunkRecord.vectorStoreKey
      ], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(chunkRecord);
      });
    });
  }

  async getFileByPath(absolutePath: string): Promise<FileRecord | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM files WHERE absolute_path = ?';
      
      this.db.get(sql, [absolutePath], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        resolve(this.rowToFileRecord(row));
      });
    });
  }

  async getFileByDisplayName(displayName: string): Promise<FileRecord | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM files WHERE display_name = ?';
      
      this.db.get(sql, [displayName], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        resolve(this.rowToFileRecord(row));
      });
    });
  }

  async getFileById(id: string): Promise<FileRecord | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM files WHERE id = ?';
      
      this.db.get(sql, [id], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        resolve(this.rowToFileRecord(row));
      });
    });
  }

  async getChunkByVectorKey(vectorStoreKey: string): Promise<ChunkRecord | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM chunks WHERE vector_store_key = ?';
      
      this.db.get(sql, [vectorStoreKey], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        resolve(this.rowToChunkRecord(row));
      });
    });
  }

  async getChunksByFileId(fileId: string): Promise<ChunkRecord[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM chunks WHERE file_id = ? ORDER BY chunk_index';
      
      this.db.all(sql, [fileId], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(rows.map(row => this.rowToChunkRecord(row)));
      });
    });
  }

  async removeFile(fileId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM files WHERE id = ?';
      
      this.db.run(sql, [fileId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async getAllFiles(): Promise<FileRecord[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM files ORDER BY display_name';
      
      this.db.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(rows.map(row => this.rowToFileRecord(row)));
      });
    });
  }

  async updateFileModified(fileId: string, lastModified: Date): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE files SET last_modified = ? WHERE id = ?';
      
      this.db.run(sql, [lastModified.toISOString(), fileId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  private rowToFileRecord(row: any): FileRecord {
    return {
      id: row.id,
      absolutePath: row.absolute_path,
      displayName: row.display_name,
      fileType: row.file_type,
      dateAdded: new Date(row.date_added),
      lastModified: new Date(row.last_modified),
      fileSize: row.file_size,
      contentHash: row.content_hash
    };
  }

  private rowToChunkRecord(row: any): ChunkRecord {
    return {
      id: row.id,
      fileId: row.file_id,
      chunkIndex: row.chunk_index,
      chunkContent: row.chunk_content,
      vectorStoreKey: row.vector_store_key
    };
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close(() => resolve());
    });
  }
}