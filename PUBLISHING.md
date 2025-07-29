# Publishing Guide

This guide explains how to publish the Checklist MCP Server to npm.

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **npm CLI**: Ensure npm is installed and updated
3. **Authentication**: Login to npm via CLI

## Step-by-Step Publishing Process

### 1. Setup npm Account and Login

```bash
# Create account at npmjs.com first, then login
npm login

# Verify you're logged in
npm whoami
```

### 2. Pre-publish Checklist

```bash
# Ensure all tests pass
npm test

# Verify package configuration
npm run verify

# Check what will be published
npm pack --dry-run

# Build the project
npm run build
```

### 3. Version Management

```bash
# For patch releases (bug fixes)
npm version patch

# For minor releases (new features)
npm version minor

# For major releases (breaking changes)
npm version major

# Or set version manually in package.json
```

### 4. Publish to npm

```bash
# Publish to npm registry
npm publish

# For scoped packages (if needed)
npm publish --access public
```

### 5. Verify Publication

```bash
# Check if package is available
npm view checklist-mcp-server

# Test installation from npm
npx checklist-mcp-server@latest --help
```

## Publishing Checklist

- [ ] All tests pass (`npm test`)
- [ ] Package builds successfully (`npm run build`)
- [ ] Package verification passes (`npm run verify`)
- [ ] Version number updated appropriately
- [ ] CHANGELOG.md updated with new version
- [ ] README.md is up to date
- [ ] LICENSE file exists
- [ ] .npmignore configured properly
- [ ] Author and repository information in package.json
- [ ] Keywords are relevant and complete

## Post-Publication Steps

1. **Test Installation**:
   ```bash
   # Test on different machines/environments
   npx checklist-mcp-server@latest
   ```

2. **Update Documentation**:
   - Update README with npm installation instructions
   - Update any external documentation
   - Create GitHub release if using GitHub

3. **Monitor**:
   - Check npm download statistics
   - Monitor for issues or bug reports
   - Respond to user feedback

## Troubleshooting

### Common Issues

**Authentication Error**:
```bash
npm login
# Enter your npm credentials
```

**Package Name Conflict**:
```bash
# Check if name is available
npm view your-package-name
# If taken, choose a different name in package.json
```

**Permission Denied**:
```bash
# For scoped packages
npm publish --access public
```

**Build Failures**:
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Version Management

```bash
# Check current version
npm version

# See all versions of your package
npm view checklist-mcp-server versions --json

# Unpublish a version (within 24 hours)
npm unpublish checklist-mcp-server@1.1.0
```

## Automated Publishing (CI/CD)

For automated publishing, create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Security Considerations

1. **Never commit npm tokens** to version control
2. **Use 2FA** on your npm account
3. **Review dependencies** for security vulnerabilities
4. **Keep dependencies updated**

## Support

After publishing, users can:
- Install globally: `npm install -g checklist-mcp-server`
- Use with npx: `npx checklist-mcp-server`
- Report issues on your repository's issue tracker