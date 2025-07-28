#!/usr/bin/env node
/**
 * Test for get_recent_works_info MCP tool
 * Tests the implementation of the get_recent_works_info tool functionality
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

async function testGetRecentWorksInfo() {
  console.log('--- Starting get_recent_works_info Tests ---');

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
    await client.connect(transport);

    // Test 1: Get recent works from empty cache
    console.log('\nTesting get_recent_works_info with empty cache...');
    const emptyResult = await client.callTool({ 
      name: "get_recent_works_info", 
      arguments: {} as { [x: string]: unknown }
    }) as ToolSuccessResponse;

    console.log('Empty cache result:', JSON.stringify(emptyResult, null, 2));
    
    // Parse the response to verify it's valid JSON with empty works array
    const emptyResponse = JSON.parse(emptyResult.content[0].text);
    if (!emptyResponse.works || !Array.isArray(emptyResponse.works) || emptyResponse.works.length !== 0) {
      throw new Error('Empty cache should return empty works array');
    }
    console.log('✓ Empty cache test passed');

    // Test 2: Add some work info entries and test retrieval
    console.log('\nAdding work info entries...');
    
    // Add first work info
    const work1Result = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "First work summary for testing recent works retrieval",
        work_description: "First test work"
      } as { [x: string]: unknown }
    }) as ToolSuccessResponse;
    console.log('Added first work:', work1Result.content[0].text);

    // Add second work info
    const work2Result = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "Second work summary for testing recent works retrieval",
        work_description: "Second test work"
      } as { [x: string]: unknown }
    }) as ToolSuccessResponse;
    console.log('Added second work:', work2Result.content[0].text);

    // Add third work info
    const work3Result = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "Third work summary for testing recent works retrieval",
        work_description: "Third test work"
      } as { [x: string]: unknown }
    }) as ToolSuccessResponse;
    console.log('Added third work:', work3Result.content[0].text);

    // Test 3: Get recent works with entries
    console.log('\nTesting get_recent_works_info with entries...');
    const worksResult = await client.callTool({ 
      name: "get_recent_works_info", 
      arguments: {} as { [x: string]: unknown }
    }) as ToolSuccessResponse;

    console.log('Recent works result:', JSON.stringify(worksResult, null, 2));
    
    // Parse and validate the response
    const worksResponse = JSON.parse(worksResult.content[0].text);
    if (!worksResponse.works || !Array.isArray(worksResponse.works)) {
      throw new Error('Response should contain works array');
    }

    if (worksResponse.works.length !== 3) {
      throw new Error(`Expected 3 works, got ${worksResponse.works.length}`);
    }

    // Verify each work entry has required fields
    for (const work of worksResponse.works) {
      if (!work.workId || !work.work_timestamp || !work.work_description) {
        throw new Error('Each work entry should have workId, work_timestamp, and work_description');
      }
      
      // Verify workId is 8-digit numeric string
      if (!/^\d{8}$/.test(work.workId)) {
        throw new Error(`Invalid workId format: ${work.workId}`);
      }
    }

    // Verify ordering (most recent first - should be Third, Second, First)
    if (worksResponse.works[0].work_description !== "Third test work") {
      throw new Error('Works should be ordered by most recently used first');
    }
    if (worksResponse.works[1].work_description !== "Second test work") {
      throw new Error('Second work should be in second position');
    }
    if (worksResponse.works[2].work_description !== "First test work") {
      throw new Error('First work should be in third position');
    }

    console.log('✓ Recent works retrieval test passed');

    // Test 4: Test LRU ordering by adding another work
    console.log('\nTesting LRU ordering by adding another work...');
    
    // Add a fourth work info
    const work4Result = await client.callTool({ 
      name: "save_current_work_info", 
      arguments: {
        work_summarize: "Fourth work summary for testing LRU ordering",
        work_description: "Fourth test work"
      } as { [x: string]: unknown }
    }) as ToolSuccessResponse;
    console.log('Added fourth work:', work4Result.content[0].text);

    // Now get recent works again - fourth work should be at the top
    const reorderedResult = await client.callTool({ 
      name: "get_recent_works_info", 
      arguments: {} as { [x: string]: unknown }
    }) as ToolSuccessResponse;

    const reorderedResponse = JSON.parse(reorderedResult.content[0].text);
    if (reorderedResponse.works.length !== 4) {
      throw new Error(`Expected 4 works after adding fourth, got ${reorderedResponse.works.length}`);
    }
    if (reorderedResponse.works[0].work_description !== "Fourth test work") {
      throw new Error('Fourth work should be at the top after being added');
    }

    console.log('✓ LRU ordering test passed');

    console.log('\n--- All get_recent_works_info Tests PASSED ---');

  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    // Clean up
    await client.close();
  }
}

testGetRecentWorksInfo()
  .then(() => {
    console.log('--- get_recent_works_info Test Finished ---');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });