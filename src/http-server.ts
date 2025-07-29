#!/usr/bin/env node
import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { createChecklistServer } from './server';

const app = express();
app.use(express.json());

const MCP_ENDPOINT = "/mcp";
const PORT = process.env.PORT || 8585;

// Get the base checklist server
const mcpServer = createChecklistServer();


app.post(MCP_ENDPOINT, async (req: Request, res: Response) => {
  console.log('Received MCP request');
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    // Note: We connect the single mcpServer instance to a new transport for each request.
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on('close', () => {
      console.log('Request stream closed, cleaning up transport.');
      transport.close();
    });
  } catch (error: any) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error: ' + error.message,
        },
        id: req.body?.id || null,
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Checklist MCP HTTP server running on port ${PORT}`);
});
