import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import pino from 'pino';

// Configure pino logger to write to stderr
const logger = pino({ level: 'info' }, pino.destination(2)); // 2 is stderr file descriptor

// Import work info utilities
import { WorkInfoLRUCache } from './utils/workInfoLRUCache';
import { WorkIdGenerator } from './utils/workIdGenerator';
import { 
  validateSaveWorkInfoInput, 
  validateGetWorkByIdInput,
  createTimestamp 
} from './utils/workInfoValidation';
import { WorkInfo } from './types/workInfo';
import { validateTaskId } from './utils/taskIdGenerator';

// Define the hierarchical Task structure
export interface Task {
  taskId: string;     
  description: string;
  status: 'TODO' | 'DONE';
  children?: Task[];
}

// In-memory store for tasks, keyed by sessionId
const taskStore: Map<string, Task[]> = new Map();

// Initialize work info LRU cache
const workInfoCache = new WorkInfoLRUCache(10);
const sessionToWorkIdMap = new Map<string, string>();

// Validation and Error Handling Functions
function validateSession(sessionId: string): { isValid: boolean; error?: string } {
  if (!sessionId || typeof sessionId !== 'string') {
    return { isValid: false, error: 'Session ID must be a non-empty string' };
  }
  if (sessionId.length < 1 || sessionId.length > 100) {
    return { isValid: false, error: 'Session ID must be between 1 and 100 characters long' };
  }
  const validSessionIdRegex = /^[a-zA-Z0-9_-]+$/;
  if (!validSessionIdRegex.test(sessionId)) {
    return { isValid: false, error: 'Session ID can only contain alphanumeric characters, hyphens, and underscores' };
  }
  return { isValid: true };
}

function validatePath(path: string): { isValid: boolean; normalizedPath?: string; error?: string } {
  if (path === null || path === undefined) return { isValid: true, normalizedPath: '/' };
  if (typeof path !== 'string') return { isValid: false, error: 'Path must be a string' };
  if (path.trim() === '') return { isValid: true, normalizedPath: '/' };
  if (path.length > 500) return { isValid: false, error: 'Path cannot exceed 500 characters' };
  let normalizedPath = path.trim();
  if (!normalizedPath.startsWith('/')) normalizedPath = '/' + normalizedPath;
  if (normalizedPath.includes('//')) return { isValid: false, error: 'Path cannot contain consecutive slashes' };
  const pathSegments = parsePath(normalizedPath);
  for (const segment of pathSegments) {
    if (!validateTaskId(segment)) {
      return { isValid: false, error: `Invalid path segment '${segment}'` };
    }
  }
  return { isValid: true, normalizedPath };
}

function validateTaskData(task: any, context: string = ''): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const contextPrefix = context ? `${context}: ` : '';
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    errors.push(`${contextPrefix}Task must be a valid object`);
    return { isValid: false, errors };
  }
  if (!task.taskId) errors.push(`${contextPrefix}Task is missing required field 'taskId'`);
  else if (typeof task.taskId !== 'string') errors.push(`${contextPrefix}Task 'taskId' must be a string`);
  else if (!validateTaskId(task.taskId)) errors.push(`${contextPrefix}Task 'taskId' format is invalid: '${task.taskId}'`);
  if (!task.description) errors.push(`${contextPrefix}Task is missing required field 'description'`);
  else if (typeof task.description !== 'string') errors.push(`${contextPrefix}Task 'description' must be a string`);
  else if (task.description.trim().length === 0) errors.push(`${contextPrefix}Task 'description' cannot be empty`);
  else if (task.description.length > 1000) errors.push(`${contextPrefix}Task 'description' is too long`);
  if (!task.status) errors.push(`${contextPrefix}Task is missing required field 'status'`);
  else if (task.status !== 'TODO' && task.status !== 'DONE') errors.push(`${contextPrefix}Task 'status' must be either 'TODO' or 'DONE'`);
  if (task.children !== undefined) {
    if (!Array.isArray(task.children)) errors.push(`${contextPrefix}Task 'children' must be an array`);
    else task.children.forEach((child: any, index: number) => {
      errors.push(...validateTaskData(child, `${context}.children[${index}]`).errors);
    });
  }
  return { isValid: errors.length === 0, errors };
}

function validateTasksArray(tasks: any, context: string = ''): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(tasks)) {
    errors.push(`${context}: Tasks must be an array`);
    return { isValid: false, errors };
  }
  const taskIds = new Set<string>();
  tasks.forEach((task, index) => {
    errors.push(...validateTaskData(task, `${context}.task[${index}]`).errors);
    if (task?.taskId) {
      if (taskIds.has(task.taskId)) errors.push(`${context}: Duplicate task ID '${task.taskId}'`);
      else taskIds.add(task.taskId);
    }
  });
  return { isValid: errors.length === 0, errors };
}

