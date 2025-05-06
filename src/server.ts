import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import crypto from 'crypto'; // Import crypto for UUID generation

// Define the Task structure
interface Task {
  id: string;
  name: string;
  description: string;
  status: 'TODO' | 'DONE';
}

// In-memory store for tasks, keyed by sessionId
const taskStore: Map<string, Task[]> = new Map();

async function main() {
  // Create an MCP server instance
  const server = new McpServer({
    name: "checklist-mcp-server",
    version: "1.0.0"
  });

  // --- Tool Definitions ---

  // 1. save_tasks tool
  const saveTasksInputSchema = z.object({
    // Make sessionId optional
    sessionId: z.string().optional(),
    tasks: z.array(z.object({
        id: z.string().min(1, "Task ID cannot be empty"),
        name: z.string().min(1, "Task name cannot be empty"),
        description: z.string()
        // Status will be added internally as 'TODO'
    })).min(1, "Tasks array cannot be empty")
  });

  // Define the type inferred from the schema
  type SaveTasksInput = z.infer<typeof saveTasksInputSchema>;

  server.tool("save_tasks", 
    "Saves or replaces a list of tasks for a given session. Tasks are initialized with 'TODO' status. If 'sessionId' is omitted or empty, a new session is created and its ID is returned. Otherwise, the tasks for the existing session are overwritten.",
     saveTasksInputSchema.shape, async ({ sessionId: inputSessionId, tasks }: SaveTasksInput) => {
    let usedSessionId = inputSessionId;
    
    // If sessionId is empty or not provided, generate a new one
    if (!usedSessionId) {
      usedSessionId = crypto.randomUUID();
      console.log(`[New Session] Generated new sessionId: ${usedSessionId}`);
    }

    // Explicitly type 'task' in map function
    const tasksWithStatus: Task[] = tasks.map((task: { id: string; name: string; description: string }) => ({ 
        ...task, 
        status: 'TODO' 
    }));
    
    taskStore.set(usedSessionId, tasksWithStatus);
    console.log(`[${usedSessionId}] Saved ${tasksWithStatus.length} tasks.`);
    return {
      // Return the used sessionId in the response
      content: [{ type: "text", text: `Successfully saved ${tasksWithStatus.length} tasks for session ${usedSessionId}.` }]
    };
  });

  // 2. check_task tool
  const checkTaskInputSchema = z.object({
      sessionId: z.string().min(1, "sessionId cannot be empty"),
      taskId: z.string().min(1, "taskId cannot be empty")
  });

  // Define the type inferred from the schema
  type CheckTaskInput = z.infer<typeof checkTaskInputSchema>;

  server.tool("check_task", 
    "Marks a specific task as 'DONE' within a session. Requires the 'sessionId' and the 'taskId' of the task to be marked. Returns the full updated list of tasks for the session.", 
    checkTaskInputSchema.shape, async ({ sessionId, taskId }: CheckTaskInput) => {
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

    // Format the updated task list for the response
    const updatedTaskListText = sessionTasks.map(task => 
        `- [${task.status === 'DONE' ? 'x' : ' '}] ${task.id}: ${task.name} (${task.description})`
    ).join('\n');

    return {
      content: [
          { type: "text", text: `Successfully marked task ${taskId} as DONE for session ${sessionId}.` },
          { type: "text", text: `Current tasks for session ${sessionId}:\n${updatedTaskListText}` }
      ]
    };
  });

  // 3. get_all_tasks tool
  const getAllTasksInputSchema = z.object({
      sessionId: z.string().min(1, "sessionId cannot be empty")
  });

  // Define the type inferred from the schema
  type GetAllTasksInput = z.infer<typeof getAllTasksInputSchema>;

  server.tool("get_all_tasks", 
    "Retrieves the complete list of tasks and their current status ('TODO' or 'DONE') for the specified 'sessionId'.", 
    getAllTasksInputSchema.shape, async ({ sessionId }: GetAllTasksInput) => {
    const sessionTasks = taskStore.get(sessionId);
    if (!sessionTasks || sessionTasks.length === 0) {
      return {
        content: [{ type: "text", text: `No tasks found for session ${sessionId}.` }]
      };
    }

    // Format the output nicely
    const taskListText = sessionTasks.map(task => 
        `- [${task.status === 'DONE' ? 'x' : ' '}] ${task.id}: ${task.name} (${task.description})`
    ).join('\n');

    console.log(`[${sessionId}] Retrieved ${sessionTasks.length} tasks.`);
    return {
      content: [
        { type: "text", text: `Tasks for session ${sessionId}:\n${taskListText}` }
      ]
    };
  });

  // --- Server Connection ---

  // Create the Stdio transport
  const transport = new StdioServerTransport();

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
