import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import pino from 'pino';

// Configure pino logger to write to stderr
const logger = pino({ level: 'info' }, pino.destination(2)); // 2 is stderr file descriptor

// Import work info utilities
import { WorkInfo } from './types/workInfo';
import { WorkInfoLRUCache } from './utils/workInfoLRUCache';
import { WorkIdGenerator } from './utils/workIdGenerator';
import { 
  validateSaveWorkInfoInput, 
  validateGetWorkByIdInput,
  createTimestamp 
} from './utils/workInfoValidation';

// Final, validated Task structure
export interface Task {
  taskId: string;
  description: string;
  status: 'TODO' | 'DONE';
  children?: Task[];
}

// A separate type for input validation, where status is optional
interface InputTask {
  taskId: string;
  description: string;
  status?: 'TODO' | 'DONE';
  children?: InputTask[];
}

// Recursive Zod schema for the InputTask type
const inputTaskSchema: z.ZodType<InputTask> = z.lazy(() =>
  z.object({
    taskId: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, {
      message: "Task 'taskId' format is invalid. Only alphanumeric characters, hyphens, and underscores are allowed.",
    }),
    description: z.string().min(1),
    status: z.enum(['TODO', 'DONE']).optional(),
    children: z.array(inputTaskSchema).optional(),
  })
);

