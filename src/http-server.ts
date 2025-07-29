#!/usr/bin/env node
import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createChecklistServer } from './server';

const app = express();

// 使用express.raw()来保存原始请求体，然后手动解析JSON
// 这个修复解决了某些客户端连接时req.body为undefined的问题
app.use(express.raw({ type: 'application/json', limit: '10mb' }));

// 手动解析JSON
app.use((req, res, next) => {
  if (req.body && Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString('utf8'));
    } catch (error) {
      console.error('JSON parse error:', error);
      req.body = null;
    }
  }
  next();
});

const MCP_ENDPOINT = "/mcp";
const PORT = process.env.PORT || 8585;

// Get the base checklist server
const mcpServer = createChecklistServer();

// 添加健康检查端点
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'checklist-mcp-server',
    version: '1.1.0'
  });
});

// 添加根路径处理
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Checklist MCP Server is running',
    endpoint: MCP_ENDPOINT,
    timestamp: new Date().toISOString()
  });
});

app.post(MCP_ENDPOINT, async (req: Request, res: Response) => {
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    // Note: We connect the single mcpServer instance to a new transport for each request.
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on('close', () => {
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
