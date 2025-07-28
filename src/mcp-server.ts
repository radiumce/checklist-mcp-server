#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createChecklistServer } from "./server.js";

async function main() {
    const server = createChecklistServer();
    const transport = new StdioServerTransport();
    server.connect(transport);
    console.log("Checklist MCP Server (stdio) started");
}

main();
