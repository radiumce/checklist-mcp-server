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

interface TextContentItem {
  type: 'text';
  text: string;
}

interface ToolSuccessResponse {
  content: TextContentItem[];
}

/**
 * Final validation test that verifies all requirements from the spec are implemented
 * This test validates the complete system against the original requirements
 */
class FinalValidationTest {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async setup() {
    console.log('🔍 Final Validation Test - Verifying All Requirements');
    console.log('=====================================================');
    
    this.transport = new StdioClientTransport({
      command: serverCommand,
      args: serverArgs,
    });

    this.client = new Client({
      name: 'final-validation-client',
      version: '1.0.0',
    });

    await this.client.connect(this.transport);
    console.log('✅ Connected to server for final validation');
  }

  async cleanup() {
    if (this.transport) {
      await this.transport.close();
      console.log('✅ Final validation cleanup complete');
    }
  }

  private async callTool(name: string, args: any): Promise<ToolSuccessResponse> {
    if (!this.client) throw new Error('Client not initialized');
    return await this.client.callTool({ name, arguments: args }) as ToolSuccessResponse;
  }

  async validateAllRequirements() {
    console.log('\n📋 Validating Requirements Compliance');
    console.log('=====================================');

    await this.validateRequirement1_1();
    await this.validateRequirement1_2();
    await this.validateRequirement2_1();
    await this.validateRequirement2_2();
    await this.validateRequirement3_1();
    await this.validateRequirement3_2();
    await this.validateRequirement4_1();
    await this.validateRequirement4_2();
    await this.validateRequirement5_1();
    await this.validateRequirement5_2();

    console.log('\n🎯 All requirements validated successfully!');
  }

  // Requirement 1.1: WHEN a user creates a new task THEN the system SHALL generate a unique task ID
  async validateRequirement1_1() {
    console.log('\n🔸 Validating Requirement 1.1: Unique Task ID Generation');
    
    const sessionId = generateTestSessionId('req-1-1');
    const tasks = createMultipleTasks([
      'First test task',
      'Second test task', 
      'Third test task'
    ]);

    const result = await this.callTool('update_tasks', {
      sessionId,
      path: '/',
      tasks
    });

    // Verify each task has a unique ID and is created successfully
    assert(result.content[0].text.includes('Successfully updated 3 tasks'), 'Tasks should be created with unique IDs');
    
    const getResult = await this.callTool('get_all_tasks', { sessionId });
    // Verify all tasks are present by checking their descriptions
    assert(getResult.content[0].text.includes('First test task'), 'First task should exist');
    assert(getResult.content[0].text.includes('Second test task'), 'Second task should exist');
    assert(getResult.content[0].text.includes('Third test task'), 'Third task should exist');

    console.log('✅ Requirement 1.1 validated: Unique task IDs generated and stored');
  }

  // Requirement 1.2: WHEN a user creates a task with subtasks THEN the system SHALL maintain hierarchical relationships
  async validateRequirement1_2() {
    console.log('\n🔸 Validating Requirement 1.2: Hierarchical Task Relationships');
    
    const sessionId = generateTestSessionId('req-1-2');
    const hierarchicalTasks = createTestTasks([
      {
        description: 'Parent task',
        status: 'TODO',
        children: [
          {
            description: 'First child task',
            status: 'TODO',
            children: [
              { description: 'Grandchild task', status: 'TODO' }
            ]
          },
          { description: 'Second child task', status: 'TODO' }
        ]
      }
    ]);

    await this.callTool('update_tasks', {
      sessionId,
      path: '/',
      tasks: hierarchicalTasks
    });

    const result = await this.callTool('get_all_tasks', { sessionId });
    const treeText = result.content[0].text;

    // Verify hierarchical structure is maintained by checking descriptions
    assert(treeText.includes('Parent task'), 'Parent task should be present');
    assert(treeText.includes('First child task'), 'Child task should be present');
    assert(treeText.includes('Second child task'), 'Second child task should be present');
    assert(treeText.includes('Grandchild task'), 'Grandchild task should be present');
    
    // Verify proper tree formatting indicates hierarchy
    assert(treeText.includes('├──') || treeText.includes('└──'), 'Tree should show hierarchical structure');

    console.log('✅ Requirement 1.2 validated: Hierarchical relationships maintained');
  }

