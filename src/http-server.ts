#!/usr/bin/env node
import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createChecklistServer } from './server.js';
import { runInNamespace } from './utils/namespaceContext.js';
import { URL } from 'url';
import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';
const logger = pino({ level: logLevel }, pino.destination(2));

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
// Debug logging middleware
app.use((req, res, next) => {
  if (logger.level !== 'debug') {
    return next();
  }

  logger.debug({ method: req.method, url: req.url, headers: req.headers }, 'Incoming request');

  // Hook into response to log output
  const originalWrite = res.write;
  const originalEnd = res.end;

  const chunks: Buffer[] = [];

  res.write = function (chunk: any, ...args: any[]) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return originalWrite.apply(res, [chunk, ...args] as any);
  };

  res.end = function (chunk: any, ...args: any[]) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const body = Buffer.concat(chunks).toString('utf8');
    logger.debug({ statusCode: res.statusCode, body }, 'Outgoing response');
    return originalEnd.apply(res, [chunk, ...args] as any);
  };

  next();
});

const MCP_ENDPOINT = "/mcp";
const PORT = process.env.PORT || 8585;

// Create singleton MCP server instance
const mcpServer = createChecklistServer();
logger.info('MCP Server instance created (singleton)');

// 添加健康检查端点
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'checklist-mcp-server',
    version: '1.2.0'
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

app.all(MCP_ENDPOINT, async (req: Request, res: Response) => {
  // Only allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Extract namespace from URL query parameters
  const fullUrl = `http://${req.headers.host}${req.url}`;
  const urlObj = new URL(fullUrl);
  const namespace = urlObj.searchParams.get('namespace') || 'default';

  logger.info({ body: req.body }, 'MCP Request Payload');

  // Log namespace for debugging (only log tools/call to reduce noise)
  const method = req.body?.method || 'unknown';
  if (method === 'tools/call') {
    const toolName = req.body?.params?.name || 'unknown';
    logger.info({ namespace, method, toolName }, `Tool call: ${toolName} in namespace: ${namespace}`);
  }

  // Run the entire request handling in namespace context
  await runInNamespace(namespace, async () => {
    try {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

      res.on('close', () => {
        transport.close();
      });

      // Use the singleton MCP server instance
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
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
});

app.listen(PORT, () => {
  console.log(`Checklist MCP HTTP server running on port ${PORT}`);
});