function logError(operation: string, error: any, context: Record<string, any> = {}) {
  logger.error({ operation, error: error instanceof Error ? { name: error.name, message: error.message } : String(error), context }, `Error in ${operation}`);
}

// Utility Functions
function isUniqueInSession(id: string, sessionTasks: Task[]): boolean {
  return !findTaskById(sessionTasks, id);
}

function parsePath(path: string): string[] {
  if (!path || path.trim() === '') return [];
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  if (normalizedPath === '') return [];
  return normalizedPath.split('/').filter(segment => segment.length > 0);
}

function updateTasksAtPath(rootTasks: Task[], path: string, newTasks: Task[]): Task[] {
  const pathSegments = parsePath(path);
  if (pathSegments.length === 0) return [...newTasks];
  let currentLevel = rootTasks;
  for (let i = 0; i < pathSegments.length - 1; i++) {
    const segment = pathSegments[i];
    const parentTask = currentLevel.find(task => task.taskId === segment);
    if (!parentTask) return rootTasks; // Path not found
    if (!parentTask.children) parentTask.children = [];
    currentLevel = parentTask.children;
  }
  const targetTask = currentLevel.find(task => task.taskId === pathSegments[pathSegments.length - 1]);
  if (targetTask) targetTask.children = [...newTasks];
  return rootTasks;
}

function formatTaskTree(tasks: Task[], indent: string = ""): string {
  return tasks.map((task, index) => {
    const isLast = index === tasks.length - 1;
    const prefix = indent + (isLast ? "└── " : "├── ");
    const status = task.status === 'DONE' ? '✓' : '○';
    let result = `${prefix}${status} ${task.taskId}: ${task.description}`;
    if (task.children?.length) {
      result += "\n" + formatTaskTree(task.children, indent + (isLast ? "    " : "│   "));
    }
    return result;
  }).join("\n");
}

function findTaskById(tasks: Task[], taskId: string): Task | null {
  for (const task of tasks) {
    if (task.taskId === taskId) return task;
    if (task.children) {
      const found = findTaskById(task.children, taskId);
      if (found) return found;
    }
  }
  return null;
}

function getTaskPath(tasks: Task[], taskId: string, currentPath: string = ""): string | null {
  for (const task of tasks) {
    const newPath = `${currentPath}/${task.taskId}`;
    if (task.taskId === taskId) return newPath;
    if (task.children) {
      const foundPath = getTaskPath(task.children, taskId, newPath);
      if (foundPath) return foundPath;
    }
  }
  return null;
}

