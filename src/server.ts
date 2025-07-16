#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import pino from 'pino'; // Import pino

// Configure pino logger to write to stderr
const logger = pino({ level: 'info' }, pino.destination(2)); // 2 is stderr file descriptor

// Define the hierarchical Task structure
interface Task {
  taskId: string;     
  description: string; // Combined name + description from original
  status: 'TODO' | 'DONE';
  children?: Task[];   // Optional subtasks array
}

// In-memory store for tasks, keyed by sessionId
const taskStore: Map<string, Task[]> = new Map();

// Enhanced Error Handling and Validation

/**
 * Validates session ID format and existence
 * @param sessionId The session ID to validate
 * @returns Object with isValid boolean and error message if invalid
 */
function validateSession(sessionId: string): { isValid: boolean; error?: string } {
  // Check if sessionId is provided and not empty
  if (!sessionId || typeof sessionId !== 'string') {
    logger.error({ sessionId }, 'Invalid session ID: must be a non-empty string');
    return { 
      isValid: false, 
      error: 'Session ID must be a non-empty string' 
    };
  }

  // Check sessionId length (reasonable bounds)
  if (sessionId.length < 1 || sessionId.length > 100) {
    logger.error({ sessionId, length: sessionId.length }, 'Invalid session ID length');
    return { 
      isValid: false, 
      error: 'Session ID must be between 1 and 100 characters long' 
    };
  }

  // Check for valid characters (alphanumeric, hyphens, underscores)
  const validSessionIdRegex = /^[a-zA-Z0-9_-]+$/;
  if (!validSessionIdRegex.test(sessionId)) {
    logger.error({ sessionId }, 'Invalid session ID format: contains invalid characters');
    return { 
      isValid: false, 
      error: 'Session ID can only contain alphanumeric characters, hyphens, and underscores' 
    };
  }

  return { isValid: true };
}

/**
 * Validates path format and structure
 * @param path The path string to validate
 * @returns Object with isValid boolean, normalized path, and error message if invalid
 */
function validatePath(path: string): { isValid: boolean; normalizedPath?: string; error?: string } {
  // Handle null/undefined path
  if (path === null || path === undefined) {
    logger.warn({ path }, 'Path is null/undefined, defaulting to root');
    return { isValid: true, normalizedPath: '/' };
  }

  // Handle non-string path
  if (typeof path !== 'string') {
    logger.error({ path, type: typeof path }, 'Invalid path type: must be string');
    return { 
      isValid: false, 
      error: 'Path must be a string' 
    };
  }

  // Handle empty string path
  if (path.trim() === '') {
    logger.info({ path }, 'Empty path provided, defaulting to root');
    return { isValid: true, normalizedPath: '/' };
  }

  // Check path length (reasonable bounds)
  if (path.length > 500) {
    logger.error({ path, length: path.length }, 'Path too long');
    return { 
      isValid: false, 
      error: 'Path cannot exceed 500 characters' 
    };
  }

  // Normalize path
  let normalizedPath = path.trim();
  
  // Ensure path starts with /
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }

  // Check for invalid characters in path segments
  const pathSegments = parsePath(normalizedPath);
  for (const segment of pathSegments) {
    if (!validateTaskId(segment)) {
      logger.error({ path, invalidSegment: segment }, 'Invalid path segment: does not match task ID format');
      return { 
        isValid: false, 
        error: `Invalid path segment '${segment}': must be a valid task ID (1-20 characters, letters/numbers/symbols allowed, excluding / \\ : * ? " < > |)` 
      };
    }
  }

  // Check for consecutive slashes or other malformed patterns
  if (normalizedPath.includes('//')) {
    logger.error({ path }, 'Invalid path format: contains consecutive slashes');
    return { 
      isValid: false, 
      error: 'Path cannot contain consecutive slashes' 
    };
  }

  return { isValid: true, normalizedPath };
}

/**
 * Validates task data structure and required fields
 * @param task The task object to validate
 * @param context Additional context for error reporting (e.g., array index, path)
 * @returns Object with isValid boolean and array of error messages
 */
