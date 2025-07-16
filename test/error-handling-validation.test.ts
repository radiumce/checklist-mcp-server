import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import assert from 'assert';

const serverScriptPath = path.resolve(__dirname, '../dist/server.js');
const serverCommand = 'node';
const serverArgs = [serverScriptPath];

interface TextContentItem {
    type: 'text';
    text: string;
}

interface ToolSuccessResponse {
    content: TextContentItem[];
}

async function runErrorHandlingTests() {
    let client: Client | null = null;
    let transport: StdioClientTransport | null = null;

    try {
        console.log('--- Starting Error Handling Validation Tests ---');

        transport = new StdioClientTransport({
            command: serverCommand,
            args: serverArgs,
        });

        client = new Client({
            name: 'error-handling-test-client',
            version: '1.0.0',
        });

        await client.connect(transport);
        console.log('Connected successfully.');

        // Test 1: Invalid session ID format
        console.log("Testing invalid session ID format...");
        const invalidSessionResult = await client.callTool({ 
            name: 'get_all_tasks', 
            arguments: { sessionId: "invalid@session!" } as unknown as { [x: string]: unknown }
        });
        const invalidSessionText = (invalidSessionResult as ToolSuccessResponse).content[0].text;
        console.log(`Invalid session response: ${invalidSessionText}`);
        assert(invalidSessionText.includes("Session ID can only contain alphanumeric characters"), "Should validate session ID format");
        console.log("Invalid session ID format test PASSED.");

        // Test 2: Empty session ID (handled by Zod schema validation)
        console.log("Testing empty session ID...");
        try {
            await client.callTool({ 
                name: 'get_all_tasks', 
                arguments: { sessionId: "" } as unknown as { [x: string]: unknown }
            });
            assert(false, "Should have thrown an error for empty session ID");
        } catch (error: any) {
            console.log(`Empty session error (expected): ${error.message}`);
            assert(error.message.includes("sessionId cannot be empty"), "Should validate empty session ID");
            console.log("Empty session ID test PASSED.");
        }

        // Test 3: Invalid task data structure
        console.log("Testing invalid task data structure...");
        const invalidTaskResult = await client.callTool({ 
            name: 'update_tasks', 
            arguments: { 
                sessionId: "test-session", 
                path: "/",
                tasks: [{ taskId: "ab", description: "Too short ID" }] // Invalid: taskId too short
            } as unknown as { [x: string]: unknown }
        });
        const invalidTaskText = (invalidTaskResult as ToolSuccessResponse).content[0].text;
        console.log(`Invalid task data response: ${invalidTaskText}`);
        assert(invalidTaskText.includes("Task 'taskId' format is invalid"), "Should validate task ID format");
        console.log("Invalid task data structure test PASSED.");

        // Test 4: Duplicate task IDs
        console.log("Testing duplicate task IDs...");
        const duplicateTaskResult = await client.callTool({ 
            name: 'update_tasks', 
            arguments: { 
                sessionId: "test-session-2", 
                path: "/",
                tasks: [
                    { taskId: "task1", description: "First task" },
                    { taskId: "task1", description: "Duplicate task" }
                ]
            } as unknown as { [x: string]: unknown }
        });
        const duplicateTaskText = (duplicateTaskResult as ToolSuccessResponse).content[0].text;
        console.log(`Duplicate task response: ${duplicateTaskText}`);
        assert(duplicateTaskText.includes("Duplicate task ID 'task1'"), "Should detect duplicate task IDs");
        console.log("Duplicate task IDs test PASSED.");

        // Test 5: Invalid path format
        console.log("Testing invalid path format...");
        const invalidPathResult = await client.callTool({ 
            name: 'update_tasks', 
            arguments: { 
                sessionId: "test-session-3", 
                path: "/invalid//path",  // Double slashes
                tasks: [{ taskId: "task1", description: "Test task" }]
            } as unknown as { [x: string]: unknown }
        });
        const invalidPathText = (invalidPathResult as ToolSuccessResponse).content[0].text;
        console.log(`Invalid path response: ${invalidPathText}`);
        assert(invalidPathText.includes("Path cannot contain consecutive slashes"), "Should validate path format");
        console.log("Invalid path format test PASSED.");

        console.log('--- All Error Handling Tests PASSED ---');

    } catch (error) {
        console.error('--- Error Handling Test FAILED ---');
        console.error(error);
        process.exitCode = 1;
    } finally {
        if (transport) {
            console.log('Closing transport...');
            await transport.close();
            console.log('Transport closed.');
        }
        console.log('--- Error Handling Test Finished ---');
    }
}

runErrorHandlingTests();