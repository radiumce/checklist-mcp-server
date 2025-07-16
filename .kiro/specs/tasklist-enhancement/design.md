# Design Document

## Overview

The tasklist enhancement introduces hierarchical task management while maintaining the existing MCP server's core philosophy. The design focuses on two main capabilities: subtask support and dynamic task plan updates. The solution uses a tree-based data structure with path-based navigation for updates.

## Architecture

### Data Model Transformation

The existing flat Task interface will be replaced with a hierarchical structure:

```typescript
interface Task {
  taskId: string;      // 1-20 character identifier (e.g., "auth1", "ui2", "step", "123", "v1.0", "user@task")
  description: string; // Combined name + description from original
  status: 'TODO' | 'DONE';
  children?: Task[];   // Optional subtasks array
}
```

### Session Storage

The taskStore remains a Map<string, Task[]> but now stores root-level tasks with nested children, replacing the flat array structure.

### Path-Based Navigation

Task hierarchy navigation uses Unix-style paths:
- `/` - Root level
- `/auth1/` - Children of task "auth1"  
- `/auth1/ui2/` - Children of task "ui2" under "auth1"

## Components and Interfaces

### Core Tools Redesign

**1. update_tasks Tool (replaces save_tasks)**
- Unified interface for creating and updating tasks at any hierarchy level
- Accepts path parameter for targeting specific levels
- Processes complete task arrays for the specified level
- Preserves unchanged tasks and their subtree structures

**2. mark_task_as_done Tool (enhanced)**
- Extended to work with hierarchical task IDs
- Uses recursive search to find tasks at any depth
- Maintains subtask independence from parent status

**3. get_all_tasks Tool (enhanced)**
- Returns complete hierarchical view with tree formatting
- Uses visual indicators (├──, └──) for structure clarity
- Shows status indicators for each task level

### Path Resolution Engine

```typescript
interface PathResolver {
  parsePath(path: string): string[];
  findTaskAtPath(tasks: Task[], pathSegments: string[]): Task | null;
  updateTasksAtPath(rootTasks: Task[], path: string, newTasks: Task[]): Task[];
}
```

### Task ID Generator

```typescript
interface TaskIdGenerator {
  generateId(): string;
  validateId(id: string): boolean;
  isUniqueInSession(id: string, sessionTasks: Task[]): boolean;
}
```

## Data Models

### Task Hierarchy Structure

```typescript
// Example task tree
const exampleTasks: Task[] = [
  {
    taskId: "auth1",
    description: "Implement user authentication system",
    status: "TODO",
    children: [
      {
        taskId: "db",
        description: "Design database schema",
        status: "DONE",
        children: []
      },
      {
        taskId: "api",
        description: "Create authentication API",
        status: "TODO",
        children: [
          {
            taskId: "login",
            description: "Login endpoint",
            status: "TODO"
          },
          {
            taskId: "logout", 
            description: "Logout endpoint",
            status: "TODO"
          }
        ]
      }
    ]
  }
];
```

### Update Operations

Task updates follow these principles:
1. **Complete Replacement**: Each update provides the full task list for the target path
2. **Preservation**: Unchanged tasks retain their taskId and complete subtree
3. **Atomic Updates**: All changes at a path level happen together
4. **Reference Integrity**: Parent-child relationships remain consistent

## Error Handling

### Path Validation
- Empty or malformed paths default to root level "/"
- Non-existent intermediate paths return descriptive errors
- Invalid task IDs in paths are reported with context

### Task Operation Errors
- Duplicate task IDs within the same level are rejected
- Missing required fields (taskId, description) are validated
- Status preservation errors are logged and reported

### Session Management
- Invalid session IDs return appropriate error messages
- Empty sessions are handled gracefully
- Concurrent access protection through atomic operations

## Testing Strategy

### Unit Tests
- Path parsing and resolution logic
- Task ID generation and validation
- Hierarchical task operations (add, update, mark done)
- Error condition handling

### Integration Tests  
- Complete workflow scenarios (create → update → mark done → retrieve)
- Multi-level hierarchy operations
- Session persistence and retrieval
- Tool interaction patterns

### Edge Case Testing
- Deep nesting scenarios (5+ levels)
- Large task trees (100+ tasks)
- Concurrent session operations
- Malformed input handling

## Implementation Approach

### Phase 1: Data Model Migration
- Update Task interface with children support
- Implement path resolution utilities
- Create task ID generation system

### Phase 2: Tool Enhancement
- Replace save_tasks with update_tasks
- Enhance mark_task_as_done for hierarchy support
- Update get_all_tasks with tree formatting

### Phase 3: Integration & Testing
- Comprehensive test coverage
- Performance validation
- Backward compatibility verification