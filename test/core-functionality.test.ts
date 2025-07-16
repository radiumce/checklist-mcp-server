import assert from 'assert';

// Core interfaces and types
interface Task {
  taskId: string;
  description: string;
  status: 'TODO' | 'DONE';
  children?: Task[];
}

// Copy core functions from server.ts for testing
// These functions are duplicated here since they're not exported from the server

/**
 * Validates session ID format and existence
 */
function validateSession(sessionId: string): { isValid: boolean; error?: string } {
  if (!sessionId || typeof sessionId !== 'string') {
    return { 
      isValid: false, 
      error: 'Session ID must be a non-empty string' 
    };
  }

  if (sessionId.length < 1 || sessionId.length > 100) {
    return { 
      isValid: false, 
      error: 'Session ID must be between 1 and 100 characters long' 
    };
  }

  const validSessionIdRegex = /^[a-zA-Z0-9_-]+$/;
  if (!validSessionIdRegex.test(sessionId)) {
    return { 
      isValid: false, 
      error: 'Session ID can only contain alphanumeric characters, hyphens, and underscores' 
    };
  }

  return { isValid: true };
}

/**
 * Validates path format and structure
 */
function validatePath(path: string): { isValid: boolean; normalizedPath?: string; error?: string } {
  if (path === null || path === undefined) {
    return { isValid: true, normalizedPath: '/' };
  }

  if (typeof path !== 'string') {
    return { 
      isValid: false, 
      error: 'Path must be a string' 
    };
  }

  if (path.trim() === '') {
    return { isValid: true, normalizedPath: '/' };
  }

  if (path.length > 500) {
    return { 
      isValid: false, 
      error: 'Path cannot exceed 500 characters' 
    };
  }

  let normalizedPath = path.trim();
  
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }

  if (normalizedPath.includes('//')) {
    return { 
      isValid: false, 
      error: 'Path cannot contain consecutive slashes' 
    };
  }

  return { isValid: true, normalizedPath };
}

/**
 * Validates that a task ID meets the format requirements
 */