// This function recursively transforms InputTask[] to Task[], setting default status
function setDefaultStatusRecursively(tasks: InputTask[]): Task[] {
  return tasks.map(inputTask => {
    const newTask: Task = {
      taskId: inputTask.taskId,
      description: inputTask.description,
      status: inputTask.status ?? 'TODO',
    };
    if (inputTask.children) {
      newTask.children = setDefaultStatusRecursively(inputTask.children);
    }
    return newTask;
  });
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

function validateTaskId(taskId: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(taskId);
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
    version: '1.1.0',
  });

  // --- Tool Definitions ---

  const updateTasksInputSchema = z.object({
    sessionId: z.string().min(1),
    path: z.string().default('/'),
    tasks: z.array(inputTaskSchema), // Validate against the input schema
  });
  type UpdateTasksInput = z.infer<typeof updateTasksInputSchema>;

  const updateTasksDescription = `
Creates new tasks or overwrites existing tasks at a specific hierarchical path.

This tool allows for building and managing a nested checklist. If you provide a list of tasks to a path that already contains tasks, the existing tasks at that level will be completely replaced by the new list.

Input:
- sessionId (string, required): The unique identifier for the user's session. This isolates task lists between different users or contexts.
- path (string, optional, default: '/'): The hierarchical path where tasks should be updated, composed of '/'-separated taskIds (e.g., '/task-1/sub-task-a'). The root is '/'.
- tasks (array, required): An array of task objects to set at the specified path. Each task object contains:
  - taskId (string, required): A unique identifier for the task (alphanumeric, hyphens, underscores).
  - description (string, required): The text describing the task.
  - status (string, optional, default: 'TODO'): The status of the task, can be 'TODO' or 'DONE'.
  - children (array, optional): A nested array of child task objects.
`;
  server.tool("update_tasks", updateTasksDescription, updateTasksInputSchema.shape, async (params: UpdateTasksInput) => {
    const validationResult = updateTasksInputSchema.safeParse(params);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { content: [{ type: "text", text: `Error: Invalid input:\n${errorMessages.join('\n')}` }] };
    }

    const { sessionId, path, tasks: inputTasks } = validationResult.data;

    // After validation, manually transform the tasks to set default status
    const transformedTasks = setDefaultStatusRecursively(inputTasks);

    // Manually check for duplicate task IDs in the input
    const taskIds = new Set<string>();
    function findDuplicates(tasks: Task[]): string | null {
      for (const task of tasks) {
        if (taskIds.has(task.taskId)) {
          return task.taskId;
        }
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
      return { content: [{ type: 'text', text: `Error: Duplicate task ID '${duplicateId}' found in the request.` }] };
    }

    const sessionValidation = validateSession(sessionId);
    if (!sessionValidation.isValid) return { content: [{ type: "text", text: `Error: ${sessionValidation.error}` }] };

    const pathValidation = validatePath(path);
    if (!pathValidation.isValid) return { content: [{ type: "text", text: `Error: ${pathValidation.error}` }] };

    let sessionTasks = taskStore.get(sessionId) || [];
    const updatedTasks = updateTasksAtPath(sessionTasks, pathValidation.normalizedPath || path, transformedTasks);
    taskStore.set(sessionId, updatedTasks);

    const treeView = updatedTasks.length > 0 ? formatTaskTree(updatedTasks) : "No tasks";
    const pathInfo = (path && path !== '/') ? ` at path '${path}'` : '';
    return {
      content: [
        { type: "text", text: `Successfully updated ${inputTasks.length} tasks${pathInfo} for session ${sessionId}.` },
        { type: "text", text: `Complete task hierarchy:\n${treeView}` }
      ]
    };
  });

  const markTaskAsDoneInputSchema = z.object({ sessionId: z.string().min(1), taskId: z.string().min(1) });
  type MarkTaskAsDoneInput = z.infer<typeof markTaskAsDoneInputSchema>;

  const markTaskAsDoneDescription = `
Finds a specific task by its unique taskId within a session and updates its status to 'DONE'.

The tool will search the entire task hierarchy for the given taskId.

Input:
- sessionId (string, required): The unique identifier for the user's session where the task exists.
- taskId (string, required): The unique ID of the task you want to mark as done.
`;
  server.tool("mark_task_as_done", markTaskAsDoneDescription, markTaskAsDoneInputSchema.shape, async (params: MarkTaskAsDoneInput) => {
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
        { type: 'text', text: `Successfully marked task ${taskId} as DONE` },
        { type: "text", text: `Complete task hierarchy:\n${treeView}` }
      ]
    };
  });

  const getAllTasksInputSchema = z.object({ sessionId: z.string().min(1) });
  type GetAllTasksInput = z.infer<typeof getAllTasksInputSchema>;

  const getAllTasksDescription = `
Retrieves the complete hierarchical list of tasks for a given session and displays it as a formatted tree.

Input:
- sessionId (string, required): The unique identifier for the user's session to retrieve tasks from.
`;
  server.tool("get_all_tasks", getAllTasksDescription, getAllTasksInputSchema.shape, async (params: GetAllTasksInput) => {
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

  const saveCurrentWorkInfoDescription = `
Saves a snapshot of the current work session, including a detailed context document and a brief, searchable description.

A unique 'workId' is generated for each saved entry, which can be used later to retrieve the full details. This tool is intended to capture all necessary information to relay the current work to another LLM session, ensuring no loss of context or progress.

Input:
- work_summarize (string, required): A detailed, comprehensive document containing all necessary context, code, and progress to continue the work in a different session. This should be thorough enough to prevent information loss.
- work_description (string, required): A short, concise summary (around 100 characters) of the work. This description is used for easy searching and retrieval of the saved work info.
- sessionId (string, optional): If provided, the current state of the task list for this session will be saved along with the work info.
`;
  server.tool("save_current_work_info", saveCurrentWorkInfoDescription, saveCurrentWorkInfoInputSchema.shape, async (params: SaveCurrentWorkInfoInput) => {
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

  const getRecentWorksInfoDescription = `
Retrieves a summary list of the most recently saved work information entries.

This tool is useful for quickly viewing past work without retrieving all the details. The output includes the 'workId' for each entry, which can then be used with the 'get_work_by_id' tool to fetch complete information.

Input: None
`;
  server.tool("get_recent_works_info", getRecentWorksInfoDescription, {}, async () => {
    const recentWorks = workInfoCache.getRecentList();
    const worksJson = JSON.stringify({ works: recentWorks }, null, 2);
    const hint = "If you find the required work info in the list above, please extract the workId and call the `get_work_by_id` tool to get detailed information.";
    return {
      content: [
        { type: "text", text: worksJson },
        { type: "text", text: hint },
      ],
    };
  });

  const getWorkByIdInputSchema = z.object({ workId: z.string().regex(/^\d{8}$/, "workId must be an 8-digit string") });
  type GetWorkByIdInput = z.infer<typeof getWorkByIdInputSchema>;

  const getWorkByIdDescription = `
Retrieves the full, detailed information for a single work session using its unique workId.

This includes the work summary, detailed description, and the complete snapshot of the associated task list (if it was saved).

Input:
- workId (string, required): The 8-digit unique identifier for the work entry, obtained from 'save_current_work_info' or 'get_recent_works_info'.
`;
  server.tool("get_work_by_id", getWorkByIdDescription, getWorkByIdInputSchema.shape, async (params: GetWorkByIdInput) => {
    const { workId } = params;
    const workInfo = workInfoCache.get(workId);
    if (!workInfo) return { content: [{ type: "text", text: `Error: Work not found for workId '${workId}'` }] };
    return { content: [{ type: "text", text: JSON.stringify(workInfo, null, 2) }] };
  });

  return server;
}
