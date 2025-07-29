# Release Checklist

Use this checklist before publishing a new version.

## Pre-Release Checklist

### Code Quality
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Package verification passes (`npm run verify`)
- [ ] No TypeScript errors
- [ ] No linting errors

### Documentation
- [ ] README.md is up to date
- [ ] CHANGELOG.md updated with new version
- [ ] USAGE_EXAMPLES.md reflects current features
- [ ] All code examples work
- [ ] API documentation is current

### Package Configuration
- [ ] Version number updated in package.json
- [ ] Author information is correct
- [ ] Repository URLs are correct
- [ ] Keywords are relevant and complete
- [ ] License is specified
- [ ] Files array includes all necessary files
- [ ] .npmignore excludes development files

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] HTTP server tests pass
- [ ] CLI functionality tested
- [ ] Cross-platform compatibility verified

### Security
- [ ] Dependencies are up to date
- [ ] No known security vulnerabilities
- [ ] Secrets are not exposed in code
- [ ] npm audit passes

## Release Process

### 1. Version Bump
```bash
# Choose appropriate version bump
npm version patch  # Bug fixes
npm version minor  # New features
npm version major  # Breaking changes
```

### 2. Final Testing
```bash
npm run build
npm test
npm run verify
```

### 3. Publish
```bash
# Interactive publishing (recommended)
npm run publish:interactive

# Or direct publishing
npm publish
```

### 4. Post-Release Verification
```bash
# Verify package is available
npm view checklist-mcp-server

# Test installation
npx checklist-mcp-server@latest --help
```

## Post-Release Tasks

### Immediate
- [ ] Test package installation on clean system
- [ ] Verify npx functionality works
- [ ] Check npm package page
- [ ] Update any external documentation

### Within 24 Hours
- [ ] Monitor for user feedback
- [ ] Check download statistics
- [ ] Respond to any issues
- [ ] Create GitHub release (if using GitHub)

### Within 1 Week
- [ ] Monitor for bug reports
- [ ] Update documentation based on user feedback
- [ ] Plan next release if needed

## Rollback Plan

If issues are discovered after release:

### Within 24 Hours
```bash
# Unpublish the problematic version
npm unpublish checklist-mcp-server@x.x.x
```

### After 24 Hours
```bash
# Publish a patch version with fixes
npm version patch
npm publish
```

## Version History Template

Add to CHANGELOG.md:

```markdown
## [x.x.x] - YYYY-MM-DD

### Added
- New features

### Changed
- Modified functionality

### Deprecated
- Features marked for removal

### Removed
- Deleted features

### Fixed
- Bug fixes

### Security
- Security improvements
```

## Communication

### Release Announcement Template

```markdown
🎉 Checklist MCP Server v{version} is now available!

## What's New
- Feature 1
- Feature 2
- Bug fixes

## Installation
```bash
npx checklist-mcp-server@latest
```

## Upgrade
```bash
npm update -g checklist-mcp-server
```

Full changelog: [link to CHANGELOG.md]
```

### Channels
- [ ] GitHub Releases
- [ ] npm package description
- [ ] Social media (if applicable)
- [ ] Documentation sites
- [ ] Community forums

## Emergency Contacts

- npm Support: support@npmjs.com
- GitHub Support: support@github.com
- Package Maintainer: [your contact info]