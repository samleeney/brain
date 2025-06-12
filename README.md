# Brain - Knowledge Graph Integration for LLM Agents

Brain provides LLM agents with intelligent, contextual access to your markdown knowledge base. Instead of manually searching files, agents can understand your knowledge graph and autonomously decide when and how to access relevant information based on conversation context.

## 🧠 How It Works

Brain provides **persistent knowledge graph access** for intelligent agent decision-making:

1. **📊 Always-On Graph Awareness**: Agent loads your knowledge map at session start and maintains awareness of all topics, structure, and connections
2. **🎯 Context-Driven Decisions**: With full graph visibility, agent intelligently decides when user queries intersect with your documented knowledge
3. **🔍 Targeted Deep Search**: When relevant, agent searches specific areas of your knowledge base for detailed context
4. **🔗 Relationship Navigation**: Agent can trace connections and discover related concepts you've documented

**Key Insight**: The agent needs your knowledge graph structure loaded at all times to make smart decisions about when to search deeper.

## 🎯 Two-Tier Access Pattern

### Tier 1: Always-On Graph Awareness
```bash
# Load at session start and keep in context
brain --notes-root ~/vault overview
```
**Result**: Agent knows your entire knowledge landscape:
- Topics you've researched (machine learning, web development, etc.)
- Project clusters and their connections  
- Key hub notes and their relationships
- Knowledge gaps and orphaned notes

### Tier 2: Contextual Deep Search  
```bash
# Only when Tier 1 indicates relevance
brain --notes-root ~/vault search "specific query"
brain --notes-root ~/vault read relevant-note.md
```
**Result**: Agent retrieves detailed content when the overview suggests relevance

This two-tier approach allows intelligent filtering - the agent "knows" your knowledge base well enough to decide when to search deeper, just like how you might remember "I wrote something about X" before looking for the specific note.

## 🚀 Quick Setup

### 1. Install Brain
```bash
npm install -g brain
```

### 2. Initialize Your Knowledge Base
```bash
brain init
```

The init command will:
- 📂 Ask for your knowledge base/vault location
- 🎯 Let you choose between **Auto** mode (loads overview automatically) or **Call** mode (manual commands)
- 📋 Generate LLM-optimized instructions for your setup
- 🤖 Automatically integrate with Claude Code (creates/updates CLAUDE.md)

### 3. Start Using
After initialization, your LLM agent will have persistent access to your knowledge base according to your chosen mode.

### Example Setup Flow
```bash
$ brain init
🧠 Welcome to Brain - Knowledge Base Navigation Tool for LLMs

? Where is your knowledge base/vault located? ~/vault
? Which mode do you want to use? Auto - Brain loads overview automatically when LLM starts session

✅ Brain initialization complete!
✅ Added Brain instructions to ~/vault/CLAUDE.md
🚀 You can now run `brain overview` to see your knowledge base summary
```

### Manual Configuration (Optional)
If you prefer manual setup, create `CLAUDE.md` in your project:

```markdown
# Knowledge Base Integration

My personal notes are stored at `~/vault` and indexed with Brain.

## Session Initialization
At the start of every session, load my knowledge graph:
`brain --notes-root ~/vault overview`

This gives you the complete structure - topics, clusters, key notes, and connections.
Keep this context loaded throughout our conversation.

## Decision Framework
With the knowledge graph loaded, automatically search deeper when user queries relate to:
- Topics present in the graph (you'll know from overview)
- Technical domains I've documented
- Project names or concepts that appear in my notes
- Problem areas where I have previous solutions

## Search Commands
When you decide to search deeper:
- `brain --notes-root ~/vault search "query"` - Find relevant notes
- `brain --notes-root ~/vault read note.md` - Get full context
- `brain --notes-root ~/vault related note.md` - Find connections

## Goal
You should "know" my knowledge base like you know your training data - seamlessly reference it when relevant, ignore it when not.
```

## 💭 Agent Behavior Examples

### Intelligent Context Detection

**User**: *"I'm working on a React project and need to handle authentication"*

**Claude's Decision Process**:
- User mentions "React project" and "authentication" 
- These are technical topics likely documented in notes
- → Automatically search: `brain --notes-root ~/vault search "react authentication"`
- Find relevant notes and incorporate into response

**User**: *"What's the weather like today?"*

