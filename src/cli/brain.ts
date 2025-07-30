#!/usr/bin/env node

/**
 * Brain CLI V2 - Multi-location file support
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { FileRegistry } from '../storage/FileRegistry';
import { VectorStore } from '../embedding/VectorStore';
import { EmbeddingService } from '../embedding/EmbeddingService';
import { ParserFactory } from '../parser/ParserFactory';
import { ChunkingService } from '../parser/ChunkingService';
import glob from 'fast-glob';

const program = new Command();

interface BrainConfig {
  openaiApiKey?: string;
}

async function loadConfig(): Promise<BrainConfig> {
  const configPath = path.join(process.env.HOME || '~', '.brain', 'config.json');
  
  if (!fs.existsSync(configPath)) {
    // Create minimal config if it doesn't exist
    return {};
  }
  
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

async function ensureConfigDir(): Promise<string> {
  const configDir = path.join(process.env.HOME || '~', '.brain');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return configDir;
}

/**
 * Add files command with multi-location support
 */
async function addFiles(targetPath: string, options: { types?: string }) {
  const config = await loadConfig();
  const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OpenAI API key not found. Set OPENAI_API_KEY environment variable or add to ~/.brain/config.json');
    process.exit(1);
  }

  const configDir = await ensureConfigDir();

  // Resolve absolute path
  const absolutePath = path.resolve(targetPath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Path not found: ${absolutePath}`);
    process.exit(1);
  }

  console.log('🧠 Brain Add Files');
  console.log(`📂 Target: ${absolutePath}`);
  console.log('');

  // Initialize services
  const fileRegistry = new FileRegistry(configDir);
  await fileRegistry.initialize();
  
  const vectorStore = new VectorStore(configDir, fileRegistry);
  const embeddingService = new EmbeddingService(apiKey);
  const parserFactory = new ParserFactory();

  let supportedExtensions = parserFactory.getSupportedExtensions();
  
  // Filter by types if specified
  if (options.types) {
    const requestedTypes = options.types.split(',').map(t => t.trim().startsWith('.') ? t : '.' + t);
    supportedExtensions = supportedExtensions.filter(ext => requestedTypes.includes(ext));
    console.log(`🔍 File types: ${supportedExtensions.join(', ')}`);
  }

  // Find files
  let files: string[];
  if (fs.statSync(absolutePath).isDirectory()) {
    const patterns = supportedExtensions.map(ext => `**/*${ext}`);
    files = await glob(patterns, {
      cwd: absolutePath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/.*/**']
    });
  } else {
    // Single file
    const ext = path.extname(absolutePath).toLowerCase();
    if (!supportedExtensions.includes(ext)) {
      console.error(`❌ Unsupported file type: ${ext}`);
      console.log(`Supported types: ${supportedExtensions.join(', ')}`);
      process.exit(1);
    }
    files = [absolutePath];
  }

  if (files.length === 0) {
    console.log('❌ No supported files found.');
    return;
  }

  console.log(`📁 Found ${files.length} file(s) to add:`);
  files.slice(0, 10).forEach(file => {
    console.log(`  📄 ${path.relative(process.cwd(), file)}`);
  });
  if (files.length > 10) {
    console.log(`  ... and ${files.length - 10} more`);
  }
  console.log('');

  // Process files
  console.log('📊 Processing files...');
  let processed = 0;
  let added = 0;

  for (const filePath of files) {
    try {
      // Check if file already exists
      const existingFile = await fileRegistry.getFileByPath(filePath);
      const stats = fs.statSync(filePath);
      
      if (existingFile && existingFile.lastModified >= stats.mtime) {
        console.log(`  ⏭️  Skipping ${path.basename(filePath)} (not modified)`);
        continue;
      }

      // Parse file
      const parser = parserFactory.getParser(filePath);
      if (!parser) {
        console.log(`  ⚠️  No parser for ${path.basename(filePath)}`);
        continue;
      }
      
      const content = filePath.endsWith('.pdf') 
        ? fs.readFileSync(filePath) 
        : fs.readFileSync(filePath, 'utf-8');
      const parseResult = await parser.parse(filePath, content, configDir);
      
      if (!parseResult) {
        console.log(`  ⚠️  Skipping ${path.basename(filePath)} (no content)`);
        continue;
      }

      // Create display name (relative to current directory or absolute path)
      const displayName = path.relative(process.cwd(), filePath) || path.basename(filePath);
      const fileType = path.extname(filePath).substring(1).toUpperCase();

      // Add or update file in registry
      let fileRecord;
      if (existingFile) {
        await fileRegistry.updateFileModified(existingFile.id, stats.mtime);
        fileRecord = existingFile;
        fileRecord.lastModified = stats.mtime;
      } else {
        fileRecord = await fileRegistry.addFile(filePath, displayName, fileType);
      }

      // Create chunks using the chunking service
      // For PDFs, we need to re-extract the text since we can't pass binary data
      let textContent: string;
      if (filePath.endsWith('.pdf')) {
        // Re-extract text from PDF using pdftotext
        const { execSync } = require('child_process');
        textContent = execSync(`pdftotext -layout "${filePath}" -`, {
          encoding: 'utf-8',
          maxBuffer: 50 * 1024 * 1024
        });
      } else {
        textContent = content as string;
      }
      
      const chunks = ChunkingService.createChunks(
        textContent,
        parseResult.title,
        parseResult.headings,
        filePath
      );

      // Add chunks to vector store
      await vectorStore.addFileChunks(fileRecord, chunks, embeddingService);
      
      processed++;
      added++;
      
      if (processed % 5 === 0) {
        console.log(`  📝 Processed ${processed} files...`);
      }
    } catch (error) {
      console.error(`❌ Failed to add ${path.basename(filePath)}: ${(error as Error).message}`);
    }
  }

  // Save vector store
  await vectorStore.saveToDisk();
  
  console.log('');
  console.log('✅ Files added successfully!');
  console.log(`📈 Added: ${added} files`);
  
  const stats = await vectorStore.getStats();
  console.log(`📊 Total: ${stats.totalFiles} files, ${stats.totalDocuments} chunks`);
  
  await fileRegistry.close();
}

