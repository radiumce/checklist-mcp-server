# Checklist MCP Server

A Model Context Protocol (MCP) server for hierarchical checklist management with session-based task organization and tree visualization.

## Overview

The Checklist MCP Server provides a robust solution for managing hierarchical task lists through the Model Context Protocol. It enables AI assistants and other MCP clients to create, update, and track tasks in a structured, tree-like format with support for multiple concurrent sessions. It can significantly enhance the agent's ability to adhere to the task plan during task execution.

## Features

- **Hierarchical Task Management**: Create nested task structures with unlimited depth
- **Session-Based Isolation**: Multiple independent task lists per session
- **Visual Tree Display**: ASCII tree visualization with status indicators (✓ for DONE, ○ for TODO)
- **Path-Based Operations**: Update tasks at specific hierarchy levels using path notation
- **Flexible Task IDs**: Support for alphanumeric characters and common symbols (1-20 characters)
- **Comprehensive Validation**: Input validation with detailed error messages
- **Real-time Updates**: Immediate task status changes with full hierarchy display


## MCP Configuration

```json
{
  "mcpServers": {
    "checklist": {
      "command": "npx",
      "args": [
        "checklist-mcp-server"
      ],
      "env": {}
    }
  }
}
```


## Available Tools

The server provides three MCP tools for comprehensive task management:

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

## Usage Examples

### Basic Task Management

```javascript
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
```

### Hierarchical Updates

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
