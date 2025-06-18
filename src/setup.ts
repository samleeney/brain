#!/usr/bin/env node

/**
 * Brain MCP Setup Script
 * Simple configuration utility for Brain MCP Server
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import inquirer from 'inquirer';

interface BrainConfig {
  notesRoot: string;
  openaiApiKey: string;
  name: string;
  version: string;
}

async function main() {
  console.log('🧠 Brain MCP Server Setup');
  console.log('');

  // Ask for configuration
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'notesRoot',
      message: 'Where is your knowledge base/notes directory?',
      default: process.cwd(),
      validate: (input: string) => {
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
      validate: (input: string) => {
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
  const config: BrainConfig = {
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
  } else if (process.platform === 'win32') {
    configFileLocation = path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
  } else {
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
  const { saveConfig } = await inquirer.prompt([
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
          ...(existingConfig as any).mcpServers,
          ...claudeConfig.mcpServers
        }
      };

      await fs.promises.writeFile(configFileLocation, JSON.stringify(updatedConfig, null, 2));
      console.log('✅ Claude Desktop configuration updated!');
      console.log('🔄 Please restart Claude Desktop to activate Brain');

    } catch (error) {
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

export { main as setupBrain };