function validateTaskData(task: any, context: string = ''): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const contextPrefix = context ? `${context}: ` : '';

  // Check if task is an object
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    const error = `${contextPrefix}Task must be a valid object`;
    logger.error({ task, context }, error);
    errors.push(error);
    return { isValid: false, errors };
  }

  // Validate taskId
  if (!task.taskId) {
    const error = `${contextPrefix}Task is missing required field 'taskId'`;
    logger.error({ task, context }, error);
    errors.push(error);
  } else if (typeof task.taskId !== 'string') {
    const error = `${contextPrefix}Task 'taskId' must be a string`;
    logger.error({ task, context }, error);
    errors.push(error);
  } else if (!validateTaskId(task.taskId)) {
    const error = `${contextPrefix}Task 'taskId' format is invalid: '${task.taskId}' (must be 1-20 characters, letters/numbers/symbols allowed, excluding / \\ : * ? " < > |)`;
    logger.error({ task, context }, error);
    errors.push(error);
  }

  // Validate description
  if (!task.description) {
    const error = `${contextPrefix}Task is missing required field 'description'`;
    logger.error({ task, context }, error);
    errors.push(error);
  } else if (typeof task.description !== 'string') {
    const error = `${contextPrefix}Task 'description' must be a string`;
    logger.error({ task, context }, error);
    errors.push(error);
  } else if (task.description.trim().length === 0) {
    const error = `${contextPrefix}Task 'description' cannot be empty`;
    logger.error({ task, context }, error);
    errors.push(error);
  } else if (task.description.length > 1000) {
    const error = `${contextPrefix}Task 'description' is too long (max 1000 characters)`;
    logger.error({ task, context }, error);
    errors.push(error);
  }

  // Validate status
  if (!task.status) {
    const error = `${contextPrefix}Task is missing required field 'status'`;
    logger.error({ task, context }, error);
    errors.push(error);
  } else if (typeof task.status !== 'string') {
    const error = `${contextPrefix}Task 'status' must be a string`;
    logger.error({ task, context }, error);
    errors.push(error);
  } else if (task.status !== 'TODO' && task.status !== 'DONE') {
    const error = `${contextPrefix}Task 'status' must be either 'TODO' or 'DONE', got '${task.status}'`;
    logger.error({ task, context }, error);
    errors.push(error);
  }

  // Validate children if present
  if (task.children !== undefined) {
    if (!Array.isArray(task.children)) {
      const error = `${contextPrefix}Task 'children' must be an array if provided`;
      logger.error({ task, context }, error);
      errors.push(error);
    } else {
      // Recursively validate children
      task.children.forEach((child: any, index: number) => {
        const childContext = `${context ? context + '.' : ''}children[${index}]`;
        const childValidation = validateTaskData(child, childContext);
        errors.push(...childValidation.errors);
      });
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates an array of tasks with comprehensive error reporting
 * @param tasks The tasks array to validate
 * @param context Additional context for error reporting
 * @returns Object with isValid boolean and array of error messages
 */
function validateTasksArray(tasks: any, context: string = ''): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const contextPrefix = context ? `${context}: ` : '';

  // Check if tasks is an array
  if (!Array.isArray(tasks)) {
    const error = `${contextPrefix}Tasks must be an array`;
    logger.error({ tasks, context }, error);
    errors.push(error);
    return { isValid: false, errors };
  }

  // Validate each task in the array
  const taskIds = new Set<string>();
  tasks.forEach((task, index) => {
    const taskContext = `${context ? context + '.' : ''}task[${index}]`;
    
    // Validate individual task
    const taskValidation = validateTaskData(task, taskContext);
    errors.push(...taskValidation.errors);

    // Check for duplicate task IDs within this array
    if (task && task.taskId && typeof task.taskId === 'string') {
      if (taskIds.has(task.taskId)) {
        const error = `${contextPrefix}Duplicate task ID '${task.taskId}' found at index ${index}`;
        logger.error({ taskId: task.taskId, index, context }, error);
        errors.push(error);
      } else {
        taskIds.add(task.taskId);
      }
    }
  });

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates that a path exists in the task hierarchy
 * @param sessionTasks The root tasks array for the session
 * @param path The path to validate
 * @returns Object with isValid boolean and error message if invalid
 */
function validatePathExists(sessionTasks: Task[], path: string): { isValid: boolean; error?: string } {
  const pathSegments = parsePath(path);
  
  // Root path always exists
  if (pathSegments.length === 0) {
    return { isValid: true };
  }

  // Validate each segment exists
  let currentTasks = sessionTasks;
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    const task = currentTasks.find(t => t.taskId === segment);
    
    if (!task) {
      const partialPath = '/' + pathSegments.slice(0, i + 1).join('/');
      const error = `Path '${path}' is invalid: task '${segment}' not found at '${partialPath}'`;
      logger.error({ path, segment, partialPath }, error);
      return { isValid: false, error };
    }
    
    // Move to children for next iteration
    currentTasks = task.children || [];
  }

  return { isValid: true };
}

/**
 * Logs comprehensive error information for debugging
 * @param operation The operation being performed
 * @param error The error that occurred
 * @param context Additional context information
 */
function logError(operation: string, error: any, context: Record<string, any> = {}) {
  const errorInfo = {
    operation,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : String(error),
    context,
    timestamp: new Date().toISOString()
  };
  
  logger.error(errorInfo, `Error in ${operation}`);
}

// Import shared task ID utilities
import { generateTaskId, validateTaskId } from './utils/taskIdGenerator.js';

/**
 * Checks if a task ID is unique within the session's task hierarchy
 * @param id The task ID to check
 * @param sessionTasks The root tasks array for the session
 * @returns true if the ID is unique, false if it already exists
 */
function isUniqueInSession(id: string, sessionTasks: Task[]): boolean {
  function checkTasksRecursively(tasks: Task[]): boolean {
    for (const task of tasks) {
      if (task.taskId === id) {
        return false; // ID already exists
      }
      if (task.children && task.children.length > 0) {
        if (!checkTasksRecursively(task.children)) {
          return false; // ID found in children
        }
      }
    }
    return true; // ID not found (unique)
  }
  
  return checkTasksRecursively(sessionTasks);
}

// Path Resolution Utilities

/**
 * Converts path strings into array segments for hierarchical navigation
 * @param path The path string (e.g., "/", "/auth1/", "/auth1/ui2/")
 * @returns Array of path segments, empty array for root path
 */
function parsePath(path: string): string[] {
  // Handle empty or undefined path
  if (!path || path.trim() === '') {
    return [];
  }
  
  // Normalize path by removing leading/trailing slashes and splitting
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  
  // If path is empty after normalization (was just "/"), return empty array for root
  if (normalizedPath === '') {
    return [];
  }
  
  // Split by slash and filter out empty segments
  return normalizedPath.split('/').filter(segment => segment.length > 0);
}

/**
 * Recursively finds a task at the specified path in the task hierarchy
 * @param tasks The root tasks array to search in
 * @param pathSegments Array of path segments from parsePath
 * @returns The task at the specified path, or null if not found
 */
function findTaskAtPath(tasks: Task[], pathSegments: string[]): Task | null {
  // If no path segments, we're looking for the root level (return null as there's no single task)
  if (pathSegments.length === 0) {
    return null;
  }
  
  // Find the task with the first segment's ID
  const targetTaskId = pathSegments[0];
  const targetTask = tasks.find(task => task.taskId === targetTaskId);
  
  if (!targetTask) {
    return null; // Task not found at this level
  }
  
  // If this is the last segment, return the found task
  if (pathSegments.length === 1) {
    return targetTask;
  }
  
  // If there are more segments, recurse into children
  if (!targetTask.children || targetTask.children.length === 0) {
    return null; // No children to search in
  }
  
  // Recurse with remaining path segments
  return findTaskAtPath(targetTask.children, pathSegments.slice(1));
}

/**
 * Updates tasks at a specific hierarchy level, preserving unchanged tasks and their subtrees
 * @param rootTasks The root tasks array for the session
 * @param path The path string indicating where to update tasks
 * @param newTasks The new tasks array to set at the specified path
 * @returns Updated root tasks array with changes applied
 */
function updateTasksAtPath(rootTasks: Task[], path: string, newTasks: Task[]): Task[] {
  const pathSegments = parsePath(path);
  
  // If path is root ("/"), replace the entire root tasks array
  if (pathSegments.length === 0) {
    return [...newTasks];
  }
  
  // For non-root paths, we need to find the parent and update its children
  if (pathSegments.length === 1) {
    // Update direct children of root
    const targetTaskId = pathSegments[0];
    return rootTasks.map(task => {
      if (task.taskId === targetTaskId) {
        // Replace this task's children with newTasks
        return {
          ...task,
          children: [...newTasks]
        };
      }
      return task; // Keep other tasks unchanged
    });
  }
  
  // For deeper paths, recursively update
  const firstSegment = pathSegments[0];
  const remainingPath = '/' + pathSegments.slice(1).join('/');
  
  return rootTasks.map(task => {
    if (task.taskId === firstSegment) {
      // This is the task we need to recurse into
      const updatedChildren = updateTasksAtPath(task.children || [], remainingPath, newTasks);
      return {
        ...task,
        children: updatedChildren
      };
    }
    return task; // Keep other tasks unchanged
  });
}

// Tree Formatting Utilities

/**
 * Formats a task hierarchy into a tree visualization with proper indentation and branch characters
 * @param tasks The tasks array to format
 * @param indent The current indentation string (used for recursion)
 * @returns A formatted string representing the task tree
 */
function formatTaskTree(tasks: Task[], indent: string = ""): string {
  return tasks.map((task, index) => {
    const isLast = index === tasks.length - 1;
    const prefix = indent + (isLast ? "└── " : "├── ");
    const status = task.status === 'DONE' ? '✓' : '○';
    let result = `${prefix}${status} ${task.taskId}: ${task.description}`;
    
    if (task.children && task.children.length > 0) {
      const childIndent = indent + (isLast ? "    " : "│   ");
      result += "\n" + formatTaskTree(task.children, childIndent);
    }
    
    return result;
  }).join("\n");
}

// Hierarchical Task Search Functionality

/**
 * Recursively finds a task by its ID at any depth in the task hierarchy
 * @param tasks The tasks array to search in
 * @param taskId The ID of the task to find
 * @returns The task if found, null otherwise
 */
function findTaskById(tasks: Task[], taskId: string): Task | null {
  for (const task of tasks) {
    // Check if this is the task we're looking for
    if (task.taskId === taskId) {
      return task;
    }
    
    // If this task has children, search recursively
    if (task.children && task.children.length > 0) {
      const foundInChildren = findTaskById(task.children, taskId);
      if (foundInChildren) {
        return foundInChildren;
      }
    }
  }
  
  return null; // Task not found
}

/**
 * Determines the hierarchical path to a specific task
 * @param tasks The root tasks array to search in
 * @param taskId The ID of the task to find the path for
 * @param currentPath The current path being built (used for recursion)
 * @returns The path string to the task (e.g., "/auth1/api/login") or null if not found
 */
function getTaskPath(tasks: Task[], taskId: string, currentPath: string = ""): string | null {
  for (const task of tasks) {
    const taskPath = currentPath + "/" + task.taskId;
    
    // Check if this is the task we're looking for
    if (task.taskId === taskId) {
      return taskPath;
    }
    
    // If this task has children, search recursively
    if (task.children && task.children.length > 0) {
      const foundPath = getTaskPath(task.children, taskId, taskPath);
      if (foundPath) {
        return foundPath;
      }
    }
  }
  
  return null; // Task not found
}

/**
 * Validates the integrity of a task hierarchy
 * @param tasks The tasks array to validate
 * @param seenIds Set of task IDs already seen (used for recursion to detect duplicates)
 * @param currentPath Current path for error reporting
 * @returns Object with isValid boolean and array of error messages
 */
function validateTaskHierarchy(
  tasks: Task[], 
  seenIds: Set<string> = new Set(), 
  currentPath: string = "root"
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const taskPath = `${currentPath}[${i}]`;
    
    // Validate required fields
    if (!task.taskId || typeof task.taskId !== 'string') {
      errors.push(`Task at ${taskPath} has invalid or missing taskId`);
      continue; // Skip further validation for this task
    }
    
    if (!task.description || typeof task.description !== 'string') {
      errors.push(`Task at ${taskPath} (${task.taskId}) has invalid or missing description`);
    }
    
    if (!task.status || (task.status !== 'TODO' && task.status !== 'DONE')) {
      errors.push(`Task at ${taskPath} (${task.taskId}) has invalid status: ${task.status}`);
    }
    
    // Validate task ID format
    if (!validateTaskId(task.taskId)) {
      errors.push(`Task at ${taskPath} has invalid taskId format: ${task.taskId}`);
    }
    
    // Check for duplicate task IDs
    if (seenIds.has(task.taskId)) {
      errors.push(`Duplicate task ID found: ${task.taskId} at ${taskPath}`);
    } else {
      seenIds.add(task.taskId);
    }
    
    // Validate children if they exist
    if (task.children) {
      if (!Array.isArray(task.children)) {
        errors.push(`Task at ${taskPath} (${task.taskId}) has invalid children property (not an array)`);
      } else {
        // Recursively validate children
        const childValidation = validateTaskHierarchy(
          task.children, 
          seenIds, 
          `${taskPath}.children`
        );
        errors.push(...childValidation.errors);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

async function main() {
  // Create an MCP server instance
  const server = new McpServer({
    name: "checklist-mcp-server",
    version: "1.0.0"
  });

  // --- Tool Definitions ---

  // 1. update_tasks tool
  const updateTasksInputSchema = z.object({
    sessionId: z.string()
      .min(1, "sessionId cannot be empty")
      .describe("Unique identifier for the task session. Must be 1-100 characters, alphanumeric with hyphens/underscores allowed."),
    path: z.string()
      .default("/")
      .describe("Hierarchical path specifying where to update tasks. Examples: '/' (root level), '/auth1/' (children of task auth1), '/auth1/api2/' (children of task api2 under auth1). Path segments must be valid task IDs. Use '/' to replace entire task list, '/taskId/' to replace children of a specific task."),
    tasks: z.array(z.object({
        taskId: z.string()
          .min(1, "Task ID cannot be empty")
          .describe("Unique 1-20 character identifier for the task (letters, numbers, symbols allowed, excluding / \\ : * ? \" < > |). Examples: 'task-1', 'task-1-1', 'task-1-a', 'task1-a', 'task1-1', 'task-1-a-b', 'user@task-1'"),
        description: z.string()
          .min(1, "Task description cannot be empty")
          .describe("Human-readable description of the task (max 1000 characters)"),
        status: z.enum(['TODO', 'DONE'])
          .default('TODO')
          .describe("Current status of the task. 'TODO' for incomplete, 'DONE' for completed"),
        children: z.array(z.any())
          .optional()
          .describe("Optional array of subtasks with the same structure as parent tasks")
    }))
    .min(0, "Tasks array must be valid")
    .describe("Array of tasks to set at the specified path. Empty array clears tasks at that path.")
  });

  // Define the type inferred from the schema
  type UpdateTasksInput = z.infer<typeof updateTasksInputSchema>;

  server.tool("update_tasks", 
    "Updates tasks at a specific hierarchy level within a session. Accepts a path parameter for targeting specific levels (e.g., '/', '/taskId/', '/taskId1/taskId2/'). Preserves unchanged tasks and their subtree structures. Creates new session if sessionId doesn't exist.",
     updateTasksInputSchema.shape, async ({ sessionId, path, tasks }: UpdateTasksInput) => {
    // Log entry with request details
    logger.info({ tool: 'update_tasks', params: { sessionId, path, taskCount: tasks.length } }, 'Received update_tasks request');
    
    try {
      // Enhanced session validation
      const sessionValidation = validateSession(sessionId);
      if (!sessionValidation.isValid) {
        logError('update_tasks', sessionValidation.error, { sessionId, path });
        return {
          content: [{ 
            type: "text", 
            text: `Error: ${sessionValidation.error}` 
          }]
        };
      }

      // Enhanced path validation
      const pathValidation = validatePath(path);
      if (!pathValidation.isValid) {
        logError('update_tasks', pathValidation.error, { sessionId, path });
        return {
          content: [{ 
            type: "text", 
            text: `Error: ${pathValidation.error}` 
          }]
        };
      }
      
      // Use normalized path from validation
      const normalizedPath = pathValidation.normalizedPath || path;

      // Enhanced task data validation
      const tasksValidation = validateTasksArray(tasks, 'update_tasks');
      if (!tasksValidation.isValid) {
        logError('update_tasks', 'Task validation failed', { 
          sessionId, 
          path: normalizedPath, 
          errors: tasksValidation.errors 
        });
        return {
          content: [{ 
            type: "text", 
            text: `Error: Invalid task data:\n${tasksValidation.errors.join('\n')}` 
          }]
        };
      }

      // Get or create session tasks
      let sessionTasks = taskStore.get(sessionId);
      if (!sessionTasks) {
        // Create new session with empty tasks array
        sessionTasks = [];
        taskStore.set(sessionId, sessionTasks);
        logger.info({ sessionId }, 'Created new session for update_tasks');
      }

      // Validate path exists (except for root path)
      const pathSegments = parsePath(path);
      if (pathSegments.length > 0 && path !== "/") {
        // For paths like "/taskId/", we need to verify the parent task exists
        // The path represents where we want to update children, so we validate the parent exists
        const parentPath = pathSegments.slice(0, -1);
        let targetParent: Task[] | null = sessionTasks;
        
        // Validate each segment in the parent path exists
        for (const segment of parentPath) {
          const parentTask: Task | undefined = targetParent?.find(task => task.taskId === segment);
          if (!parentTask) {
            logger.error({ sessionId, path, missingSegment: segment }, 'Invalid path - parent task not found');
            return {
              content: [{ 
                type: "text", 
                text: `Error: Invalid path '${path}' - parent task '${segment}' not found` 
              }]
            };
          }
          targetParent = parentTask.children || [];
        }

        // For updating children of a task (e.g., "/taskId/"), verify the target task exists
        if (pathSegments.length > 0) {
          const finalSegment = pathSegments[pathSegments.length - 1];
          const targetTask: Task | undefined = targetParent?.find(task => task.taskId === finalSegment);
          if (!targetTask) {
            logger.error({ sessionId, path, missingTask: finalSegment }, 'Invalid path - target task not found');
            return {
              content: [{ 
                type: "text", 
                text: `Error: Invalid path '${path}' - target task '${finalSegment}' not found` 
              }]
            };
          }
        }
      }

      // Check for task ID conflicts with existing tasks in the session
      for (const newTask of tasks as Task[]) {
        if (!isUniqueInSession(newTask.taskId, sessionTasks)) {
          // Allow the task if it's being updated at the same path
          const existingTask = findTaskById(sessionTasks, newTask.taskId);
          if (existingTask) {
            const existingPath = getTaskPath(sessionTasks, newTask.taskId);
            const targetPath = path === "/" ? "/" : path + "/";
            
            // Only allow if the task is being updated in its current location
            if (existingPath !== targetPath.replace(/\/$/, '') && !existingPath?.startsWith(targetPath)) {
              logger.error({ sessionId, path, conflictingId: newTask.taskId, existingPath }, 'Task ID conflict with existing task');
              return {
                content: [{ 
                  type: "text", 
                  text: `Error: Task ID '${newTask.taskId}' already exists at path '${existingPath}'` 
                }]
              };
            }
          }
        }
      }

      // Apply the update using the path resolution utility
      const updatedTasks = updateTasksAtPath(sessionTasks, path, tasks as Task[]);
      taskStore.set(sessionId, updatedTasks);

      // Log successful update
      logger.info({ sessionId, path, updatedCount: tasks.length }, 'Updated tasks successfully');

      // Format response with complete hierarchy using the global formatTaskTree function
      const treeView = updatedTasks.length > 0 ? formatTaskTree(updatedTasks) : "No tasks";

      return {
        content: [
          { type: "text", text: `Successfully updated ${tasks.length} tasks at path '${path}' for session ${sessionId}` },
          { type: "text", text: `Complete task hierarchy:\n${treeView}` }
        ]
      };

    } catch (error) {
      logger.error({ sessionId, path, error: error instanceof Error ? error.message : String(error) }, 'Error in update_tasks');
      return {
        content: [{ 
          type: "text", 
          text: `Error updating tasks: ${error instanceof Error ? error.message : String(error)}` 
        }]
      };
    }
  });

  // 2. mark_task_as_done tool
  const markTaskAsDoneInputSchema = z.object({
      sessionId: z.string()
        .min(1, "sessionId cannot be empty")
        .describe("Unique identifier for the task session. Must match an existing session."),
      taskId: z.string()
        .min(1, "taskId cannot be empty")
        .describe("The unique identifier of the task to mark as done. Task will be found at any depth in the hierarchy. Examples: 'auth1', 'ui2', 'login'")
  });

  // Define the type inferred from the schema
  type MarkTaskAsDoneInput = z.infer<typeof markTaskAsDoneInputSchema>;

  server.tool("mark_task_as_done", 
    "Marks a specific task as 'DONE' within a session using hierarchical task search. Requires the 'sessionId' and the 'taskId' of the task to be marked. Preserves subtask independence - marking a parent task does not affect subtask status. Returns the complete hierarchical task view after marking.", 
    markTaskAsDoneInputSchema.shape, async ({ sessionId, taskId }: MarkTaskAsDoneInput) => {
    // Log entry with request details
    logger.info({ tool: 'mark_task_as_done', params: { sessionId, taskId } }, 'Received mark_task_as_done request');
    
    try {
      // Enhanced session validation
      const sessionValidation = validateSession(sessionId);
      if (!sessionValidation.isValid) {
        logError('mark_task_as_done', sessionValidation.error, { sessionId, taskId });
        return {
          content: [{ 
            type: "text", 
            text: `Error: ${sessionValidation.error}` 
          }]
        };
      }

      // Enhanced task ID validation
      if (!taskId || typeof taskId !== 'string') {
        logError('mark_task_as_done', 'Invalid task ID', { sessionId, taskId });
        return {
          content: [{ 
            type: "text", 
            text: `Error: Task ID must be a non-empty string` 
          }]
        };
      }

      if (!validateTaskId(taskId)) {
        logError('mark_task_as_done', 'Invalid task ID format', { sessionId, taskId });
        return {
          content: [{ 
            type: "text", 
            text: `Error: Task ID '${taskId}' has invalid format (must be 1-20 characters, letters/numbers/symbols allowed, excluding / \\ : * ? " < > |)` 
          }]
        };
      }

      const sessionTasks = taskStore.get(sessionId);
      if (!sessionTasks) {
        logError('mark_task_as_done', 'Session not found', { sessionId, taskId });
        return {
          content: [{ 
            type: "text", 
            text: `Error: No tasks found for session ${sessionId}` 
          }]
        };
      }

      // Use recursive hierarchical search to find the task at any depth
      const targetTask = findTaskById(sessionTasks, taskId);
      if (!targetTask) {
        logError('mark_task_as_done', 'Task not found', { sessionId, taskId });
        return {
          content: [{ 
            type: "text", 
            text: `Error: Task with ID '${taskId}' not found in session '${sessionId}'` 
          }]
        };
      }
    
      if (targetTask.status === 'DONE') {
         // Log task already marked as DONE
         logger.warn({ sessionId, taskId }, 'Task already marked as DONE');
         
         // Format complete hierarchy for response even when task is already done using global function
         const treeView = sessionTasks.length > 0 ? formatTaskTree(sessionTasks) : "No tasks";
         
         return {
            content: [
              { type: "text", text: `Task ${taskId} in session ${sessionId} is already marked as DONE.` },
              { type: "text", text: `Complete task hierarchy:\n${treeView}` }
            ]
        };
      }

      // Mark only the specific task as DONE, preserving subtask independence
      targetTask.status = 'DONE';
      taskStore.set(sessionId, sessionTasks); // Update the store
      
      // Log successful marking
      logger.info({ sessionId, taskId }, 'Marked task as DONE');

      // Format the complete hierarchical task view for the response using global function
      const treeView = sessionTasks.length > 0 ? formatTaskTree(sessionTasks) : "No tasks";

      return {
        content: [
            { type: "text", text: `Successfully marked task ${taskId} as DONE for session ${sessionId}.` },
            { type: "text", text: `Complete task hierarchy:\n${treeView}` }
        ]
      };

    } catch (error) {
      logError('mark_task_as_done', error, { sessionId, taskId });
      return {
        content: [{ 
          type: "text", 
          text: `Error marking task as done: ${error instanceof Error ? error.message : String(error)}` 
        }]
      };
    }
  });

  // 3. get_all_tasks tool
  const getAllTasksInputSchema = z.object({
      sessionId: z.string()
        .min(1, "sessionId cannot be empty")
        .describe("Unique identifier for the task session to retrieve tasks from. Must match an existing session.")
  });

  // Define the type inferred from the schema
  type GetAllTasksInput = z.infer<typeof getAllTasksInputSchema>;

  server.tool("get_all_tasks", 
    "Retrieves the complete hierarchical list of tasks and their current status ('TODO' or 'DONE') for the specified 'sessionId'. Returns tasks in a tree format with proper indentation and visual indicators.", 
    getAllTasksInputSchema.shape, async ({ sessionId }: GetAllTasksInput) => {
    // Log entry with request details
    logger.info({ tool: 'get_all_tasks', params: { sessionId } }, 'Received get_all_tasks request');
    
    try {
      // Enhanced session validation
      const sessionValidation = validateSession(sessionId);
      if (!sessionValidation.isValid) {
        logError('get_all_tasks', sessionValidation.error, { sessionId });
        return {
          content: [{ 
            type: "text", 
            text: `Error: ${sessionValidation.error}` 
          }]
        };
      }

      const sessionTasks = taskStore.get(sessionId);
      if (!sessionTasks || sessionTasks.length === 0) {
        // Log no tasks found or invalid sessionId
        logger.warn({ sessionId }, 'No tasks found or invalid sessionId for get_all_tasks');
        return {
          content: [{ type: "text", text: `No tasks found for session ${sessionId}.` }]
        };
      }

      // Use the formatTaskTree function for consistent hierarchical visualization
      const treeView = formatTaskTree(sessionTasks);

      // Log successful retrieval
      logger.info({ sessionId, retrievedCount: sessionTasks.length }, 'Retrieved tasks successfully');
      return {
        content: [
          { type: "text", text: `Tasks for session ${sessionId}:\n${treeView}` }
        ]
      };

    } catch (error) {
      logError('get_all_tasks', error, { sessionId });
      return {
        content: [{ 
          type: "text", 
          text: `Error retrieving tasks: ${error instanceof Error ? error.message : String(error)}` 
        }]
      };
    }
  });

  // --- Server Connection ---

  // Create the Stdio transport
  const transport = new StdioServerTransport();

  // Connect the server to the transport and start listening
  logger.info('Checklist MCP Server starting in stdio mode...');
  await server.connect(transport);
}

main().catch(err => {
  // Log fatal errors before exiting
  logger.fatal({ err }, 'Checklist MCP Server stopped due to an unhandled error');
  process.exit(1);
});
