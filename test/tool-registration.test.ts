#!/usr/bin/env node
/**
 * Test to verify tool registration
 * Checks that get_recent_works_info tool is properly registered
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

// Path to the compiled server script
const serverScriptPath = path.resolve(__dirname, '../dist/mcp-server.js');
const serverCommand = 'node';
const serverArgs = [serverScriptPath];

async function testToolRegistration() {
  console.log('--- Testing Tool Registration ---');

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
    console.log('Connected successfully.');

    // List available tools
    const toolsResult = await client.listTools();
    console.log('Available tools:', toolsResult.tools.map(t => t.name));

    // Check if get_recent_works_info is registered
    const hasGetRecentWorksInfo = toolsResult.tools.some(tool => tool.name === 'get_recent_works_info');
    if (!hasGetRecentWorksInfo) {
      throw new Error('get_recent_works_info tool is not registered');
    }

    console.log('✓ get_recent_works_info tool is properly registered');

    // Check if save_current_work_info is still registered
    const hasSaveCurrentWorkInfo = toolsResult.tools.some(tool => tool.name === 'save_current_work_info');
    if (!hasSaveCurrentWorkInfo) {
      throw new Error('save_current_work_info tool is not registered');
    }

    console.log('✓ save_current_work_info tool is properly registered');

    console.log('--- Tool Registration Test PASSED ---');

  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    // Clean up
    await client.close();
  }
}

testToolRegistration()
  .then(() => {
    console.log('--- Tool Registration Test Finished ---');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });