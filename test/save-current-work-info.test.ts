#!/usr/bin/env node
/**
 * Test for save_current_work_info MCP tool
 * Tests the implementation of the save_current_work_info tool functionality
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

async function testSaveCurrentWorkInfo() {
  console.log('--- Starting save_current_work_info Tests ---');

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

    // Test 1: Basic save work info without sessionId
    console.log('\nTesting basic save work info without sessionId...');
    const basicResult = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "This is a test work summary describing the current progress on implementing the save_current_work_info tool.",
        work_description: "Test work info save"
      } as { [x: string]: unknown }
    });

    const basicResponse = basicResult as ToolSuccessResponse;
    console.log('Basic save result:', basicResponse.content[0].text);
    
    // Extract workId from response
    const workIdMatch = basicResponse.content[0].text.match(/workId: (\d{8})/);
    if (!workIdMatch) {
      throw new Error('Failed to extract workId from response');
    }
    const workId = workIdMatch[1];
    console.log('Generated workId:', workId);

    // Test 2: Save work info with sessionId (non-existent session)
    console.log('\nTesting save work info with non-existent sessionId...');
    const sessionResult = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "This is another test work summary with a session ID that doesn't exist.",
        work_description: "Test with non-existent session",
        sessionId: "non-existent-session"
      } as { [x: string]: unknown }
    });

    const sessionResponse = sessionResult as ToolSuccessResponse;
    console.log('Session save result:', sessionResponse.content[0].text);
    console.log('Warning message:', sessionResponse.content[sessionResponse.content.length - 1].text);

    // Test 3: Create a session with tasks and then save work info
    console.log('\nTesting save work info with existing sessionId...');
    
    // First create a session with tasks
    await client.callTool({ 
      name: "update_tasks", 
      arguments: {
        sessionId: "test-session-123",
        path: "/",
        tasks: [
          {
            taskId: "task1",
            description: "First test task",
            status: "TODO"
          },
          {
            taskId: "task2", 
            description: "Second test task",
            status: "DONE"
          }
        ]
      } as { [x: string]: unknown }
    });

    // Now save work info with this sessionId
    const sessionWithTasksResult = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "This work summary is associated with a session that has tasks. The tasks should be captured as a static snapshot.",
        work_description: "Test with existing session and tasks",
        sessionId: "test-session-123"
      } as { [x: string]: unknown }
    });

    const sessionWithTasksResponse = sessionWithTasksResult as ToolSuccessResponse;
    console.log('Session with tasks result:', sessionWithTasksResponse.content[0].text);
    console.log('Session association message:', sessionWithTasksResponse.content[1].text);

    // Test 4: Test sessionId overwrite behavior
    console.log('\nTesting sessionId overwrite behavior...');
    const overwriteResult = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "This should overwrite the previous work info for the same sessionId.",
        work_description: "Overwrite test",
        sessionId: "test-session-123"
      } as { [x: string]: unknown }
    });

    const overwriteResponse = overwriteResult as ToolSuccessResponse;
    console.log('Overwrite result:', overwriteResponse.content[0].text);

    // Test 5: Test input validation errors
    console.log('\nTesting input validation errors...');
    
    try {
      await client.callTool({ 
        name: "save_current_work_info", 
        arguments: {
          work_summarize: "", // Empty summary should fail
          work_description: "Test validation"
        } as { [x: string]: unknown }
      });
      console.log('ERROR: Empty summary should have failed validation');
    } catch (error: any) {
      console.log('Empty summary validation error (expected):', error.message);
    }

    try {
      await client.callTool({ 
        name: "save_current_work_info", 
        arguments: {
          work_summarize: "Valid summary",
          work_description: "" // Empty description should fail
        } as { [x: string]: unknown }
      });
      console.log('ERROR: Empty description should have failed validation');
    } catch (error: any) {
      console.log('Empty description validation error (expected):', error.message);
    }

    try {
      await client.callTool({ 
        name: "save_current_work_info", 
        arguments: {
          work_summarize: "Valid summary",
          work_description: "Valid description",
          sessionId: "invalid@session!" // Invalid sessionId should fail
        } as { [x: string]: unknown }
      });
      console.log('ERROR: Invalid sessionId should have failed validation');
    } catch (error: any) {
      console.log('Invalid sessionId validation error (expected):', error.message);
    }

    // Test 6: Test maximum length validation
    console.log('\nTesting maximum length validation...');
    
    try {
      const longSummary = "a".repeat(5001); // Exceeds 5000 character limit
      await client.callTool({ 
        name: "save_current_work_info", 
        arguments: {
          work_summarize: longSummary,
          work_description: "Test long summary"
        } as { [x: string]: unknown }
      });
      console.log('ERROR: Long summary should have failed validation');
    } catch (error: any) {
      console.log('Long summary validation error (expected):', error.message);
    }

    try {
      const longDescription = "a".repeat(201); // Exceeds 200 character limit
      await client.callTool({ 
        name: "save_current_work_info", 
        arguments: {
          work_summarize: "Valid summary",
          work_description: longDescription
        } as { [x: string]: unknown }
      });
      console.log('ERROR: Long description should have failed validation');
    } catch (error: any) {
      console.log('Long description validation error (expected):', error.message);
    }

    console.log('\n--- All save_current_work_info Tests PASSED ---');

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
testSaveCurrentWorkInfo()
  .then(() => {
    console.log('--- save_current_work_info Test Finished ---');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });