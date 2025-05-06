# Checklist MCP Server

A simple example implementation of a Model Context Protocol (MCP) server that manages checklists.

This server uses the `@modelcontextprotocol/sdk` and provides basic functionality to save, retrieve, and check off tasks associated with different sessions.

## Features

*   Manages multiple checklists using session IDs.
*   Provides MCP tools to interact with checklists.
*   Uses in-memory storage (tasks are lost when the server stops).
*   Includes basic tests using the MCP client SDK.
*   Structured logging using Pino.

## Prerequisites

*   Node.js (v18 or later recommended)
*   npm (comes with Node.js)

## Installation

1.  Clone the repository (if you haven't already):
    ```bash
    git clone https://github.com/radiumce/checklist-mcp-server.git
    cd checklist-mcp-server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

## Building

Compile the TypeScript code to JavaScript:

```bash
npm run build
```

This will generate the output in the `dist/` directory.

## Running the Server

This server is designed to communicate via standard input/output (stdio) as per the MCP specification. It's typically invoked by an MCP client or orchestrator.

To run it directly (primarily for debugging or manual interaction, though not the standard use case):

```bash
node dist/server.js
```

You would then need to send MCP JSON messages via stdin and read responses from stdout.

## Running Tests

The project includes an integration test suite that uses the MCP client SDK to interact with the server via stdio.

To run the tests:

```bash
npm run test
```

This command first builds the project and then executes the tests defined in `test/run_tests.ts`.

## Project Structure

```
.
├── dist/             # Compiled JavaScript output
├── node_modules/     # Installed dependencies
├── src/
│   └── server.ts     # Main server logic and tool definitions
├── test/
│   └── run_tests.ts  # Integration tests using MCP client
├── .gitignore        # Git ignore rules
├── package.json      # Project metadata and dependencies
├── package-lock.json # Locked dependency versions
├── README.md         # This file
└── tsconfig.json     # TypeScript configuration
```

## MCP Tools Provided

*   `save_tasks`: Saves or replaces a list of tasks for a session. Creates a new session if no ID is provided.
*   `get_all_tasks`: Retrieves all tasks for a given session ID.
*   `check_task`: Marks a specific task as DONE within a session.
