/**
 * Test Helper Utilities
 * Provides shared utilities for test files to ensure consistency
 */

import { generateTaskId, generateMultipleTaskIds, createUniqueIdGenerator } from '../../src/utils/taskIdGenerator.js';

// Re-export ID generation functions for tests
export { generateTaskId, generateMultipleTaskIds, createUniqueIdGenerator };

/**
 * Interface for test task input
 */
export interface TestTaskInput {
  taskId?: string; // Optional - will be generated if not provided
  description: string;
  status?: 'TODO' | 'DONE';
  children?: TestTaskInput[];
}

/**
 * Interface for final task with generated IDs
 */
export interface TaskInput {
  taskId: string;
  description: string;
  status?: 'TODO' | 'DONE';
  children?: TaskInput[];
}

/**
 * Creates test tasks with automatically generated valid task IDs
 * @param tasks Array of test task definitions
 * @returns Array of tasks with valid generated IDs
 */
export function createTestTasks(tasks: TestTaskInput[]): TaskInput[] {
  const idGenerator = createUniqueIdGenerator();
  
  function processTask(task: TestTaskInput): TaskInput {
    const processedTask: TaskInput = {
      taskId: task.taskId || idGenerator(),
      description: task.description,
      status: task.status || 'TODO'
    };
    
    if (task.children && task.children.length > 0) {
      processedTask.children = task.children.map(processTask);
    }
    
    return processedTask;
  }
  
  return tasks.map(processTask);
}

/**
 * Creates a simple test task with generated ID
 * @param description Task description
 * @param status Task status (defaults to TODO)
 * @returns Task with generated ID
 */
export function createSimpleTask(description: string, status: 'TODO' | 'DONE' = 'TODO'): TaskInput {
  return {
    taskId: generateTaskId(),
    description,
    status
  };
}

/**
 * Creates a hierarchical test task structure
 * @param rootDescription Root task description
 * @param childDescriptions Array of child task descriptions
 * @returns Hierarchical task structure with generated IDs
 */
export function createHierarchicalTask(
  rootDescription: string, 
  childDescriptions: string[]
): TaskInput {
  const idGenerator = createUniqueIdGenerator();
  
  return {
    taskId: idGenerator(),
    description: rootDescription,
    status: 'TODO',
    children: childDescriptions.map(desc => ({
      taskId: idGenerator(),
      description: desc,
      status: 'TODO' as const
    }))
  };
}

/**
 * Creates multiple simple tasks with generated IDs
 * @param descriptions Array of task descriptions
 * @returns Array of tasks with generated IDs
 */
export function createMultipleTasks(descriptions: string[]): TaskInput[] {
  const ids = generateMultipleTaskIds(descriptions.length);
  
  return descriptions.map((desc, index) => ({
    taskId: ids[index],
    description: desc,
    status: 'TODO' as const
  }));
}

/**
 * Session ID generator for tests
 */
let sessionCounter = 0;
export function generateTestSessionId(prefix: string = 'test-session'): string {
  return `${prefix}-${++sessionCounter}-${Date.now()}`;
}