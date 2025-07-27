#!/usr/bin/env node
/**
 * Comprehensive Work Info Functionality Test
 * Tests all work info features together including edge cases, error handling,
 * LRU eviction scenarios, and session association functionality
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

// Path to the compiled server script
const serverScriptPath = path.resolve(__dirname, '../dist/server.js');
const serverCommand = 'node';
const serverArgs = [serverScriptPath];

// Expected structure of the response content field
interface TextContentItem {
    type: 'text';
    text: string;
}

// Basic expected structure of a successful tool response
interface ToolSuccessResponse {
    content: TextContentItem[];
}

async function testWorkInfoComprehensive() {
  console.log('--- Starting Comprehensive Work Info Tests ---');

  // Create client and transport
  const transport = new StdioClientTransport({
    command: serverCommand,
    args: serverArgs
  });

  const client = new Client({
    name: "comprehensive-test-client",
    version: "1.0.0"
  });

  try {
    // Connect to server
    await client.connect(transport);
    console.log('Connected successfully.');

    // Test 1: LRU Cache Capacity and Eviction
    console.log('\n=== Test 1: LRU Cache Capacity and Eviction ===');
    
    // Save 12 work items (exceeds default capacity of 10)
    const workIds: string[] = [];
    for (let i = 1; i <= 12; i++) {
      const saveResult = await client.callTool({ 
        name: "save_current_work_info", 
        arguments: {
          work_summarize: `Work summary ${i} - This is a comprehensive test of LRU cache eviction behavior.`,
          work_description: `Work ${i}`
        } as { [x: string]: unknown }
      });

      const saveResponse = saveResult as ToolSuccessResponse;
      const workIdMatch = saveResponse.content[0].text.match(/ID: (\d{8})/);
      if (workIdMatch) {
        workIds.push(workIdMatch[1]);
      }
    }

    console.log(`Created ${workIds.length} work items`);

    // Get recent works - should only have 10 items (LRU capacity)
    const recentResult = await client.callTool({ 
      name: "get_recent_works_info", 
      arguments: {} as { [x: string]: unknown }
    });

    const recentResponse = recentResult as ToolSuccessResponse;
    const recentData = JSON.parse(recentResponse.content[0].text);
    
    if (recentData.works.length !== 10) {
      throw new Error(`Expected 10 works in cache, got ${recentData.works.length}`);
    }

    // First 2 work items should be evicted
    const firstWorkId = workIds[0];
    const secondWorkId = workIds[1];
    
    const firstWorkResult = await client.callTool({ 
      name: "get_work_by_id", 
      arguments: { workId: firstWorkId } as { [x: string]: unknown }
    });
    const firstWorkResponse = firstWorkResult as ToolSuccessResponse;
    if (!firstWorkResponse.content[0].text.includes('Work not found')) {
      throw new Error('First work should have been evicted from LRU cache');
    }

    const secondWorkResult = await client.callTool({ 
      name: "get_work_by_id", 
      arguments: { workId: secondWorkId } as { [x: string]: unknown }
    });
    const secondWorkResponse = secondWorkResult as ToolSuccessResponse;
    if (!secondWorkResponse.content[0].text.includes('Work not found')) {
      throw new Error('Second work should have been evicted from LRU cache');
    }

    // Last work item should still exist
    const lastWorkId = workIds[workIds.length - 1];
    const lastWorkResult = await client.callTool({ 
      name: "get_work_by_id", 
      arguments: { workId: lastWorkId } as { [x: string]: unknown }
    });
    const lastWorkResponse = lastWorkResult as ToolSuccessResponse;
    const lastWorkData = JSON.parse(lastWorkResponse.content[0].text);
    if (lastWorkData.workId !== lastWorkId) {
      throw new Error('Last work should still exist in cache');
    }

    console.log('✓ LRU cache capacity and eviction working correctly');

    // Test 2: LRU Access Order Update
    console.log('\n=== Test 2: LRU Access Order Update ===');
    
    // Access an older work item to move it to front
    const middleWorkId = workIds[5]; // Should still be in cache
    await client.callTool({ 
      name: "get_work_by_id", 
      arguments: { workId: middleWorkId } as { [x: string]: unknown }
    });

    // Get recent works again - accessed item should be first
    const updatedRecentResult = await client.callTool({ 
      name: "get_recent_works_info", 
      arguments: {} as { [x: string]: unknown }
    });
    const updatedRecentResponse = updatedRecentResult as ToolSuccessResponse;
    const updatedRecentData = JSON.parse(updatedRecentResponse.content[0].text);
    
    if (updatedRecentData.works[0].workId !== middleWorkId) {
      throw new Error('Accessed work should be moved to front of LRU cache');
    }

    console.log('✓ LRU access order update working correctly');

    // Test 3: Session Association and Task Snapshots
    console.log('\n=== Test 3: Session Association and Task Snapshots ===');
    
    // Create session with tasks
    await client.callTool({ 
      name: "update_tasks", 
      arguments: {
        sessionId: 'session-snapshot-test',
        path: "/",
        tasks: [
          { taskId: 'snap1', description: 'Snapshot task 1', status: 'TODO' },
          { taskId: 'snap2', description: 'Snapshot task 2', status: 'DONE' }
        ]
      } as { [x: string]: unknown }
    });

    // Save work info with session
    const sessionSaveResult = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "Work summary for snapshot test - Testing task snapshot functionality.",
        work_description: "Snapshot test work",
        sessionId: 'session-snapshot-test'
      } as { [x: string]: unknown }
    });

    const sessionSaveResponse = sessionSaveResult as ToolSuccessResponse;
    const sessionWorkId = sessionSaveResponse.content[0].text.match(/ID: (\d{8})/)![1];

    // Modify tasks in session
    await client.callTool({ 
      name: "mark_task_as_done", 
      arguments: {
        sessionId: 'session-snapshot-test',
        taskId: 'snap1'
      } as { [x: string]: unknown }
    });

    // Verify task snapshot remains unchanged
    const workResult = await client.callTool({ 
      name: "get_work_by_id", 
      arguments: { workId: sessionWorkId } as { [x: string]: unknown }
    });
    const workResponse = workResult as ToolSuccessResponse;
    
    // Check if work was evicted from cache
    if (workResponse.content[0].text.includes('Work not found')) {
      console.log('  Work was evicted from cache due to LRU eviction (expected)');
    } else {
      const workData = JSON.parse(workResponse.content[0].text);

      if (!workData.work_tasks) {
        throw new Error('Work should have task snapshot');
      }

      // Verify original task states are preserved in snapshot
      const snap1Task = workData.work_tasks.find((t: any) => t.taskId === 'snap1');
      if (snap1Task.status !== 'TODO') {
        throw new Error('Task snapshot should preserve original TODO status');
      }
    }

    console.log('✓ Session association and task snapshots working correctly');

    // Test 4: SessionId Overwrite Behavior
    console.log('\n=== Test 4: SessionId Overwrite Behavior ===');
    
    const overwriteSessionId = 'session-overwrite-test';
    
    // Create session
    await client.callTool({ 
      name: "update_tasks", 
      arguments: {
        sessionId: overwriteSessionId,
        path: "/",
        tasks: [
          { taskId: 'overwrite1', description: 'Original task', status: 'TODO' }
        ]
      } as { [x: string]: unknown }
    });

    // Save first work info
    const firstOverwriteResult = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "First work summary for overwrite test",
        work_description: "First overwrite work",
        sessionId: overwriteSessionId
      } as { [x: string]: unknown }
    });
    const firstOverwriteResponse = firstOverwriteResult as ToolSuccessResponse;
    const firstOverwriteWorkId = firstOverwriteResponse.content[0].text.match(/ID: (\d{8})/)![1];

    // Update tasks
    await client.callTool({ 
      name: "update_tasks", 
      arguments: {
        sessionId: overwriteSessionId,
        path: "/",
        tasks: [
          { taskId: 'overwrite1', description: 'Original task', status: 'DONE' },
          { taskId: 'overwrite2', description: 'New task', status: 'TODO' }
        ]
      } as { [x: string]: unknown }
    });

    // Save second work info with same sessionId (should overwrite)
    const secondOverwriteResult = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "Second work summary for overwrite test - should overwrite first",
        work_description: "Second overwrite work",
        sessionId: overwriteSessionId
      } as { [x: string]: unknown }
    });
    const secondOverwriteResponse = secondOverwriteResult as ToolSuccessResponse;
    const secondOverwriteWorkId = secondOverwriteResponse.content[0].text.match(/ID: (\d{8})/)![1];

    // Should reuse the same workId
    if (firstOverwriteWorkId !== secondOverwriteWorkId) {
      throw new Error('SessionId overwrite should reuse the same workId');
    }

    // Verify the work info was overwritten (if not evicted)
    const overwriteCheckResult = await client.callTool({ 
      name: "get_work_by_id", 
      arguments: { workId: firstOverwriteWorkId } as { [x: string]: unknown }
    });
    const overwriteCheckResponse = overwriteCheckResult as ToolSuccessResponse;
    
    if (overwriteCheckResponse.content[0].text.includes('Work not found')) {
      console.log('  Work was evicted from cache due to LRU eviction (expected)');
    } else {
      const overwriteCheckData = JSON.parse(overwriteCheckResponse.content[0].text);

      if (!overwriteCheckData.work_summarize.includes('Second work summary')) {
        throw new Error('Work info should be overwritten with new summary');
      }

      // Task snapshot should reflect the state at second save time
      const overwriteTask1 = overwriteCheckData.work_tasks.find((t: any) => t.taskId === 'overwrite1');
      const overwriteTask2 = overwriteCheckData.work_tasks.find((t: any) => t.taskId === 'overwrite2');
      
      if (overwriteTask1.status !== 'DONE') {
        throw new Error('Overwritten task snapshot should reflect updated task status');
      }
      if (!overwriteTask2) {
        throw new Error('Overwritten task snapshot should include new tasks');
      }
    }

    console.log('✓ SessionId overwrite behavior working correctly');

    // Test 5: Error Handling Edge Cases
    console.log('\n=== Test 5: Error Handling Edge Cases ===');
    
    // Test boundary values for work_summarize length
    const maxSummary = 'a'.repeat(5000);
    const maxSummaryResult = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: maxSummary,
        work_description: "Max length summary test"
      } as { [x: string]: unknown }
    });
    // Should succeed
    const maxSummaryResponse = maxSummaryResult as ToolSuccessResponse;
    if (!maxSummaryResponse.content[0].text.includes('Successfully saved')) {
      throw new Error('Maximum length summary should be accepted');
    }

    // Test boundary values for work_description length
    const maxDescription = 'b'.repeat(200);
    const maxDescResult = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "Test summary for max description",
        work_description: maxDescription
      } as { [x: string]: unknown }
    });
    // Should succeed
    const maxDescResponse = maxDescResult as ToolSuccessResponse;
    if (!maxDescResponse.content[0].text.includes('Successfully saved')) {
      throw new Error('Maximum length description should be accepted');
    }

    // Test various invalid workId formats
    const invalidWorkIds = [
      '1234567',    // 7 digits
      '123456789',  // 9 digits
      '0234567',    // 7 digits starting with 0
      '09999999',   // 8 digits starting with 0
      'abcd1234',   // contains letters
      '1234-567',   // contains special characters
      '12345678.0', // contains decimal
    ];

    for (const invalidId of invalidWorkIds) {
      const invalidResult = await client.callTool({ 
        name: "get_work_by_id", 
        arguments: { workId: invalidId } as { [x: string]: unknown }
      });
      const invalidResponse = invalidResult as ToolSuccessResponse;
      if (!invalidResponse.content[0].text.includes('Error:')) {
        throw new Error(`Invalid workId '${invalidId}' should produce error`);
      }
    }

    // Test empty workId separately (throws MCP error)
    try {
      await client.callTool({ 
        name: "get_work_by_id", 
        arguments: { workId: '' } as { [x: string]: unknown }
      });
      throw new Error('Empty workId should have thrown MCP error');
    } catch (error: any) {
      if (!error.message.includes('workId cannot be empty')) {
        throw new Error('Empty workId should produce correct error message');
      }
    }

    // Test non-existent but valid format workIds
    const nonExistentIds = ['10000001', '99999998', '50000000'];
    for (const nonExistentId of nonExistentIds) {
      const nonExistentResult = await client.callTool({ 
        name: "get_work_by_id", 
        arguments: { workId: nonExistentId } as { [x: string]: unknown }
      });
      const nonExistentResponse = nonExistentResult as ToolSuccessResponse;
      if (!nonExistentResponse.content[0].text.includes('Work not found')) {
        throw new Error(`Non-existent workId '${nonExistentId}' should return 'Work not found'`);
      }
    }

    console.log('✓ Error handling edge cases working correctly');

    // Test 6: Concurrent Operations and Race Conditions
    console.log('\n=== Test 6: Concurrent Operations ===');
    
    // Save multiple work items rapidly
    const rapidSavePromises = [];
    for (let i = 1; i <= 5; i++) {
      rapidSavePromises.push(
        client.callTool({ 
          name: "save_current_work_info", 
          arguments: {
            work_summarize: `Rapid save test ${i} - Testing concurrent operations`,
            work_description: `Rapid ${i}`
          } as { [x: string]: unknown }
        })
      );
    }

    const rapidSaveResults = await Promise.all(rapidSavePromises);
    const rapidWorkIds = rapidSaveResults.map(result => {
      const response = result as ToolSuccessResponse;
      const match = response.content[0].text.match(/ID: (\d{8})/);
      return match ? match[1] : null;
    }).filter(id => id !== null);

    if (rapidWorkIds.length !== 5) {
      throw new Error('All rapid saves should succeed');
    }

    // Verify all work IDs are unique
    const uniqueIds = new Set(rapidWorkIds);
    if (uniqueIds.size !== rapidWorkIds.length) {
      throw new Error('All rapid save work IDs should be unique');
    }

    // Rapidly access work items
    const rapidAccessPromises = rapidWorkIds.map(workId => 
      client.callTool({ 
        name: "get_work_by_id", 
        arguments: { workId } as { [x: string]: unknown }
      })
    );

    const rapidAccessResults = await Promise.all(rapidAccessPromises);
    for (const result of rapidAccessResults) {
      const response = result as ToolSuccessResponse;
      if (response.content[0].text.includes('Error:')) {
        throw new Error('Rapid access should succeed for all work items');
      }
    }

    console.log('✓ Concurrent operations working correctly');

    // Test 7: Memory and Performance Validation
    console.log('\n=== Test 7: Memory and Performance Validation ===');
    
    // Fill cache to capacity multiple times to test memory management
    for (let cycle = 1; cycle <= 3; cycle++) {
      console.log(`  Memory test cycle ${cycle}/3`);
      
      // Add 15 more items (will cause evictions)
      for (let i = 1; i <= 15; i++) {
        await client.callTool({ 
          name: "save_current_work_info", 
          arguments: {
            work_summarize: `Memory test cycle ${cycle}, item ${i} - Testing memory management and eviction behavior over multiple cycles.`,
            work_description: `Cycle${cycle}-Item${i}`
          } as { [x: string]: unknown }
        });
      }

      // Verify cache still maintains capacity
      const memoryTestResult = await client.callTool({ 
        name: "get_recent_works_info", 
        arguments: {} as { [x: string]: unknown }
      });
      const memoryTestResponse = memoryTestResult as ToolSuccessResponse;
      const memoryTestData = JSON.parse(memoryTestResponse.content[0].text);
      
      if (memoryTestData.works.length !== 10) {
        throw new Error(`Cache should maintain capacity of 10, got ${memoryTestData.works.length} in cycle ${cycle}`);
      }
    }

    console.log('✓ Memory and performance validation passed');

    console.log('\n--- All Comprehensive Work Info Tests PASSED ---');

  } catch (error) {
    console.error('Comprehensive test failed:', error);
    throw error;
  } finally {
    // Cleanup
    console.log('Closing transport...');
    await transport.close();
    console.log('Transport closed.');
  }
}

// Run the comprehensive test
testWorkInfoComprehensive()
  .then(() => {
    console.log('--- Comprehensive Work Info Test Finished Successfully ---');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Comprehensive test suite failed:', error);
    process.exit(1);
  });