#!/usr/bin/env node
"use strict";
/**
 * Brain MCP Setup Script
 * Simple configuration utility for Brain MCP Server
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
exports.setupBrain = main;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const inquirer_1 = __importDefault(require("inquirer"));
async function main() {
    console.log('🧠 Brain MCP Server Setup');
    console.log('');
    // Ask for configuration
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'notesRoot',
            message: 'Where is your knowledge base/notes directory?',
            default: process.cwd(),
            validate: (input) => {
                const resolvedPath = path.resolve(input);
                if (!fs.existsSync(resolvedPath)) {
                    return `Directory '${resolvedPath}' does not exist.`;
                }
                return true;
            }
        },
        {
            type: 'password',
            name: 'openaiApiKey',
            message: 'Enter your OpenAI API key (for semantic search):',
            mask: '*',
            validate: (input) => {
                if (!input || input.trim().length === 0) {
                    return 'OpenAI API key is required for semantic search.';
                }
                if (!input.startsWith('sk-')) {
                    return 'OpenAI API key should start with "sk-".';
                }
                return true;
            }
        }
    ]);
    const notesRoot = path.resolve(answers.notesRoot);
    const openaiApiKey = answers.openaiApiKey.trim();
    // Create configuration
    const config = {
        notesRoot,
        openaiApiKey,
        name: 'brain-mcp-server',
        version: '1.0.0'
    };
    // Save configuration
    const configPath = path.join(notesRoot, 'brain-mcp-config.json');
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
    // Create Claude Desktop configuration
    const homeDir = os.homedir();
    const brainServerPath = path.join(__dirname, 'mcp', 'server.js');
    const claudeConfig = {
        mcpServers: {
            brain: {
                command: 'node',
                args: [brainServerPath],
                env: {
                    BRAIN_CONFIG: configPath
                }
            }
        }
    };
    console.log('');
    console.log('✅ Brain MCP Server configured!');
    console.log('');
    console.log('📋 Add this to your Claude Desktop configuration:');
    console.log('');
    // Show platform-specific config file location
    let configFileLocation;
    if (process.platform === 'darwin') {
        configFileLocation = path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    }
    else if (process.platform === 'win32') {
        configFileLocation = path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
    }
    else {
        configFileLocation = path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
    }
    console.log(`File: ${configFileLocation}`);
    console.log('');
    console.log(JSON.stringify(claudeConfig, null, 2));
    console.log('');
    console.log('🔄 Restart Claude Desktop to activate Brain MCP server');
    console.log('');
    console.log('🧠 Brain will provide these tools in Claude Desktop:');
    console.log('  • brain_search: Semantic search your knowledge base');
    console.log('  • brain_read: Read specific notes with context');
    console.log('  • brain_overview: Get knowledge base summary');
    console.log('  • brain_related: Find related notes');
    console.log('  • brain_list: List notes in directories');
    console.log('');
    console.log('💡 Just ask Claude to search your brain naturally!');
    // Offer to save Claude config directly
    const { saveConfig } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'saveConfig',
            message: 'Would you like me to automatically add this to Claude Desktop config?\n  (If you are using another tool, click no and we will print the command to add to your context)',
            default: false
        }
    ]);
    if (saveConfig) {
        try {
            // Ensure directory exists
            await fs.promises.mkdir(path.dirname(configFileLocation), { recursive: true });
            let existingConfig = {};
            if (fs.existsSync(configFileLocation)) {
                const existingContent = await fs.promises.readFile(configFileLocation, 'utf-8');
                existingConfig = JSON.parse(existingContent);
            }
            // Merge configurations
            const updatedConfig = {
                ...existingConfig,
                mcpServers: {
                    ...existingConfig.mcpServers,
                    ...claudeConfig.mcpServers
                }
            };
            await fs.promises.writeFile(configFileLocation, JSON.stringify(updatedConfig, null, 2));
            console.log('✅ Claude Desktop configuration updated!');
            console.log('🔄 Please restart Claude Desktop to activate Brain');
        }
        catch (error) {
            console.log('❌ Failed to update Claude config automatically.');
            console.log('Please add the configuration manually.');
        }
    }
}
if (require.main === module) {
    main().catch((error) => {
        console.error('Setup error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=setup.js.map