"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChecklistServer = createChecklistServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const pino_1 = __importDefault(require("pino"));
// Configure pino logger to write to stderr
const logger = (0, pino_1.default)({ level: 'info' }, pino_1.default.destination(2)); // 2 is stderr file descriptor
// Import work info utilities
const workInfoLRUCache_1 = require("./utils/workInfoLRUCache");
const workIdGenerator_1 = require("./utils/workIdGenerator");
const workInfoValidation_1 = require("./utils/workInfoValidation");
const taskIdGenerator_1 = require("./utils/taskIdGenerator");
// In-memory store for tasks, keyed by sessionId
const taskStore = new Map();
// Initialize work info LRU cache
const workInfoCache = new workInfoLRUCache_1.WorkInfoLRUCache(10);
const sessionToWorkIdMap = new Map();
// Validation and Error Handling Functions
function validateSession(sessionId) {
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
function validatePath(path) {
    if (path === null || path === undefined)
        return { isValid: true, normalizedPath: '/' };
    if (typeof path !== 'string')
        return { isValid: false, error: 'Path must be a string' };
    if (path.trim() === '')
        return { isValid: true, normalizedPath: '/' };
    if (path.length > 500)
        return { isValid: false, error: 'Path cannot exceed 500 characters' };
    let normalizedPath = path.trim();
    if (!normalizedPath.startsWith('/'))
        normalizedPath = '/' + normalizedPath;
    if (normalizedPath.includes('//'))
        return { isValid: false, error: 'Path cannot contain consecutive slashes' };
    const pathSegments = parsePath(normalizedPath);
    for (const segment of pathSegments) {
        if (!(0, taskIdGenerator_1.validateTaskId)(segment)) {
            return { isValid: false, error: `Invalid path segment '${segment}'` };
        }
    }
    return { isValid: true, normalizedPath };
}
function validateTaskData(task, context = '') {
    const errors = [];
    const contextPrefix = context ? `${context}: ` : '';
    if (!task || typeof task !== 'object' || Array.isArray(task)) {
        errors.push(`${contextPrefix}Task must be a valid object`);
        return { isValid: false, errors };
    }
    if (!task.taskId)
        errors.push(`${contextPrefix}Task is missing required field 'taskId'`);
    else if (typeof task.taskId !== 'string')
        errors.push(`${contextPrefix}Task 'taskId' must be a string`);
    else if (!(0, taskIdGenerator_1.validateTaskId)(task.taskId))
        errors.push(`${contextPrefix}Task 'taskId' format is invalid: '${task.taskId}'`);
    if (!task.description)
        errors.push(`${contextPrefix}Task is missing required field 'description'`);
    else if (typeof task.description !== 'string')
        errors.push(`${contextPrefix}Task 'description' must be a string`);
    else if (task.description.trim().length === 0)
        errors.push(`${contextPrefix}Task 'description' cannot be empty`);
    else if (task.description.length > 1000)
        errors.push(`${contextPrefix}Task 'description' is too long`);
    if (!task.status)
        errors.push(`${contextPrefix}Task is missing required field 'status'`);
    else if (task.status !== 'TODO' && task.status !== 'DONE')
        errors.push(`${contextPrefix}Task 'status' must be either 'TODO' or 'DONE'`);
    if (task.children !== undefined) {
        if (!Array.isArray(task.children))
            errors.push(`${contextPrefix}Task 'children' must be an array`);
        else
            task.children.forEach((child, index) => {
                errors.push(...validateTaskData(child, `${context}.children[${index}]`).errors);
            });
    }
    return { isValid: errors.length === 0, errors };
}
function validateTasksArray(tasks, context = '') {
    const errors = [];
    if (!Array.isArray(tasks)) {
        errors.push(`${context}: Tasks must be an array`);
        return { isValid: false, errors };
    }
    const taskIds = new Set();
    tasks.forEach((task, index) => {
        errors.push(...validateTaskData(task, `${context}.task[${index}]`).errors);
        if (task?.taskId) {
            if (taskIds.has(task.taskId))
                errors.push(`${context}: Duplicate task ID '${task.taskId}'`);
            else
                taskIds.add(task.taskId);
        }
    });
    return { isValid: errors.length === 0, errors };
}
function logError(operation, error, context = {}) {
    logger.error({ operation, error: error instanceof Error ? { name: error.name, message: error.message } : String(error), context }, `Error in ${operation}`);
}
// Utility Functions
function isUniqueInSession(id, sessionTasks) {
    return !findTaskById(sessionTasks, id);
}
function parsePath(path) {
    if (!path || path.trim() === '')
        return [];
    const normalizedPath = path.replace(/^\/+|\/+$/g, '');
    if (normalizedPath === '')
        return [];
    return normalizedPath.split('/').filter(segment => segment.length > 0);
}
function updateTasksAtPath(rootTasks, path, newTasks) {
    const pathSegments = parsePath(path);
    if (pathSegments.length === 0)
        return [...newTasks];
    let currentLevel = rootTasks;
    for (let i = 0; i < pathSegments.length - 1; i++) {
        const segment = pathSegments[i];
        const parentTask = currentLevel.find(task => task.taskId === segment);
        if (!parentTask)
            return rootTasks; // Path not found
        if (!parentTask.children)
            parentTask.children = [];
        currentLevel = parentTask.children;
    }
    const targetTask = currentLevel.find(task => task.taskId === pathSegments[pathSegments.length - 1]);
    if (targetTask)
        targetTask.children = [...newTasks];
    return rootTasks;
}
function formatTaskTree(tasks, indent = "") {
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
function findTaskById(tasks, taskId) {
    for (const task of tasks) {
        if (task.taskId === taskId)
            return task;
        if (task.children) {
            const found = findTaskById(task.children, taskId);
            if (found)
                return found;
        }
    }
    return null;
}
function getTaskPath(tasks, taskId, currentPath = "") {
    for (const task of tasks) {
        const newPath = `${currentPath}/${task.taskId}`;
        if (task.taskId === taskId)
            return newPath;
        if (task.children) {
            const foundPath = getTaskPath(task.children, taskId, newPath);
            if (foundPath)
                return foundPath;
        }
    }
    return null;
}
function createChecklistServer() {
    const server = new mcp_js_1.McpServer({
        name: 'checklist-mcp-server',
        version: '1.0.1',
    });
    // --- Tool Definitions ---
    const updateTasksInputSchema = zod_1.z.object({
        sessionId: zod_1.z.string().min(1),
        path: zod_1.z.string().default('/'),
        tasks: zod_1.z.array(zod_1.z.object({
            taskId: zod_1.z.string().min(1),
            description: zod_1.z.string().min(1),
            status: zod_1.z.enum(['TODO', 'DONE']).default('TODO'),
            children: zod_1.z.array(zod_1.z.any()).optional(),
        })),
    });
    server.tool("update_tasks", "Updates tasks at a specific hierarchy level.", updateTasksInputSchema.shape, async (params) => {
        const { sessionId, path, tasks } = params;
        const sessionValidation = validateSession(sessionId);
        if (!sessionValidation.isValid)
            return { content: [{ type: "text", text: `Error: ${sessionValidation.error}` }] };
        const pathValidation = validatePath(path);
        if (!pathValidation.isValid)
            return { content: [{ type: "text", text: `Error: ${pathValidation.error}` }] };
        const tasksValidation = validateTasksArray(tasks, 'update_tasks');
        if (!tasksValidation.isValid)
            return { content: [{ type: "text", text: `Error: Invalid task data:\n${tasksValidation.errors.join('\n')}` }] };
        let sessionTasks = taskStore.get(sessionId) || [];
        const updatedTasks = updateTasksAtPath(sessionTasks, pathValidation.normalizedPath || path, tasks);
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
    const markTaskAsDoneInputSchema = zod_1.z.object({ sessionId: zod_1.z.string().min(1), taskId: zod_1.z.string().min(1) });
    server.tool("mark_task_as_done", "Marks a specific task as 'DONE'.", markTaskAsDoneInputSchema.shape, async (params) => {
        const { sessionId, taskId } = params;
        const sessionValidation = validateSession(sessionId);
        if (!sessionValidation.isValid)
            return { content: [{ type: "text", text: `Error: ${sessionValidation.error}` }] };
        if (!(0, taskIdGenerator_1.validateTaskId)(taskId)) {
            return { content: [{ type: "text", text: `Error: Task ID '${taskId}' has invalid format` }] };
        }
        let sessionTasks = taskStore.get(sessionId);
        if (!sessionTasks)
            return { content: [{ type: "text", text: `Error: No tasks found for session ${sessionId}` }] };
        const targetTask = findTaskById(sessionTasks, taskId);
        if (!targetTask)
            return { content: [{ type: "text", text: `Error: Task with ID '${taskId}' not found` }] };
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
    const getAllTasksInputSchema = zod_1.z.object({ sessionId: zod_1.z.string().min(1) });
    server.tool("get_all_tasks", "Retrieves the complete hierarchical list of tasks.", getAllTasksInputSchema.shape, async (params) => {
        const { sessionId } = params;
        const sessionValidation = validateSession(sessionId);
        if (!sessionValidation.isValid)
            return { content: [{ type: "text", text: `Error: ${sessionValidation.error}` }] };
        const sessionTasks = taskStore.get(sessionId);
        if (!sessionTasks || sessionTasks.length === 0)
            return { content: [{ type: "text", text: `No tasks found for session ${sessionId}.` }] };
        const treeView = formatTaskTree(sessionTasks);
        return { content: [{ type: "text", text: `Tasks for session ${sessionId}:\n${treeView}` }] };
    });
    const saveCurrentWorkInfoInputSchema = zod_1.z.object({
        work_summarize: zod_1.z.string().min(1),
        work_description: zod_1.z.string().min(1),
        sessionId: zod_1.z.string().optional(),
    });
    server.tool("save_current_work_info", "Saves current work information.", saveCurrentWorkInfoInputSchema.shape, async (params) => {
        const { work_summarize, work_description, sessionId } = params;
        let workId;
        if (sessionId && sessionToWorkIdMap.has(sessionId)) {
            workId = sessionToWorkIdMap.get(sessionId);
        }
        else {
            workId = workIdGenerator_1.WorkIdGenerator.generateUniqueId();
            if (sessionId) {
                sessionToWorkIdMap.set(sessionId, workId);
            }
        }
        const sessionTasks = sessionId ? taskStore.get(sessionId) : undefined;
        const workInfo = {
            workId,
            work_timestamp: (0, workInfoValidation_1.createTimestamp)(),
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
            }
            else {
                responseMessages.push(`Warning: Session with ID '${sessionId}' not found. No tasks were associated.`);
            }
        }
        return { content: responseMessages.map(text => ({ type: 'text', text })) };
    });
    server.tool("get_recent_works_info", "Retrieves a list of recent work information entries.", {}, async () => {
        const recentWorks = workInfoCache.getRecentList();
        return { content: [{ type: "text", text: JSON.stringify({ works: recentWorks }, null, 2) }] };
    });
    const getWorkByIdInputSchema = zod_1.z.object({ workId: zod_1.z.string().regex(/^\d{8}$/, "workId must be an 8-digit string") });
    server.tool("get_work_by_id", "Gets work information by its ID.", getWorkByIdInputSchema.shape, async (params) => {
        const { workId } = params;
        const workInfo = workInfoCache.get(workId);
        if (!workInfo)
            return { content: [{ type: "text", text: `Error: Work not found for workId '${workId}'` }] };
        return { content: [{ type: "text", text: JSON.stringify(workInfo, null, 2) }] };
    });
    return server;
}
