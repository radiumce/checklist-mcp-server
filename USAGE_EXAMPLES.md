# Usage Examples

This document provides practical examples of using the Checklist MCP Server with npx.

## Quick Start Examples

### 1. Basic HTTP Server

```bash
# Start server (default HTTP mode, port 8585)
npx checklist-mcp-server

# Output:
# Starting Checklist MCP Server in HTTP mode...
# HTTP server will run on port 8585
# MCP endpoint: http://localhost:8585/mcp
# Checklist MCP HTTP server running on port 8585
```

### 2. Custom Port

```bash
# Start HTTP server on port 3000
npx checklist-mcp-server --port 3000

# Or using short flag
npx checklist-mcp-server -p 3000
```

### 3. Legacy stdio Mode

```bash
# Start stdio server (for legacy MCP clients)
npx checklist-mcp-server stdio
```

### 4. Get Help

```bash
# Show help and usage information
npx checklist-mcp-server --help
```

## MCP Client Configuration Examples

### HTTP Transport (Recommended)

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

### Custom Port Configuration

```json
{
  "mcpServers": {
    "checklist": {
      "transport": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### stdio Transport (Legacy)

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

## Development Workflow Examples

### 1. Development with Auto-restart

```bash
# Terminal 1: Start server in development mode
npm run dev

# Terminal 2: Test with your MCP client
# The server will restart automatically when you make changes
```

### 2. Testing Different Modes

```bash
# Test HTTP mode
npx checklist-mcp-server &
SERVER_PID=$!

# Test your client here...

# Stop server
kill $SERVER_PID

# Test stdio mode
npx checklist-mcp-server stdio &
SERVER_PID=$!

# Test your client here...

# Stop server
kill $SERVER_PID
```

### 3. Production Deployment

```bash
# Install globally for production
npm install -g checklist-mcp-server

# Start with process manager (e.g., PM2)
pm2 start checklist-mcp-server --name "mcp-checklist" -- --port 8585

# Or use systemd service
sudo systemctl start checklist-mcp-server
```

## Integration Examples

### 1. With Kiro IDE

```json
// .kiro/settings/mcp.json
{
  "mcpServers": {
    "checklist": {
      "transport": "http",
      "url": "http://localhost:8585/mcp",
      "autoApprove": ["get_all_tasks", "get_recent_works_info"]
    }
  }
}
```

### 2. With Claude Desktop

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "checklist": {
      "transport": "http",
      "url": "http://localhost:8585/mcp"
    }
  }
}
```

### 3. With Custom MCP Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Connect to server
const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:8585/mcp')
);

const client = new Client({
  name: 'my-app',
  version: '1.0.0',
});

await client.connect(transport);

// Use the tools
const result = await client.callTool({
  name: 'update_tasks',
  arguments: {
    sessionId: 'my-session',
    path: '/',
    tasks: [
      {
        taskId: 'task1',
        description: 'My first task',
        status: 'TODO'
      }
    ]
  }
});

console.log(result);

// Clean up
await transport.close();
```

## Troubleshooting Examples

### 1. Port Already in Use

```bash
# Check what's using the port
lsof -i :8585

# Use a different port
npx checklist-mcp-server --port 8586
```

### 2. Server Not Responding

```bash
# Check if server is running
curl -X POST http://localhost:8585/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping"}'

# Check server logs
npx checklist-mcp-server 2>&1 | tee server.log
```

### 3. npx Cache Issues

```bash
# Clear npx cache
npm cache clean --force

# Force fresh install
npx --yes checklist-mcp-server@latest
```

## Advanced Usage

### 1. Environment Variables

```bash
# Set custom port via environment
PORT=9000 npx checklist-mcp-server

# Set log level
LOG_LEVEL=debug npx checklist-mcp-server
```

### 2. Docker Usage

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install the package
RUN npm install -g checklist-mcp-server

EXPOSE 8585

CMD ["checklist-mcp-server"]
```

```bash
# Build and run
docker build -t checklist-mcp .
docker run -p 8585:8585 checklist-mcp
```

### 3. Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checklist-mcp-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: checklist-mcp-server
  template:
    metadata:
      labels:
        app: checklist-mcp-server
    spec:
      containers:
      - name: checklist-mcp-server
        image: node:18-alpine
        command: ["npx", "checklist-mcp-server"]
        ports:
        - containerPort: 8585
        env:
        - name: PORT
          value: "8585"
---
apiVersion: v1
kind: Service
metadata:
  name: checklist-mcp-service
spec:
  selector:
    app: checklist-mcp-server
  ports:
  - port: 8585
    targetPort: 8585
  type: LoadBalancer
```

## Performance Tips

1. **Use HTTP transport** for better performance than stdio
2. **Keep sessions organized** - use meaningful session IDs
3. **Batch operations** when possible
4. **Monitor memory usage** with large task hierarchies
5. **Use appropriate ports** - avoid conflicts with other services

## Security Considerations

1. **Network access**: HTTP server is accessible to all network interfaces by default
2. **Authentication**: No built-in authentication - use reverse proxy if needed
3. **Rate limiting**: Consider implementing rate limiting for production use
4. **Data persistence**: Data is stored in memory only - consider backup strategies