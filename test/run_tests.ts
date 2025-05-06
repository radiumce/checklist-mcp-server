import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import assert from 'assert'; // Using Node's built-in assert module

// Path to the compiled server script
// Ensure the server is compiled (e.g., using `npm run build`) before running tests.
const serverScriptPath = path.resolve(__dirname, '../dist/server.js');
const serverCommand = 'node';
const serverArgs = [serverScriptPath];

// Interfaces based on server Zod schemas
interface TaskInput {
  id: string;
  name: string;
  description: string;
}

interface SaveTasksInputParams {
  sessionId?: string; // Optional session ID for saving
  tasks: TaskInput[];
}

interface CheckTaskInputParams {
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

        // 3. Test 'save_tasks' (create new session)
        console.log("Testing 'save_tasks' (new session)...");
        const initialTasks: TaskInput[] = [
            { id: "1", name: "Task 1", description: "First thing to do" },
            { id: "2", name: "Task 2", description: "Second thing to do" },
        ];
        const saveParams: SaveTasksInputParams = { tasks: initialTasks };
        const saveResult = await client.callTool({ name: 'save_tasks', arguments: saveParams as unknown as { [x: string]: unknown } });

        // Basic check - Ideally, the server tool should return the sessionId
        // For now, we assume the text contains it or we need to modify the server tool.
        // Extract session ID - VERY brittle, depends on exact server output format.
        const saveResultText = (saveResult as ToolSuccessResponse).content[0].text;
        console.log(`save_tasks response: ${saveResultText}`);
        const sessionMatch = saveResultText.match(/session ([a-f0-9\-]+)/);
        assert(sessionMatch && sessionMatch[1], "Could not extract session ID from save_tasks response");
        sessionId = sessionMatch[1];
        console.log(`Session ID created: ${sessionId}`);
        assert(saveResultText.includes(`Successfully saved ${initialTasks.length} tasks`), "Save task response message mismatch");
        console.log("'save_tasks' (new session) test PASSED.");

        // 4. Test 'get_all_tasks'
        console.log("Testing 'get_all_tasks'...");
        assert(sessionId, "Session ID must be set before getting tasks");
        const getParams1: GetAllTasksInputParams = { sessionId };
        const getResult1 = await client.callTool({ name: 'get_all_tasks', arguments: getParams1 as unknown as { [x: string]: unknown } });
        const getTasksText1 = (getResult1 as ToolSuccessResponse).content[0].text;
        console.log(`get_all_tasks response:\n${getTasksText1}`);
        assert(getTasksText1.includes("Task 1"), "Task 1 not found in initial get_all_tasks");
        assert(getTasksText1.includes("Task 2"), "Task 2 not found in initial get_all_tasks");
        assert(getTasksText1.includes("- [ ] 1: Task 1 (First thing to do)"), "Task 1 format/status incorrect");
        assert(getTasksText1.includes("- [ ] 2: Task 2 (Second thing to do)"), "Task 2 format/status incorrect");
        console.log("'get_all_tasks' (initial) test PASSED.");

        // 5. Test 'check_task'
        console.log("Testing 'check_task'...");
        assert(sessionId, "Session ID must be set before checking task");
        const checkParams: CheckTaskInputParams = { sessionId, taskId: "1" };
        const checkResult = await client.callTool({ name: 'check_task', arguments: checkParams as unknown as { [x: string]: unknown } }); // Mark Task 1 (ID '1') as DONE
        const checkTaskText = (checkResult as ToolSuccessResponse).content[0].text;
        console.log(`check_task response:\n${checkTaskText}`);
        assert(checkTaskText.includes(`Successfully marked task ${checkParams.taskId} as DONE`), "Check task confirmation message mismatch");
        console.log("'check_task' test PASSED.");

        // 6. Test 'get_all_tasks' again after check
        console.log("Testing 'get_all_tasks' (after check)...");
        assert(sessionId, "Session ID must be set before getting tasks again");
        const getParams2: GetAllTasksInputParams = { sessionId };
        const getResult2 = await client.callTool({ name: 'get_all_tasks', arguments: getParams2 as unknown as { [x: string]: unknown } });
        const getTasksText2 = (getResult2 as ToolSuccessResponse).content[0].text;
        console.log(`get_all_tasks response:\n${getTasksText2}`);
        assert(getTasksText2.includes("- [x] 1: Task 1 (First thing to do)"), "Task 1 should be DONE in final get_all_tasks");
        assert(getTasksText2.includes("- [ ] 2: Task 2 (Second thing to do)"), "Task 2 should still be TODO in final get_all_tasks");
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

        // 8. Test invalid task ID for check_task
        console.log("Testing 'check_task' (invalid task ID)...");
        assert(sessionId, "Session ID must be set before checking invalid task");
        const invalidTaskId = "999";
        const checkInvalidParams: CheckTaskInputParams = { sessionId, taskId: invalidTaskId };
        const checkInvalidResult = await client.callTool({ name: 'check_task', arguments: checkInvalidParams as unknown as { [x: string]: unknown } });
        const checkInvalidText = (checkInvalidResult as ToolSuccessResponse).content[0].text;
        console.log(`check_task (invalid task) response: ${checkInvalidText}`);
        assert(checkInvalidText.includes(`Error: Task with ID ${invalidTaskId} not found`), "Expected error message for invalid task ID");
        console.log("'check_task' (invalid task ID) test PASSED.");

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
