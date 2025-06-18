# Contributing to Brain MCP

Thank you for your interest in contributing to Brain MCP! This guide will help you get started with development.

## Development Setup

### Prerequisites

- Node.js 18.x, 20.x, or 22.x
- npm 7+
- Git
- OpenAI API key (for testing semantic search features)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/samleeney/brain.git
   cd brain
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## Development Workflow

### Simple Development Process

1. **Make your changes**
2. **Build the project**: `npm run build`
3. **Test with Claude Code**: Changes are automatically picked up
4. **Run tests**: `npm test`
5. **Check code quality**: `npm run precommit`

### Available Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts and cache files

### Testing with Claude Code

Add your development server to Claude Code:
```bash
claude mcp add brain-dev node /absolute/path/to/brain/dist/mcp/server.js
```

After making changes:
```bash
npm run build  # Updates dist/mcp/server.js that Claude Code uses
```

### Code Quality

Before submitting a PR, ensure your code passes all quality checks:

```bash
npm run precommit
```

This runs linting, formatting checks, type checking, and tests.

## Project Structure

```
brain/
├── src/
│   ├── cli/          # CLI interface
│   ├── core/         # Core business logic
│   ├── mcp/          # MCP server implementation
│   ├── services/     # Service layer (embeddings, search, etc.)
│   └── setup.ts      # Setup script
├── tests/            # Test files
├── docs/             # Documentation
└── dist/             # Build output (generated)
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Test additions or modifications
- `build:` Build system changes
- `ci:` CI configuration changes
- `chore:` Other changes

Examples:
```bash
git commit -m "feat: add parallel search strategy for improved performance"
git commit -m "fix: handle empty search results gracefully"
```

## Pull Request Process

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the coding standards
3. **Add tests** for any new functionality
4. **Update documentation** if needed
5. **Run quality checks** locally: `npm run precommit`
6. **Commit your changes** using conventional commits
7. **Push to your fork** and submit a pull request
8. **Ensure CI passes** and address any review feedback

## Working with MCP

- Test your changes with Claude Code by adding your local server
- Refer to the [MCP documentation](https://modelcontextprotocol.org) for protocol details

## Debugging

Use standard Node.js debugging:
```bash
# Debug the built server
node --inspect dist/mcp/server.js

# Then connect your debugger to port 9229
```

## Common Issues

1. **TypeScript errors after dependency updates**
   ```bash
   npm run clean && npm install && npm run build
   ```

2. **Test timeouts**
   - Increase timeout in jest.config.js for embedding operations
   - Mock OpenAI API calls for unit tests

3. **Husky hooks not running**
   ```bash
   npm run prepare
   ```

## Getting Help

- Check existing issues and discussions
- Join our community discussions
- Reach out to maintainers for guidance

Thank you for contributing to Brain MCP!