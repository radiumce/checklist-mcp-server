# Migration Guide: stdio to HTTP Transport

## Overview

This version of the Checklist MCP Server has migrated from stdio transport to HTTP streamable transport for improved performance and better integration capabilities.

## What Changed

### Before (stdio transport)
- Server communicated via stdin/stdout
- Started as a child process
- Configuration used `command` and `args`

### After (HTTP streamable transport)
- Server runs as HTTP service on port 8585
- Communicates via HTTP POST requests
- Configuration uses `transport` and `url`

## Migration Steps

### 1. Update MCP Configuration

**Old Configuration:**
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

**New Configuration:**
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

### 2. Start the HTTP Server

Before connecting your MCP client, start the HTTP server:

```bash
# Install/update the package
npm install -g checklist-mcp-server@latest

# Start the HTTP server
checklist-mcp-server-http
# or
npm run start:http
```

### 3. Verify Connection

The server will log when it's ready:
```
Checklist MCP HTTP server running on port 8585
```

### 4. Update Client Code (if applicable)

If you're using the MCP SDK directly:

**Old (stdio):**
```typescript
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['checklist-mcp-server']
});
```

**New (HTTP):**
```typescript
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:8585/mcp')
);
```

## Benefits of HTTP Transport

1. **Better Performance**: Persistent connections and streaming support
2. **Easier Debugging**: HTTP requests can be inspected and tested with standard tools
3. **Scalability**: Can handle multiple concurrent clients
4. **Deployment Flexibility**: Can be deployed as a standalone service
5. **Monitoring**: Standard HTTP monitoring and logging tools work out of the box

## Troubleshooting

### Server Not Starting
- Check if port 8585 is available
- Use `PORT=3000 npm run start:http` to use a different port
- Update the URL in your MCP configuration accordingly

### Connection Refused
- Ensure the HTTP server is running before starting your MCP client
- Verify the URL in your configuration matches the server address

### Legacy stdio References
- Remove any `command` and `args` from your MCP configuration
- Ensure you're using the latest version of the package
- The old `checklist-mcp-server` binary still exists but is deprecated

## Support

If you encounter issues during migration, please check:
1. Server logs for error messages
2. MCP client logs for connection errors
3. Network connectivity to localhost:8585
4. Firewall settings if running on different hosts