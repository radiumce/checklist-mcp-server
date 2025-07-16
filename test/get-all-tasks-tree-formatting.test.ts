import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('get_all_tasks tool with tree formatting', () => {
  let serverProcess: any;
  let serverReady = false;

  beforeAll(async () => {
    // Start the server process
    serverProcess = spawn('node', [join(__dirname, '../dist/server.js')], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to be ready
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.error('Server startup timeout');
        resolve();
      }, 5000);

      serverProcess.stderr.on('data', (data: Buffer) => {
        const message = data.toString();
        if (message.includes('Checklist MCP Server starting')) {
          serverReady = true;
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  const sendRequest = (method: string, params: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!serverReady) {
        reject(new Error('Server not ready'));
        return;
      }

      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      };

      let responseData = '';
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      const onData = (data: Buffer) => {
        responseData += data.toString();
        try {
          const response = JSON.parse(responseData);
          clearTimeout(timeout);
          serverProcess.stdout.removeListener('data', onData);
          resolve(response);
        } catch (e) {
          // Continue collecting data
        }
      };

      serverProcess.stdout.on('data', onData);
      serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  };

  test('should format flat task list with tree structure', async () => {
    const sessionId = 'tree-test-flat';
    
    // Create flat tasks
    const updateResponse = await sendRequest('tools/call', {
      name: 'update_tasks',
      arguments: {
        sessionId,
        path: '/',
        tasks: [
          { taskId: 'task1', description: 'First task', status: 'TODO' },
          { taskId: 'task2', description: 'Second task', status: 'DONE' },
          { taskId: 'task3', description: 'Third task', status: 'TODO' }
        ]
      }
    });

    expect(updateResponse.result).toBeDefined();

    // Get all tasks and verify tree formatting
    const getAllResponse = await sendRequest('tools/call', {
      name: 'get_all_tasks',
      arguments: { sessionId }
    });

    expect(getAllResponse.result).toBeDefined();
    expect(getAllResponse.result.content).toHaveLength(1);
    
    const treeOutput = getAllResponse.result.content[0].text;
    expect(treeOutput).toContain(`Tasks for session ${sessionId}:`);
    
    // Verify tree structure with proper branch characters
    expect(treeOutput).toMatch(/├── ○ task1: First task/);
    expect(treeOutput).toMatch(/├── ✓ task2: Second task/);
    expect(treeOutput).toMatch(/└── ○ task3: Third task/);
  });

  test('should format hierarchical task list with proper indentation', async () => {
    const sessionId = 'tree-test-hierarchical';
    
    // Create hierarchical tasks
    const updateResponse = await sendRequest('tools/call', {
      name: 'update_tasks',
      arguments: {
        sessionId,
        path: '/',
        tasks: [
          {
            taskId: 'auth',
            description: 'Authentication system',
            status: 'TODO',
            children: [
              { taskId: 'db', description: 'Database schema', status: 'DONE' },
              {
                taskId: 'api',
                description: 'API endpoints',
                status: 'TODO',
                children: [
                  { taskId: 'login', description: 'Login endpoint', status: 'DONE' },
                  { taskId: 'logout', description: 'Logout endpoint', status: 'TODO' }
                ]
              }
            ]
          },
          { taskId: 'ui', description: 'User interface', status: 'TODO' }
        ]
      }
    });

    expect(updateResponse.result).toBeDefined();

    // Get all tasks and verify hierarchical tree formatting
    const getAllResponse = await sendRequest('tools/call', {
      name: 'get_all_tasks',
      arguments: { sessionId }
    });

    expect(getAllResponse.result).toBeDefined();
    expect(getAllResponse.result.content).toHaveLength(1);
    
    const treeOutput = getAllResponse.result.content[0].text;
    
    // Verify root level tasks
    expect(treeOutput).toMatch(/├── ○ auth: Authentication system/);
    expect(treeOutput).toMatch(/└── ○ ui: User interface/);
    
    // Verify first level children with proper indentation
    expect(treeOutput).toMatch(/│   ├── ✓ db: Database schema/);
    expect(treeOutput).toMatch(/│   └── ○ api: API endpoints/);
    
    // Verify second level children with deeper indentation
    expect(treeOutput).toMatch(/│       ├── ✓ login: Login endpoint/);
    expect(treeOutput).toMatch(/│       └── ○ logout: Logout endpoint/);
  });

  test('should display clear TODO/DONE status indicators', async () => {
    const sessionId = 'tree-test-status';
    
    // Create tasks with mixed statuses
    const updateResponse = await sendRequest('tools/call', {
      name: 'update_tasks',
      arguments: {
        sessionId,
        path: '/',
        tasks: [
          { taskId: 'todo1', description: 'TODO task', status: 'TODO' },
          { taskId: 'done1', description: 'DONE task', status: 'DONE' }
        ]
      }
    });

    expect(updateResponse.result).toBeDefined();

    // Get all tasks and verify status indicators
    const getAllResponse = await sendRequest('tools/call', {
      name: 'get_all_tasks',
      arguments: { sessionId }
    });

    expect(getAllResponse.result).toBeDefined();
    const treeOutput = getAllResponse.result.content[0].text;
    
    // Verify TODO status uses ○ symbol
    expect(treeOutput).toMatch(/○ todo1: TODO task/);
    
    // Verify DONE status uses ✓ symbol
    expect(treeOutput).toMatch(/✓ done1: DONE task/);
  });

  test('should handle empty task list gracefully', async () => {
    const sessionId = 'tree-test-empty';
    
    // Try to get tasks from non-existent session
    const getAllResponse = await sendRequest('tools/call', {
      name: 'get_all_tasks',
      arguments: { sessionId }
    });

    expect(getAllResponse.result).toBeDefined();
    expect(getAllResponse.result.content).toHaveLength(1);
    expect(getAllResponse.result.content[0].text).toBe(`No tasks found for session ${sessionId}.`);
  });

  test('should maintain consistent formatting across different operations', async () => {
    const sessionId = 'tree-test-consistency';
    
    // Create initial tasks
    await sendRequest('tools/call', {
      name: 'update_tasks',
      arguments: {
        sessionId,
        path: '/',
        tasks: [
          {
            taskId: 'parent',
            description: 'Parent task',
            status: 'TODO',
            children: [
              { taskId: 'child1', description: 'Child task 1', status: 'TODO' },
              { taskId: 'child2', description: 'Child task 2', status: 'TODO' }
            ]
          }
        ]
      }
    });

    // Get initial tree format
    const initialResponse = await sendRequest('tools/call', {
      name: 'get_all_tasks',
      arguments: { sessionId }
    });

    // Mark a child task as done
    await sendRequest('tools/call', {
      name: 'mark_task_as_done',
      arguments: { sessionId, taskId: 'child1' }
    });

    // Get updated tree format
    const updatedResponse = await sendRequest('tools/call', {
      name: 'get_all_tasks',
      arguments: { sessionId }
    });

    // Both responses should use the same tree formatting structure
    const initialTree = initialResponse.result.content[0].text;
    const updatedTree = updatedResponse.result.content[0].text;

    // Verify both use the same tree structure characters
    expect(initialTree).toMatch(/├── ○ parent: Parent task/);
    expect(updatedTree).toMatch(/├── ○ parent: Parent task/);
    
    // Verify status change is reflected
    expect(initialTree).toMatch(/│   ├── ○ child1: Child task 1/);
    expect(updatedTree).toMatch(/│   ├── ✓ child1: Child task 1/);
    
    // Verify unchanged task remains the same
    expect(initialTree).toMatch(/│   └── ○ child2: Child task 2/);
    expect(updatedTree).toMatch(/│   └── ○ child2: Child task 2/);
  });

  test('should handle deep nesting with proper indentation', async () => {
    const sessionId = 'tree-test-deep';
    
    // Create deeply nested tasks (4 levels)
    const updateResponse = await sendRequest('tools/call', {
      name: 'update_tasks',
      arguments: {
        sessionId,
        path: '/',
        tasks: [
          {
            taskId: 'l1',
            description: 'Level 1',
            status: 'TODO',
            children: [
              {
                taskId: 'l2',
                description: 'Level 2',
                status: 'TODO',
                children: [
                  {
                    taskId: 'l3',
                    description: 'Level 3',
                    status: 'TODO',
                    children: [
                      { taskId: 'l4', description: 'Level 4', status: 'DONE' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    });

    expect(updateResponse.result).toBeDefined();

    // Get all tasks and verify deep nesting
    const getAllResponse = await sendRequest('tools/call', {
      name: 'get_all_tasks',
      arguments: { sessionId }
    });

    const treeOutput = getAllResponse.result.content[0].text;
    
    // Verify each level has proper indentation
    expect(treeOutput).toMatch(/└── ○ l1: Level 1/);
    expect(treeOutput).toMatch(/    └── ○ l2: Level 2/);
    expect(treeOutput).toMatch(/        └── ○ l3: Level 3/);
    expect(treeOutput).toMatch(/            └── ✓ l4: Level 4/);
  });
});