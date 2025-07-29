#!/usr/bin/env node

console.log(`
🎉 Checklist MCP Server installed successfully!

Quick start:
  npx checklist-mcp-server                    # Start HTTP server (recommended)
  npx checklist-mcp-server --port 3000        # Custom port
  npx checklist-mcp-server stdio              # Legacy stdio mode
  npx checklist-mcp-server --help             # Show help

Configure your MCP client:
{
  "mcpServers": {
    "checklist": {
      "transport": "http",
      "url": "http://localhost:8585/mcp"
    }
  }
}

Documentation: https://github.com/your-repo/checklist-mcp-server
`);