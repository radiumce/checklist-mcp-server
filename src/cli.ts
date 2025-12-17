#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname, join } from 'path';

// Use a simple approach - the compiled files will be in the same directory
const currentDir = __dirname;

function showHelp() {
  console.log(`
Checklist MCP Server v1.1.0

Usage:
  npx checklist-mcp-server [command] [options]

Commands:
  http, start     Start HTTP server (default)
  help, --help    Show this help message

Options:
  --port, -p      Port for HTTP server (default: 8585)

Examples:
  npx checklist-mcp-server                    # Start HTTP server on port 8585
  npx checklist-mcp-server http               # Start HTTP server on port 8585
  npx checklist-mcp-server http --port 3000   # Start HTTP server on port 3000

For HTTP mode, configure your MCP client with:
{
  "mcpServers": {
    "checklist": {
      "transport": "http",
      "url": "http://localhost:8585/mcp"
    }
  }
}


`);
}

function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let command = 'http'; // default to HTTP
  let port = '8585';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === 'help' || arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === 'http' || arg === 'start') {
      command = 'http';

    } else if (arg === '--port' || arg === '-p') {
      if (i + 1 < args.length) {
        port = args[i + 1];
        i++; // skip next argument
      } else {
        console.error('Error: --port requires a value');
        process.exit(1);
      }
    } else {
      console.error(`Error: Unknown argument '${arg}'`);
      console.error('Use --help for usage information');
      process.exit(1);
    }
  }

  // Set environment variables
  if (command === 'http') {
    process.env.PORT = port;
  }

  // Determine which server to start
  const serverPath = join(currentDir, 'http-server.js');

  console.log(`Starting Checklist MCP Server in ${command.toUpperCase()} mode...`);
  console.log(`HTTP server will run on port ${port}`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);

  // Start the server
  const child = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  child.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    child.kill('SIGTERM');
  });
}

main();