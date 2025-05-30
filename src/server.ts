import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import crypto from 'crypto'; // Import crypto for UUID generation
import pino from 'pino'; // Import pino

// Configure pino logger to write to stderr
const logger = pino({ level: 'info' }, pino.destination(2)); // 2 is stderr file descriptor

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
    // Log entry with request details
    logger.info({ tool: 'save_tasks', params: { inputSessionId, taskCount: tasks.length } }, 'Received save_tasks request');
    let usedSessionId = inputSessionId;
    
    // If sessionId is empty or not provided, generate a new one
    if (!usedSessionId) {
      usedSessionId = crypto.randomUUID();
      // Log new session creation
      logger.info({ sessionId: usedSessionId }, 'Generated new session ID');
    }

    // Explicitly type 'task' in map function
    const tasksWithStatus: Task[] = tasks.map((task: { id: string; name: string; description: string }) => ({ 
        ...task, 
        status: 'TODO' 
    }));
    
    taskStore.set(usedSessionId, tasksWithStatus);
    // Log successful save
    logger.info({ sessionId: usedSessionId, savedCount: tasksWithStatus.length }, 'Saved tasks successfully');
    return {
      // Return the used sessionId in the response
      content: [{ type: "text", text: `Successfully saved ${tasksWithStatus.length} tasks for session ${usedSessionId}, and always remember to mark each task as DONE after it's completed.` }]
    };
  });

  // 2. mark_task_as_done tool
  const markTaskAsDoneInputSchema = z.object({
      sessionId: z.string().min(1, "sessionId cannot be empty"),
      taskId: z.string().min(1, "taskId cannot be empty")
  });

  // Define the type inferred from the schema
  type MarkTaskAsDoneInput = z.infer<typeof markTaskAsDoneInputSchema>;

  server.tool("mark_task_as_done", 
    "Marks a specific task as 'DONE' within a session. Requires the 'sessionId' and the 'taskId' of the task to be marked. Returns the full updated list of tasks for the session.", 
    markTaskAsDoneInputSchema.shape, async ({ sessionId, taskId }: MarkTaskAsDoneInput) => {
    // Log entry with request details
    logger.info({ tool: 'mark_task_as_done', params: { sessionId, taskId } }, 'Received mark_task_as_done request');
    const sessionTasks = taskStore.get(sessionId);
    if (!sessionTasks) {
      // Log invalid sessionId error
      logger.error({ sessionId }, 'Invalid sessionId for mark_task_as_done');
      return {
        content: [{ type: "text", text: `Error: No tasks found for session ${sessionId}.` }]
      };
    }

    const taskIndex = sessionTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
        // Log invalid taskId error
        logger.error({ sessionId, taskId }, 'Invalid taskId for mark_task_as_done');
        return {
            content: [{ type: "text", text: `Error: Task with ID ${taskId} not found in session ${sessionId}.` }]
        };
    }
    
    if (sessionTasks[taskIndex].status === 'DONE') {
         // Log task already marked as DONE
         logger.warn({ sessionId, taskId }, 'Task already marked as DONE');
         return {
            content: [{ type: "text", text: `Task ${taskId} in session ${sessionId} is already marked as DONE.` }]
        };
    }

    sessionTasks[taskIndex].status = 'DONE';
    taskStore.set(sessionId, sessionTasks); // Update the store
    // Log successful marking
    logger.info({ sessionId, taskId }, 'Marked task as DONE');

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
    // Log entry with request details
    logger.info({ tool: 'get_all_tasks', params: { sessionId } }, 'Received get_all_tasks request');
    const sessionTasks = taskStore.get(sessionId);
    if (!sessionTasks || sessionTasks.length === 0) {
      // Log no tasks found or invalid sessionId
      logger.warn({ sessionId }, 'No tasks found or invalid sessionId for get_all_tasks');
      return {
        content: [{ type: "text", text: `No tasks found for session ${sessionId}.` }]
      };
    }

    // Format the output nicely
    const taskListText = sessionTasks.map(task => 
        `- [${task.status === 'DONE' ? 'x' : ' '}] ${task.id}: ${task.name} (${task.description})`
    ).join('\n');

    // Log successful retrieval
    logger.info({ sessionId, retrievedCount: sessionTasks.length }, 'Retrieved tasks successfully');
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
  logger.info('Checklist MCP Server starting in stdio mode...');
  await server.connect(transport);
}

main().catch(err => {
  // Log fatal errors before exiting
  logger.fatal({ err }, 'Checklist MCP Server stopped due to an unhandled error');
  process.exit(1);
});
