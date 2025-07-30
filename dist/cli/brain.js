#!/usr/bin/env node
"use strict";
/**
 * Brain CLI V2 - Multi-location file support
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const FileRegistry_1 = require("../storage/FileRegistry");
const VectorStore_1 = require("../embedding/VectorStore");
const EmbeddingService_1 = require("../embedding/EmbeddingService");
const ParserFactory_1 = require("../parser/ParserFactory");
const ChunkingService_1 = require("../parser/ChunkingService");
const fast_glob_1 = __importDefault(require("fast-glob"));
const program = new commander_1.Command();
async function loadConfig() {
    const configPath = path.join(process.env.HOME || '~', '.brain', 'config.json');
    if (!fs.existsSync(configPath)) {
        // Create minimal config if it doesn't exist
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    catch {
        return {};
    }
}
async function ensureConfigDir() {
    const configDir = path.join(process.env.HOME || '~', '.brain');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    return configDir;
}
/**
 * Add files command with multi-location support
 */
async function addFiles(targetPath, options) {
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
    const fileRegistry = new FileRegistry_1.FileRegistry(configDir);
    await fileRegistry.initialize();
    const vectorStore = new VectorStore_1.VectorStore(configDir, fileRegistry);
    const embeddingService = new EmbeddingService_1.EmbeddingService(apiKey);
    const parserFactory = new ParserFactory_1.ParserFactory();
    let supportedExtensions = parserFactory.getSupportedExtensions();
    // Filter by types if specified
    if (options.types) {
        const requestedTypes = options.types.split(',').map(t => t.trim().startsWith('.') ? t : '.' + t);
        supportedExtensions = supportedExtensions.filter(ext => requestedTypes.includes(ext));
        console.log(`🔍 File types: ${supportedExtensions.join(', ')}`);
    }
    // Find files
    let files;
    if (fs.statSync(absolutePath).isDirectory()) {
        const patterns = supportedExtensions.map(ext => `**/*${ext}`);
        files = await (0, fast_glob_1.default)(patterns, {
            cwd: absolutePath,
            absolute: true,
            ignore: ['**/node_modules/**', '**/.*/**']
        });
    }
    else {
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
            }
            else {
                fileRecord = await fileRegistry.addFile(filePath, displayName, fileType);
            }
            // Create chunks using the chunking service
            // For PDFs, we need to re-extract the text since we can't pass binary data
            let textContent;
            if (filePath.endsWith('.pdf')) {
                // Re-extract text from PDF using pdftotext
                const { execSync } = require('child_process');
                textContent = execSync(`pdftotext -layout "${filePath}" -`, {
                    encoding: 'utf-8',
                    maxBuffer: 50 * 1024 * 1024
                });
            }
            else {
                textContent = content;
            }
            const chunks = ChunkingService_1.ChunkingService.createChunks(textContent, parseResult.title, parseResult.headings, filePath);
            // Add chunks to vector store
            await vectorStore.addFileChunks(fileRecord, chunks, embeddingService);
            processed++;
            added++;
            if (processed % 5 === 0) {
                console.log(`  📝 Processed ${processed} files...`);
            }
        }
        catch (error) {
            console.error(`❌ Failed to add ${path.basename(filePath)}: ${error.message}`);
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
async function removeFiles(targetPath) {
    const configDir = await ensureConfigDir();
    // Initialize services
    const fileRegistry = new FileRegistry_1.FileRegistry(configDir);
    await fileRegistry.initialize();
    const vectorStore = new VectorStore_1.VectorStore(configDir, fileRegistry);
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
    const fileRegistry = new FileRegistry_1.FileRegistry(configDir);
    await fileRegistry.initialize();
    const vectorStore = new VectorStore_1.VectorStore(configDir, fileRegistry);
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
        }, {});
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
    }
    catch (error) {
        console.error('❌ Failed to clear:', error.message);
        process.exit(1);
    }
}
// Set up CLI commands
program
    .name('brain')
    .description('Brain MCP - Semantic knowledge base for your files')
    .version('2.0.0');
program
    .command('setup')
    .description('Interactive setup for Brain MCP configuration')
    .action(async () => {
    try {
        const setupPath = path.join(__dirname, '..', 'setup.js');
        const { setupBrain } = require(setupPath);
        await setupBrain();
    }
    catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
});
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
//# sourceMappingURL=brain.js.map