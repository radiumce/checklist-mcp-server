import { describe, it, expect } from 'vitest';

// Import the Task interface and functions we need to test
// Since they're not exported, we'll need to copy the interface and test the logic separately
interface Task {
  taskId: string;
  description: string;
  status: 'TODO' | 'DONE';
  children?: Task[];
}

// Copy the functions from server.ts for testing
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

describe('Path Resolution Utilities', () => {
  // Sample task hierarchy for testing
  const sampleTasks: Task[] = [
    {
      taskId: 'auth1',
      description: 'Implement user authentication system',
      status: 'TODO',
      children: [
        {
          taskId: 'db',
          description: 'Design database schema',
          status: 'DONE',
          children: []
        },
        {
          taskId: 'api',
          description: 'Create authentication API',
          status: 'TODO',
          children: [
            {
              taskId: 'login',
              description: 'Login endpoint',
              status: 'TODO'
            },
            {
              taskId: 'logout',
              description: 'Logout endpoint',
              status: 'TODO'
            }
          ]
        }
      ]
    },
    {
      taskId: 'ui2',
      description: 'Build user interface',
      status: 'TODO',
      children: [
        {
          taskId: 'forms',
          description: 'Create forms',
          status: 'TODO'
        }
      ]
    }
  ];

  describe('parsePath', () => {
    it('should return empty array for root path "/"', () => {
      expect(parsePath('/')).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(parsePath('')).toEqual([]);
    });

    it('should return empty array for whitespace-only string', () => {
      expect(parsePath('   ')).toEqual([]);
    });

    it('should parse single-level path "/auth1/"', () => {
      expect(parsePath('/auth1/')).toEqual(['auth1']);
    });

    it('should parse single-level path without trailing slash "/auth1"', () => {
      expect(parsePath('/auth1')).toEqual(['auth1']);
    });

    it('should parse multi-level path "/auth1/api/"', () => {
      expect(parsePath('/auth1/api/')).toEqual(['auth1', 'api']);
    });

    it('should parse deep path "/auth1/api/login/"', () => {
      expect(parsePath('/auth1/api/login/')).toEqual(['auth1', 'api', 'login']);
    });

    it('should handle multiple slashes', () => {
      expect(parsePath('//auth1//api//')).toEqual(['auth1', 'api']);
    });

    it('should filter out empty segments', () => {
      expect(parsePath('/auth1//api/')).toEqual(['auth1', 'api']);
    });
  });

  describe('findTaskAtPath', () => {
    it('should return null for empty path segments (root level)', () => {
      expect(findTaskAtPath(sampleTasks, [])).toBeNull();
    });

    it('should find task at root level', () => {
      const result = findTaskAtPath(sampleTasks, ['auth1']);
      expect(result).not.toBeNull();
      expect(result?.taskId).toBe('auth1');
      expect(result?.description).toBe('Implement user authentication system');
    });

    it('should find task at second level', () => {
      const result = findTaskAtPath(sampleTasks, ['auth1', 'api']);
      expect(result).not.toBeNull();
      expect(result?.taskId).toBe('api');
      expect(result?.description).toBe('Create authentication API');
    });

    it('should find task at third level', () => {
      const result = findTaskAtPath(sampleTasks, ['auth1', 'api', 'login']);
      expect(result).not.toBeNull();
      expect(result?.taskId).toBe('login');
      expect(result?.description).toBe('Login endpoint');
    });

    it('should return null for non-existent task at root level', () => {
      expect(findTaskAtPath(sampleTasks, ['nonexistent'])).toBeNull();
    });

    it('should return null for non-existent task at deeper level', () => {
      expect(findTaskAtPath(sampleTasks, ['auth1', 'nonexistent'])).toBeNull();
    });

    it('should return null when trying to go deeper than available children', () => {
      expect(findTaskAtPath(sampleTasks, ['auth1', 'db', 'nonexistent'])).toBeNull();
    });

    it('should handle task without children', () => {
      const result = findTaskAtPath(sampleTasks, ['auth1', 'db']);
      expect(result).not.toBeNull();
      expect(result?.taskId).toBe('db');
    });
  });

  describe('updateTasksAtPath', () => {
    it('should replace entire root tasks array when path is root', () => {
      const newTasks: Task[] = [
        {
          taskId: 'new1',
          description: 'New task 1',
          status: 'TODO'
        }
      ];
      
      const result = updateTasksAtPath(sampleTasks, '/', newTasks);
      expect(result).toEqual(newTasks);
      expect(result.length).toBe(1);
      expect(result[0].taskId).toBe('new1');
    });

    it('should update children of a root-level task', () => {
      const newChildren: Task[] = [
        {
          taskId: 'newchild',
          description: 'New child task',
          status: 'TODO'
        }
      ];
      
      const result = updateTasksAtPath(sampleTasks, '/auth1', newChildren);
      
      // Should preserve the auth1 task but replace its children
      const auth1Task = result.find(task => task.taskId === 'auth1');
      expect(auth1Task).not.toBeNull();
      expect(auth1Task?.children).toEqual(newChildren);
      expect(auth1Task?.description).toBe('Implement user authentication system');
      
      // Should preserve other root tasks unchanged
      const ui2Task = result.find(task => task.taskId === 'ui2');
      expect(ui2Task).toEqual(sampleTasks[1]);
    });

    it('should update children at deeper levels', () => {
      const newChildren: Task[] = [
        {
          taskId: 'signin',
          description: 'Sign in endpoint',
          status: 'TODO'
        },
        {
          taskId: 'signout',
          description: 'Sign out endpoint',
          status: 'TODO'
        }
      ];
      
      const result = updateTasksAtPath(sampleTasks, '/auth1/api', newChildren);
      
      // Navigate to the updated task
      const auth1Task = result.find(task => task.taskId === 'auth1');
      const apiTask = auth1Task?.children?.find(child => child.taskId === 'api');
      
      expect(apiTask?.children).toEqual(newChildren);
      expect(apiTask?.description).toBe('Create authentication API');
      
      // Should preserve other children of auth1
      const dbTask = auth1Task?.children?.find(child => child.taskId === 'db');
      expect(dbTask?.taskId).toBe('db');
      expect(dbTask?.description).toBe('Design database schema');
    });

    it('should preserve unchanged tasks and their subtrees', () => {
      const newChildren: Task[] = [
        {
          taskId: 'newapi',
          description: 'New API task',
          status: 'TODO'
        }
      ];
      
      const result = updateTasksAtPath(sampleTasks, '/auth1', newChildren);
      
      // ui2 task should be completely unchanged
      const ui2Task = result.find(task => task.taskId === 'ui2');
      expect(ui2Task).toEqual(sampleTasks[1]);
      
      // auth1 task should preserve its properties but have new children
      const auth1Task = result.find(task => task.taskId === 'auth1');
      expect(auth1Task?.taskId).toBe('auth1');
      expect(auth1Task?.description).toBe('Implement user authentication system');
      expect(auth1Task?.status).toBe('TODO');
      expect(auth1Task?.children).toEqual(newChildren);
    });

    it('should handle empty newTasks array', () => {
      const result = updateTasksAtPath(sampleTasks, '/auth1', []);
      
      const auth1Task = result.find(task => task.taskId === 'auth1');
      expect(auth1Task?.children).toEqual([]);
    });

    it('should handle non-existent path gracefully', () => {
      const newTasks: Task[] = [
        {
          taskId: 'new',
          description: 'New task',
          status: 'TODO'
        }
      ];
      
      // This should not crash, but the original tasks should be preserved
      const result = updateTasksAtPath(sampleTasks, '/nonexistent', newTasks);
      expect(result).toEqual(sampleTasks);
    });
  });
});