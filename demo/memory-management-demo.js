#!/usr/bin/env node

/**
 * Memory Management Demo
 * Demonstrates the LRU session management functionality
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');

console.log('🚀 Session Memory Management Demo');
console.log('=====================================\n');

async function runDemo() {
  // Set up transport with a very small session limit for demo purposes
  const serverScriptPath = path.resolve(__dirname, '../dist/mcp-server.js');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverScriptPath],
    env: { ...process.env, MAX_SESSIONS: '2' } // Very small limit for demo
  });

  const client = new Client({
    name: 'memory-demo-client',
    version: '1.0.0',
  });

  try {
    console.log('📡 Connecting to server with MAX_SESSIONS=2...');
    await client.connect(transport);
    console.log('✅ Connected successfully\n');

    // Demo 1: Create sessions within limit
    console.log('📝 Demo 1: Creating sessions within limit');
    console.log('------------------------------------------');
    
    for (let i = 1; i <= 2; i++) {
      const sessionId = `demo-session-${i}`;
      await client.callTool({
        name: 'update_tasks',
        arguments: {
          sessionId,
          tasks: [
            {
              taskId: `task-${i}`,
              description: `Task for session ${i}`,
              status: 'TODO'
            }
          ]
        }
      });
      console.log(`✅ Created session: ${sessionId}`);
    }

    // Verify both sessions exist
    console.log('\n🔍 Verifying sessions exist:');
    for (let i = 1; i <= 2; i++) {
      const sessionId = `demo-session-${i}`;
      const result = await client.callTool({
        name: 'get_all_tasks',
        arguments: { sessionId }
      });
      const hasContent = !result.content[0].text.includes('No tasks found');
      console.log(`   ${sessionId}: ${hasContent ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    }

    // Demo 2: Trigger LRU eviction
    console.log('\n📝 Demo 2: Triggering LRU eviction');
    console.log('-----------------------------------');
    console.log('Adding a 3rd session (should evict demo-session-1)...');
    
    await client.callTool({
      name: 'update_tasks',
      arguments: {
        sessionId: 'demo-session-3',
        tasks: [
          {
            taskId: 'task-3',
            description: 'Task for session 3',
            status: 'TODO'
          }
        ]
      }
    });
    console.log('✅ Created session: demo-session-3');

    // Check which sessions still exist
    console.log('\n🔍 Checking session status after eviction:');
    for (let i = 1; i <= 3; i++) {
      const sessionId = `demo-session-${i}`;
      const result = await client.callTool({
        name: 'get_all_tasks',
        arguments: { sessionId }
      });
      const hasContent = !result.content[0].text.includes('No tasks found');
      const status = hasContent ? '✅ EXISTS' : '❌ EVICTED';
      console.log(`   ${sessionId}: ${status}`);
    }

    // Demo 3: LRU access order
    console.log('\n📝 Demo 3: Testing LRU access order');
    console.log('------------------------------------');
    console.log('Accessing demo-session-2 to make it most recent...');
    
    await client.callTool({
      name: 'get_all_tasks',
      arguments: { sessionId: 'demo-session-2' }
    });
    console.log('✅ Accessed demo-session-2');

    console.log('Adding demo-session-4 (should evict demo-session-3, not demo-session-2)...');
    await client.callTool({
      name: 'update_tasks',
      arguments: {
        sessionId: 'demo-session-4',
        tasks: [
          {
            taskId: 'task-4',
            description: 'Task for session 4',
            status: 'TODO'
          }
        ]
      }
    });
    console.log('✅ Created session: demo-session-4');

    // Final status check
    console.log('\n🔍 Final session status:');
    for (let i = 1; i <= 4; i++) {
      const sessionId = `demo-session-${i}`;
      const result = await client.callTool({
        name: 'get_all_tasks',
        arguments: { sessionId }
      });
      const hasContent = !result.content[0].text.includes('No tasks found');
      const status = hasContent ? '✅ EXISTS' : '❌ EVICTED';
      console.log(`   ${sessionId}: ${status}`);
    }

    console.log('\n🎉 Demo completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   • Memory usage is limited to MAX_SESSIONS (2 in this demo)');
    console.log('   • LRU algorithm keeps most recently used sessions');
    console.log('   • Accessing a session updates its position in LRU order');
    console.log('   • Older sessions are automatically evicted when limit is reached');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  } finally {
    console.log('\n🧹 Cleaning up...');
    await transport.close();
    console.log('✅ Demo finished');
  }
}

// Run the demo
runDemo()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Demo failed:', error);
    process.exit(1);
  });