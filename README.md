# Brain MCP Server

**Semantic knowledge base access for Claude Desktop via Model Context Protocol**

Brain transforms your markdown notes into an intelligent, searchable knowledge base that integrates directly into Claude Desktop. Just ask Claude to search your brain naturally - no commands needed!

## 🧠 How It Works

Brain provides **native MCP tools** in Claude Desktop for semantic knowledge access:

```mermaid
flowchart TD
    A[📄 Your Markdown Notes] --> B[🔧 Intelligent Chunking]
    B --> B1[Title + Context]
    B --> B2[Heading Sections] 
    B --> B3[Paragraphs]
    B --> B4[Code/Lists/Tables]
    
    B1 --> C[🧮 OpenAI Embeddings]
    B2 --> C
    B3 --> C
    B4 --> C
    
    C --> D[💾 Vector Store<br/>Persistent Search Index]
    
    E[👤 You: "What did I learn about React?"<br/>🤖 Claude Desktop] --> F[🔍 brain_search tool]
    F --> G[📊 Semantic Similarity]
    D --> G
    
    G --> H[📝 Relevant Chunks<br/>with Context]
    H --> I[🤖 Claude Response<br/>with Your Knowledge]
    
    style A fill:#e1f5fe
    style E fill:#f3e5f5
    style I fill:#e8f5e8
    style D fill:#fff3e0
```

## ✨ Key Benefits

- **🤖 Native Integration**: Tools appear as built-in Claude Desktop capabilities
- **🧠 Enhanced Semantic Search**: Parallel multi-phrase search with automatic query expansion
- **📄 Chunk-Level Precision**: Returns specific sections, not entire documents
- **🏗️ Hierarchical Context**: Preserves heading structure and relationships
- **⚡ Optimized Performance**: Parallel search execution with intelligent deduplication
- **🔒 Private & Secure**: Runs locally on your machine
- **📚 Smart Query Expansion**: Automatic synonyms, context, and temporal term expansion

## 🚀 Quick Setup

### 1. Install Brain MCP Server
```bash
npm install -g brain-mcp
```

### 2. Configure Your Knowledge Base
```bash
brain-setup
```

This interactive setup will:
- 📂 Ask for your notes directory location
- 🔑 Request your OpenAI API key (for semantic search)
- 📋 Generate Claude Desktop configuration
- 🤖 Optionally update Claude Desktop config automatically

### 3. Restart Claude Desktop

After setup, restart Claude Desktop to activate the Brain MCP server.

### 4. Start Using Naturally!

```
You: "What did I learn about React hooks?"

Claude: [Uses brain_search automatically]
Looking at your notes, I found several sections about React hooks. In your 
'react-patterns.md' file, you documented that useState is great for simple 
local state, but you prefer useReducer for complex state logic...

[Uses brain_read for full context]
You also noted some performance optimizations using useMemo and useCallback 
in your 'optimization-notes.md' file...
```

## 🔧 Available MCP Tools

Brain provides these native tools in Claude Desktop:

### `brain_search`
**Enhanced parallel semantic search across your knowledge base**
- **🔍 Multi-phrase search**: Automatically expands queries with synonyms, keywords, and context
- **⚡ Parallel execution**: Searches multiple query variations simultaneously
- **🧠 Smart deduplication**: Combines and ranks results from all search variations
- **🎯 Temporal awareness**: Expands time-related queries (e.g., "this year" → "2024 2025")
- **📊 Configurable thresholds**: Adjustable similarity scoring
- **🔄 Fallback option**: Can disable multi-phrase for simple queries

### `brain_read` 
**Read specific notes with full context**
- Complete note content
- Metadata and relationships
- Link information

### `brain_overview`
**Knowledge base structure and summary**
- Topic areas and clusters
- Hub notes and connections
- Statistics and insights

### `brain_related`
**Find related notes**
- Direct link relationships
- Graph-based connections
- Contextual associations

### `brain_list`
**Browse notes by directory**
- Hierarchical exploration
- File metadata
- Organization insights

## 🎭 Example Conversations

### Research and Learning
```
You: "Summarize what I know about machine learning"

Claude: [Automatically searches and reads relevant notes]
Based on your machine learning notes, you've covered several key areas:

1. **Fundamentals** (from ml-basics.md): You've documented supervised vs 
   unsupervised learning, with examples of classification and regression...

2. **Deep Learning** (from neural-networks.md): You explored CNNs for image 
   recognition and RNNs for sequence data...

3. **Practical Applications** (from projects/ml-project.md): You implemented 
   a sentiment analysis system using transformers...

Would you like me to dive deeper into any of these areas?
```

### Project Continuity
```
You: "I'm continuing work on my e-commerce API"

Claude: [Searches for e-commerce project information]
Great! I can see from your notes that you're building an e-commerce platform. 
Your latest entries show you were implementing:

- Authentication with JWT tokens (auth-system.md)
- Product catalog with PostgreSQL (database-design.md)  
- Payment processing with Stripe (payments.md)

You left off working on the order management system. I noticed you documented 
some concerns about handling concurrent inventory updates. Should we pick up 
there, or would you like to work on a different part?
```

