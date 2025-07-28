import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import assert from 'assert';

const serverScriptPath = path.resolve(__dirname, '../dist/mcp-server.js');
const serverCommand = 'node';
const serverArgs = [serverScriptPath];

interface TaskInput {
  taskId: string;
  description: string;
  status?: 'TODO' | 'DONE';
  children?: TaskInput[];
}

interface TextContentItem {
    type: 'text';
    text: string;
}

interface ToolSuccessResponse {
    content: TextContentItem[];
}

async function testHierarchicalTreeFormatting() {
    let client: Client | null = null;
    let transport: StdioClientTransport | null = null;

    try {
        console.log('--- Testing Hierarchical Tree Formatting ---');

        transport = new StdioClientTransport({
            command: serverCommand,
            args: serverArgs,
        });

        client = new Client({
            name: 'hierarchical-tree-test-client',
            version: '1.0.0',
        });

        await client.connect(transport);
        console.log('Connected successfully.');

        const sessionId = "hierarchical-tree-test";
        
        // Create hierarchical tasks
        const hierarchicalTasks: TaskInput[] = [
            {
                taskId: "auth1",
                description: "Authentication system",
                status: "TODO",
                children: [
                    { taskId: "db1", description: "Database schema", status: "DONE" },
                    {
                        taskId: "api1",
                        description: "API endpoints",
                        status: "TODO",
                        children: [
                            { taskId: "login1", description: "Login endpoint", status: "DONE" },
                            { taskId: "logout1", description: "Logout endpoint", status: "TODO" }
                        ]
                    }
                ]
            },
            { taskId: "ui1", description: "User interface", status: "TODO" }
        ];

        // Update tasks
        const updateResult = await client.callTool({ 
            name: 'update_tasks', 
            arguments: { 
                sessionId, 
                path: "/", 
                tasks: hierarchicalTasks 
            } as unknown as { [x: string]: unknown } 
        });

        console.log('Hierarchical tasks created successfully.');

        // Get all tasks and verify tree formatting
        const getResult = await client.callTool({ 
            name: 'get_all_tasks', 
            arguments: { sessionId } as unknown as { [x: string]: unknown } 
        });

        const treeOutput = (getResult as ToolSuccessResponse).content[0].text;
        console.log('Tree output:');
        console.log(treeOutput);

        // Verify tree structure
        assert(treeOutput.includes("├── ○ auth1: Authentication system"), "Root auth1 task not found");
        assert(treeOutput.includes("└── ○ ui1: User interface"), "Root ui1 task not found");
        assert(treeOutput.includes("│   ├── ✓ db1: Database schema"), "Child db1 task not found");
        assert(treeOutput.includes("│   └── ○ api1: API endpoints"), "Child api1 task not found");
        assert(treeOutput.includes("│       ├── ✓ login1: Login endpoint"), "Grandchild login1 task not found");
        assert(treeOutput.includes("│       └── ○ logout1: Logout endpoint"), "Grandchild logout1 task not found");

        console.log('--- Hierarchical Tree Formatting Test PASSED ---');

    } catch (error) {
        console.error('--- Test FAILED ---');
        console.error(error);
        process.exitCode = 1;
    } finally {
        if (transport) {
            await transport.close();
        }
    }
}

testHierarchicalTreeFormatting();