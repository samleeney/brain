"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileRegistry = void 0;
const sqlite3 = __importStar(require("sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const uuid_1 = require("uuid");
class FileRegistry {
    db;
    dbPath;
    constructor(configDir) {
        this.dbPath = path.join(configDir, 'brain-registry.db');
        // Ensure config directory exists
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
    }
    async initialize() {
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
    async createTables() {
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
    async addFile(absolutePath, displayName, fileType) {
        const stats = fs.statSync(absolutePath);
        const fileRecord = {
            id: (0, uuid_1.v4)(),
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
    async addChunk(fileId, chunkIndex, chunkContent) {
        const chunkRecord = {
            id: (0, uuid_1.v4)(),
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
    async getFileByPath(absolutePath) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM files WHERE absolute_path = ?';
            this.db.get(sql, [absolutePath], (err, row) => {
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
    async getFileByDisplayName(displayName) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM files WHERE display_name = ?';
            this.db.get(sql, [displayName], (err, row) => {
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
    async getFileById(id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM files WHERE id = ?';
            this.db.get(sql, [id], (err, row) => {
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
    async getChunkByVectorKey(vectorStoreKey) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM chunks WHERE vector_store_key = ?';
            this.db.get(sql, [vectorStoreKey], (err, row) => {
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
    async getChunksByFileId(fileId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM chunks WHERE file_id = ? ORDER BY chunk_index';
            this.db.all(sql, [fileId], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows.map(row => this.rowToChunkRecord(row)));
            });
        });
    }
    async removeFile(fileId) {
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
    async getAllFiles() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM files ORDER BY display_name';
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows.map(row => this.rowToFileRecord(row)));
            });
        });
    }
    async updateFileModified(fileId, lastModified) {
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
    rowToFileRecord(row) {
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
    rowToChunkRecord(row) {
        return {
            id: row.id,
            fileId: row.file_id,
            chunkIndex: row.chunk_index,
            chunkContent: row.chunk_content,
            vectorStoreKey: row.vector_store_key
        };
    }
    async close() {
        return new Promise((resolve) => {
            this.db.close(() => resolve());
        });
    }
}
exports.FileRegistry = FileRegistry;
//# sourceMappingURL=FileRegistry.js.map