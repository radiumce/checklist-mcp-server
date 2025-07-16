# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Build TypeScript to JavaScript**: `npm run build`
- **Run server in dev mode**: `npm run dev`
- **Start compiled server**: `npm run start`
- **Run full test suite**: `npm run test` (builds then runs tests)
- **Run tests directly**: `ts-node test/run_tests.ts`

## Architecture Overview

This is a TypeScript MCP (Model Context Protocol) server implementing checklist management. It uses:

- **MCP SDK**: `@modelcontextprotocol/sdk` for server/client communication
- **Transport**: Stdio (standard input/output) for MCP communication
- **Storage**: In-memory Map keyed by sessionId, tasks lost on server restart
- **Logging**: Pino logger writing to stderr at info level
- **Schema**: Zod for runtime type validation/casting

## Core Components

**src/server.ts:178-183** - Entry point with `main()` function that:
- Creates McpServer instance with "checklist-mcp-server" name
- Registers 3 MCP tools: save_tasks, get_all_tasks, mark_task_as_done
- Uses StdioServerTransport bound to stdio endpoints

**MCP Tools**: 
- `save_tasks`: Creates/replaces tasks for a session, auto-generates UUID if no sessionId
- `mark_task_as_done`: Marks specific task as DONE, returns full updated list
- `get_all_tasks`: Retrieves all tasks for a session with formatted status output

**test/run_tests.ts** - Integration tests using MCP client SDK via stdio:
- Tests all 3 server tools with various scenarios
- Extracts sessionId from text responses via regex matching
- Verifies formatted task output with status indicators

## Project Structure

- `src/server.ts` - Single file server implementation
- `test/run_tests.ts` - Comprehensive integration test suite
- `dist/server.js` - Compiled JS output (build target)
- `tsconfig.json` - NodeNext modules, ES2022 target, strict mode
- Uses package.json scripts: build, start, dev, test