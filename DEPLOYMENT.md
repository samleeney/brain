# Deployment Guide

This guide covers how to deploy and publish Brain MCP.

## Prerequisites

- npm account with publishing permissions
- GitHub repository access with admin rights
- Configured secrets in GitHub repository:
  - `NPM_TOKEN` - npm automation token
  - `CODECOV_TOKEN` - Codecov token (optional)

## Automated Release Process

Brain MCP uses semantic-release for automated versioning and publishing.

### How It Works

1. **Commit to main branch** triggers the release workflow
2. **Semantic-release analyzes** commit messages
3. **Version is determined** based on commit types:
   - `fix:` → Patch release (1.0.0 → 1.0.1)
   - `feat:` → Minor release (1.0.0 → 1.1.0)
   - `BREAKING CHANGE:` → Major release (1.0.0 → 2.0.0)
4. **Automatic updates**:
   - Version in package.json
   - CHANGELOG.md generation
   - Git tag creation
   - GitHub release creation
   - npm package publication

### Triggering a Release

Simply merge PRs to the main branch with proper commit messages:

```bash
# Patch release
git commit -m "fix: resolve search timeout issue"

# Minor release
git commit -m "feat: add fuzzy search capability"

# Major release
git commit -m "feat!: redesign search API

BREAKING CHANGE: search method now returns different response format"
```

## Manual Release Process

If needed, you can release manually:

### 1. Update Version

```bash
# Update version following semver
npm version patch  # or minor, major
```

### 2. Build and Test

```bash
npm run clean
npm install
npm run build
npm test
```

### 3. Create Release Tag

```bash
git tag v1.2.3
git push origin v1.2.3
```

### 4. Publish to npm

```bash
npm publish
```

## Pre-release Versions

For testing releases:

```bash
# Create beta version
npm version prerelease --preid=beta
# Results in: 1.0.0-beta.0

# Publish with beta tag
npm publish --tag beta
```

## Local Testing Before Release

### Test Package Installation

```bash
# Pack the package
npm pack

# Test in a new directory
cd /tmp
mkdir test-brain
cd test-brain
npm init -y
npm install /path/to/brain-mcp-1.0.0.tgz

# Test global installation
npm install -g /path/to/brain-mcp-1.0.0.tgz
brain --version
```

### Test with Claude Desktop

1. Build the package locally
2. Update Claude Desktop config to point to local build:
   ```json
   {
     "brain": {
       "command": "node",
       "args": ["/absolute/path/to/brain/dist/mcp/server.js"]
     }
   }
   ```
3. Restart Claude Desktop and test functionality

## CI/CD Pipeline

### GitHub Actions Workflows

1. **CI Workflow** (`ci.yml`)
   - Runs on every push and PR
   - Tests on Node.js 18.x, 20.x, 22.x
   - Runs linting and type checking
   - Executes test suite with coverage
   - Validates package installation

2. **PR Test Workflow** (`pr-test.yml`)
   - Additional tests for pull requests
   - Cross-platform compatibility checks
   - Setup command validation

3. **Release Workflow** (`release.yml`)
   - Triggered on push to main
   - Runs semantic-release
   - Publishes to npm
   - Creates GitHub releases

4. **Security Workflow** (`security.yml`)
   - Weekly security audits
   - Dependency vulnerability checks
   - Automated security updates

### Setting Up CI/CD

1. **Configure npm Token**
   - Generate automation token at npmjs.com
   - Add as `NPM_TOKEN` secret in GitHub

2. **Configure Codecov** (optional)
   - Sign up at codecov.io
   - Add `CODECOV_TOKEN` to GitHub secrets

3. **Enable GitHub Actions**
   - Ensure Actions are enabled in repository settings
   - Grant workflow permissions for releases

## Monitoring Releases

### Health Checks

- npm package page: https://www.npmjs.com/package/brain-mcp
- GitHub releases: https://github.com/samleeney/brain/releases
- CI status: Check Actions tab in GitHub

### Post-Release Validation

After each release:
1. Verify npm package is published
2. Check GitHub release is created
3. Test installation: `npm install -g brain-mcp@latest`
4. Monitor issue tracker for problems

## Rollback Procedure

If a release has critical issues:

### 1. Deprecate Bad Version

```bash
npm deprecate brain-mcp@1.2.3 "Critical bug, use 1.2.2"
```

### 2. Create Fix

```bash
# Create hotfix branch
git checkout -b hotfix/critical-bug

# Fix issue and commit
git commit -m "fix: resolve critical bug in search"

# Merge to main
```

### 3. Monitor Automated Release

The fix will trigger a new patch release automatically.

## Security Considerations

- Never commit secrets or API keys
- Keep dependencies updated
- Review security advisories
- Use npm audit regularly
- Enable 2FA on npm account
- Restrict npm publish access

## Troubleshooting

### Release Workflow Fails

1. Check GitHub Actions logs
2. Verify NPM_TOKEN is valid
3. Ensure version hasn't been published
4. Check commit message format

### npm Publish Errors

- **E403**: Check npm authentication
- **E409**: Version already exists
- **E404**: Package name not found

### Semantic Release Issues

- Ensure commits follow conventional format
- Check .releaserc.json configuration
- Verify GitHub token permissions