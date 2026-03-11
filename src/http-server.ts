#!/usr/bin/env node
import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createChecklistServer } from './server.js';
import { runInNamespace } from './utils/namespaceContext.js';
import { URL } from 'url';
import pino from 'pino';
import { randomUUID } from 'crypto';

const logLevel = process.env.LOG_LEVEL || 'info';
const logger = pino({ level: logLevel }, pino.destination(2));

const app = express();

// 使用express.raw()来保存原始请求体，然后手动解析JSON
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

import { namespaceManager } from './utils/namespaceManager.js';
import { 
  validateSession, 
  validatePath, 
  validateTaskId, 
  formatTaskTree, 
  setDefaultStatusRecursively, 
  updateTasksAtPath, 
  findTaskById,
  Task
} from './server.js';

// POST-only stateless mode - no session management needed

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

// ============================================================================
// REST API ENDPOINTS - FOR CLI CLIENT
// ============================================================================

app.get('/api/tasks', (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const namespace = (req.query.namespace as string) || 'default';
  
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }
  
  const sessionValidation = validateSession(sessionId);
  if (!sessionValidation.isValid) {
    res.status(400).json({ error: sessionValidation.error });
    return;
  }
  
  const { taskStoreCache } = namespaceManager.getCaches(namespace);
  const sessionTasks = taskStoreCache.getTasks(sessionId);
  
  if (!sessionTasks || sessionTasks.length === 0) {
    res.json({ message: `No tasks found for session ${sessionId}.`, raw: [] });
    return;
  }
  
  const treeView = formatTaskTree(sessionTasks);
  res.json({ message: `Tasks for session ${sessionId}:\n${treeView}`, raw: sessionTasks });
});

app.post('/api/tasks/update', (req: Request, res: Response) => {
  const namespace = (req.query.namespace as string) || 'default';
  const { sessionId, path = '/', tasks: inputTasks } = req.body;
  
  if (!sessionId || !inputTasks || !Array.isArray(inputTasks)) {
    res.status(400).json({ error: 'sessionId and a valid tasks array are required in the body' });
    return;
  }
  
  const sessionValidation = validateSession(sessionId);
  if (!sessionValidation.isValid) {
    res.status(400).json({ error: sessionValidation.error });
    return;
  }
  
  const pathValidation = validatePath(path);
  if (!pathValidation.isValid) {
    res.status(400).json({ error: pathValidation.error });
    return;
  }
  
  const { taskStoreCache } = namespaceManager.getCaches(namespace);
  const transformedTasks = setDefaultStatusRecursively(inputTasks);
  
  // Duplicate check
  const taskIds = new Set<string>();
  function findDuplicates(tasks: Task[]): string | null {
    for (const task of tasks) {
      if (taskIds.has(task.taskId)) return task.taskId;
      taskIds.add(task.taskId);
      if (task.children) {
        const duplicate = findDuplicates(task.children);
        if (duplicate) return duplicate;
      }
    }
    return null;
  }
  
  const duplicateId = findDuplicates(transformedTasks);
  if (duplicateId) {
     res.status(400).json({ error: `Duplicate task ID '${duplicateId}' found in the request.` });
     return;
  }
  
  let sessionTasks = taskStoreCache.getTasks(sessionId) || [];
  let updatedTasks: Task[];
  try {
    updatedTasks = updateTasksAtPath(sessionTasks, pathValidation.normalizedPath || path, transformedTasks);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    return;
  }
  
  taskStoreCache.setTasks(sessionId, updatedTasks);
  const treeView = updatedTasks.length > 0 ? formatTaskTree(updatedTasks) : "No tasks";
  const pathInfo = (path && path !== '/') ? ` at path '${path}'` : '';
  
  res.json({
    message: `Successfully updated ${inputTasks.length} tasks${pathInfo} for session ${sessionId}.\nComplete task hierarchy:\n${treeView}`,
    raw: updatedTasks
  });
});

app.post('/api/tasks/done', (req: Request, res: Response) => {
  const namespace = (req.query.namespace as string) || 'default';
  const { sessionId, taskIds } = req.body;
  
  if (!sessionId || !taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    res.status(400).json({ error: 'sessionId and a non-empty taskIds array are required in the body' });
    return;
  }
  
  const sessionValidation = validateSession(sessionId);
  if (!sessionValidation.isValid) {
    res.status(400).json({ error: sessionValidation.error });
    return;
  }
  
  const { taskStoreCache } = namespaceManager.getCaches(namespace);
  let sessionTasks = taskStoreCache.getTasks(sessionId);
  if (!sessionTasks) {
    res.status(404).json({ error: `No tasks found for session ${sessionId}` });
    return;
  }
  
  const markedIds: string[] = [];
  const notFoundIds: string[] = [];
  
  for (const id of taskIds) {
    if (!validateTaskId(id)) {
      notFoundIds.push(`${id} (invalid format)`);
      continue;
    }
    const targetTask = findTaskById(sessionTasks, id);
    if (targetTask) {
      targetTask.status = 'DONE';
      markedIds.push(id);
    } else {
      notFoundIds.push(id);
    }
  }
  
  taskStoreCache.setTasks(sessionId, sessionTasks);
  const treeView = formatTaskTree(sessionTasks);
  
  let resultMessage = `Successfully marked ${markedIds.length} tasks as DONE.`;
  if (markedIds.length > 0) resultMessage += `\nMarked IDs: ${markedIds.join(', ')}`;
  if (notFoundIds.length > 0) resultMessage += `\nFailed to find/mark IDs: ${notFoundIds.join(', ')}`;
  
  res.json({
    message: `${resultMessage}\nComplete task hierarchy:\n${treeView}`,
    raw: sessionTasks
  });
});

// ============================================================================
// MCP ENDPOINT HANDLER - POST-Only Stateless Mode
// ============================================================================
// This implementation uses POST-only mode without SSE support.
// All requests are handled statelessly, avoiding SSE reconnection issues.
// The MCP spec allows this: "The client MAY issue an HTTP GET to open an SSE stream"
// (MAY = optional). We return 405 for GET to indicate SSE is not supported.

app.all(MCP_ENDPOINT, async (req: Request, res: Response) => {
  // POST-only mode: reject GET requests for SSE
  if (req.method === 'GET') {
    // Per MCP spec: "if it does not offer SSE at this endpoint, return HTTP 405"
    logger.info('GET request rejected - SSE not supported in POST-only mode');
    res.status(405).json({
      error: 'Method not allowed. This server operates in POST-only mode without SSE support.'
    });
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Extract namespace from URL query parameters
  const fullUrl = `http://${req.headers.host}${req.url}`;
  const urlObj = new URL(fullUrl);
  const namespace = urlObj.searchParams.get('namespace') || 'default';

  const rpcMethod = req.body?.method || 'unknown';
  logger.info({ method: req.method, rpcMethod }, 'MCP Request (POST-only mode)');

  // Run the entire request handling in namespace context
  await runInNamespace(namespace, async () => {
    try {
      // STATELESS MODE: Create fresh server + transport for each request
      // This is the simplest and most robust approach
      const server = createChecklistServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined  // Stateless - no session management
      });

      await server.connect(transport);
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

const server = app.listen(PORT, () => {
  console.log(`Checklist MCP HTTP server running on port ${PORT} (POST-only mode)`);
});

// Configure server for long-lived connections (just in case)
server.timeout = 0;
server.keepAliveTimeout = 0;
server.headersTimeout = 0;

logger.info('Server started in POST-only stateless mode (no SSE support)');


