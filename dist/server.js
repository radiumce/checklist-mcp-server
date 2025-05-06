"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
// In-memory store for tasks, keyed by sessionId
const taskStore = new Map();
async function main() {
    // Create an MCP server instance
    const server = new mcp_js_1.McpServer({
        name: "checklist-mcp-server",
        version: "1.0.0"
    });
    // --- Tool Definitions ---
    // 1. save_tasks tool
    const saveTasksInputSchema = zod_1.z.object({
        sessionId: zod_1.z.string().min(1, "sessionId cannot be empty"),
        tasks: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string().min(1, "Task ID cannot be empty"),
            name: zod_1.z.string().min(1, "Task name cannot be empty"),
            description: zod_1.z.string()
            // Status will be added internally as 'TODO'
        })).min(1, "Tasks array cannot be empty")
    });
    server.tool("save_tasks", saveTasksInputSchema.shape, async ({ sessionId, tasks }) => {
        // Explicitly type 'task' in map function
        const tasksWithStatus = tasks.map((task) => ({
            ...task,
            status: 'TODO'
        }));
        taskStore.set(sessionId, tasksWithStatus);
        console.log(`[${sessionId}] Saved ${tasksWithStatus.length} tasks.`);
        return {
            content: [{ type: "text", text: `Successfully saved ${tasksWithStatus.length} tasks for session ${sessionId}.` }]
        };
    });
    // 2. check_task tool
    const checkTaskInputSchema = zod_1.z.object({
        sessionId: zod_1.z.string().min(1, "sessionId cannot be empty"),
        taskId: zod_1.z.string().min(1, "taskId cannot be empty")
    });
    server.tool("check_task", checkTaskInputSchema.shape, async ({ sessionId, taskId }) => {
        const sessionTasks = taskStore.get(sessionId);
        if (!sessionTasks) {
            return {
                content: [{ type: "text", text: `Error: No tasks found for session ${sessionId}.` }]
            };
        }
        const taskIndex = sessionTasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) {
            return {
                content: [{ type: "text", text: `Error: Task with ID ${taskId} not found in session ${sessionId}.` }]
            };
        }
        if (sessionTasks[taskIndex].status === 'DONE') {
            return {
                content: [{ type: "text", text: `Task ${taskId} in session ${sessionId} is already marked as DONE.` }]
            };
        }
        sessionTasks[taskIndex].status = 'DONE';
        taskStore.set(sessionId, sessionTasks); // Update the store
        console.log(`[${sessionId}] Marked task ${taskId} as DONE.`);
        return {
            content: [{ type: "text", text: `Successfully marked task ${taskId} as DONE for session ${sessionId}.` }]
        };
    });
    // 3. get_all_tasks tool
    const getAllTasksInputSchema = zod_1.z.object({
        sessionId: zod_1.z.string().min(1, "sessionId cannot be empty")
    });
    server.tool("get_all_tasks", getAllTasksInputSchema.shape, async ({ sessionId }) => {
        const sessionTasks = taskStore.get(sessionId);
        if (!sessionTasks || sessionTasks.length === 0) {
            return {
                content: [{ type: "text", text: `No tasks found for session ${sessionId}.` }]
            };
        }
        // Format the output nicely
        const taskListText = sessionTasks.map(task => `- [${task.status === 'DONE' ? 'x' : ' '}] ${task.id}: ${task.name} (${task.description})`).join('\n');
        console.log(`[${sessionId}] Retrieved ${sessionTasks.length} tasks.`);
        return {
            content: [
                { type: "text", text: `Tasks for session ${sessionId}:\n${taskListText}` }
            ]
        };
    });
    // --- Server Connection ---
    // Create the Stdio transport
    const transport = new stdio_js_1.StdioServerTransport();
    // Connect the server to the transport and start listening
    console.log("Checklist MCP Server starting in stdio mode...");
    await server.connect(transport);
    // 移除此处的 "stopped" 消息，因为服务器应该持续运行
}
main().catch(err => {
    console.error("Server encountered an error:", err);
    console.log("Checklist MCP Server stopped due to an error.");
    process.exit(1);
});
