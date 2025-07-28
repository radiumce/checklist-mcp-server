#!/usr/bin/env node

import assert from 'assert';
/**
 * Test for get_work_by_id MCP tool
 * Tests the implementation of the get_work_by_id tool functionality
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

// Path to the compiled server script
const serverScriptPath = path.resolve(__dirname, '../dist/mcp-server.js');
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

async function testGetWorkById() {
  console.log('--- Starting get_work_by_id Tests ---');

  // Create client and transport
  const transport = new StdioClientTransport({
    command: serverCommand,
    args: serverArgs
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  });

  try {
    // Connect to server
    await client.connect(transport);
    console.log('Connected successfully.');

    // Setup: First save some work info to test retrieval
    console.log('\nSetting up test data...');
    
    // Save work info without sessionId
    const saveResult1 = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "This is a test work summary for get_work_by_id testing. It contains detailed information about the work progress.",
        work_description: "Test work for get_work_by_id"
      } as { [x: string]: unknown }
    });

    const saveResponse1 = saveResult1 as ToolSuccessResponse;
    const workIdMatch1 = saveResponse1.content[0].text.match(/workId: (\d{8})/);
    if (!workIdMatch1) {
      throw new Error('Failed to extract workId from first save response');
    }
    const workId1 = workIdMatch1[1];
    console.log('Saved work info 1 with workId:', workId1);

    // Create a session with tasks and save work info with sessionId
    await client.callTool({ 
      name: "update_tasks", 
      arguments: {
        sessionId: "test-session-get-work",
        path: "/",
        tasks: [
          {
            taskId: "task1",
            description: "First test task for get_work_by_id",
            status: "TODO"
          },
          {
            taskId: "task2", 
            description: "Second test task for get_work_by_id",
            status: "DONE",
            children: [
              {
                taskId: "subtask1",
                description: "Subtask under task2",
                status: "TODO"
              }
            ]
          }
        ]
      } as { [x: string]: unknown }
    });

    // Save work info with sessionId
    const saveResult2 = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "This work summary is associated with a session that has tasks. The tasks should be captured as a static snapshot and included in get_work_by_id response.",
        work_description: "Test work with session and tasks",
        sessionId: "test-session-get-work"
      } as { [x: string]: unknown }
    });

    const saveResponse2 = saveResult2 as ToolSuccessResponse;
    const workIdMatch2 = saveResponse2.content[0].text.match(/workId: (\d{8})/);
    if (!workIdMatch2) {
      throw new Error('Failed to extract workId from second save response');
    }
    const workId2 = workIdMatch2[1];
    console.log('Saved work info 2 with workId:', workId2);

    // Test 1: Get work by ID without sessionId
    console.log('\nTest 1: Getting work by ID without sessionId...');
    const getResult1 = await client.callTool({ 
      name: "get_work_by_id", 
      arguments: {
        workId: workId1
      } as { [x: string]: unknown }
    });

    const getResponse1 = getResult1 as ToolSuccessResponse;
    const workData1 = JSON.parse(getResponse1.content[0].text);
    console.log('Retrieved work data 1:', JSON.stringify(workData1, null, 2));

    // Verify required fields are present
    if (!workData1.workId || !workData1.work_timestamp || !workData1.work_description || !workData1.work_summarize) {
      throw new Error('Missing required fields in work data 1');
    }

    // Verify work_tasks is not present (no sessionId)
    if (workData1.work_tasks !== undefined) {
      throw new Error('work_tasks should not be present when no sessionId was used');
    }

    console.log('✓ Work data 1 structure is correct');

    // Test 2: Get work by ID with sessionId (should include work_tasks)
    console.log('\nTest 2: Getting work by ID with sessionId...');
    const getResult2 = await client.callTool({ 
      name: "get_work_by_id", 
      arguments: {
        workId: workId2
      } as { [x: string]: unknown }
    });

    const getResponse2 = getResult2 as ToolSuccessResponse;
    const workData2 = JSON.parse(getResponse2.content[0].text);
    console.log('Retrieved work data 2:', JSON.stringify(workData2, null, 2));

    // Verify required fields are present
    if (!workData2.workId || !workData2.work_timestamp || !workData2.work_description || !workData2.work_summarize) {
      throw new Error('Missing required fields in work data 2');
    }

    // Verify work_tasks is present (sessionId was used)
    if (workData2.work_tasks === undefined) {
      throw new Error('work_tasks should be present when sessionId was used');
    }

    console.log('✓ Work data 2 structure is correct with task snapshot');

    // Test 3: Test LRU access tracking by checking recent works order
    console.log('\nTest 3: Testing LRU access tracking...');
    
    // Get recent works to see current order
    const recentResult1 = await client.callTool({ 
      name: "get_recent_works_info", 
      arguments: {} as { [x: string]: unknown }
    });
    const recentResponse1 = recentResult1 as ToolSuccessResponse;
    const recentWorks = JSON.parse(recentResponse1.content[0].text).works;
    assert(recentResponse1.content[1].text.includes('If you find the required work info'), 'Hint message is missing or incorrect.');
    console.log('Recent works before access:', recentWorks.map((w: any) => w.workId));

    // Access workId1 (should move it to most recent)
    await client.callTool({ 
      name: "get_work_by_id", 
      arguments: {
        workId: workId1
      } as { [x: string]: unknown }
    });

    // Check recent works order again
    const recentResult2 = await client.callTool({ 
      name: "get_recent_works_info", 
      arguments: {} as { [x: string]: unknown }
    });
    const recentResponse2 = recentResult2 as ToolSuccessResponse;
    const recentData2 = JSON.parse(recentResponse2.content[0].text);
    console.log('Recent works after accessing workId1:', recentData2.works.map((w: any) => w.workId));

    // Verify workId1 is now first (most recent)
    if (recentData2.works[0].workId !== workId1) {
      throw new Error('LRU access tracking not working - workId1 should be most recent');
    }

    console.log('✓ LRU access tracking is working correctly');

    // Test 4: Test work not found scenario
    console.log('\nTest 4: Testing work not found scenario...');
    const nonExistentWorkId = '99999999';
    
    const getResult3 = await client.callTool({ 
      name: "get_work_by_id", 
      arguments: {
        workId: nonExistentWorkId
      } as { [x: string]: unknown }
    });

    const getResponse3 = getResult3 as ToolSuccessResponse;
    console.log('Work not found response:', getResponse3.content[0].text);

    // Verify error message format
    if (!getResponse3.content[0].text.includes('Error: Work not found')) {
      throw new Error('Expected work not found error message');
    }

    console.log('✓ Work not found scenario handled correctly');

    // Test 5: Test input validation errors
    console.log('\nTest 5: Testing input validation errors...');
    
    // Test empty workId
    try {
      await client.callTool({ 
        name: "get_work_by_id", 
        arguments: {
          workId: ""
        } as { [x: string]: unknown }
      });
      console.log('ERROR: Empty workId should have failed validation');
    } catch (error: any) {
      console.log('Empty workId validation error (expected):', error.message);
    }

    // Test invalid workId format
    try {
      await client.callTool({ 
        name: "get_work_by_id", 
        arguments: {
          workId: "invalid123"
        } as { [x: string]: unknown }
      });
      throw new Error('Test failed: Invalid workId format should have thrown an exception');
    } catch (error: any) {
      if (error.code === -32602) {
        console.log('✓ Received expected input validation error for invalid workId format');
      } else {
        throw new Error(`Unexpected error for invalid workId format: ${error.message}`);
      }
    }

    console.log('✓ Input validation working correctly');

    // Test 6: Test that task snapshot is static (doesn't change after task updates)
    console.log('\nTest 6: Testing static task snapshot behavior...');
    
    // Modify tasks in the session
    await client.callTool({ 
      name: "mark_task_as_done", 
      arguments: {
        sessionId: "test-session-get-work",
        taskId: "task1"
      } as { [x: string]: unknown }
    });

    // Get work by ID again - task snapshot should remain unchanged
    const getResult4 = await client.callTool({ 
      name: "get_work_by_id", 
      arguments: {
        workId: workId2
      } as { [x: string]: unknown }
    });

    const getResponse4 = getResult4 as ToolSuccessResponse;
    const workData4 = JSON.parse(getResponse4.content[0].text);
    
    // Find task1 in the snapshot - it should still be TODO (not DONE)
    const task1InSnapshot = workData4.work_tasks.find((t: any) => t.taskId === 'task1');
    if (!task1InSnapshot || task1InSnapshot.status !== 'TODO') {
      throw new Error('Task snapshot should be static - task1 should still be TODO in snapshot');
    }

    console.log('✓ Task snapshot is static and unchanged after task updates');

    console.log('\n--- All get_work_by_id Tests PASSED ---');

  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    console.log('Closing transport...');
    await transport.close();
    console.log('Transport closed.');
  }
}

// Run the test
testGetWorkById()
  .then(() => {
    console.log('--- get_work_by_id Test Finished ---');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });