#!/usr/bin/env node
"use strict";
/**
 * Brain CLI - Main command interface for Brain MCP
 * Usage: brain <command> [options]
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
const GraphBuilder_1 = require("../graph/GraphBuilder");
const CacheManager_1 = require("../cache/CacheManager");
const VectorStore_1 = require("../embedding/VectorStore");
const EmbeddingService_1 = require("../embedding/EmbeddingService");
const ParserFactory_1 = require("../parser/ParserFactory");
const fast_glob_1 = __importDefault(require("fast-glob"));
const program = new commander_1.Command();
async function loadConfig() {
    const configPath = path.join(process.env.HOME || '~', '.brain', 'config.json');
    if (!fs.existsSync(configPath)) {
        console.error('❌ Brain config not found. Run brain setup first.');
        process.exit(1);
    }
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return {
            vaultPath: config.vaultPath,
            openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY
        };
    }
    catch (error) {
        console.error('❌ Failed to load Brain config:', error);
        process.exit(1);
    }
}
async function updateVectors(clear = false) {
    try {
        const config = await loadConfig();
        if (!config.openaiApiKey) {
            console.error('❌ OpenAI API key not found. Set OPENAI_API_KEY environment variable or run brain setup.');
            process.exit(1);
        }
        console.log('🧠 Brain Vector Store Update');
        console.log(`📂 Vault: ${config.vaultPath}`);
        console.log('');
        // Initialize services
        const cacheManager = new CacheManager_1.CacheManager(config.vaultPath);
        const vectorStore = new VectorStore_1.VectorStore(config.vaultPath);
        const embeddingService = new EmbeddingService_1.EmbeddingService(config.openaiApiKey);
        if (clear) {
            console.log('🗑️  Clearing existing vectors...');
            vectorStore.clear();
            await vectorStore.saveToDisk();
        }
        // Build graph
        console.log('📊 Building knowledge graph...');
        const graphBuilder = new GraphBuilder_1.GraphBuilder(config.vaultPath);
        const graph = await graphBuilder.buildGraph();
        console.log(`✅ Found ${graph.nodes.size} notes`);
        // Update vector embeddings
        console.log('🔄 Updating vector embeddings...');
        let updated = 0;
        let skipped = 0;
        for (const [notePath, node] of graph.nodes.entries()) {
            try {
                // Check if note needs re-embedding
                if (node.note.lastModified && vectorStore.needsReembedding(notePath, node.note.lastModified)) {
                    if (node.note.chunks && node.note.chunks.length > 0) {
                        await vectorStore.addNoteChunks(notePath, node.note.title, node.note.chunks, node.note.relativePath, node.note.lastModified, node.note.wordCount, embeddingService);
                        updated++;
                        if (updated % 5 === 0) {
                            console.log(`  📝 Updated ${updated} notes...`);
                        }
                    }
                }
                else {
                    skipped++;
                }
            }
            catch (error) {
                console.error(`❌ Failed to update ${node.note.relativePath}: ${error.message}`);
            }
        }
        // Save vector store
        await vectorStore.saveToDisk();
        console.log('');
        console.log('✅ Vector store update complete!');
        console.log(`📈 Updated: ${updated} notes`);
        console.log(`⏭️  Skipped: ${skipped} notes (already up to date)`);
        const stats = vectorStore.getStats();
        console.log(`📊 Total: ${stats.totalNotes} notes, ${stats.totalChunks} chunks`);
    }
    catch (error) {
        console.error('❌ Update failed:', error.message);
        process.exit(1);
    }
}
async function showStatus() {
    try {
        const config = await loadConfig();
        console.log('🧠 Brain Status');
        console.log('');
        // Check vault
        console.log(`📂 Vault: ${config.vaultPath}`);
        console.log(`✅ Config: ${fs.existsSync(config.vaultPath) ? 'Valid' : '❌ Directory not found'}`);
        // Check API key
        console.log(`🔑 OpenAI API: ${config.openaiApiKey ? '✅ Configured' : '❌ Missing'}`);
        // Check vector store
        const vectorStore = new VectorStore_1.VectorStore(config.vaultPath);
        const stats = vectorStore.getStats();
        if (stats.totalNotes > 0) {
            console.log(`📊 Vector Store: ${stats.totalNotes} notes, ${stats.totalChunks} chunks`);
        }
        else {
            console.log('📊 Vector Store: ❌ Empty - run brain update');
        }
        // Check graph cache
        const cacheManager = new CacheManager_1.CacheManager(config.vaultPath);
        const cacheStats = await cacheManager.getCacheStats();
        if (cacheStats) {
            console.log(`💾 Cache: ${cacheStats.notesCount} notes (${cacheStats.sizeMb.toFixed(1)}MB)`);
        }
        else {
            console.log('💾 Cache: ❌ Empty');
        }
    }
    catch (error) {
        console.error('❌ Status check failed:', error.message);
        process.exit(1);
    }
}
async function addFiles(targetPath, options) {
    try {
        const config = await loadConfig();
        if (!config.openaiApiKey) {
            console.error('❌ OpenAI API key not found. Set OPENAI_API_KEY environment variable or run brain setup.');
            process.exit(1);
        }
        // Resolve absolute path
        const absolutePath = path.resolve(targetPath);
        if (!fs.existsSync(absolutePath)) {
            console.error(`❌ Path not found: ${absolutePath}`);
            process.exit(1);
        }
        console.log('🧠 Brain Add Files');
        console.log(`📂 Target: ${absolutePath}`);
        console.log('');
        // Initialize parser factory
        const parserFactory = new ParserFactory_1.ParserFactory();
        let supportedExtensions = parserFactory.getSupportedExtensions();
        // Filter by types if specified
        if (options.types && options.types.length > 0) {
            const requestedTypes = options.types.map(t => t.startsWith('.') ? t : '.' + t);
            supportedExtensions = supportedExtensions.filter(ext => requestedTypes.includes(ext));
            console.log(`🔍 File types: ${supportedExtensions.join(', ')}`);
        }
        // Create glob patterns
        const patterns = supportedExtensions.map(ext => `**/*${ext}`);
        // Find files
        let files;
        if (fs.statSync(absolutePath).isDirectory()) {
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
        // Initialize services
        const cacheManager = new CacheManager_1.CacheManager(config.vaultPath);
        const vectorStore = new VectorStore_1.VectorStore(config.vaultPath);
        const embeddingService = new EmbeddingService_1.EmbeddingService(config.openaiApiKey);
        const graphBuilder = new GraphBuilder_1.GraphBuilder(config.vaultPath);
        // Build graph with specified files
        console.log('📊 Processing files...');
        const graph = await graphBuilder.buildGraph(files);
        console.log(`✅ Processed ${graph.nodes.size} files`);
        // Update vector embeddings
        console.log('🔄 Adding to vector store...');
        let added = 0;
        for (const [notePath, node] of graph.nodes.entries()) {
            try {
                if (node.note.chunks && node.note.chunks.length > 0) {
                    await vectorStore.addNoteChunks(notePath, node.note.title, node.note.chunks, node.note.relativePath, node.note.lastModified || new Date(), node.note.wordCount, embeddingService);
                    added++;
                    if (added % 5 === 0) {
                        console.log(`  📝 Added ${added} files...`);
                    }
                }
            }
            catch (error) {
                console.error(`❌ Failed to add ${node.note.relativePath}: ${error.message}`);
            }
        }
        // Save vector store
        await vectorStore.saveToDisk();
        console.log('');
        console.log('✅ Files added successfully!');
        console.log(`📈 Added: ${added} files`);
        const stats = vectorStore.getStats();
        console.log(`📊 Total: ${stats.totalNotes} notes, ${stats.totalChunks} chunks`);
    }
    catch (error) {
        console.error('❌ Add failed:', error.message);
        process.exit(1);
    }
}
async function removeFiles(targetPath) {
    try {
        const config = await loadConfig();
        // Resolve absolute path
        const absolutePath = path.resolve(targetPath);
        console.log('🧠 Brain Remove Files');
        console.log(`📂 Target: ${absolutePath}`);
        console.log('');
        // Initialize services
        const vectorStore = new VectorStore_1.VectorStore(config.vaultPath);
        // Find files to remove from vector store
        const stats = vectorStore.getStats();
        const filesToRemove = [];
        // Get all indexed files that match the target path
        for (const notePath of vectorStore.getAllNotePaths()) {
            if (notePath.startsWith(absolutePath)) {
                filesToRemove.push(notePath);
            }
        }
        if (filesToRemove.length === 0) {
            console.log('❌ No matching files found in vector store.');
            return;
        }
        console.log(`📁 Found ${filesToRemove.length} file(s) to remove:`);
        filesToRemove.slice(0, 10).forEach(file => {
            console.log(`  📄 ${path.relative(process.cwd(), file)}`);
        });
        if (filesToRemove.length > 10) {
            console.log(`  ... and ${filesToRemove.length - 10} more`);
        }
        console.log('');
        // Remove from vector store
        console.log('🗑️  Removing from vector store...');
        let removed = 0;
        for (const filePath of filesToRemove) {
            try {
                vectorStore.removeNote(filePath);
                removed++;
            }
            catch (error) {
                console.error(`❌ Failed to remove ${filePath}: ${error.message}`);
            }
        }
        // Save vector store
        await vectorStore.saveToDisk();
        console.log('');
        console.log('✅ Files removed successfully!');
        console.log(`🗑️  Removed: ${removed} files`);
        const newStats = vectorStore.getStats();
        console.log(`📊 Remaining: ${newStats.totalNotes} notes, ${newStats.totalChunks} chunks`);
    }
    catch (error) {
        console.error('❌ Remove failed:', error.message);
        process.exit(1);
    }
}
// Set up CLI commands
program
    .name('brain')
    .description('Brain MCP - Semantic knowledge base for your markdown notes')
    .version('1.0.4');
program
    .command('setup')
    .description('Interactive setup for Brain MCP server')
    .action(async () => {
    console.log('🧠 Running Brain setup...');
    // Import and run the existing setup script
    const { spawn } = await Promise.resolve().then(() => __importStar(require('child_process')));
    const setupPath = path.join(__dirname, '../setup.js');
    const child = spawn('node', [setupPath], { stdio: 'inherit' });
    child.on('close', (code) => {
        process.exit(code || 0);
    });
});
program
    .command('update')
    .description('Update vector embeddings for changed files')
    .option('--clear', 'Clear all vectors and rebuild from scratch')
    .action(async (options) => {
    await updateVectors(options.clear);
});
program
    .command('status')
    .description('Show Brain configuration and status')
    .action(async () => {
    await showStatus();
});
program
    .command('clear')
    .description('Clear and rebuild all vector embeddings')
    .action(async () => {
    await updateVectors(true);
});
program
    .command('server')
    .description('Start the Brain MCP server')
    .action(async () => {
    console.log('🧠 Starting Brain MCP server...');
    // Import and run the MCP server
    const { spawn } = await Promise.resolve().then(() => __importStar(require('child_process')));
    const serverPath = path.join(__dirname, '../mcp/server.js');
    const child = spawn('node', [serverPath], { stdio: 'inherit' });
    child.on('close', (code) => {
        process.exit(code || 0);
    });
});
program
    .command('add')
    .description('Add files to the Brain knowledge base')
    .argument('<path>', 'Path to file or directory to add')
    .option('-t, --types <types>', 'Comma-separated list of file types to include (e.g., pdf,txt,org)', (value) => value.split(','))
    .action(async (targetPath, options) => {
    await addFiles(targetPath, options);
});
program
    .command('remove')
    .description('Remove files from the Brain knowledge base')
    .argument('<path>', 'Path to file or directory to remove')
    .action(async (targetPath) => {
    await removeFiles(targetPath);
});
// Parse command line arguments
program.parse();
//# sourceMappingURL=brain.js.map