**Claude's Decision Process**:
- Weather query unrelated to personal knowledge base
- → Skip Brain search, respond normally

### Proactive Knowledge Integration

**User**: *"Help me plan my weekend"*

**Claude's Decision Process**:
- Personal planning might reference previous ideas/projects
- → Search: `brain --notes-root ~/vault search "weekend projects ideas"`
- → If found, incorporate personal context: "I see you have some project ideas..."

## 🎯 Key Commands for LLM Agents

### Setup & Initialization
```bash
# First-time setup - run after installing Brain
brain init

# Get complete knowledge base overview - START HERE (after init)
brain overview  # or: brain --notes-root ~/notes overview

# Check your Brain configuration
brain --notes-root ~/notes cache stats
```

### Essential Navigation
```bash
# Search across all content, filenames, tags
brain --notes-root ~/notes search "your query"

# Read specific note with full context and connections
brain --notes-root ~/notes read note-name.md

# List notes in directory structure
brain --notes-root ~/notes ls [optional-path]
```

### Advanced Discovery
```bash
# Find related notes (direct links, clusters, similar topics)
brain --notes-root ~/notes related note-name.md

# Trace connection paths between any two notes
brain --notes-root ~/notes trace source.md target.md

# Pattern-based file finding
brain --notes-root ~/notes glob "**/*pattern*.md"

# Regex content search
brain --notes-root ~/notes grep "regex-pattern"
```

## ✨ Features

- **🔗 Dual Organization**: Understands both hierarchical folders and graph-based wiki-style links
- **🔍 Multi-Strategy Search**: Text content, filenames, tags, and graph navigation
- **🤖 LLM-Optimized**: Dense, structured output designed for efficient token usage
- **📊 Graph Analysis**: Detects hubs, clusters, orphaned notes, and connection paths
- **⚡ High Performance**: Handles 1000+ notes with intelligent caching
- **🔄 Live Updates**: Incremental updates when files change

## 🤖 Agent Decision Framework

LLM agents should use Brain when the user query suggests personal knowledge relevance:

### ✅ **Search My Notes When**:
- Technical questions about tools/frameworks I use
- References to "my projects", "my ideas", "what I know"
- Planning questions that might reference past work
- Creative tasks that could build on documented concepts
- Research topics I might have explored
- Problem-solving for domains I work in

### ❌ **Skip Brain When**:
- General knowledge questions 
- Current events or real-time information
- Simple calculations or basic concepts
- Weather, news, or external services
- Questions clearly outside my documented interests

## 🔧 Core Agent Commands

### Session Initialization (After brain init)
```bash
# Load complete knowledge graph at session start
brain overview  # Uses path from init configuration
# or specify manually: brain --notes-root ~/vault overview

# Agent now knows: all topics, clusters, key notes, connections
# This context stays loaded for intelligent decision-making
```

### Graph Intelligence
```bash
# Get detailed statistics when needed
brain --notes-root ~/vault stats

# Check cache freshness
brain --notes-root ~/vault cache stats
```

### Context-Driven Search
```bash
# Search when user mentions specific topics
brain --notes-root ~/vault search "user mentioned topic"

# Find project-specific information
brain --notes-root ~/vault search "project name OR domain"

# Look for related concepts
brain --notes-root ~/vault search "broader topic category"
```

### Deep Context Retrieval
```bash
# Read specific notes that match the query
brain --notes-root ~/vault read [relevant-note.md]

# Find related information to provide fuller context
brain --notes-root ~/vault related [relevant-note.md]

# Trace connections between concepts
brain --notes-root ~/vault trace [concept-a.md] [concept-b.md]
```

## 🎯 Smart Integration Patterns

### Pattern 1: Contextual Enhancement
```
User asks about React hooks
→ brain search "react hooks"
→ If found: "Based on your notes about React hooks..."
→ If not found: Standard response without personal context
```

### Pattern 2: Project Continuity  
```
User mentions working on a project
→ brain search "[project indicators]"
→ Surface relevant past work, notes, decisions
→ Provide continuity with previous thinking
```

### Pattern 3: Knowledge Building
```
User asks about unfamiliar topic
→ brain search "[topic]" 
→ Check if they've researched this before
→ Either build on existing knowledge or note it's new territory
```

## 🔧 Cache Management

Brain uses intelligent caching for performance. LLM agents should know:

