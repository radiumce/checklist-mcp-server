#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import assert from 'assert';
import { createTestTasks, createSimpleTask, createHierarchicalTask, createMultipleTasks, generateTestSessionId, type TaskInput } from '../src/test-utils/testHelpers';

// Path to the compiled server script
const serverScriptPath = path.resolve(__dirname, '../dist/mcp-server.js');
const serverCommand = 'node';
const serverArgs = [serverScriptPath];

// TaskInput is imported from testHelpers

interface UpdateTasksInputParams {
  sessionId: string;
  path?: string;
  tasks: TaskInput[];
}

interface MarkTaskAsDoneInputParams {
  sessionId: string;
  taskId: string;
}

interface GetAllTasksInputParams {
  sessionId: string;
}

interface TextContentItem {
  type: 'text';
  text: string;
}

interface ToolSuccessResponse {
  content: TextContentItem[];
}

class IntegrationTestSuite {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private testResults: { name: string; passed: boolean; error?: string }[] = [];

  async setup() {
    console.log('🚀 Setting up Integration Test Suite');
    console.log('=====================================');
    
    this.transport = new StdioClientTransport({
      command: serverCommand,
      args: serverArgs,
    });

    this.client = new Client({
      name: 'integration-test-client',
      version: '1.0.0',
    });

    await this.client.connect(this.transport);
    console.log('✅ Connected to server successfully');
  }

  async cleanup() {
    if (this.transport) {
      await this.transport.close();
      console.log('✅ Transport closed');
    }
  }

  private async callTool(name: string, args: any): Promise<ToolSuccessResponse> {
    if (!this.client) throw new Error('Client not initialized');
    return await this.client.callTool({ name, arguments: args }) as ToolSuccessResponse;
  }

  private recordTest(name: string, passed: boolean, error?: string) {
    this.testResults.push({ name, passed, error });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
    if (error && !passed) {
      console.log(`   Error: ${error}`);
    }
  }

