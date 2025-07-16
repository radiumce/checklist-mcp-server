#!/usr/bin/env ts-node
import { spawn } from 'child_process';
import assert from 'assert';

interface Task {
  taskId: string;
  description: string;
  status: 'TODO' | 'DONE';
  children?: Task[];
}

// Helper function to send MCP requests to the server
const sendRequest = (serverProcess: any, method: string, params: any): Promise<any> => {
  return new Promise((resolve, reject) => {
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

async function testMarkTaskAsDoneHierarchy() {
  console.log('--- Testing mark_task_as_done hierarchical functionality ---');
  
  // Start the server process
  const serverProcess = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  try {
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 1: Mark parent task as done while preserving subtask independence
    console.log('Test 1: Mark parent task as done while preserving subtask independence');
    const sessionId1 = 'hierarchy-test-' + Date.now();
    
    const hierarchicalTasks: Task[] = [
      {
        taskId: 'auth1',
        description: 'Implement authentication system',
        status: 'TODO',
        children: [
          {
            taskId: 'db1',
            description: 'Design database schema',
            status: 'DONE'
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
        taskId: 'ui1',
        description: 'Build user interface',
        status: 'TODO'
      }
    ];

    // Set up initial tasks
    await sendRequest(serverProcess, 'tools/call', {
      name: 'update_tasks',
      arguments: {
        sessionId: sessionId1,
        path: '/',
        tasks: hierarchicalTasks
      }
    });

    // Mark parent task 'auth1' as done
    const markResponse1 = await sendRequest(serverProcess, 'tools/call', {
      name: 'mark_task_as_done',
      arguments: {
        sessionId: sessionId1,
        taskId: 'auth1'
      }
    });

    assert(markResponse1.result, 'Should have result');
    assert(markResponse1.result.content, 'Should have content');
    assert(markResponse1.result.content[0].text.includes('Successfully marked task auth1 as DONE'), 'Should confirm task marked as done');
    
    // Verify the response includes complete hierarchy
    const hierarchyText1 = markResponse1.result.content[1].text;
    assert(hierarchyText1.includes('Complete task hierarchy:'), 'Should show complete hierarchy');
    assert(hierarchyText1.includes('✓ auth1: Implement authentication system'), 'Parent should be marked as done');
    assert(hierarchyText1.includes('✓ db1: Design database schema'), 'Child already done should stay done');
    assert(hierarchyText1.includes('○ api: Create authentication API'), 'Child should stay TODO');
    assert(hierarchyText1.includes('○ login: Login endpoint'), 'Grandchild should stay TODO');
    assert(hierarchyText1.includes('○ logout: Logout endpoint'), 'Grandchild should stay TODO');
    assert(hierarchyText1.includes('○ ui1: Build user interface'), 'Sibling should stay TODO');
    console.log('✓ Parent task marked as done while preserving subtask independence');

    // Test 2: Mark deep nested task as done without affecting siblings or parents
    console.log('Test 2: Mark deep nested task as done without affecting siblings or parents');
    const sessionId2 = 'deep-nest-test-' + Date.now();
    
    const deepTasks: Task[] = [
      {
        taskId: 'proj',
        description: 'Main project',
        status: 'TODO',
        children: [
          {
            taskId: 'feat1',
            description: 'Feature 1',
            status: 'TODO',
            children: [
              {
                taskId: 'task1',
                description: 'Task 1',
                status: 'TODO'
              },
              {
                taskId: 'task2',
                description: 'Task 2',
                status: 'TODO'
              }
            ]
          },
          {
            taskId: 'feat2',
            description: 'Feature 2',
            status: 'TODO'
          }
        ]
      }
    ];

    // Set up initial tasks
    await sendRequest(serverProcess, 'tools/call', {
      name: 'update_tasks',
      arguments: {
        sessionId: sessionId2,
        path: '/',
        tasks: deepTasks
      }
    });

    // Mark deep nested task 'task1' as done
    const markResponse2 = await sendRequest(serverProcess, 'tools/call', {
      name: 'mark_task_as_done',
      arguments: {
        sessionId: sessionId2,
        taskId: 'task1'
      }
    });

    assert(markResponse2.result, 'Should have result');
    assert(markResponse2.result.content[0].text.includes('Successfully marked task task1 as DONE'), 'Should confirm deep task marked as done');
    
    // Verify hierarchy shows correct status
    const hierarchyText2 = markResponse2.result.content[1].text;
    assert(hierarchyText2.includes('○ proj: Main project'), 'Parent should stay TODO');
    assert(hierarchyText2.includes('○ feat1: Feature 1'), 'Parent should stay TODO');
    assert(hierarchyText2.includes('✓ task1: Task 1'), 'Target should be marked as done');
    assert(hierarchyText2.includes('○ task2: Task 2'), 'Sibling should stay TODO');
    assert(hierarchyText2.includes('○ feat2: Feature 2'), 'Uncle should stay TODO');
    console.log('✓ Deep nested task marked as done without affecting siblings or parents');

    // Test 3: Handle marking already done task gracefully
    console.log('Test 3: Handle marking already done task gracefully');
    const sessionId3 = 'already-done-test-' + Date.now();
    
    const doneTasks: Task[] = [
      {
        taskId: 'done1',
        description: 'Already completed task',
        status: 'DONE'
      }
    ];

    // Set up initial tasks
    await sendRequest(serverProcess, 'tools/call', {
      name: 'update_tasks',
      arguments: {
        sessionId: sessionId3,
        path: '/',
        tasks: doneTasks
      }
    });

    // Try to mark already done task as done
    const markResponse3 = await sendRequest(serverProcess, 'tools/call', {
      name: 'mark_task_as_done',
      arguments: {
        sessionId: sessionId3,
        taskId: 'done1'
      }
    });

    assert(markResponse3.result, 'Should have result');
    assert(markResponse3.result.content[0].text.includes('Task done1 in session'), 'Should mention task and session');
    assert(markResponse3.result.content[0].text.includes('is already marked as DONE'), 'Should indicate already done');
    
    // Should still return complete hierarchy
    const hierarchyText3 = markResponse3.result.content[1].text;
    assert(hierarchyText3.includes('Complete task hierarchy:'), 'Should show complete hierarchy');
    assert(hierarchyText3.includes('✓ done1: Already completed task'), 'Should show task as done');
    console.log('✓ Already done task handled gracefully');

    // Test 4: Return error for non-existent task
    console.log('Test 4: Return error for non-existent task');
    const sessionId4 = 'nonexistent-test-' + Date.now();
    
    const realTasks: Task[] = [
      {
        taskId: 'real1',
        description: 'Real task',
        status: 'TODO'
      }
    ];

    // Set up initial tasks
    await sendRequest(serverProcess, 'tools/call', {
      name: 'update_tasks',
      arguments: {
        sessionId: sessionId4,
        path: '/',
        tasks: realTasks
      }
    });

    // Try to mark non-existent task as done
    const markResponse4 = await sendRequest(serverProcess, 'tools/call', {
      name: 'mark_task_as_done',
      arguments: {
        sessionId: sessionId4,
        taskId: 'fake1'
      }
    });

    assert(markResponse4.result, 'Should have result');
    assert(markResponse4.result.content[0].text.includes('Error: Task with ID fake1 not found'), 'Should return error for non-existent task');
    console.log('✓ Error returned for non-existent task');

    // Test 5: Return error for non-existent session
    console.log('Test 5: Return error for non-existent session');
    const markResponse5 = await sendRequest(serverProcess, 'tools/call', {
      name: 'mark_task_as_done',
      arguments: {
        sessionId: 'nonexistent-session',
        taskId: 'any1'
      }
    });

    assert(markResponse5.result, 'Should have result');
    assert(markResponse5.result.content[0].text.includes('Error: No tasks found for session nonexistent-session'), 'Should return error for non-existent session');
    console.log('✓ Error returned for non-existent session');

    // Test 6: Use proper tree formatting with visual indicators
    console.log('Test 6: Use proper tree formatting with visual indicators');
    const sessionId6 = 'tree-format-test-' + Date.now();
    
    const treeTasks: Task[] = [
      {
        taskId: 'root1',
        description: 'Root task 1',
        status: 'TODO',
        children: [
          {
            taskId: 'child1',
            description: 'Child 1',
            status: 'DONE'
          },
          {
            taskId: 'child2',
            description: 'Child 2',
            status: 'TODO',
            children: [
              {
                taskId: 'grand1',
                description: 'Grandchild 1',
                status: 'TODO'
              }
            ]
          }
        ]
      },
      {
        taskId: 'root2',
        description: 'Root task 2',
        status: 'TODO'
      }
    ];

    // Set up initial tasks
    await sendRequest(serverProcess, 'tools/call', {
      name: 'update_tasks',
      arguments: {
        sessionId: sessionId6,
        path: '/',
        tasks: treeTasks
      }
    });

    // Mark a task as done to trigger tree formatting
    const markResponse6 = await sendRequest(serverProcess, 'tools/call', {
      name: 'mark_task_as_done',
      arguments: {
        sessionId: sessionId6,
        taskId: 'grand1'
      }
    });

    const hierarchyText6 = markResponse6.result.content[1].text;
    
    // Check for proper tree formatting characters
    assert(hierarchyText6.includes('├── '), 'Should contain branch character');
    assert(hierarchyText6.includes('└── '), 'Should contain last branch character');
    assert(hierarchyText6.includes('│   '), 'Should contain continuation character');
    assert(hierarchyText6.includes('    '), 'Should contain indentation for last items');
    
    // Check for status indicators
    assert(hierarchyText6.includes('○ '), 'Should contain TODO indicator');
    assert(hierarchyText6.includes('✓ '), 'Should contain DONE indicator');
    console.log('✓ Proper tree formatting with visual indicators');

    console.log('--- All mark_task_as_done hierarchical tests PASSED ---');

  } finally {
    // Clean up server process
    serverProcess.kill();
  }
}

// Run the tests
testMarkTaskAsDoneHierarchy().catch(console.error);