```bash
# Check cache status
brain --notes-root ~/notes cache stats

# Rebuild if notes have changed significantly
brain --notes-root ~/notes cache rebuild

# Clear cache if having issues
brain --notes-root ~/notes cache clear
```

## 📝 Supported Markdown

### Link Types
- **Wiki links**: `[[note-name]]` or `[[note-name|display text]]`
- **Markdown links**: `[display text](relative/path/to/note.md)`
- **Tags**: `#tag-name` anywhere in the document

### Document Structure
- **Headings**: All levels (`#` to `######`) for hierarchy
- **YAML frontmatter**: Optional metadata support
- **Content analysis**: Word counts, modification dates

### Link Resolution
- Exact filename matching
- Case-insensitive fallbacks
- Partial name matching
- Relative path resolution
- Broken link detection

## 🔧 Example Output

### Overview
```
=== KNOWLEDGE BASE OVERVIEW ===
Total Notes: 237 | Links: 180 | Last Updated: 2025-06-12
Structure: Mixed (15% in folders, 85% flat files)

TOP HUBS (most connected):
1. "Project Ideas" (45 connections)
2. "Daily Notes Index" (23 connections)

CLUSTERS DETECTED:
- "Research Papers" (67 notes)
- "Project Documentation" (34 notes)

ORPHANED NOTES: 12 notes with no connections
WARNING: 5 broken links detected
```

### Search Results
```
SEARCH RESULTS (3 matches):

1. projects/ai-research.md
   - Match: heading+text (score: 15.2)
   - Context: # AI Research Project Machine learning approaches...
   - Graph: 12 connections, Cluster: #2

2. notes/machine-learning.md
   - Match: tag+text (score: 8.5)
   - Context: Deep learning fundamentals #machine-learning
   - Graph: 8 connections
```

## 🏗️ Architecture

Brain is built with modern TypeScript and optimized for performance:

- **Parser**: Extracts structure and links from markdown files
- **Graph**: Builds knowledge graph with NetworkX-like algorithms
- **Search**: Multi-strategy search with relevance scoring  
- **Cache**: JSON-based persistence with change detection
- **CLI**: Commander.js for robust command-line interface

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions welcome! Please see our [contributing guidelines](CONTRIBUTING.md).

## 🎯 Real-World Agent Integration

### Autonomous Knowledge Integration
The agent should seamlessly weave your personal knowledge into conversations:

```
Setup (once):
brain init  # Configured vault at ~/vault, chose Auto mode

Session Start:
brain overview  # or automatically loaded in Auto mode
→ Agent loads: "Web scraping" cluster (5 notes), "Python automation" projects, "E-commerce" research area

User: "I want to build a web scraper for product prices"

Claude Internal Process:
1. Checks loaded knowledge graph → sees "web scraping" + "e-commerce" topics
2. Recognizes user has documented experience in this area
3. brain --notes-root ~/vault search "web scraping python automation"
4. Finds relevant notes, incorporates personal context

Claude Response: "For web scraping, I'd recommend using Python with BeautifulSoup or Scrapy. 

I see from your notes that you've worked with web scraping before for your 'price-tracker' project, where you used Playwright for dynamic content. You also documented some rate limiting strategies that worked well. 

Let me check what specific challenges you encountered..."
```

### Smart Context Loading
Agent loads just enough context without overwhelming the conversation:

```
User: "How should I structure my React components?"

Claude Process:
1. brain search "react components architecture"
2. If found: Load your specific patterns and preferences
3. Blend personal knowledge with general best practices
4. Reference your actual project decisions

Result: Advice tailored to YOUR coding style and previous decisions
```

### Proactive Knowledge Surfacing
Agent can surface relevant knowledge even when not directly asked:

```
User: "I'm feeling stuck on this authentication flow"

Claude Process:
1. Recognizes problem-solving context
2. brain search "authentication security oauth"
3. Finds your previous auth implementations
4. Suggests approaches you've used successfully before

Result: "I notice you've solved similar auth challenges before. In your 'user-management' notes, you documented a clean JWT approach that handled refresh tokens elegantly..."
```

## 🔗 Links

- **Repository**: https://github.com/samleeney/brain
- **Issues**: https://github.com/samleeney/brain/issues
- **NPM Package**: https://www.npmjs.com/package/brain

---

*Built for LLMs, by LLMs - Optimized for Claude Code*