import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import assert from 'assert'; // Using Node's built-in assert module

// Path to the compiled server script
// Ensure the server is compiled (e.g., using `npm run build`) before running tests.
const serverScriptPath = path.resolve(__dirname, '../dist/mcp-server.js');
const serverCommand = 'node';
const serverArgs = [serverScriptPath];

// Interfaces based on server Zod schemas
interface TaskInput {
  taskId: string;
  description: string;
  status?: 'TODO' | 'DONE';
  children?: TaskInput[];
}

interface UpdateTasksInputParams {
  sessionId: string;
  path?: string; // Optional path, defaults to "/"
  tasks: TaskInput[];
}

interface MarkTaskAsDoneInputParams {
  sessionId: string;
  taskId: string;
}

interface GetAllTasksInputParams {
  sessionId: string;
}

// Expected structure of the response content field
interface TextContentItem {
    type: 'text';
    text: string;
}

// Basic expected structure of a successful tool response
interface ToolSuccessResponse {
    content: TextContentItem[];
    // The actual response might have more fields (mcp_version, status_code, etc.)
    // but we only need 'content' for type checking the result access.
}

async function runTests() {
    let client: Client | null = null;
    let transport: StdioClientTransport | null = null;
    let sessionId: string | null = null; // To store the session ID between calls

    try {
        console.log('--- Starting Checklist MCP Server Test ---');

        // 1. Initialize Client and Transport
        console.log(`Setting up client to connect to command: ${serverCommand} ${serverArgs.join(' ')}`);
        transport = new StdioClientTransport({
            command: serverCommand,
            args: serverArgs,
            // Optional: Add cwd if needed, defaults to process.cwd()
            // cwd: path.resolve(__dirname, '..')
        });

        client = new Client({
            name: 'checklist-test-client',
            version: '1.0.0',
            // Optional: Add logger for client-side debugging
            // logger: console
        });

        // 2. Connect to the server
        console.log('Connecting to server...');
        await client.connect(transport);
        console.log('Connected successfully.');

        // 3. Test 'update_tasks' (create new session)
        console.log("Testing 'update_tasks' (new session)...");
        sessionId = "test-session-123"; // Use a fixed session ID for testing
        const initialTasks: TaskInput[] = [
            { taskId: "task1", description: "First thing to do" },
            { taskId: "task2", description: "Second thing to do" },
        ];
        const updateParams: UpdateTasksInputParams = { 
            sessionId, 
            path: "/", 
            tasks: initialTasks 
        };
        const updateResult = await client.callTool({ name: 'update_tasks', arguments: updateParams as unknown as { [x: string]: unknown } });

        const updateResultText = (updateResult as ToolSuccessResponse).content[0].text;
        console.log(`update_tasks response: ${updateResultText}`);
        assert(updateResultText.includes(`Successfully updated ${initialTasks.length} tasks`), "Update task response message mismatch");
        assert(updateResultText.includes(`session ${sessionId}`), "Session ID not found in response");
        console.log("'update_tasks' (new session) test PASSED.");

        // 4. Test 'get_all_tasks'
        console.log("Testing 'get_all_tasks'...");
        assert(sessionId, "Session ID must be set before getting tasks");
        const getParams1: GetAllTasksInputParams = { sessionId };
        const getResult1 = await client.callTool({ name: 'get_all_tasks', arguments: getParams1 as unknown as { [x: string]: unknown } });
        const getTasksText1 = (getResult1 as ToolSuccessResponse).content[0].text;
        console.log(`get_all_tasks response:\n${getTasksText1}`);
        assert(getTasksText1.includes("task1"), "task1 not found in initial get_all_tasks");
        assert(getTasksText1.includes("task2"), "task2 not found in initial get_all_tasks");
        assert(getTasksText1.includes("○ task1: First thing to do"), "task1 format/status incorrect");
        assert(getTasksText1.includes("○ task2: Second thing to do"), "task2 format/status incorrect");
        console.log("'get_all_tasks' (initial) test PASSED.");

        // 5. Test 'mark_task_as_done'
        console.log("Testing 'mark_task_as_done'...");
        assert(sessionId, "Session ID must be set before checking task");
        const markParams: MarkTaskAsDoneInputParams = { sessionId, taskId: "task1" };
        const checkResult = await client.callTool({ name: 'mark_task_as_done', arguments: markParams as unknown as { [x: string]: unknown } }); // Mark task1 as DONE
        const checkTaskText = (checkResult as ToolSuccessResponse).content[0].text;
        console.log(`mark_task_as_done response: ${checkTaskText}`);
        assert(checkTaskText.includes(`Successfully marked task ${markParams.taskId} as DONE`), "Mark task as done confirmation message mismatch");
        console.log("'mark_task_as_done' test PASSED.");

        // 6. Test 'get_all_tasks' again after check
        console.log("Testing 'get_all_tasks' (after check)...");
        assert(sessionId, "Session ID must be set before getting tasks again");
        const getParams2: GetAllTasksInputParams = { sessionId };
        const getResult2 = await client.callTool({ name: 'get_all_tasks', arguments: getParams2 as unknown as { [x: string]: unknown } });
        const getTasksText2 = (getResult2 as ToolSuccessResponse).content[0].text;
        console.log(`get_all_tasks response:\n${getTasksText2}`);
        assert(getTasksText2.includes("✓ task1: First thing to do"), "task1 should be DONE in final get_all_tasks");
        assert(getTasksText2.includes("○ task2: Second thing to do"), "task2 should still be TODO in final get_all_tasks");
        console.log("'get_all_tasks' (after check) test PASSED.");

        // 7. Test invalid session ID for get_all_tasks
        console.log("Testing 'get_all_tasks' (invalid session)...");
        const invalidSessionId = "invalid-session-id";
        const getInvalidParams: GetAllTasksInputParams = { sessionId: invalidSessionId };
        const getInvalidResult = await client.callTool({ name: 'get_all_tasks', arguments: getInvalidParams as unknown as { [x: string]: unknown } });
        const getInvalidText = (getInvalidResult as ToolSuccessResponse).content[0].text;
        console.log(`get_all_tasks (invalid) response: ${getInvalidText}`);
        assert(getInvalidText.includes(`No tasks found for session ${invalidSessionId}`), "Expected error message for invalid session ID");
        console.log("'get_all_tasks' (invalid session) test PASSED.");

        // 8. Test invalid task ID format for mark_task_as_done
        console.log("Testing 'mark_task_as_done' (invalid task ID format)...");
        assert(sessionId, "Session ID must be set before checking invalid task");
        const invalidTaskId = "task/invalid"; // Use a taskid with forbidden character
        const markInvalidParams: MarkTaskAsDoneInputParams = { sessionId, taskId: invalidTaskId };
        const markInvalidResult = await client.callTool({ name: 'mark_task_as_done', arguments: markInvalidParams as unknown as { [x: string]: unknown } });
        const markInvalidText = (markInvalidResult as ToolSuccessResponse).content[0].text;
        console.log(`mark_task_as_done (invalid task) response: ${markInvalidText}`);
        assert(markInvalidText.includes(`Error: Task ID '${invalidTaskId}' has invalid format`), "Expected error message for invalid task ID format");
        console.log("'mark_task_as_done' (invalid task ID format) test PASSED.");

        console.log('--- All tests PASSED ---');

    } catch (error) {
        console.error('--- Test FAILED ---');
        console.error(error);
        process.exitCode = 1; // Indicate failure
    } finally {
        // Disconnect and cleanup by closing the transport
        if (transport) {
            console.log('Closing transport (terminating server process)...');
            // Assuming transport.close() is the correct method.
            // If this fails, the actual method might be different (e.g., disconnect).
            await transport.close(); 
            console.log('Transport closed.');
        } else if (client && (client as any).close) {
             // Fallback attempt if transport is null but client exists and might have a close method
             console.log('Transport not available, attempting client.close()...');
             await (client as any).close();
             console.log('Client closed (fallback).');
        }
         console.log('--- Test Finished ---');
     }
 }

// Run the tests
runTests();