function validateTaskId(id: string): boolean {
  // Check length (1-20 characters, allowing more flexibility)
  if (id.length < 1 || id.length > 20) {
    return false;
  }
  
  // Allow letters, numbers, and common symbols
  // Excluding only characters that might cause issues in paths or parsing: / \ : * ? " < > |
  const validCharsRegex = /^[a-zA-Z0-9\-_@#$%&+=!.]+$/;
  if (!validCharsRegex.test(id)) {
    return false;
  }
  
  // No additional restrictions - pure numbers, symbols, etc. are all allowed
  return true;
}

/**
 * Validates task data structure and required fields
 */
function validateTaskData(task: any, context: string = ''): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const contextPrefix = context ? `${context}: ` : '';

  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    const error = `${contextPrefix}Task must be a valid object`;
    errors.push(error);
    return { isValid: false, errors };
  }

  if (!task.taskId) {
    errors.push(`${contextPrefix}Task is missing required field 'taskId'`);
  } else if (typeof task.taskId !== 'string') {
    errors.push(`${contextPrefix}Task 'taskId' must be a string`);
  } else if (!validateTaskId(task.taskId)) {
    errors.push(`${contextPrefix}Task 'taskId' format is invalid: '${task.taskId}' (must be 1-20 characters, letters/numbers/symbols allowed, excluding / \\ : * ? " < > |)`);
  }

  if (!task.description) {
    errors.push(`${contextPrefix}Task is missing required field 'description'`);
  } else if (typeof task.description !== 'string') {
    errors.push(`${contextPrefix}Task 'description' must be a string`);
  } else if (task.description.trim().length === 0) {
    errors.push(`${contextPrefix}Task 'description' cannot be empty`);
  } else if (task.description.length > 1000) {
    errors.push(`${contextPrefix}Task 'description' is too long (max 1000 characters)`);
  }

  if (!task.status) {
    errors.push(`${contextPrefix}Task is missing required field 'status'`);
  } else if (typeof task.status !== 'string') {
    errors.push(`${contextPrefix}Task 'status' must be a string`);
  } else if (task.status !== 'TODO' && task.status !== 'DONE') {
    errors.push(`${contextPrefix}Task 'status' must be either 'TODO' or 'DONE', got '${task.status}'`);
  }

  if (task.children !== undefined) {
    if (!Array.isArray(task.children)) {
      errors.push(`${contextPrefix}Task 'children' must be an array if provided`);
    } else {
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
 * Converts path strings into array segments for hierarchical navigation
 */
function parsePath(path: string): string[] {
  if (!path || path.trim() === '') {
    return [];
  }
  
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  
  if (normalizedPath === '') {
    return [];
  }
  
  return normalizedPath.split('/').filter(segment => segment.length > 0);
}

/**
 * Recursively finds a task at the specified path in the task hierarchy
 */
function findTaskAtPath(tasks: Task[], pathSegments: string[]): Task | null {
  if (pathSegments.length === 0) {
    return null;
  }
  
  const targetTaskId = pathSegments[0];
  const targetTask = tasks.find(task => task.taskId === targetTaskId);
  
  if (!targetTask) {
    return null;
  }
  
  if (pathSegments.length === 1) {
    return targetTask;
  }
  
  if (!targetTask.children || targetTask.children.length === 0) {
    return null;
  }
  
  return findTaskAtPath(targetTask.children, pathSegments.slice(1));
}

/**
 * Updates tasks at a specific hierarchy level
 */
function updateTasksAtPath(rootTasks: Task[], path: string, newTasks: Task[]): Task[] {
  const pathSegments = parsePath(path);
  
  if (pathSegments.length === 0) {
    return [...newTasks];
  }
  
  if (pathSegments.length === 1) {
    const targetTaskId = pathSegments[0];
    return rootTasks.map(task => {
      if (task.taskId === targetTaskId) {
        return {
          ...task,
          children: [...newTasks]
        };
      }
      return task;
    });
  }
  
  const firstSegment = pathSegments[0];
  const remainingPath = '/' + pathSegments.slice(1).join('/');
  
  return rootTasks.map(task => {
    if (task.taskId === firstSegment) {
      const updatedChildren = updateTasksAtPath(task.children || [], remainingPath, newTasks);
      return {
        ...task,
        children: updatedChildren
      };
    }
    return task;
  });
}

/**
 * Formats a task hierarchy into a tree visualization
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

/**
 * Recursively finds a task by its ID at any depth
 */
function findTaskById(tasks: Task[], taskId: string): Task | null {
  for (const task of tasks) {
    if (task.taskId === taskId) {
      return task;
    }
    
    if (task.children && task.children.length > 0) {
      const foundInChildren = findTaskById(task.children, taskId);
      if (foundInChildren) {
        return foundInChildren;
      }
    }
  }
  
  return null;
}

/**
 * Determines the hierarchical path to a specific task
 */
function getTaskPath(tasks: Task[], taskId: string, currentPath: string = ""): string | null {
  for (const task of tasks) {
    const taskPath = currentPath + "/" + task.taskId;
    
    if (task.taskId === taskId) {
      return taskPath;
    }
    
    if (task.children && task.children.length > 0) {
      const foundPath = getTaskPath(task.children, taskId, taskPath);
      if (foundPath) {
        return foundPath;
      }
    }
  }
  
  return null;
}

// Test data
const sampleTasks: Task[] = [
  {
    taskId: "auth1",
    description: "Implement authentication system",
    status: "TODO",
    children: [
      {
        taskId: "db1",
        description: "Design database schema",
        status: "DONE"
      },
      {
        taskId: "api",
        description: "Create authentication API",
        status: "TODO",
        children: [
          {
            taskId: "login",
            description: "Login endpoint",
            status: "TODO"
          },
          {
            taskId: "logout",
            description: "Logout endpoint",
            status: "TODO"
          }
        ]
      }
    ]
  },
  {
    taskId: "ui2",
    description: "Build user interface",
    status: "TODO",
    children: [
      {
        taskId: "forms",
        description: "Create forms",
        status: "TODO"
      }
    ]
  }
];

// Test suite for core functionality
async function runCoreTests() {
  console.log('--- Starting Core Functionality Tests ---');
  
  try {
    // Test 1: validateSession function
    console.log('Testing validateSession function...');
    
    // Valid sessions
    assert(validateSession('valid-session').isValid === true, 'Should accept valid session ID');
    assert(validateSession('test123').isValid === true, 'Should accept alphanumeric session ID');
    assert(validateSession('session_with_underscores').isValid === true, 'Should accept underscores');
    assert(validateSession('session-with-hyphens').isValid === true, 'Should accept hyphens');
    
    // Invalid sessions
    assert(validateSession('').isValid === false, 'Should reject empty session ID');
    assert(validateSession('invalid@session!').isValid === false, 'Should reject special characters');
    assert(validateSession('a'.repeat(101)).isValid === false, 'Should reject too long session ID');
    
    console.log('validateSession tests PASSED');
    
    // Test 2: validatePath function
    console.log('Testing validatePath function...');
    
    // Valid paths
    const validPath1 = validatePath('/');
    assert(validPath1.isValid === true && validPath1.normalizedPath === '/', 'Should accept root path');
    
    const validPath2 = validatePath('/task1');
    assert(validPath2.isValid === true, 'Should accept simple path');
    
    const validPath3 = validatePath('task1');
    assert(validPath3.isValid === true && validPath3.normalizedPath === '/task1', 'Should normalize path without leading slash');
    
    // Invalid paths
    assert(validatePath('/invalid//path').isValid === false, 'Should reject consecutive slashes');
    assert(validatePath('a'.repeat(501)).isValid === false, 'Should reject too long path');
    
    console.log('validatePath tests PASSED');
    
    // Test 3: validateTaskId function
    console.log('Testing validateTaskId function...');
    
    // Valid task IDs
    assert(validateTaskId('abc') === true, 'Should accept 3-character ID with letters');
    assert(validateTaskId('auth1') === true, 'Should accept typical task ID');
    assert(validateTaskId('ui2') === true, 'Should accept short mixed ID');
    assert(validateTaskId('a1b2c3d4') === true, 'Should accept 8-character mixed ID');
    
    // Invalid task IDs
    assert(validateTaskId('') === false, 'Should reject empty ID');
    assert(validateTaskId('a'.repeat(21)) === false, 'Should reject too long ID (>20 chars)');
    assert(validateTaskId('ab/c') === false, 'Should reject forbidden characters (/)');
    assert(validateTaskId('ab\\c') === false, 'Should reject forbidden characters (\\)');
    assert(validateTaskId('ab:c') === false, 'Should reject forbidden characters (:)');
    assert(validateTaskId('ab*c') === false, 'Should reject forbidden characters (*)');
    assert(validateTaskId('ab?c') === false, 'Should reject forbidden characters (?)');
    assert(validateTaskId('ab"c') === false, 'Should reject forbidden characters (")');
    assert(validateTaskId('ab<c') === false, 'Should reject forbidden characters (<)');
    assert(validateTaskId('ab>c') === false, 'Should reject forbidden characters (>)');
    assert(validateTaskId('ab|c') === false, 'Should reject forbidden characters (|)');
    assert(validateTaskId('ab c') === false, 'Should reject spaces');
    
    // Valid task IDs (now allowed)
    assert(validateTaskId('123') === true, 'Should accept pure numbers');
    assert(validateTaskId('ab-c') === true, 'Should accept hyphens');
    assert(validateTaskId('ab_c') === true, 'Should accept underscores');
    assert(validateTaskId('@task') === true, 'Should accept @ symbol');
    assert(validateTaskId('task#1') === true, 'Should accept # symbol');
    assert(validateTaskId('v1.0') === true, 'Should accept dots');
    assert(validateTaskId('user+admin') === true, 'Should accept + symbol');
    assert(validateTaskId('test!') === true, 'Should accept exclamation');
    assert(validateTaskId('x') === true, 'Should accept single character');
    
    console.log('validateTaskId tests PASSED');
    
    // Test 4: validateTaskData function
    console.log('Testing validateTaskData function...');
    
    // Valid task
    const validTask = {
      taskId: 'test1',
      description: 'Test task',
      status: 'TODO'
    };
    const validResult = validateTaskData(validTask);
    assert(validResult.isValid === true, 'Should accept valid task');
    assert(validResult.errors.length === 0, 'Should have no errors for valid task');
    
    // Invalid task - missing fields
    const invalidTask1 = {
      taskId: 'test1'
      // missing description and status
    };
    const invalidResult1 = validateTaskData(invalidTask1);
    assert(invalidResult1.isValid === false, 'Should reject task with missing fields');
    assert(invalidResult1.errors.length > 0, 'Should have errors for invalid task');
    
    // Invalid task - wrong types
    const invalidTask2 = {
      taskId: 123,
      description: 'Test task',
      status: 'TODO'
    };
    const invalidResult2 = validateTaskData(invalidTask2);
    assert(invalidResult2.isValid === false, 'Should reject task with wrong field types');
    
    console.log('validateTaskData tests PASSED');
    
    // Test 5: parsePath function
    console.log('Testing parsePath function...');
    
    assert(JSON.stringify(parsePath('/')) === JSON.stringify([]), 'Should parse root path as empty array');
    assert(JSON.stringify(parsePath('/task1')) === JSON.stringify(['task1']), 'Should parse single segment');
    assert(JSON.stringify(parsePath('/task1/task2')) === JSON.stringify(['task1', 'task2']), 'Should parse multiple segments');
    assert(JSON.stringify(parsePath('task1/task2/')) === JSON.stringify(['task1', 'task2']), 'Should handle trailing slash');
    
    console.log('parsePath tests PASSED');
    
    // Test 6: findTaskAtPath function
    console.log('Testing findTaskAtPath function...');
    
    const foundTask1 = findTaskAtPath(sampleTasks, ['auth1']);
    assert(foundTask1?.taskId === 'auth1', 'Should find task at root level');
    
    const foundTask2 = findTaskAtPath(sampleTasks, ['auth1', 'api']);
    assert(foundTask2?.taskId === 'api', 'Should find task at second level');
    
    const foundTask3 = findTaskAtPath(sampleTasks, ['auth1', 'api', 'login']);
    assert(foundTask3?.taskId === 'login', 'Should find task at third level');
    
    const notFound = findTaskAtPath(sampleTasks, ['nonexistent']);
    assert(notFound === null, 'Should return null for non-existent task');
    
    console.log('findTaskAtPath tests PASSED');
    
    // Test 7: updateTasksAtPath function
    console.log('Testing updateTasksAtPath function...');
    
    const newTasks: Task[] = [
      { taskId: 'new1', description: 'New task 1', status: 'TODO' },
      { taskId: 'new2', description: 'New task 2', status: 'DONE' }
    ];
    
    // Update at root level
    const updatedRoot = updateTasksAtPath(sampleTasks, '/', newTasks);
    assert(updatedRoot.length === 2, 'Should replace root tasks');
    assert(updatedRoot[0].taskId === 'new1', 'Should have new task at root');
    
    // Update at child level
    const updatedChild = updateTasksAtPath(sampleTasks, '/auth1', newTasks);
    assert(updatedChild[0].taskId === 'auth1', 'Should preserve parent task');
    assert(updatedChild[0].children?.length === 2, 'Should update children');
    assert(updatedChild[0].children?.[0].taskId === 'new1', 'Should have new child task');
    
    console.log('updateTasksAtPath tests PASSED');
    
    // Test 8: formatTaskTree function
    console.log('Testing formatTaskTree function...');
    
    const treeOutput = formatTaskTree(sampleTasks);
    assert(treeOutput.includes('○ auth1: Implement authentication system'), 'Should format root task');
    assert(treeOutput.includes('✓ db1: Design database schema'), 'Should show DONE status');
    assert(treeOutput.includes('├── '), 'Should include tree characters');
    assert(treeOutput.includes('└── '), 'Should include last item tree character');
    
    console.log('formatTaskTree tests PASSED');
    
    // Test 9: findTaskById function
    console.log('Testing findTaskById function...');
    
    const foundById1 = findTaskById(sampleTasks, 'auth1');
    assert(foundById1?.taskId === 'auth1', 'Should find root task by ID');
    
    const foundById2 = findTaskById(sampleTasks, 'login');
    assert(foundById2?.taskId === 'login', 'Should find nested task by ID');
    
    const notFoundById = findTaskById(sampleTasks, 'nonexistent');
    assert(notFoundById === null, 'Should return null for non-existent task ID');
    
    console.log('findTaskById tests PASSED');
    
    // Test 10: getTaskPath function
    console.log('Testing getTaskPath function...');
    
    const path1 = getTaskPath(sampleTasks, 'auth1');
    assert(path1 === '/auth1', 'Should return correct path for root task');
    
    const path2 = getTaskPath(sampleTasks, 'api');
    assert(path2 === '/auth1/api', 'Should return correct path for nested task');
    
    const path3 = getTaskPath(sampleTasks, 'login');
    assert(path3 === '/auth1/api/login', 'Should return correct path for deeply nested task');
    
    const noPath = getTaskPath(sampleTasks, 'nonexistent');
    assert(noPath === null, 'Should return null for non-existent task');
    
    console.log('getTaskPath tests PASSED');
    
    console.log('--- All Core Functionality Tests PASSED ---');
    
  } catch (error) {
    console.error('--- Core Functionality Tests FAILED ---');
    console.error(error);
    process.exitCode = 1;
  }
}

// Run the tests
runCoreTests();