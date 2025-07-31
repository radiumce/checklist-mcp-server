#!/usr/bin/env node

/**
 * Session Limit Integration Test
 * Tests the session limit functionality with the MCP server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

console.log('--- Starting Session Limit Integration Test ---');

// Expected structure of a successful tool response
interface ToolSuccessResponse {
    content: { type: 'text'; text: string }[];
}

async function runSessionLimitTest() {
  // Set up transport with MAX_SESSIONS environment variable
  const serverScriptPath = path.resolve(__dirname, '../dist/mcp-server.js');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverScriptPath],
    env: { ...process.env, MAX_SESSIONS: '3' } // Set limit to 3 sessions
  });

  const client = new Client({
    name: 'session-limit-test-client',
    version: '1.0.0',
  });

  try {
    console.log('Connecting to server with MAX_SESSIONS=3...');
    await client.connect(transport);
    console.log('✅ Connected successfully');

    // Test 1: Create tasks for 3 sessions (within limit)
    console.log('\nTest 1: Creating tasks for 3 sessions (within limit)...');
    
    for (let i = 1; i <= 3; i++) {
      const sessionId = `test-session-${i}`;
      const result = await client.callTool({
        name: 'update_tasks',
        arguments: {
          sessionId,
          tasks: [
            {
              taskId: `task-${i}-1`,
              description: `First task for session ${i}`,
              status: 'TODO'
            },
            {
              taskId: `task-${i}-2`,
              description: `Second task for session ${i}`,
              status: 'TODO'
            }
          ]
        } as unknown as { [x: string]: unknown }
      });
      
      console.log(`✅ Created tasks for ${sessionId}`);
    }

    // Test 2: Verify all 3 sessions exist
    console.log('\nTest 2: Verifying all 3 sessions exist...');
    
    for (let i = 1; i <= 3; i++) {
      const sessionId = `test-session-${i}`;
      const result = await client.callTool({
        name: 'get_all_tasks',
        arguments: { sessionId } as unknown as { [x: string]: unknown }
      });
      
      const content = (result as ToolSuccessResponse).content[0].text;
      if (content.includes('No tasks found')) {
        throw new Error(`Session ${sessionId} should exist but was not found`);
      }
      console.log(`✅ Session ${sessionId} exists and has tasks`);
    }

    // Test 3: Add a 4th session (should trigger LRU eviction)
    console.log('\nTest 3: Adding 4th session (should trigger LRU eviction)...');
    
    const result4 = await client.callTool({
      name: 'update_tasks',
      arguments: {
        sessionId: 'test-session-4',
        tasks: [
          {
            taskId: 'task-4-1',
            description: 'First task for session 4',
            status: 'TODO'
          }
        ]
      } as unknown as { [x: string]: unknown }
    });
    
    console.log('✅ Created tasks for test-session-4');

    // Test 4: Verify session-1 was evicted (LRU)
    console.log('\nTest 4: Verifying session-1 was evicted (LRU)...');
    
    const checkSession1 = await client.callTool({
      name: 'get_all_tasks',
      arguments: { sessionId: 'test-session-1' } as unknown as { [x: string]: unknown }
    });
    
    const session1Content = (checkSession1 as ToolSuccessResponse).content[0].text;
    if (!session1Content.includes('No tasks found')) {
      throw new Error('Session test-session-1 should have been evicted but still exists');
    }
    console.log('✅ Session test-session-1 was correctly evicted');

    // Test 5: Verify sessions 2, 3, and 4 still exist
    console.log('\nTest 5: Verifying sessions 2, 3, and 4 still exist...');
    
    for (const sessionNum of [2, 3, 4]) {
      const sessionId = `test-session-${sessionNum}`;
      const result = await client.callTool({
        name: 'get_all_tasks',
        arguments: { sessionId } as unknown as { [x: string]: unknown }
      });
      
      const content = (result as ToolSuccessResponse).content[0].text;
      if (content.includes('No tasks found')) {
        throw new Error(`Session ${sessionId} should exist but was not found`);
      }
      console.log(`✅ Session ${sessionId} still exists`);
    }

    // Test 6: Access session-2 to make it most recent, then add session-5
    console.log('\nTest 6: Testing LRU access order...');
    
    // Access session-2 to make it most recent
    await client.callTool({
      name: 'get_all_tasks',
      arguments: { sessionId: 'test-session-2' } as unknown as { [x: string]: unknown }
    });
    console.log('✅ Accessed test-session-2 to make it most recent');

    // Add session-5, should evict session-3 (now LRU)
    await client.callTool({
      name: 'update_tasks',
      arguments: {
        sessionId: 'test-session-5',
        tasks: [
          {
            taskId: 'task-5-1',
            description: 'First task for session 5',
            status: 'TODO'
          }
        ]
      } as unknown as { [x: string]: unknown }
    });
    console.log('✅ Created tasks for test-session-5');

    // Verify session-3 was evicted
    const checkSession3 = await client.callTool({
      name: 'get_all_tasks',
      arguments: { sessionId: 'test-session-3' } as unknown as { [x: string]: unknown }
    });
    
    const session3Content = (checkSession3 as ToolSuccessResponse).content[0].text;
    if (!session3Content.includes('No tasks found')) {
      throw new Error('Session test-session-3 should have been evicted but still exists');
    }
    console.log('✅ Session test-session-3 was correctly evicted (LRU)');

    // Verify sessions 2, 4, and 5 still exist
    for (const sessionNum of [2, 4, 5]) {
      const sessionId = `test-session-${sessionNum}`;
      const result = await client.callTool({
        name: 'get_all_tasks',
        arguments: { sessionId } as unknown as { [x: string]: unknown }
      });
      
      const content = (result as ToolSuccessResponse).content[0].text;
      if (content.includes('No tasks found')) {
        throw new Error(`Session ${sessionId} should exist but was not found`);
      }
      console.log(`✅ Session ${sessionId} still exists after LRU eviction`);
    }

    console.log('\n🎉 All session limit integration tests PASSED!');
    console.log('✅ LRU session management is working correctly');
    console.log('✅ Memory usage is properly limited to MAX_SESSIONS');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    console.log('\nCleaning up...');
    await transport.close();
    console.log('✅ Cleanup complete');
  }
}

// Run the test
runSessionLimitTest()
  .then(() => {
    console.log('--- Session Limit Integration Test Finished Successfully ---');
    process.exit(0);
  })
  .catch((error) => {
    console.error('--- Session Limit Integration Test Failed ---');
    console.error(error);
    process.exit(1);
  });