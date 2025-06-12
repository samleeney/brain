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

## Local Testing
Before pushing, run these commands locally:
```bash
npm ci
npm run build
npm run test  # When test suite is available
```