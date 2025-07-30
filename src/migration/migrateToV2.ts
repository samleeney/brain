#!/usr/bin/env node

/**
 * Migration script from Brain v1 to v2
 * Migrates existing vector stores to the new multi-location architecture
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileRegistry } from '../storage/FileRegistry';
import { VectorStore } from '../embedding/VectorStore';
import { EmbeddingService } from '../embedding/EmbeddingService';
import { ParserFactory } from '../parser/ParserFactory';
import { ChunkingService } from '../parser/ChunkingService';

interface OldVectorDocument {
  id: string;
  title: string;
  content: string;
  embedding: number[];
  metadata: {
    notePath: string;
    relativePath: string;
    lastModified: Date;
    wordCount: number;
    chunkType: string;
    headingContext: string[];
    startLine: number;
    endLine: number;
  };
}

async function migrate() {
  console.log('🔄 Brain Migration: v1 → v2');
  console.log('');

  // Load config
  const configDir = path.join(process.env.HOME || '~', '.brain');
  const configPath = path.join(configDir, 'config.json');
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ Brain config not found. Nothing to migrate.');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const vaultPath = config.vaultPath;
  const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;

  if (!vaultPath) {
    console.error('❌ Vault path not configured.');
    process.exit(1);
  }

  // Check for old vector store
  const oldVectorPath = path.join(vaultPath, '.brain-vectors.json');
  if (!fs.existsSync(oldVectorPath)) {
    console.log('✅ No v1 vector store found. Nothing to migrate.');
    return;
  }

  console.log(`📂 Vault: ${vaultPath}`);
  console.log(`📄 Found v1 vector store: ${oldVectorPath}`);
  console.log('');

  // Create backup
  const backupPath = oldVectorPath + '.backup';
  fs.copyFileSync(oldVectorPath, backupPath);
  console.log(`💾 Created backup: ${backupPath}`);

  // Initialize new services
  const fileRegistry = new FileRegistry(configDir);
  await fileRegistry.initialize();
  
  const vectorStore = new VectorStore(configDir, fileRegistry);
  const embeddingService = apiKey ? new EmbeddingService(apiKey) : null;
  const parserFactory = new ParserFactory();
  const chunkingService = new ChunkingService();

  // Load old vector store
  console.log('📖 Reading v1 vector store...');
  const oldData = JSON.parse(fs.readFileSync(oldVectorPath, 'utf-8'));
  
  // Group documents by file
  const fileGroups = new Map<string, OldVectorDocument[]>();
  
  for (const [notePath, documents] of Object.entries(oldData)) {
    if (Array.isArray(documents)) {
      fileGroups.set(notePath, documents as OldVectorDocument[]);
    }
  }

  console.log(`📊 Found ${fileGroups.size} files to migrate`);
  console.log('');

  // Migrate each file
  let migratedFiles = 0;
  let migratedChunks = 0;
  let skippedFiles = 0;

  for (const [notePath, documents] of fileGroups) {
    try {
      // Determine absolute path
      const absolutePath = path.isAbsolute(notePath) 
        ? notePath 
        : path.join(vaultPath, notePath);

      if (!fs.existsSync(absolutePath)) {
        console.log(`  ⚠️  Skipping ${notePath} (file not found)`);
        skippedFiles++;
        continue;
      }

      const stats = fs.statSync(absolutePath);
      const fileType = path.extname(absolutePath).substring(1).toUpperCase() || 'MD';
      
      // Use the original relative path as display name
      const displayName = documents[0]?.metadata.relativePath || notePath;

      // Add file to registry
      const fileRecord = await fileRegistry.addFile(absolutePath, displayName, fileType);
      
      // Recreate vector documents with new structure
      for (let i = 0; i < documents.length; i++) {
        const oldDoc = documents[i];
        
        // Add chunk to registry
        const chunkRecord = await fileRegistry.addChunk(
          fileRecord.id,
          i,
          oldDoc.content
        );

        // Add to vector store (reuse existing embeddings)
        const vectorDoc = {
          vectorKey: chunkRecord.vectorStoreKey,
          fileId: fileRecord.id,
          content: oldDoc.content,
          embedding: oldDoc.embedding,
          metadata: {
            chunkType: oldDoc.metadata.chunkType,
            headingContext: oldDoc.metadata.headingContext,
            startLine: oldDoc.metadata.startLine,
            endLine: oldDoc.metadata.endLine,
            chunkIndex: i
          }
        };

        // Add directly to vector store's internal structure
        (vectorStore as any).documents.set(chunkRecord.vectorStoreKey, vectorDoc);
        migratedChunks++;
      }

      migratedFiles++;
      
      if (migratedFiles % 10 === 0) {
        console.log(`  📝 Migrated ${migratedFiles} files...`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to migrate ${notePath}: ${(error as Error).message}`);
      skippedFiles++;
    }
  }

  // Save new vector store
  await vectorStore.saveToDisk();
  await fileRegistry.close();

  console.log('');
  console.log('✅ Migration completed!');
  console.log(`📈 Migrated: ${migratedFiles} files, ${migratedChunks} chunks`);
  if (skippedFiles > 0) {
    console.log(`⚠️  Skipped: ${skippedFiles} files`);
  }
  console.log('');
  console.log('🎯 Next steps:');
  console.log('1. Test the migration with: brain status');
  console.log('2. Update your MCP configuration to use the v2 server');
  console.log('3. The old vector store backup is at:', backupPath);
  console.log('4. Once verified, you can remove the old .brain-vectors.json file');
}

// Run migration
migrate().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});