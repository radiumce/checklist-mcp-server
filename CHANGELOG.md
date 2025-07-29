# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-29

### Added
- HTTP streamable transport support via `StreamableHTTPServerTransport`
- New HTTP server implementation (`src/http-server.ts`)
- HTTP integration tests (`test/http-integration.test.ts`)
- New binary `checklist-mcp-server-http` for HTTP server
- Environment variable support for port configuration (`PORT`)
- Migration guide (`MIGRATION.md`) for stdio to HTTP transition
- Enhanced documentation with HTTP setup instructions

### Changed
- **BREAKING**: Primary transport changed from stdio to HTTP streamable transport
- Server architecture refactored to support both stdio (legacy) and HTTP transports
- Updated MCP configuration examples to use HTTP transport
- Enhanced README with HTTP-specific setup and usage instructions
- Updated package description and keywords to reflect HTTP support
- Version bumped to 1.1.0 to reflect major transport change

### Deprecated
- Stdio transport is now considered legacy (still functional but not recommended)
- Old MCP configuration format with `command` and `args`

### Technical Details
- HTTP server runs on port 8585 by default (configurable via `PORT` environment variable)
- Uses Express.js for HTTP server implementation
- Maintains full backward compatibility with existing MCP tools and functionality
- All existing tools (`update_tasks`, `get_all_tasks`, `mark_task_as_done`, etc.) work identically over HTTP
- Improved error handling and logging for HTTP requests

### Migration Required
Users must update their MCP configuration from:
```json
{
  "mcpServers": {
    "checklist": {
      "command": "npx",
      "args": ["checklist-mcp-server"],
      "env": {}
    }
  }
}
```

To:
```json
{
  "mcpServers": {
    "checklist": {
      "transport": "http",
      "url": "http://localhost:8585/mcp"
    }
  }
}
```

## [1.0.1] - 2025-01-28

### Added
- Detailed descriptions for all MCP server tool endpoints
- Usage hints for `get_recent_works_info` tool
- Improved cache handling

### Changed
- Enhanced documentation with comprehensive tool descriptions
- Improved error handling and validation

## [1.0.0] - 2025-01-27

### Added
- Initial release with stdio transport
- Hierarchical task management with unlimited depth
- Session-based task isolation
- Work information management with LRU cache
- Six MCP tools: `update_tasks`, `get_all_tasks`, `mark_task_as_done`, `save_current_work_info`, `get_recent_works_info`, `get_work_by_id`
- Comprehensive test suite
- ASCII tree visualization for task hierarchies
- Agent handoff capabilities