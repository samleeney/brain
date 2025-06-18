#!/usr/bin/env node

// Test script to display MCP tool format
const tools = [
  {
    name: 'brain_search',
    description: 'Search the knowledge base using semantic similarity to find relevant content chunks',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant content',
        },
        threshold: {
          type: 'number',
          description: 'Similarity threshold (0.0-1.0, default: 0.3)',
          minimum: 0,
          maximum: 1,
          default: 0.3,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
          minimum: 1,
          maximum: 50,
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'brain_read',
    description: 'Read a specific note with full context and metadata',
    inputSchema: {
      type: 'object',
      properties: {
        notePath: {
          type: 'string',
          description: 'Path to the note file (relative or absolute)',
        },
      },
      required: ['notePath'],
    },
  },
];

console.log('MCP Tool Definition Format:');
console.log('==========================\n');

tools.forEach(tool => {
  console.log(`Tool: ${tool.name}`);
  console.log(`Description: ${tool.description}`);
  console.log('Input Schema:');
  console.log(JSON.stringify(tool.inputSchema, null, 2));
  console.log('\n---\n');
});

console.log('\nFull JSON format:');
console.log(JSON.stringify(tools, null, 2));