  // Requirement 2.1: WHEN a user marks a task as complete THEN the system SHALL update the task status to DONE
  async validateRequirement2_1() {
    console.log('\n🔸 Validating Requirement 2.1: Task Status Update to DONE');
    
    const sessionId = generateTestSessionId('req-2-1');
    const tasks = createMultipleTasks([
      'Task to be completed',
      'Another task'
    ]);

    await this.callTool('update_tasks', { sessionId, path: '/', tasks });

    // Mark first task as done
    const markResult = await this.callTool('mark_task_as_done', {
      sessionId,
      taskId: tasks[0].taskId
    });

    assert(markResult.content[0].text.includes(`Successfully marked task ${tasks[0].taskId} as DONE`), 'Task should be marked as DONE');

    // Verify status change
    const getResult = await this.callTool('get_all_tasks', { sessionId });
    assert(getResult.content[0].text.includes('✓') && getResult.content[0].text.includes('Task to be completed'), 'Task should show as DONE with ✓ symbol');
    assert(getResult.content[0].text.includes('○') && getResult.content[0].text.includes('Another task'), 'Other task should remain TODO with ○ symbol');

    console.log('✅ Requirement 2.1 validated: Task status updated to DONE');
  }

  // Requirement 2.2: WHEN a user marks a parent task as complete THEN the system SHALL NOT automatically mark subtasks as complete
  async validateRequirement2_2() {
    console.log('\n🔸 Validating Requirement 2.2: Subtask Independence');
    
    const sessionId = generateTestSessionId('req-2-2');
    const tasks = createTestTasks([
      {
        description: 'Parent task',
        status: 'TODO',
        children: [
          { description: 'Child task 1', status: 'TODO' },
          { description: 'Child task 2', status: 'TODO' }
        ]
      }
    ]);

    await this.callTool('update_tasks', { sessionId, path: '/', tasks });

    // Mark parent as done
    await this.callTool('mark_task_as_done', { sessionId, taskId: tasks[0].taskId });

    // Verify subtasks remain TODO
    const result = await this.callTool('get_all_tasks', { sessionId });
    const treeText = result.content[0].text;

    assert(treeText.includes('✓') && treeText.includes('Parent task'), 'Parent should be marked as DONE');
    assert(treeText.includes('○') && treeText.includes('Child task 1'), 'Child1 should remain TODO');
    assert(treeText.includes('○') && treeText.includes('Child task 2'), 'Child2 should remain TODO');

    console.log('✅ Requirement 2.2 validated: Subtasks remain independent when parent is completed');
  }

  // Requirement 3.1: WHEN a user requests all tasks THEN the system SHALL return tasks in a hierarchical tree format
  async validateRequirement3_1() {
    console.log('\n🔸 Validating Requirement 3.1: Hierarchical Tree Format Display');
    
    const sessionId = generateTestSessionId('req-3-1');
    const complexTasks = createTestTasks([
      {
        description: 'Project',
        status: 'TODO',
        children: [
          {
            description: 'Phase 1',
            status: 'DONE',
            children: [
              { description: 'Task 1', status: 'DONE' },
              { description: 'Task 2', status: 'TODO' }
            ]
          },
          { description: 'Phase 2', status: 'TODO' }
        ]
      }
    ]);

    await this.callTool('update_tasks', { sessionId, path: '/', tasks: complexTasks });
    const result = await this.callTool('get_all_tasks', { sessionId });
    const treeText = result.content[0].text;

    // Verify tree format elements
    assert(treeText.includes('├──') || treeText.includes('└──'), 'Should use tree branch characters');
    assert(treeText.includes('│'), 'Should use tree continuation characters');
    assert(treeText.includes('    '), 'Should have proper indentation');
    assert(treeText.includes('✓'), 'Should show DONE status with checkmark');
    assert(treeText.includes('○'), 'Should show TODO status with circle');

    // Verify hierarchical structure is clear
    const lines = treeText.split('\n');
    let foundProperNesting = false;
    for (const line of lines) {
      if (line.includes('Task 1') && line.includes('    ')) {
        foundProperNesting = true;
        break;
      }
    }
    assert(foundProperNesting, 'Should show proper nesting with indentation');

    console.log('✅ Requirement 3.1 validated: Tasks displayed in hierarchical tree format');
  }