### Code and Technical Knowledge
```
You: "How do I handle database migrations safely?"

Claude: [Finds migration-related notes automatically]
From your database notes, you've documented several migration best practices:

1. **Always backup before migrations** (from db-ops.md)
2. **Use reversible migrations** when possible
3. **Test on staging first** with production-like data

You also noted a specific issue with adding non-nullable columns to large 
tables and documented a solution using default values...

[Continues with your specific experience and solutions]
```

## ⚙️ Configuration

### Notes Directory Structure
Brain works with any markdown structure:
```
your-notes/
├── daily/
│   ├── 2024-01-01.md
│   └── 2024-01-02.md
├── projects/
│   ├── web-app.md
│   └── api-server.md
├── learning/
│   ├── react.md
│   └── python.md
└── ideas/
    └── project-ideas.md
```

### Supported Markdown Features
- **Headings**: All levels with hierarchical chunking
- **Wiki Links**: `[[note-name]]` or `[[note-name|display]]`
- **Markdown Links**: `[text](path/to/note.md)`
- **Tags**: `#tag-name` (included in search)
- **Code Blocks**: Preserved as distinct chunks
- **Lists & Tables**: Semantically grouped

### Environment Variables
Override configuration with environment variables:
- `BRAIN_NOTES_ROOT`: Notes directory path
- `OPENAI_API_KEY`: Your OpenAI API key
- `BRAIN_CONFIG`: Custom config file path

## 🚀 Enhanced Search Technology

Brain's search engine now features **parallel multi-phrase optimization** for dramatically improved search recall:

### Query Expansion Strategies
1. **Keyword Extraction**: Removes stop words, focuses on meaningful terms
2. **Synonym Expansion**: `ski` → `skiing snow winter alpine slopes powder`
3. **Contextual Terms**: `travel` → `booking flight hotel accommodation`
4. **Temporal Expansion**: `this year` → `2024 2025`, `skiing` → `december january february march april`

### Parallel Search Process
```mermaid
flowchart LR
    A[Original Query: "skiing this year"] --> B[Query Expansion]
    B --> C["skiing this year"]
    B --> D["ski snow winter 2024 2025"]
    B --> E["skiing mountain resort"]
    B --> F["ski december january february"]
    
    C --> G[Parallel Embedding]
    D --> G
    E --> G
    F --> G
    
    G --> H[Vector Search]
    H --> I[Deduplicate & Rank]
    I --> J[Best Results]
    
    style B fill:#e3f2fd
    style G fill:#f3e5f5
    style I fill:#e8f5e8
```

### Performance Benefits
- **Higher Recall**: Finds relevant content that single queries miss
- **Better Context**: Automatic expansion improves semantic matching
- **Parallel Execution**: Multiple searches run simultaneously
- **Smart Ranking**: Results deduplicated and sorted by relevance

## 🏗️ Architecture

Brain is built with TypeScript and optimized for semantic search:

- **ChunkingService**: Intelligently splits markdown into semantic sections
- **EmbeddingService**: OpenAI text-embedding-3-large integration
- **VectorStore**: Efficient similarity search with persistent storage
- **SearchEngine**: Enhanced parallel multi-phrase semantic search with query expansion
- **GraphBuilder**: Maintains note relationships and link structure
- **CacheManager**: Smart caching for both graph data and embeddings
- **MCP Server**: Model Context Protocol integration for Claude Desktop

## 🔧 Requirements

- **Node.js** 16+ and npm
- **Claude Desktop** application
- **OpenAI API key** for embeddings (text-embedding-3-large)
- **Markdown files** in a local directory

## 🎯 Use Cases

### Personal Knowledge Management
- Research notes with semantic discovery
- Project documentation with contextual retrieval  
- Learning materials organized by concepts
- Daily journals with cross-references

### Development Workflows
- Code patterns and solution databases
- Configuration examples and setups
- Troubleshooting guides with searchable solutions
- Architecture decisions with reasoning

### Creative and Academic Work
- Idea collections with thematic clustering
- Writing drafts with content relationships
- Reference materials organized semantically
- Research papers with citation networks

## 🐛 Troubleshooting

### Brain tools don't appear in Claude Desktop
1. Check Claude Desktop configuration file location
2. Verify the server path in configuration
3. Ensure Node.js is accessible from Claude Desktop
4. Check Claude Desktop logs for errors

### "OpenAI API key not configured"
1. Re-run `brain-setup` to set your API key
2. Check the `brain-mcp-config.json` file
3. Verify the API key format (starts with `sk-`)

### No search results found
1. Lower the similarity threshold in searches
2. Check that notes contain relevant content
3. Verify embeddings were built (check `.brain-vectors.json`)
4. Try different search terms or phrases

### Server startup errors
1. Ensure Node.js 16+ is installed
2. Check file permissions in notes directory
3. Verify all dependencies are installed
4. Check the config file is valid JSON

## 🔄 Updating

When you update your notes:
- New and modified files are automatically detected
- Embeddings are updated incrementally
- No manual rebuild required

When you update Brain:
1. Run: `npm update -g brain-mcp`
2. Your configuration will be preserved
3. Restart Claude Desktop

## 🚫 What Brain Is NOT

- **Not a note-taking app** - Works with existing markdown files
- **Not web-based** - Requires local installation and Claude Desktop
- **Not always-on** - Only activated when Claude uses the tools
- **Not a replacement for traditional search** - Complements your workflow

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions welcome! Please see our [contributing guidelines](CONTRIBUTING.md).

---

*Transform your notes into an intelligent knowledge companion for Claude Desktop*