export function createChecklistServer(): McpServer {
  const server = new McpServer({
    name: 'checklist-mcp-server',
    version: '1.0.1',
  });

  // --- Tool Definitions ---

  const updateTasksInputSchema = z.object({
    sessionId: z.string().min(1),
    path: z.string().default('/'),
    tasks: z.array(z.object({
      taskId: z.string().min(1),
      description: z.string().min(1),
      status: z.enum(['TODO', 'DONE']).default('TODO'),
      children: z.array(z.any()).optional(),
    })),
  });
  type UpdateTasksInput = z.infer<typeof updateTasksInputSchema>;

  server.tool("update_tasks", "Updates tasks at a specific hierarchy level.", updateTasksInputSchema.shape, async (params: UpdateTasksInput) => {
    const { sessionId, path, tasks } = params;
    const sessionValidation = validateSession(sessionId);
    if (!sessionValidation.isValid) return { content: [{ type: "text", text: `Error: ${sessionValidation.error}` }] };
    const pathValidation = validatePath(path);
    if (!pathValidation.isValid) return { content: [{ type: "text", text: `Error: ${pathValidation.error}` }] };
    const tasksValidation = validateTasksArray(tasks, 'update_tasks');
    if (!tasksValidation.isValid) return { content: [{ type: "text", text: `Error: Invalid task data:\n${tasksValidation.errors.join('\n')}` }] };
    let sessionTasks = taskStore.get(sessionId) || [];
    const updatedTasks = updateTasksAtPath(sessionTasks, pathValidation.normalizedPath || path, tasks as Task[]);
    taskStore.set(sessionId, updatedTasks);
    const treeView = updatedTasks.length > 0 ? formatTaskTree(updatedTasks) : "No tasks";
    const pathInfo = (path && path !== '/') ? ` at path '${path}'` : '';
    const responseMessage = `Successfully updated ${tasks.length} tasks${pathInfo} for session ${sessionId}.`;
    const treeViewMessage = `Complete task hierarchy:\n${treeView}`.trim();
    return { 
      content: [
        { type: "text", text: responseMessage },
        { type: "text", text: treeViewMessage }
      ]
    };
  });

  const markTaskAsDoneInputSchema = z.object({ sessionId: z.string().min(1), taskId: z.string().min(1) });
  type MarkTaskAsDoneInput = z.infer<typeof markTaskAsDoneInputSchema>;

  server.tool("mark_task_as_done", "Marks a specific task as 'DONE'.", markTaskAsDoneInputSchema.shape, async (params: MarkTaskAsDoneInput) => {
    const { sessionId, taskId } = params;
    const sessionValidation = validateSession(sessionId);
    if (!sessionValidation.isValid) return { content: [{ type: "text", text: `Error: ${sessionValidation.error}` }] };

    if (!validateTaskId(taskId)) {
      return { content: [{ type: "text", text: `Error: Task ID '${taskId}' has invalid format` }] };
    }

    let sessionTasks = taskStore.get(sessionId);
    if (!sessionTasks) return { content: [{ type: "text", text: `Error: No tasks found for session ${sessionId}` }] };
    const targetTask = findTaskById(sessionTasks, taskId);
    if (!targetTask) return { content: [{ type: "text", text: `Error: Task with ID '${taskId}' not found` }] };
    targetTask.status = 'DONE';
    taskStore.set(sessionId, sessionTasks);
    const treeView = formatTaskTree(sessionTasks);
    return {
      content: [
        { type: "text", text: `Task '${taskId}' marked as DONE` },
        { type: "text", text: `Complete task hierarchy:\n${treeView}` }
      ]
    };
  });

  const getAllTasksInputSchema = z.object({ sessionId: z.string().min(1) });
  type GetAllTasksInput = z.infer<typeof getAllTasksInputSchema>;

  server.tool("get_all_tasks", "Retrieves the complete hierarchical list of tasks.", getAllTasksInputSchema.shape, async (params: GetAllTasksInput) => {
    const { sessionId } = params;
    const sessionValidation = validateSession(sessionId);
    if (!sessionValidation.isValid) return { content: [{ type: "text", text: `Error: ${sessionValidation.error}` }] };
    const sessionTasks = taskStore.get(sessionId);
    if (!sessionTasks || sessionTasks.length === 0) return { content: [{ type: "text", text: `No tasks found for session ${sessionId}.` }] };
    const treeView = formatTaskTree(sessionTasks);
    return { content: [{ type: "text", text: `Tasks for session ${sessionId}:\n${treeView}` }] };
  });

  const saveCurrentWorkInfoInputSchema = z.object({
    work_summarize: z.string().min(1),
    work_description: z.string().min(1),
    sessionId: z.string().optional(),
  });
  type SaveCurrentWorkInfoInput = z.infer<typeof saveCurrentWorkInfoInputSchema>;

  server.tool("save_current_work_info", "Saves current work information.", saveCurrentWorkInfoInputSchema.shape, async (params: SaveCurrentWorkInfoInput) => {
    const { work_summarize, work_description, sessionId } = params;
    let workId: string;

    if (sessionId && sessionToWorkIdMap.has(sessionId)) {
      workId = sessionToWorkIdMap.get(sessionId)!;
    } else {
      workId = WorkIdGenerator.generateUniqueId();
      if (sessionId) {
        sessionToWorkIdMap.set(sessionId, workId);
      }
    }

    const sessionTasks = sessionId ? taskStore.get(sessionId) : undefined;
    const workInfo: WorkInfo = { 
      workId, 
      work_timestamp: createTimestamp(), 
      work_description, 
      work_summarize, 
      sessionId, 
      work_tasks: sessionTasks ? JSON.parse(JSON.stringify(sessionTasks)) : undefined
    };
    workInfoCache.set(workInfo);

    const responseMessages = [`Successfully saved work information with workId: ${workId}`];

    if (sessionId) {
      if (sessionTasks) {
        responseMessages.push(`Associated with session ${sessionId} and saved a snapshot of its tasks.`);
      } else {
        responseMessages.push(`Warning: Session with ID '${sessionId}' not found. No tasks were associated.`);
      }
    }

    return { content: responseMessages.map(text => ({ type: 'text', text })) };
  });

  server.tool("get_recent_works_info", "Retrieves a list of recent work information entries.", {}, async () => {
    const recentWorks = workInfoCache.getRecentList();
    return { content: [{ type: "text", text: JSON.stringify({ works: recentWorks }, null, 2) }] };
  });

  const getWorkByIdInputSchema = z.object({ workId: z.string().regex(/^\d{8}$/, "workId must be an 8-digit string") });
  type GetWorkByIdInput = z.infer<typeof getWorkByIdInputSchema>;

  server.tool("get_work_by_id", "Gets work information by its ID.", getWorkByIdInputSchema.shape, async (params: GetWorkByIdInput) => {
    const { workId } = params;
    const workInfo = workInfoCache.get(workId);
    if (!workInfo) return { content: [{ type: "text", text: `Error: Work not found for workId '${workId}'` }] };
    return { content: [{ type: "text", text: JSON.stringify(workInfo, null, 2) }] };
  });

  return server;
}
