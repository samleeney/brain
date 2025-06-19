#!/bin/bash

# Brain MCP Release Script
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Check if we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "❌ Error: Must be on main branch to release"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Working directory must be clean"
    exit 1
fi

# Pull latest changes
git pull origin main

# Default to patch if no argument provided
VERSION_TYPE=${1:-patch}

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "❌ Error: Version type must be patch, minor, or major"
    exit 1
fi

echo "🚀 Starting $VERSION_TYPE release..."

# Run tests
echo "🧪 Running tests..."
npm test

# Build the project
echo "🔨 Building project..."
npm run build

# Bump version
echo "📈 Bumping $VERSION_TYPE version..."
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ New version: $NEW_VERSION"

# Commit version bump
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION"

# Create and push tag
git tag "v$NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

echo "🎉 Release v$NEW_VERSION initiated!"
echo "📦 GitHub Actions will automatically:"
echo "   - Run tests"
echo "   - Publish to NPM"
echo "   - Create GitHub release"
echo "   - Upload release assets"