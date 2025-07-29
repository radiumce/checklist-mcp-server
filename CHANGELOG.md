# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-01-29

### Fixed
- **HTTP client compatibility**: Fixed issue where certain MCP clients would receive `undefined` request body
- **JSON parsing**: Improved request body parsing using `express.raw()` with manual JSON parsing
- **Client connection stability**: Enhanced HTTP transport reliability for various client implementations

### Changed
- Simplified HTTP server implementation by removing verbose debug logging
- Improved error handling for malformed JSON requests
- Streamlined server startup process

### Technical Details
- Replaced `express.json()` middleware with `express.raw()` + manual JSON parsing
- This resolves compatibility issues with specific MCP client implementations on macOS
- Maintains full backward compatibility with all existing functionality

## [1.1.0] - 2025-01-29

### Added
- **npx support**: Direct installation and startup via `npx checklist-mcp-server`
- **Smart CLI**: New command-line interface (`src/cli.ts`) with help and options
- **HTTP streamable transport support** via `StreamableHTTPServerTransport`
- **Port configuration**: `--port` option for custom HTTP server ports
- **Multiple startup modes**: HTTP (default) and stdio (legacy) modes
- New HTTP server implementation (`src/http-server.ts`)
- HTTP integration tests (`test/http-integration.test.ts`)
- Multiple binaries: `checklist-mcp-server`, `checklist-mcp-server-http`, `checklist-mcp-server-stdio`
- Environment variable support for port configuration (`PORT`)
- Migration guide (`MIGRATION.md`) for stdio to HTTP transition
- Enhanced documentation with npx usage examples

### Changed
- **Primary entry point**: `npx checklist-mcp-server` now starts HTTP server by default
- **Simplified usage**: No installation required with npx
- **Enhanced CLI**: Interactive help and better error messages
- Server architecture refactored to support both stdio (legacy) and HTTP transports
- Updated MCP configuration examples to use HTTP transport
- Enhanced README with npx usage examples and simplified setup
- Updated package description and keywords to reflect HTTP support
- Version bumped to 1.1.0 to reflect major transport and CLI improvements

### Deprecated
- Stdio transport is now considered legacy (still functional but not recommended)
- Old MCP configuration format with `command` and `args`

### Technical Details
- HTTP server runs on port 8585 by default (configurable via `PORT` environment variable)
- Uses Express.js for HTTP server implementation
- Maintains full backward compatibility with existing MCP tools and functionality
- All existing tools (`update_tasks`, `get_all_tasks`, `mark_task_as_done`, etc.) work identically over HTTP
- Improved error handling and logging for HTTP requests

### Usage Examples

**Quick start with npx (no installation):**
```bash
npx checklist-mcp-server                    # HTTP server on port 8585
npx checklist-mcp-server --port 3000        # HTTP server on port 3000
npx checklist-mcp-server stdio              # stdio server (legacy)
```

**MCP Configuration Options:**

HTTP transport (recommended):
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

Stdio transport (legacy, still supported):
```json
{
  "mcpServers": {
    "checklist": {
      "command": "npx",
      "args": ["checklist-mcp-server", "stdio"]
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