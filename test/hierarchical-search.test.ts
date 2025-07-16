import { describe, it, expect } from 'vitest';

// Import the Task interface and functions we need to test
// Since these are not exported from server.ts, we'll need to copy the interface and functions for testing
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

function validateTaskId(id: string): boolean {
  // Check length (3-8 characters)
  if (id.length < 3 || id.length > 8) {
    return false;
  }
  
  // Check that it's alphanumeric
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  if (!alphanumericRegex.test(id)) {
    return false;
  }
  
  // Check that it's not pure numbers (must contain at least one letter)
  const hasLetter = /[a-zA-Z]/.test(id);
  if (!hasLetter) {
    return false;
  }
  
  return true;
}

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

describe('Hierarchical Task Search Functionality', () => {
  describe('findTaskById', () => {
    it('should find a task at root level', () => {
      const result = findTaskById(sampleTasks, "auth1");
      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("auth1");
      expect(result?.description).toBe("Implement user authentication system");
    });

    it('should find a task at second level', () => {
      const result = findTaskById(sampleTasks, "api");
      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("api");
      expect(result?.description).toBe("Create authentication API");
    });

    it('should find a task at third level', () => {
      const result = findTaskById(sampleTasks, "login");
      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("login");
      expect(result?.description).toBe("Login endpoint");
    });

    it('should return null for non-existent task', () => {
      const result = findTaskById(sampleTasks, "nonexistent");
      expect(result).toBeNull();
    });

    it('should handle empty tasks array', () => {
      const result = findTaskById([], "any");
      expect(result).toBeNull();
    });

    it('should find task in different branches', () => {
      const result = findTaskById(sampleTasks, "forms");
      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("forms");
    });
  });

  describe('getTaskPath', () => {
    it('should return correct path for root level task', () => {
      const result = getTaskPath(sampleTasks, "auth1");
      expect(result).toBe("/auth1");
    });

    it('should return correct path for second level task', () => {
      const result = getTaskPath(sampleTasks, "api");
      expect(result).toBe("/auth1/api");
    });

    it('should return correct path for third level task', () => {
      const result = getTaskPath(sampleTasks, "login");
      expect(result).toBe("/auth1/api/login");
    });

    it('should return correct path for task in different branch', () => {
      const result = getTaskPath(sampleTasks, "forms");
      expect(result).toBe("/ui2/forms");
    });

    it('should return null for non-existent task', () => {
      const result = getTaskPath(sampleTasks, "nonexistent");
      expect(result).toBeNull();
    });

    it('should handle empty tasks array', () => {
      const result = getTaskPath([], "any");
      expect(result).toBeNull();
    });
  });

  describe('validateTaskHierarchy', () => {
    it('should validate a correct task hierarchy', () => {
      const result = validateTaskHierarchy(sampleTasks);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing taskId', () => {
      const invalidTasks: Task[] = [
        {
          taskId: "",
          description: "Test task",
          status: "TODO"
        }
      ];
      const result = validateTaskHierarchy(invalidTasks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Task at root[0] has invalid or missing taskId");
    });

    it('should detect missing description', () => {
      const invalidTasks: Task[] = [
        {
          taskId: "test1",
          description: "",
          status: "TODO"
        }
      ];
      const result = validateTaskHierarchy(invalidTasks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Task at root[0] (test1) has invalid or missing description");
    });

    it('should detect invalid status', () => {
      const invalidTasks: Task[] = [
        {
          taskId: "test1",
          description: "Test task",
          status: "INVALID" as any
        }
      ];
      const result = validateTaskHierarchy(invalidTasks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Task at root[0] (test1) has invalid status: INVALID");
    });

    it('should detect duplicate task IDs', () => {
      const invalidTasks: Task[] = [
        {
          taskId: "test1",
          description: "First task",
          status: "TODO"
        },
        {
          taskId: "test1",
          description: "Second task",
          status: "TODO"
        }
      ];
      const result = validateTaskHierarchy(invalidTasks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Duplicate task ID found: test1 at root[1]");
    });

    it('should detect duplicate task IDs across hierarchy levels', () => {
      const invalidTasks: Task[] = [
        {
          taskId: "test1",
          description: "Parent task",
          status: "TODO",
          children: [
            {
              taskId: "test1",
              description: "Child task with same ID",
              status: "TODO"
            }
          ]
        }
      ];
      const result = validateTaskHierarchy(invalidTasks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Duplicate task ID found: test1 at root[0].children[0]");
    });

    it('should detect invalid taskId format', () => {
      const invalidTasks: Task[] = [
        {
          taskId: "12", // Too short
          description: "Test task",
          status: "TODO"
        },
        {
          taskId: "123456789", // Too long
          description: "Test task",
          status: "TODO"
        },
        {
          taskId: "123", // Pure numbers
          description: "Test task",
          status: "TODO"
        }
      ];
      const result = validateTaskHierarchy(invalidTasks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Task at root[0] has invalid taskId format: 12");
      expect(result.errors).toContain("Task at root[1] has invalid taskId format: 123456789");
      expect(result.errors).toContain("Task at root[2] has invalid taskId format: 123");
    });

    it('should detect invalid children property', () => {
      const invalidTasks: any[] = [
        {
          taskId: "test1",
          description: "Test task",
          status: "TODO",
          children: "not an array"
        }
      ];
      const result = validateTaskHierarchy(invalidTasks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Task at root[0] (test1) has invalid children property (not an array)");
    });

    it('should validate nested children recursively', () => {
      const invalidTasks: Task[] = [
        {
          taskId: "test1",
          description: "Parent task",
          status: "TODO",
          children: [
            {
              taskId: "child1",
              description: "Valid child",
              status: "TODO"
            },
            {
              taskId: "",
              description: "Invalid child",
              status: "TODO"
            }
          ]
        }
      ];
      const result = validateTaskHierarchy(invalidTasks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Task at root[0].children[1] has invalid or missing taskId");
    });

    it('should handle empty tasks array', () => {
      const result = validateTaskHierarchy([]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});