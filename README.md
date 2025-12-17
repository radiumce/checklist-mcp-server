# Checklist MCP Server

An MCP (Model Context Protocol) server for managing hierarchical checklists and tracking work context, designed to help AI agents manage long-running tasks and maintain state across sessions.

## Features

- **Hierarchical Task Management**: Create and manage nested checklists.
- **Work Context Saving**: Save snapshots of current work state (including tasks and summaries) to restore context later.
- **Multi-tenancy Support**: Built-in support for multiple isolated environments using namespaces.
- **HTTP/SSE Transport**: Uses the standard MCP HTTP transport with Server-Sent Events (SSE).

## Tools

| Tool Name | Description |
|-----------|-------------|
| `update_tasks` | Create new tasks or overwrite existing tasks at a specific hierarchical path. |
| `mark_task_as_done` | Mark a specific task as completed. |
| `get_all_tasks` | Retrieve the complete hierarchical list of tasks for the current session. |
| `save_current_work_info` | Save a snapshot of the current work session (tasks + summary) for later retrieval. |
| `get_recent_works_info` | Retrieve a summary list of recently saved work snapshots. |
| `get_work_by_id` | Retrieve full details of a specific work snapshot by its ID. |

## Quick Start

### Running Locally (Node.js)

You can run the server directly using `npx` or `npm`.

**Using npx:**
```bash
npx checklist-mcp-server
```

**Using npm:**
```bash
git clone https://github.com/chene/checklist-mcp-server.git
cd checklist-mcp-server
npm install
npm run build
npm run start:http
```

The server will start on port `8585` by default.

### Running with Docker

```bash
docker run -d -p 8585:8585 --name checklist-mcp-server checklist-mcp-server:latest
```

For more detailed Docker instructions, see [DOCKER.md](DOCKER.md).

## Configuration

### MCP Client Configuration

Configure your MCP client (e.g., Claude Desktop, custom agent) to connect to the HTTP endpoint.

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

### Multi-tenancy (Namespaces)

This server supports multi-tenancy via the `namespace` query parameter. This allows multiple agents or users to store distinct data within the same server instance.

To use a specific namespace, append `?namespace=<your_namespace>` to the server URL.

**Example Client Config for a specific namespace:**

```json
{
  "mcpServers": {
    "project-alpha": {
      "transport": "http",
      "url": "http://localhost:8585/mcp?namespace=project-alpha"
    },
    "project-beta": {
      "transport": "http",
      "url": "http://localhost:8585/mcp?namespace=project-beta"
    }
  }
}
```

If no namespace is provided, the server defaults to the `default` namespace.

## License

MIT