/**
 * Remove files command
 */
async function removeFiles(targetPath: string) {
  const configDir = await ensureConfigDir();

  // Initialize services
  const fileRegistry = new FileRegistry(configDir);
  await fileRegistry.initialize();
  
  const vectorStore = new VectorStore(configDir, fileRegistry);

  console.log('🧠 Brain Remove Files');
  console.log(`📂 Target: ${targetPath}`);
  console.log('');

  // Try to find file by display name or path
  let fileRecord = await fileRegistry.getFileByDisplayName(targetPath);
  
  if (!fileRecord) {
    const absolutePath = path.resolve(targetPath);
    fileRecord = await fileRegistry.getFileByPath(absolutePath);
  }

  if (!fileRecord) {
    console.error(`❌ File not found: ${targetPath}`);
    process.exit(1);
  }

  console.log(`🗑️  Removing: ${fileRecord.displayName}`);
  
  // Remove from vector store and registry
  await vectorStore.removeFile(fileRecord.id);
  await vectorStore.saveToDisk();
  
  console.log('✅ File removed successfully!');
  
  const stats = await vectorStore.getStats();
  console.log(`📊 Remaining: ${stats.totalFiles} files, ${stats.totalDocuments} chunks`);
  
  await fileRegistry.close();
}

/**
 * Status command
 */
async function showStatus() {
  const configDir = await ensureConfigDir();
  const config = await loadConfig();
  const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;

  // Initialize services
  const fileRegistry = new FileRegistry(configDir);
  await fileRegistry.initialize();
  
  const vectorStore = new VectorStore(configDir, fileRegistry);
  const stats = await vectorStore.getStats();
  const files = await fileRegistry.getAllFiles();

  console.log('🧠 Brain Status');
  console.log('');
  console.log(`📂 Config: ${configDir}`);
  console.log(`✅ Database: ${files.length > 0 ? 'Connected' : 'Empty'}`);
  console.log(`🔑 OpenAI API: ${apiKey ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📊 Vector Store: ${stats.totalFiles} files, ${stats.totalDocuments} chunks`);
  
  if (files.length > 0) {
    console.log('');
    console.log('📁 File Types:');
    const typeCount = files.reduce((acc, file) => {
      acc[file.fileType] = (acc[file.fileType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count}`);
    });
  }
  
  await fileRegistry.close();
}

/**
 * Clear command
 */
async function clearAll() {
  const configDir = await ensureConfigDir();

  console.log('🧠 Brain Clear');
  console.log('⚠️  This will remove all indexed files and rebuild the vector store.');
  console.log('');

  // Remove database and vector files
  const dbPath = path.join(configDir, 'brain-registry.db');
  const vectorPath = path.join(configDir, '.brain-vectors-v2.json');
  
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('✅ Removed file registry');
    }
    
    if (fs.existsSync(vectorPath)) {
      fs.unlinkSync(vectorPath);
      console.log('✅ Removed vector store');
    }
    
    console.log('');
    console.log('🎉 Brain cleared successfully!');
    console.log('Run "brain add <path>" to start adding files.');
  } catch (error) {
    console.error('❌ Failed to clear:', (error as Error).message);
    process.exit(1);
  }
}

// Set up CLI commands
program
  .name('brain')
  .description('Brain MCP - Semantic knowledge base for your files')
  .version('2.0.0');

program
  .command('add <path>')
  .description('Add files to the Brain knowledge base')
  .option('-t, --types <types>', 'Comma-separated list of file types to include (e.g., pdf,txt,org)')
  .action(addFiles);

program
  .command('remove <path>')
  .description('Remove files from the Brain knowledge base')
  .action(removeFiles);

program
  .command('status')
  .description('Show Brain configuration and status')
  .action(showStatus);

program
  .command('clear')
  .description('Clear and rebuild all vector embeddings')
  .action(clearAll);

// Parse command line
program.parse(process.argv);