#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createChecklistServer } from "./server.js";

async function main() {
    try {
        const server = createChecklistServer();
        const transport = new StdioServerTransport();

        await server.connect(transport);
        console.log("Checklist MCP Server (stdio) started");

    } catch (error) {
        console.error("Error during server initialization:", error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error("Unhandled error in main:", error);
    process.exit(1);
});
