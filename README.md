# Checklist MCP Server

[![npm version](https://badge.fury.io/js/checklist-mcp-server.svg)](https://badge.fury.io/js/checklist-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/checklist-mcp-server.svg)](https://www.npmjs.com/package/checklist-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server for hierarchical checklist management with session-based task organization and tree visualization, supporting HTTP streamable transport.

## Overview

The Checklist MCP Server provides a robust solution for managing hierarchical task lists through the Model Context Protocol. It enables AI assistants and other MCP clients to create, update, and track tasks in a structured, tree-like format with support for multiple concurrent sessions. The server supports both HTTP streamable transport (recommended) and stdio transport (legacy). It can significantly enhance the agent's ability to adhere to the task plan during task execution.

## 🚀 Quick Start

Get started in seconds with npx (no installation required):

```bash
# Start the server (HTTP mode, port 8585)
npx checklist-mcp-server

# The server will show:
# Starting Checklist MCP Server in HTTP mode...
# HTTP server will run on port 8585
# MCP endpoint: http://localhost:8585/mcp
# Checklist MCP HTTP server running on port 8585
```

### Installation Options

```bash
# Option 1: Use with npx (recommended, no installation)
npx checklist-mcp-server

# Option 2: Install globally
npm install -g checklist-mcp-server
checklist-mcp-server

# Option 3: Install locally in project
npm install checklist-mcp-server
npx checklist-mcp-server
```

Then configure your MCP client:

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

That's it! No installation required. 🎉

📖 **See [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md) for more detailed examples and integration guides.**

## Features

- **HTTP Streamable Transport**: Modern HTTP-based communication for better performance and scalability
- **Hierarchical Task Management**: Create nested task structures with unlimited depth
- **Session-Based Isolation**: Multiple independent task lists per session
- **Visual Tree Display**: ASCII tree visualization with status indicators (✓ for DONE, ○ for TODO)
- **Path-Based Operations**: Update tasks at specific hierarchy levels using path notation
- **Flexible Task IDs**: Support for alphanumeric characters and common symbols (1-20 characters)
- **Comprehensive Validation**: Input validation with detailed error messages
- **Real-time Updates**: Immediate task status changes with full hierarchy display
- **Work Information Management**: LRU cache-based system for storing and sharing work summaries between agents
- **Session Association**: Link work information with task sessions to capture task state snapshots
- **Agent Handoffs**: Enable seamless work context transfer between LLM agents

## ⚠️ Important: Transport Protocol Change

**This version no longer supports stdio transport.** The server has been migrated to use HTTP streamable transport exclusively for improved performance and better integration with modern MCP clients.

### Migration from stdio to HTTP

If you were previously using stdio configuration:

```json
// ❌ Old stdio configuration (no longer supported)
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

Update to HTTP configuration:

```json
// ✅ New HTTP configuration
{
  "mcpServers": {
    "checklist": {
      "transport": "http",
      "url": "http://localhost:8585/mcp"
    }
  }
}
```


## Installation and Setup

### Quick Start with npx (Recommended)

The easiest way to use the server is with npx - no installation required:

```bash
# Start HTTP server (recommended, default port 8585)
npx checklist-mcp-server

# Start HTTP server on custom port
npx checklist-mcp-server --port 3000

# Start stdio server (legacy mode)
npx checklist-mcp-server stdio

# Show help
npx checklist-mcp-server --help
```

### Installation

For frequent use, you can install globally:

```bash
npm install -g checklist-mcp-server

# Then run directly
checklist-mcp-server
checklist-mcp-server --port 3000
checklist-mcp-server stdio
```

### Alternative Running Methods

```bash
# Using specific binaries
npx checklist-mcp-server-http        # HTTP server only
npx checklist-mcp-server-stdio       # stdio server only

# Using npm scripts (for development)
npm run start:http                   # HTTP server
npm run start                        # stdio server
```

### MCP Configuration

#### HTTP Transport (Recommended)

Configure your MCP client to connect to the HTTP server:

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

Start the server with: `npx checklist-mcp-server`

#### Stdio Transport (Legacy)

For legacy stdio transport:

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

**Note**: HTTP transport is recommended for better performance and features.

## HTTP Server Configuration

### Environment Variables

- `PORT`: Server port (default: 8585)
- `NODE_ENV`: Environment mode (development/production)

### Server Endpoints

- `POST /mcp`: Main MCP endpoint for all tool calls and protocol communication

### Development Mode

For development with auto-reload:

```bash
npm run dev:http
```

### Production Deployment

For production deployment, build the project first:

```bash
npm run build
npm run start:http
```

### Health Check

The server logs startup confirmation:
```
Checklist MCP HTTP server running on port 8585
```

### Client Connection

Use the StreamableHTTPClientTransport from the MCP SDK:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:8585/mcp')
);
const client = new Client({
  name: 'your-client-name',
  version: '1.0.0',
});

await client.connect(transport);
```


## Available Tools

The server provides six MCP tools for comprehensive task and work information management:

### Task Management Tools

### 1. `update_tasks`

Updates tasks at a specific hierarchy level within a session.

**Parameters:**
- `sessionId` (string, required): Unique session identifier (1-100 characters, alphanumeric with hyphens/underscores)
- `path` (string, optional): Hierarchical path specifying where to update tasks (default: "/")
- `tasks` (array, required): Array of task objects to set at the specified path

**Task Object Structure:**
```typescript
{
  taskId: string;        // 1-20 characters, letters/numbers/symbols (excluding / \ : * ? " < > |)
  description: string;   // Human-readable task description (max 1000 characters)
  status?: 'TODO' | 'DONE'; // Task status (default: 'TODO')
  children?: Task[];     // Optional array of subtasks
}
```

**Path Examples:**
- `"/"` - Root level (replaces entire task list)
- `"/auth1/"` - Children of task 'auth1'
- `"/auth1/api2/"` - Children of task 'api2' under 'auth1'

**Example Usage:**
```json
{
  "sessionId": "project-alpha",
  "path": "/",
  "tasks": [
    {
      "taskId": "setup",
      "description": "Project setup tasks",
      "status": "TODO",
      "children": [
        {
          "taskId": "deps",
          "description": "Install dependencies",
          "status": "DONE"
        },
        {
          "taskId": "config",
          "description": "Configure environment",
          "status": "TODO"
        }
      ]
    }
  ]
}
```

### 2. `get_all_tasks`

Retrieves all tasks for a session with formatted tree visualization.

**Parameters:**
- `sessionId` (string, required): Session identifier to retrieve tasks from

**Response:**
Returns a formatted ASCII tree showing the complete task hierarchy with status indicators.

**Example Usage:**
```json
{
  "sessionId": "project-alpha"
}
```

**Example Response:**
```
├── ○ setup: Project setup tasks
│   ├── ✓ deps: Install dependencies
│   └── ○ config: Configure environment
└── ○ testing: Testing tasks
    └── ○ unit: Write unit tests
```

### 3. `mark_task_as_done`

Marks a specific task as 'DONE' using hierarchical task search.

**Parameters:**
- `sessionId` (string, required): Session identifier containing the task
- `taskId` (string, required): Unique identifier of the task to mark as done

**Features:**
- Finds tasks at any depth in the hierarchy
- Preserves subtask independence (marking parent doesn't affect children)
- Returns complete updated hierarchy after marking

**Example Usage:**
```json
{
  "sessionId": "project-alpha",
  "taskId": "config"
}
```

### Work Information Management Tools

### 4. `save_current_work_info`

Saves current work information with summary and description to an LRU cache for sharing between agents.

**Parameters:**
- `work_summarize` (string, required): Full work summary text describing current progress and context (max 5000 characters)
- `work_description` (string, required): Short description for easy identification (max 200 characters)
- `sessionId` (string, optional): Session ID to associate work with current tasks and capture task snapshot

**Features:**
- Generates unique 8-digit numeric work ID
- Creates human-readable timestamp (ISO format)
- Captures static task snapshot when sessionId provided
- Overwrites existing entry if same sessionId used
- LRU eviction when cache exceeds capacity (default 10 entries)

**Example Usage:**
```json
{
  "work_summarize": "Completed user authentication API endpoints including login, logout, and token refresh. All endpoints are tested and documented. Next step is to implement password reset functionality.",
  "work_description": "User Auth API - Phase 1 Complete",
  "sessionId": "auth-project-2024"
}
```

**Example Response:**
```
Successfully saved work information with ID: 12345678
Timestamp: 2024-01-15T10:30:45.123Z
Associated with session 'auth-project-2024' and captured task snapshot
```

### 5. `get_recent_works_info`

Retrieves a list of recent work information entries ordered by most recently used.

**Parameters:** None

**Response Format:**
Returns JSON array with work summaries containing:
- `workId`: Unique 8-digit identifier
- `work_timestamp`: Human-readable timestamp
- `work_description`: Short description for identification

**Example Usage:**
```json
{}
```

**Example Response:**
```json
{
  "works": [
    {
      "workId": "12345678",
      "work_timestamp": "2024-01-15T10:30:45.123Z",
      "work_description": "User Auth API - Phase 1 Complete"
    },
    {
      "workId": "87654321",
      "work_timestamp": "2024-01-15T09:15:22.456Z",
      "work_description": "Database Schema Updates"
    }
  ]
}
```

### 6. `get_work_by_id`

Retrieves detailed work information by workId, including full summary and associated task snapshot.

**Parameters:**
- `workId` (string, required): The unique 8-digit numeric identifier of the work to retrieve

**Response Format:**
Returns JSON object containing:
- `workId`: The work identifier
- `work_timestamp`: Human-readable timestamp
- `work_description`: Short description
- `work_summarize`: Full work summary text
- `work_tasks` (optional): Static task snapshot from save time if sessionId was provided

**Features:**
- Updates LRU access order when work is retrieved
- Returns static task snapshot from save time (not current task status)
- Clear error messages for invalid or non-existent work IDs

**Example Usage:**
```json
{
  "workId": "12345678"
}
```

**Example Response:**
```json
{
  "workId": "12345678",
  "work_timestamp": "2024-01-15T10:30:45.123Z",
  "work_description": "User Auth API - Phase 1 Complete",
  "work_summarize": "Completed user authentication API endpoints including login, logout, and token refresh. All endpoints are tested and documented. Next step is to implement password reset functionality.",
  "work_tasks": [
    {
      "taskId": "auth",
      "description": "Authentication system",
      "status": "TODO",
      "children": [
        {
          "taskId": "login",
          "description": "Login endpoint",
          "status": "DONE"
        },
        {
          "taskId": "logout",
          "description": "Logout endpoint", 
          "status": "DONE"
        }
      ]
    }
  ]
}
```

## Work Information Data Format

### WorkInfo Structure
```typescript
interface WorkInfo {
  workId: string;           // 8-digit numeric ID (e.g., "12345678")
  work_timestamp: string;   // ISO format timestamp (e.g., "2024-01-15T10:30:45.123Z")
  work_description: string; // Short description (max 200 chars)
  work_summarize: string;   // Full work summary (max 5000 chars)
  sessionId?: string;       // Optional session association
  work_tasks?: any;         // Static task snapshot from save time
}
```

### LRU Cache Behavior
- **Capacity**: Default 10 entries, configurable
- **Eviction**: Least Recently Used when capacity exceeded
- **Access Tracking**: Updated on save_current_work_info and get_work_by_id operations
- **Overwrite Logic**: Same sessionId overwrites existing entry
- **Memory Management**: Automatic cleanup, ~50KB maximum memory usage

## Usage Examples

### Task Management Examples

#### Basic Task Management

```javascript
// Initialize HTTP client
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:8585/mcp')
);
const client = new Client({
  name: 'task-management-client',
  version: '1.0.0',
});

await client.connect(transport);

// Create initial tasks
await client.callTool({
  name: 'update_tasks',
  arguments: {
    sessionId: 'my-project',
    path: '/',
    tasks: [
      {
        taskId: 'backend',
        description: 'Backend development',
        children: [
          { taskId: 'api', description: 'Build REST API' },
          { taskId: 'db', description: 'Setup database' }
        ]
      },
      {
        taskId: 'frontend',
        description: 'Frontend development'
      }
    ]
  }
});

// Mark a task as done
await client.callTool({
  name: 'mark_task_as_done',
  arguments: {
    sessionId: 'my-project',
    taskId: 'api'
  }
});

// Get current status
await client.callTool({
  name: 'get_all_tasks',
  arguments: {
    sessionId: 'my-project'
  }
});

// Clean up
await transport.close();
```

#### Hierarchical Updates

```javascript
// Add subtasks to existing task
await client.callTool({
  name: 'update_tasks',
  arguments: {
    sessionId: 'my-project',
    path: '/backend/',
    tasks: [
      { taskId: 'api', description: 'Build REST API', status: 'DONE' },
      { taskId: 'db', description: 'Setup database' },
      { taskId: 'auth', description: 'Implement authentication' }
    ]
  }
});
```

### Work Information Management Examples

#### Agent Work Handoff Workflow

```javascript
// Agent 1: Save work progress with task association
await client.callTool({
  name: 'save_current_work_info',
  arguments: {
    work_summarize: 'Completed user registration API with validation. Implemented email verification flow and password hashing. All unit tests passing. Ready to start login functionality.',
    work_description: 'User Registration API Complete',
    sessionId: 'user-auth-sprint'
  }
});
// Returns: workId "12345678"

// Agent 2: Get recent work to understand context
await client.callTool({
  name: 'get_recent_works_info',
  arguments: {}
});

// Agent 2: Get detailed work information
await client.callTool({
  name: 'get_work_by_id',
  arguments: {
    workId: '12345678'
  }
});
// Returns full context including task snapshot from when work was saved
```

#### Work Progress Tracking

```javascript
// Save work without session association
await client.callTool({
  name: 'save_current_work_info',
  arguments: {
    work_summarize: 'Researched three different authentication libraries. JWT with refresh tokens seems best approach. Created comparison document and architecture proposal.',
    work_description: 'Auth Library Research Complete'
  }
});

// Update work for same session (overwrites previous entry)
await client.callTool({
  name: 'save_current_work_info',
  arguments: {
    work_summarize: 'Updated authentication implementation. Added JWT middleware and refresh token rotation. All endpoints secured. Performance testing shows 200ms average response time.',
    work_description: 'Auth Implementation Updated',
    sessionId: 'user-auth-sprint'
  }
});
```

#### Multi-Agent Collaboration

```javascript
// Agent A: Complete database work and save progress
await client.callTool({
  name: 'save_current_work_info',
  arguments: {
    work_summarize: 'Database schema finalized with user, session, and audit tables. All migrations tested. Indexes optimized for query performance. Ready for API integration.',
    work_description: 'Database Schema Complete',
    sessionId: 'backend-setup'
  }
});

// Agent B: Check recent work before starting
const recentWorks = await client.callTool({
  name: 'get_recent_works_info',
  arguments: {}
});

// Agent B: Get specific work details to understand database structure
const dbWork = await client.callTool({
  name: 'get_work_by_id',
  arguments: {
    workId: recentWorks.works[0].workId
  }
});

// Agent B: Continue with API development using database context
```

## Error Handling and Troubleshooting

### Common Error Scenarios

#### Task Management Errors

**Invalid Session ID:**
```
Error: Session ID can only contain alphanumeric characters, hyphens, and underscores
```
- **Solution**: Use only letters, numbers, hyphens, and underscores in session IDs
- **Valid**: `project-alpha`, `user_auth_2024`, `sprint1`
- **Invalid**: `project@alpha`, `user auth`, `sprint#1`

**Invalid Path:**
```
Error: Invalid path '/nonexistent/' - target task 'nonexistent' not found
```
- **Solution**: Ensure parent tasks exist before updating their children
- **Check**: Use `get_all_tasks` to verify current task structure

**Duplicate Task ID:**
```
Error: Task ID 'auth' already exists at path '/backend/auth'
```
- **Solution**: Use unique task IDs within the session or update at the correct path
- **Note**: Task IDs must be unique across the entire session hierarchy

**Invalid Task ID Format:**
```
Error: Task ID 'task/with/slashes' has invalid format
```
- **Solution**: Avoid these characters in task IDs: `/ \ : * ? " < > |`
- **Valid**: `task-1`, `auth_api`, `user@login`, `step.1`

#### Work Information Errors

**Invalid Work ID:**
```
Error: Input validation failed: workId must be exactly 8 digits
```
- **Solution**: Use the exact 8-digit work ID returned by `save_current_work_info`
- **Example**: `12345678` (not `1234567` or `123456789`)

**Work Not Found:**
```
Error: Work not found: No work information exists for workId '99999999'
```
- **Solution**: Verify work ID exists using `get_recent_works_info`
- **Note**: Work may have been evicted from LRU cache if capacity exceeded

**Input Validation:**
```
Error: Input validation failed: work_description cannot exceed 200 characters
```
- **Solution**: Keep descriptions concise (≤200 chars) and summaries detailed (≤5000 chars)

**Session Association Warning:**
```
Warning: sessionId 'nonexistent-session' does not exist in task store
```
- **Impact**: Work is saved but no task snapshot captured
- **Solution**: Create tasks in session first, or save work without sessionId

### Best Practices

#### Task Management
1. **Use descriptive task IDs**: `user-login` instead of `task1`
2. **Keep descriptions clear**: Include enough context for other agents
3. **Validate paths**: Check task structure with `get_all_tasks` before complex updates
4. **Handle errors gracefully**: Check for error messages in responses

#### Work Information Management
1. **Write comprehensive summaries**: Include current state, completed work, and next steps
2. **Use meaningful descriptions**: Help other agents quickly identify relevant work
3. **Associate with sessions**: Link work to task sessions for complete context
4. **Monitor cache capacity**: Recent work may be evicted after 10 entries
5. **Handle missing work**: Check `get_recent_works_info` if specific work ID not found

#### Agent Collaboration
1. **Check recent work first**: Use `get_recent_works_info` to understand current context
2. **Save progress frequently**: Don't lose work context between agent handoffs
3. **Include next steps**: Help subsequent agents understand what to do next
4. **Use consistent session IDs**: Enable work association and task context sharing

### Debugging Tips

1. **Enable logging**: Check server logs for detailed error information
2. **Validate inputs**: Ensure all required fields are provided with correct formats
3. **Test incrementally**: Start with simple operations before complex workflows
4. **Check cache state**: Use `get_recent_works_info` to understand current work cache
5. **Verify task structure**: Use `get_all_tasks` to confirm session task hierarchy
6. **HTTP connectivity**: Ensure the server is running and accessible at the configured URL
7. **Transport cleanup**: Always close HTTP transports properly to avoid connection leaks

### Troubleshooting npx Usage

**Server won't start:**
```bash
# Check if port is in use
lsof -i :8585

# Use different port
npx checklist-mcp-server --port 3000

# Check for errors
npx checklist-mcp-server 2>&1 | tee server.log
```

**npx command not found:**
```bash
# Update npm/node
npm install -g npm@latest

# Clear npx cache
npx --yes checklist-mcp-server
```

**Permission issues:**
```bash
# On Unix systems, ensure execute permissions
chmod +x ~/.npm/_npx/*/node_modules/.bin/checklist-mcp-server
```

## Testing

### Running Tests

The project includes comprehensive test suites for both core functionality and HTTP integration:

```bash
# Run all tests
npm test

# Run core functionality tests
npm run test:core

# Run HTTP integration tests (requires server to be built)
npm run test:http

# Run integration tests
npm run test:integration
```

### HTTP Integration Tests

The HTTP integration tests automatically:
1. Start the HTTP server on port 8585
2. Create an HTTP client with StreamableHTTPClientTransport
3. Test all MCP tools over HTTP
4. Clean up server and client connections

Example test output:
```
🚀 Setting up HTTP Integration Test Suite
✅ Server started, initializing client...
🧪 Running HTTP Integration Tests
✅ PASS update_tasks over HTTP
✅ PASS get_all_tasks over HTTP  
✅ PASS mark_task_as_done over HTTP
🎉 All HTTP integration tests passed!
```

### Manual Testing with curl

You can also test the HTTP endpoint directly:

```bash
# Start the server
npm run start:http

# Test with curl (example MCP request)
curl -X POST http://localhost:8585/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_all_tasks",
      "arguments": {
        "sessionId": "test-session"
      }
    }
  }'
```