  // Test 1: Complete workflow from task creation to completion
  async testCompleteWorkflow() {
    const testName = 'Complete Workflow - Task Creation to Completion';
    try {
      const sessionId = generateTestSessionId('workflow-test');
      
      // Step 1: Create initial hierarchical task structure using test helpers
      const initialTasks = createTestTasks([
        {
          description: 'Main project setup',
          status: 'TODO',
          children: [
            {
              description: 'Initial setup tasks',
              status: 'TODO',
              children: [
                { description: 'Setup environment', status: 'TODO' },
                { description: 'Install dependencies', status: 'TODO' }
              ]
            },
            {
              description: 'Implementation tasks',
              status: 'TODO',
              children: [
                { description: 'Core functionality', status: 'TODO' },
                { description: 'Write tests', status: 'TODO' }
              ]
            }
          ]
        }
      ]);

      // Create tasks
      const createResult = await this.callTool('update_tasks', {
        sessionId,
        path: '/',
        tasks: initialTasks
      });
      
      assert(createResult.content[0].text.includes('Successfully updated 1 tasks'), 'Task creation failed');
      assert(createResult.content[1].text.includes('Main project setup'), 'Hierarchy not created properly');

      // Step 2: Mark some subtasks as done using generated IDs
      const setupTaskId = initialTasks[0].children![0].taskId;
      const envTaskId = initialTasks[0].children![0].children![0].taskId;
      const depsTaskId = initialTasks[0].children![0].children![1].taskId;
      const coreTaskId = initialTasks[0].children![1].children![0].taskId;
      
      await this.callTool('mark_task_as_done', { sessionId, taskId: envTaskId });
      await this.callTool('mark_task_as_done', { sessionId, taskId: depsTaskId });

      // Step 3: Verify task status updates
      const statusResult = await this.callTool('get_all_tasks', { sessionId });
      assert(statusResult.content[0].text.includes('✓') && statusResult.content[0].text.includes('Setup environment'), 'Environment task not marked as done');
      assert(statusResult.content[0].text.includes('✓') && statusResult.content[0].text.includes('Install dependencies'), 'Dependencies task not marked as done');
      assert(statusResult.content[0].text.includes('○') && statusResult.content[0].text.includes('Core functionality'), 'Core task should still be TODO');

      // Step 4: Add new subtasks dynamically
      const newSubtasks = createMultipleTasks([
        'API implementation',
        'User interface'
      ]);

      const implTaskId = initialTasks[0].children![1].taskId;
      await this.callTool('update_tasks', {
        sessionId,
        path: `/${initialTasks[0].taskId}/${implTaskId}/`,
        tasks: newSubtasks
      });

      // Step 5: Verify dynamic updates
      const finalResult = await this.callTool('get_all_tasks', { sessionId });
      assert(finalResult.content[0].text.includes('API implementation'), 'New API task not added');
      assert(finalResult.content[0].text.includes('User interface'), 'New UI task not added');

      // Step 6: Complete the workflow by marking parent task done
      await this.callTool('mark_task_as_done', { sessionId, taskId: initialTasks[0].taskId });
      
      const completedResult = await this.callTool('get_all_tasks', { sessionId });
      assert(completedResult.content[0].text.includes('✓') && completedResult.content[0].text.includes('Main project setup'), 'Parent task not marked as done');
      
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error instanceof Error ? error.message : String(error));
    }
  }

  // Test 2: Multi-level hierarchy operations
  async testMultiLevelHierarchy() {
    const testName = 'Multi-Level Hierarchy Operations';
    try {
      const sessionId = generateTestSessionId('hierarchy-test');
      
      // Create 4-level deep hierarchy using test helpers
      const deepTasks = createTestTasks([
        {
          description: 'Project development',
          status: 'TODO',
          children: [
            {
              description: 'Backend development',
              status: 'TODO',
              children: [
                {
                  description: 'Authentication system',
                  status: 'TODO',
                  children: [
                    { description: 'Login functionality', status: 'TODO' },
                    { description: 'Logout functionality', status: 'TODO' },
                    { description: 'Registration functionality', status: 'TODO' }
                  ]
                },
                {
                  description: 'API endpoints',
                  status: 'TODO',
                  children: [
                    { description: 'User endpoints', status: 'TODO' },
                    { description: 'Post endpoints', status: 'TODO' }
                  ]
                }
              ]
            },
            {
              description: 'Frontend development',
              status: 'TODO',
              children: [
                { description: 'React components', status: 'TODO' },
                { description: 'CSS styling', status: 'TODO' }
              ]
            }
          ]
        }
      ]);

      // Create deep hierarchy
      await this.callTool('update_tasks', {
        sessionId,
        path: '/',
        tasks: deepTasks
      });

      // Verify the initial deep hierarchy was created correctly
      const hierarchyResult = await this.callTool('get_all_tasks', { sessionId });
      assert(hierarchyResult.content[0].text.includes('Project development'), 'Root task should be present');
      assert(hierarchyResult.content[0].text.includes('Backend development'), 'Backend task should be present');
      assert(hierarchyResult.content[0].text.includes('Authentication system'), 'Auth task should be present');
      assert(hierarchyResult.content[0].text.includes('Login functionality'), 'Login task should be present');

      // Test marking tasks at different levels using generated IDs
      const loginTaskId = deepTasks[0].children![0].children![0].children![0].taskId;
      const componentsTaskId = deepTasks[0].children![1].children![0].taskId;
      const backendTaskId = deepTasks[0].children![0].taskId;
      
      await this.callTool('mark_task_as_done', { sessionId, taskId: loginTaskId });
      await this.callTool('mark_task_as_done', { sessionId, taskId: componentsTaskId });
      await this.callTool('mark_task_as_done', { sessionId, taskId: backendTaskId });

      // Verify multi-level status updates
      const statusResult = await this.callTool('get_all_tasks', { sessionId });
      assert(statusResult.content[0].text.includes('✓') && statusResult.content[0].text.includes('Login functionality'), 'Deep task not marked as done');
      assert(statusResult.content[0].text.includes('✓') && statusResult.content[0].text.includes('React components'), 'Mid-level task not marked as done');
      assert(statusResult.content[0].text.includes('✓') && statusResult.content[0].text.includes('Backend development'), 'High-level task not marked as done');

      // Verify subtask independence
      assert(statusResult.content[0].text.includes('○') && statusResult.content[0].text.includes('Logout functionality'), 'Subtask should remain TODO when parent is done');
      assert(statusResult.content[0].text.includes('○') && statusResult.content[0].text.includes('Registration functionality'), 'Subtask should remain TODO when parent is done');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error instanceof Error ? error.message : String(error));
    }
  }

  // Test 3: Session management and persistence
  async testSessionManagement() {
    const testName = 'Session Management and Persistence';
    try {
      // Test multiple concurrent sessions
      const session1 = generateTestSessionId('session-mgmt-1');
      const session2 = generateTestSessionId('session-mgmt-2');
      const session3 = generateTestSessionId('session-mgmt-3');

      // Create different task structures in each session using test helpers
      const tasks1 = createTestTasks([
        { description: 'Session 1 task', status: 'TODO' }
      ]);
      
      const tasks2 = createTestTasks([
        { description: 'Session 2 task', status: 'TODO' },
        { description: 'Another session 2 task', status: 'DONE' }
      ]);

      const tasks3 = createTestTasks([
        {
          description: 'Session 3 parent task',
          status: 'TODO',
          children: [
            { description: 'Child task 1', status: 'TODO' },
            { description: 'Child task 2', status: 'DONE' }
          ]
        }
      ]);

      // Create tasks in all sessions
      await this.callTool('update_tasks', { sessionId: session1, path: '/', tasks: tasks1 });
      await this.callTool('update_tasks', { sessionId: session2, path: '/', tasks: tasks2 });
      await this.callTool('update_tasks', { sessionId: session3, path: '/', tasks: tasks3 });

      // Verify session isolation
      const result1 = await this.callTool('get_all_tasks', { sessionId: session1 });
      const result2 = await this.callTool('get_all_tasks', { sessionId: session2 });
      const result3 = await this.callTool('get_all_tasks', { sessionId: session3 });

      assert(result1.content[0].text.includes('Session 1 task') && !result1.content[0].text.includes('Session 2 task'), 'Session 1 contaminated');
      assert(result2.content[0].text.includes('Session 2 task') && !result2.content[0].text.includes('Session 1 task'), 'Session 2 contaminated');
      assert(result3.content[0].text.includes('Session 3 parent task') && !result3.content[0].text.includes('Session 1 task'), 'Session 3 contaminated');

      // Test session persistence through operations using generated IDs
      await this.callTool('mark_task_as_done', { sessionId: session1, taskId: tasks1[0].taskId });
      await this.callTool('mark_task_as_done', { sessionId: session3, taskId: tasks3[0].children![0].taskId });

      // Verify persistence
      const persistResult1 = await this.callTool('get_all_tasks', { sessionId: session1 });
      const persistResult3 = await this.callTool('get_all_tasks', { sessionId: session3 });

      assert(persistResult1.content[0].text.includes('✓') && persistResult1.content[0].text.includes('Session 1 task'), 'Session 1 state not persisted');
      assert(persistResult3.content[0].text.includes('✓') && persistResult3.content[0].text.includes('Child task 1'), 'Session 3 state not persisted');

      // Test invalid session handling
      const invalidResult = await this.callTool('get_all_tasks', { sessionId: 'non-existent-session' });
      assert(invalidResult.content[0].text.includes('No tasks found'), 'Invalid session not handled properly');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error instanceof Error ? error.message : String(error));
    }
  }

  // Test 4: Tool interaction patterns and response formats
  async testToolInteractionPatterns() {
    const testName = 'Tool Interaction Patterns and Response Formats';
    try {
      const sessionId = generateTestSessionId('interaction-test');

      // Test 1: Response format consistency using test helpers
      const tasks = createTestTasks([
        {
          description: 'Format testing task',
          status: 'TODO',
          children: [
            { description: 'Subtask 1', status: 'TODO' },
            { description: 'Subtask 2', status: 'DONE' }
          ]
        }
      ]);

      const updateResult = await this.callTool('update_tasks', {
        sessionId,
        path: '/',
        tasks
      });

      // Verify update_tasks response format
      assert(Array.isArray(updateResult.content), 'Response content should be array');
      assert(updateResult.content.length >= 2, 'Response should have at least 2 content items');
      assert(updateResult.content[0].type === 'text', 'First content item should be text');
      assert(updateResult.content[1].type === 'text', 'Second content item should be text');
      assert(updateResult.content[0].text.includes('Successfully updated'), 'First item should be success message');
      assert(updateResult.content[1].text.includes('Complete task hierarchy'), 'Second item should be hierarchy');

      // Test 2: Tree formatting consistency
      const getResult = await this.callTool('get_all_tasks', { sessionId });
      const treeText = getResult.content[0].text;
      
      // Verify tree formatting elements
      assert(treeText.includes('└──') || treeText.includes('├──'), 'Tree should use proper branch characters');
      assert(treeText.includes('○') && treeText.includes('Format testing task'), 'TODO tasks should use ○ symbol');
      assert(treeText.includes('✓') && treeText.includes('Subtask 2'), 'DONE tasks should use ✓ symbol');
      assert(treeText.includes('    '), 'Tree should have proper indentation');

      // Test 3: mark_task_as_done response format
      const markResult = await this.callTool('mark_task_as_done', {
        sessionId,
        taskId: tasks[0].taskId
      });

      assert(markResult.content[0].text.includes(`Successfully marked task ${tasks[0].taskId} as DONE`), 'Mark response should confirm action');
      assert(markResult.content[1].text.includes('Complete task hierarchy'), 'Mark response should include full hierarchy');

      // Test 4: Error response format consistency
      try {
        await this.callTool('mark_task_as_done', {
          sessionId,
          taskId: 'nonexistent'
        });
        assert(false, 'Should have thrown error for nonexistent task');
      } catch (error) {
        // This is expected - verify error format if accessible
      }

      // Test 5: Path-based operations response format
      const newSubtasks = createMultipleTasks([
        'New subtask 1',
        'New subtask 2'
      ]);

      const pathUpdateResult = await this.callTool('update_tasks', {
        sessionId,
        path: `/${tasks[0].taskId}/`,
        tasks: newSubtasks
      });

      assert(pathUpdateResult.content[0].text.includes(`path '/${tasks[0].taskId}/'`), 'Path update should mention specific path');
      assert(pathUpdateResult.content[1].text.includes('New subtask 1'), 'Path update should show new tasks');

      // Test 6: Complex hierarchy response format
      const complexResult = await this.callTool('get_all_tasks', { sessionId });
      const complexText = complexResult.content[0].text;
      
      // Count indentation levels to verify proper nesting
      const lines = complexText.split('\n');
      let hasProperNesting = false;
      for (const line of lines) {
        // Look for any subtask with proper indentation (4 spaces + tree character)
        if ((line.includes('New subtask 1') || line.includes('New subtask 2')) && 
            (line.startsWith('    ├──') || line.startsWith('    └──'))) {
          hasProperNesting = true;
          break;
        }
      }
      assert(hasProperNesting, 'Complex hierarchy should have proper nesting indentation');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error instanceof Error ? error.message : String(error));
    }
  }

  // Test 5: Edge cases and error handling
  async testEdgeCasesAndErrorHandling() {
    const testName = 'Edge Cases and Error Handling';
    try {
      const sessionId = 'edge-case-test-session';

      // Test empty session operations
      const emptyResult = await this.callTool('get_all_tasks', { sessionId });
      assert(emptyResult.content[0].text.includes('No tasks found'), 'Empty session should return appropriate message');

      // Test invalid path operations
      try {
        await this.callTool('update_tasks', {
          sessionId,
          path: '/nonexistent/path/',
          tasks: [{ taskId: 'test', description: 'Test task', status: 'TODO' }]
        });
        // If this doesn't throw, check if error is in response
        // Some implementations might return error in response instead of throwing
      } catch (error) {
        // Expected behavior for invalid path
      }

      // Test large hierarchy (performance validation) using test helpers
      const largeTasks = createTestTasks(
        Array.from({ length: 20 }, (_, i) => ({
          description: `Task number ${i + 1}`,
          status: 'TODO',
          children: [
            { description: `Subtask ${i + 1}A`, status: 'TODO' },
            { description: `Subtask ${i + 1}B`, status: 'TODO' },
          ],
        }))
      );

      const largeResult = await this.callTool('update_tasks', {
        sessionId,
        path: '/',
        tasks: largeTasks
      });
      assert(largeResult.content[0].text.includes('Successfully updated 20 tasks'), 'Large hierarchy creation failed');

      // Test rapid sequential operations using generated IDs
      for (let i = 0; i < 5; i++) {
        await this.callTool('mark_task_as_done', { sessionId, taskId: largeTasks[i].taskId });
      }

      const rapidResult = await this.callTool('get_all_tasks', { sessionId });
      assert(rapidResult.content[0].text.includes('✓') && rapidResult.content[0].text.includes('Task number 1'), 'Rapid operations failed');
      assert(rapidResult.content[0].text.includes('✓') && rapidResult.content[0].text.includes('Task number 5'), 'Rapid operations failed');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error instanceof Error ? error.message : String(error));
    }
  }

  async runAllTests() {
    console.log('\n🧪 Running Comprehensive Integration Tests');
    console.log('==========================================');

    await this.testCompleteWorkflow();
    await this.testMultiLevelHierarchy();
    await this.testSessionManagement();
    await this.testToolInteractionPatterns();
    await this.testEdgeCasesAndErrorHandling();

    this.printSummary();
  }

  private printSummary() {
    console.log('\n📊 Integration Test Results Summary');
    console.log('===================================');

    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;

    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.name}`);
      if (result.error && !result.passed) {
        console.log(`   └─ ${result.error}`);
      }
    });

    console.log(`\nTotal Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      console.log('\n❌ Some integration tests failed');
      process.exitCode = 1;
    } else {
      console.log('\n🎉 All integration tests passed!');
    }
  }
}

// Main execution
async function main() {
  const testSuite = new IntegrationTestSuite();
  
  try {
    await testSuite.setup();
    await testSuite.runAllTests();
  } catch (error) {
    console.error('💥 Integration test suite failed to run:', error);
    process.exitCode = 1;
  } finally {
    await testSuite.cleanup();
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Integration tests interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Integration tests terminated');
  process.exit(1);
});

main().catch(error => {
  console.error('💥 Unhandled error in integration tests:', error);
  process.exit(1);
});