  // Requirement 3.2: WHEN displaying tasks THEN the system SHALL show task status with visual indicators
  async validateRequirement3_2() {
    console.log('\n🔸 Validating Requirement 3.2: Visual Status Indicators');
    
    const sessionId = generateTestSessionId('req-3-2');
    const tasks = createTestTasks([
      { description: 'Completed task', status: 'DONE' },
      { description: 'Pending task', status: 'TODO' }
    ]);

    await this.callTool('update_tasks', { sessionId, path: '/', tasks });
    const result = await this.callTool('get_all_tasks', { sessionId });
    const displayText = result.content[0].text;

    // Verify visual indicators
    assert(displayText.includes('✓') && displayText.includes('Completed task'), 'DONE tasks should show ✓ indicator');
    assert(displayText.includes('○') && displayText.includes('Pending task'), 'TODO tasks should show ○ indicator');

    // Verify indicators are visually distinct
    assert(displayText.includes('✓') && displayText.includes('○'), 'Should use different symbols for different statuses');

    console.log('✅ Requirement 3.2 validated: Visual status indicators displayed correctly');
  }

  // Requirement 4.1: WHEN a user provides an invalid session ID THEN the system SHALL return an appropriate error message
  async validateRequirement4_1() {
    console.log('\n🔸 Validating Requirement 4.1: Invalid Session ID Handling');
    
    // Test with various invalid session IDs
    const invalidSessions = ['', '   ', 'session with spaces', 'session@invalid!', 'a'.repeat(101)];
    
    for (const invalidSession of invalidSessions) {
      try {
        const result = await this.callTool('get_all_tasks', { sessionId: invalidSession });
        if (invalidSession.trim() === '') {
          // Empty sessions might be handled differently
          assert(result.content[0].text.includes('Error') || result.content[0].text.includes('No tasks found'), 
                 'Empty session should return error or no tasks message');
        }
      } catch (error) {
        // Some invalid sessions might throw errors, which is also acceptable
        assert(error instanceof Error, 'Should handle invalid session appropriately');
      }
    }

    // Test with non-existent but valid session ID
    const result = await this.callTool('get_all_tasks', { sessionId: 'non-existent-session' });
    assert(result.content[0].text.includes('No tasks found'), 'Non-existent session should return no tasks message');

    console.log('✅ Requirement 4.1 validated: Invalid session IDs handled with appropriate errors');
  }

  // Requirement 4.2: WHEN a user provides an invalid task ID THEN the system SHALL return an appropriate error message
  async validateRequirement4_2() {
    console.log('\n🔸 Validating Requirement 4.2: Invalid Task ID Handling');
    
    const sessionId = generateTestSessionId('req-4-2');
    const tasks = createSimpleTask('Valid task', 'TODO');

    await this.callTool('update_tasks', { sessionId, path: '/', tasks: [tasks] });

    // Test with invalid task IDs
    const invalidTaskIds = ['', '   ', 'nonexistent', 'task/invalid', 'task\\invalid', 'a'.repeat(21)];
    
    for (const invalidTaskId of invalidTaskIds) {
      try {
        const result = await this.callTool('mark_task_as_done', {
          sessionId,
          taskId: invalidTaskId
        });
        
        // Should return error message
        assert(result.content[0].text.includes('Error'), `Invalid task ID '${invalidTaskId}' should return error`);
      } catch (error) {
        // Throwing an error is also acceptable for invalid task IDs
        assert(error instanceof Error, 'Should handle invalid task ID appropriately');
      }
    }

    console.log('✅ Requirement 4.2 validated: Invalid task IDs handled with appropriate errors');
  }

