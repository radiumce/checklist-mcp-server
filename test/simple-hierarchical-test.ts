#!/usr/bin/env ts-node
import assert from 'assert';

// Import the Task interface and functions we need to test
interface Task {
  taskId: string;
  description: string;
  status: 'TODO' | 'DONE';
  children?: Task[];
}

// Copy the functions we want to test (since they're not exported from server.ts)
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

// Test data
const sampleTasks: Task[] = [
  {
    taskId: "auth1",
    description: "Implement user authentication system",
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

console.log('--- Testing Hierarchical Task Search ---');

// Test findTaskById
console.log('Testing findTaskById...');

// Test finding root level task
const rootTask = findTaskById(sampleTasks, "auth1");
assert(rootTask !== null, "Should find root level task");
assert(rootTask.taskId === "auth1", "Should return correct root task");
console.log('✓ Found root level task');

// Test finding second level task
const secondLevelTask = findTaskById(sampleTasks, "api");
assert(secondLevelTask !== null, "Should find second level task");
assert(secondLevelTask.taskId === "api", "Should return correct second level task");
console.log('✓ Found second level task');

// Test finding third level task
const thirdLevelTask = findTaskById(sampleTasks, "login");
assert(thirdLevelTask !== null, "Should find third level task");
assert(thirdLevelTask.taskId === "login", "Should return correct third level task");
console.log('✓ Found third level task');

// Test finding task in different branch
const differentBranchTask = findTaskById(sampleTasks, "forms");
assert(differentBranchTask !== null, "Should find task in different branch");
assert(differentBranchTask.taskId === "forms", "Should return correct task from different branch");
console.log('✓ Found task in different branch');

// Test non-existent task
const nonExistentTask = findTaskById(sampleTasks, "nonexistent");
assert(nonExistentTask === null, "Should return null for non-existent task");
console.log('✓ Correctly returned null for non-existent task');

// Test getTaskPath
console.log('Testing getTaskPath...');

// Test path for root level task
const rootPath = getTaskPath(sampleTasks, "auth1");
assert(rootPath === "/auth1", "Should return correct path for root task");
console.log('✓ Correct path for root level task');

// Test path for second level task
const secondLevelPath = getTaskPath(sampleTasks, "api");
assert(secondLevelPath === "/auth1/api", "Should return correct path for second level task");
console.log('✓ Correct path for second level task');

// Test path for third level task
const thirdLevelPath = getTaskPath(sampleTasks, "login");
assert(thirdLevelPath === "/auth1/api/login", "Should return correct path for third level task");
console.log('✓ Correct path for third level task');

// Test path for task in different branch
const differentBranchPath = getTaskPath(sampleTasks, "forms");
assert(differentBranchPath === "/ui2/forms", "Should return correct path for task in different branch");
console.log('✓ Correct path for task in different branch');

// Test path for non-existent task
const nonExistentPath = getTaskPath(sampleTasks, "nonexistent");
assert(nonExistentPath === null, "Should return null for non-existent task path");
console.log('✓ Correctly returned null for non-existent task path');

console.log('--- All hierarchical search tests PASSED ---');