# GitHub Workflows

This directory contains GitHub Actions workflows for the Brain project.

## Workflows

### `ci.yml` - Continuous Integration
- **Triggers**: Push to main/develop, PRs to main/develop
- **Purpose**: Test build and basic functionality across Node.js versions
- **Tests**: TypeScript compilation, CLI commands, package installation

### `pr-test.yml` - Pull Request Testing  
- **Triggers**: PRs affecting source code
- **Purpose**: Comprehensive testing including init command functionality
- **Tests**: Cross-platform compatibility, package installation flow

### `release.yml` - Release Management
- **Triggers**: Version tags (v*)
- **Purpose**: Automated NPM publishing and GitHub releases
- **Requirements**: `NPM_TOKEN` secret for publishing

### `security.yml` - Security Monitoring
- **Triggers**: Weekly schedule, pushes to main, PRs
- **Purpose**: Dependency vulnerability scanning and security audits
- **Features**: Automated dependency review, security reports

## Setup Requirements

### Secrets
The following repository secrets need to be configured:

- `NPM_TOKEN`: NPM authentication token for publishing packages
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

### Branch Protection
Recommended branch protection rules for `main`:
- Require status checks to pass before merging
- Require up-to-date branches before merging
- Include administrators in restrictions

## Test Coverage

The CI pipeline now includes comprehensive testing with:
- **Jest Unit Tests**: Using machine learning knowledge base examples
- **TypeScript Compilation**: Strict type checking across all source files
- **CLI Command Testing**: Validation of brain CLI functionality
- **Package Installation**: End-to-end installation and usage verification
- **Cross-Platform Testing**: Ubuntu, macOS, and Windows compatibility
- **Multi-Version Support**: Node.js 18.x, 20.x, and 22.x

### Test Notes Structure

The repository includes `test-notes/` with realistic machine learning study notes:
- `machine-learning-fundamentals.md` - Core ML concepts with learning journey
- `clustering-techniques.md` - K-means and unsupervised learning methods  
- `neural-networks.md` - Deep learning architectures and training
- `practical-applications.md` - Real-world ML applications and projects

These notes demonstrate:
- Wiki-style cross-linking (`[[note-name]]`)
- Semantic content for search engine testing
- Realistic knowledge base structure for graph building
- Example queries like "What did I learn about neural networks the other day?"

## Local Testing
Before pushing, run these commands locally:
```bash
npm ci
npm run build
npm test
node dist/cli/brain.js --help
```