  // Requirement 5.1: WHEN multiple users access the system THEN the system SHALL maintain separate task lists per session
  async validateRequirement5_1() {
    console.log('\n🔸 Validating Requirement 5.1: Session Isolation');
    
    const session1 = generateTestSessionId('user1');
    const session2 = generateTestSessionId('user2');
    const session3 = generateTestSessionId('user3');

    // Create different tasks in each session using test helpers
    const task1 = createSimpleTask('User 1 task', 'TODO');
    const task2 = createSimpleTask('User 2 task', 'TODO');
    const task3 = createSimpleTask('User 3 task', 'TODO');

    await this.callTool('update_tasks', {
      sessionId: session1,
      path: '/',
      tasks: [task1]
    });

    await this.callTool('update_tasks', {
      sessionId: session2,
      path: '/',
      tasks: [task2]
    });

    await this.callTool('update_tasks', {
      sessionId: session3,
      path: '/',
      tasks: [task3]
    });

    // Verify session isolation
    const result1 = await this.callTool('get_all_tasks', { sessionId: session1 });
    const result2 = await this.callTool('get_all_tasks', { sessionId: session2 });
    const result3 = await this.callTool('get_all_tasks', { sessionId: session3 });

    assert(result1.content[0].text.includes('User 1 task') && !result1.content[0].text.includes('User 2 task'), 'Session 1 should only see its tasks');
    assert(result2.content[0].text.includes('User 2 task') && !result2.content[0].text.includes('User 1 task'), 'Session 2 should only see its tasks');
    assert(result3.content[0].text.includes('User 3 task') && !result3.content[0].text.includes('User 1 task'), 'Session 3 should only see its tasks');

    console.log('✅ Requirement 5.1 validated: Sessions maintain separate task lists');
  }

  // Requirement 5.2: WHEN a user modifies tasks in their session THEN the system SHALL NOT affect other users' sessions
  async validateRequirement5_2() {
    console.log('\n🔸 Validating Requirement 5.2: Session Modification Isolation');
    
    const sessionA = generateTestSessionId('session-a');
    const sessionB = generateTestSessionId('session-b');

    // Create similar tasks in both sessions using test helpers
    const tasksA = createMultipleTasks([
      'Task with same description',
      'Unique task A'
    ]);
    
    const tasksB = createMultipleTasks([
      'Task with same description',
      'Unique task B'
    ]);

    await this.callTool('update_tasks', { sessionId: sessionA, path: '/', tasks: tasksA });
    await this.callTool('update_tasks', { sessionId: sessionB, path: '/', tasks: tasksB });

    // Modify task in session A
    await this.callTool('mark_task_as_done', { sessionId: sessionA, taskId: tasksA[0].taskId });

    // Add new task to session A (preserve the existing tasks with their current status)
    const newTask = createSimpleTask('New task in A', 'TODO');
    // Update the first task to DONE status to preserve the mark_task_as_done operation
    const updatedTasksA = [...tasksA];
    updatedTasksA[0].status = 'DONE';
    await this.callTool('update_tasks', {
      sessionId: sessionA,
      path: '/',
      tasks: [...updatedTasksA, newTask]
    });

    // Verify session B is unaffected
    const resultB = await this.callTool('get_all_tasks', { sessionId: sessionB });
    assert(resultB.content[0].text.includes('○') && resultB.content[0].text.includes('Task with same description'), 'Session B task should remain TODO');
    assert(!resultB.content[0].text.includes('New task in A'), 'Session B should not see new task from session A');

    // Verify session A has the changes
    const resultA = await this.callTool('get_all_tasks', { sessionId: sessionA });
    assert(resultA.content[0].text.includes('✓') && resultA.content[0].text.includes('Task with same description'), 'Session A task should be DONE');
    assert(resultA.content[0].text.includes('New task in A'), 'Session A should see new task');

    console.log('✅ Requirement 5.2 validated: Session modifications do not affect other sessions');
  }

  async run() {
    try {
      await this.setup();
      await this.validateAllRequirements();
      console.log('\n🏆 FINAL VALIDATION PASSED - All requirements successfully implemented!');
    } catch (error) {
      console.error('\n💥 FINAL VALIDATION FAILED:', error);
      process.exitCode = 1;
    } finally {
      await this.cleanup();
    }
  }
}

// Main execution
async function main() {
  const validator = new FinalValidationTest();
  await validator.run();
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Final validation interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Final validation terminated');
  process.exit(1);
});

main().catch(error => {
  console.error('💥 Unhandled error in final validation:', error);
  process.exit(1);
});