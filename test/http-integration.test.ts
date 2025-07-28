import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { spawn, ChildProcess } from 'child_process';
import assert from 'assert';
import { createTestTasks } from '../src/test-utils/testHelpers';

class HttpIntegrationTestSuite {
  private serverProcess: ChildProcess | null = null;
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private testResults: { name: string; passed: boolean; error?: string }[] = [];

  async setup() {
    console.log('🚀 Setting up HTTP Integration Test Suite');
    console.log('=====================================');

    return new Promise<void>((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'start:http'], { cwd: process.cwd(), stdio: 'pipe' });

      this.serverProcess.stdout?.on('data', (data) => {
        console.log(`Server: ${data}`);
        if (data.toString().includes('Checklist MCP HTTP server running on port 8585')) {
          // Add a delay to prevent a race condition where the client connects before the server is ready.
          setTimeout(() => {
            console.log('✅ Server started, initializing client...');
            this.transport = new StreamableHTTPClientTransport(new URL('http://localhost:8585/mcp'));
            this.client = new Client({
              name: 'http-integration-test-client',
              version: '1.0.0',
            });
            this.client.connect(this.transport).then(resolve).catch(reject);
          }, 1000); // 1-second delay
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        console.error(`Server Error: ${data}`);
      });

      this.serverProcess.on('error', (err) => {
        console.error('Failed to start server process:', err);
        reject(err);
      });
    });
  }

  async cleanup() {
    if (this.transport) {
      await this.transport.close();
      console.log('✅ Transport closed');
    }
    if (this.serverProcess) {
      this.serverProcess.kill('SIGINT');
      console.log('✅ Server stopped');
    }
  }

  private recordTest(name: string, passed: boolean, error?: string) {
    this.testResults.push({ name, passed, error });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
    if (error && !passed) {
      console.log(`   Error: ${error}`);
    }
  }

  async testUpdateTasks() {
    const testName = 'update_tasks over HTTP';
    try {
      assert(this.client, 'Client not initialized');
      const sessionId = 'http-test-session';
      const tasks = createTestTasks([{ description: 'Test HTTP transport', status: 'TODO' }]);

      const result = await this.client.callTool({
        name: 'update_tasks',
        arguments: {
          sessionId,
          path: '/',
          tasks,
        },
      });

      assert(result.content && Array.isArray(result.content), 'Response should have a content array');
      assert.strictEqual(result.content.length, 2, 'Should receive two content parts');
      const responseText = result.content[0].text as string;
      assert(responseText.includes('Successfully updated 1 tasks'), 'Success message not found');
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error instanceof Error ? error.message : String(error));
    }
  }

    async testGetAllTasks() {
    const testName = 'get_all_tasks over HTTP';
    try {
      assert(this.client, 'Client not initialized');
      const sessionId = 'http-get-all-tasks-test';
      const tasks = createTestTasks([{ description: 'Task 1 for get', status: 'TODO' }]);
      await this.client.callTool({
        name: 'update_tasks',
        arguments: { sessionId, path: '/', tasks },
      });

      const result = await this.client.callTool({
        name: 'get_all_tasks',
        arguments: { sessionId },
      });

      assert(result.content && Array.isArray(result.content), 'Response should have a content array');
      const responseText = result.content[0].text as string;
      assert(responseText.includes('Task 1 for get'), 'Response should contain the task description');
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error instanceof Error ? error.message : String(error));
    }
  }

  async testMarkTaskAsDone() {
    const testName = 'mark_task_as_done over HTTP';
    try {
      assert(this.client, 'Client not initialized');
      const sessionId = 'http-mark-done-test';
      const tasks = createTestTasks([{ description: 'Task to be marked as done', status: 'TODO' }]);
      const taskId = tasks[0].taskId;

      await this.client.callTool({
        name: 'update_tasks',
        arguments: { sessionId, path: '/', tasks },
      });

      const result = await this.client.callTool({
        name: 'mark_task_as_done',
        arguments: { sessionId, taskId },
      });

      assert(result.content && Array.isArray(result.content), 'Response should have a content array');
      assert.strictEqual(result.content.length, 2, 'Should receive two content parts');
      const responseText = result.content[0].text as string;
      assert(responseText.includes(`Task '${taskId}' marked as DONE`), 'Success message not found');
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error instanceof Error ? error.message : String(error));
    }
  }

  async runAllTests() {
    console.log('\n🧪 Running HTTP Integration Tests');
    console.log('==========================================');
    await this.testUpdateTasks();
    await this.testGetAllTasks();
    await this.testMarkTaskAsDone();
    console.log('\n📊 HTTP Test Results Summary');
    console.log('===================================');
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.name}`);
      if (!result.passed && result.error) {
        console.log(`   └─ ${result.error}`);
      }
    });
    const failedTests = this.testResults.filter(r => !r.passed).length;
    console.log(`\nTotal Tests: ${this.testResults.length}`);
    console.log(`Passed: ${this.testResults.length - failedTests}`);
    console.log(`Failed: ${failedTests}`);
    if (failedTests > 0) {
      console.log('\n❌ Some HTTP integration tests failed');
      process.exit(1);
    } else {
      console.log('\n🎉 All HTTP integration tests passed!');
    }
  }
}

(async () => {
  const testSuite = new HttpIntegrationTestSuite();
  try {
    await testSuite.setup();
    await testSuite.runAllTests();
  } catch (error) {
    console.error('An error occurred during test execution:', error);
    process.exit(1);
  } finally {
    await testSuite.cleanup();
  }
})();

