# Design Document

## Overview

This design extends the existing Checklist MCP Server with work information management capabilities. The system will implement an LRU (Least Recently Used) cache to store work summaries that can be shared between LLM agents, enabling seamless work handoffs and context preservation.

The design integrates with the existing task management system by associating work information with session IDs, allowing agents to access both work summaries and current task states.

## Architecture

### High-Level Architecture

The work information management system will be integrated into the existing MCP server architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server                               │
├─────────────────────────────────────────────────────────────┤
│  Existing Tools          │  New Work Info Tools             │
│  - update_tasks          │  - save_current_work_info        │
│  - get_all_tasks         │  - get_recent_works_info         │
│  - mark_task_as_done     │  - get_work_by_id                │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  - taskStore (Map)       │  - workInfoCache (LRU)          │
│  - Session-based tasks   │  - Work info with associations   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Save Work Info**: Agent → save_current_work_info → LRU Cache → Generate ID & Timestamp
2. **Get Recent Works**: Agent → get_recent_works_info → LRU Cache → Return List
3. **Get Work Details**: Agent → get_work_by_id → LRU Cache + Task Store → Return Details

## Components and Interfaces

### 1. Work Information Data Structure

```typescript
interface WorkInfo {
  workId: string;           // 8-digit numeric ID
  work_timestamp: string;   // Human-readable timestamp string (ISO format)
  work_description: string; // Short description for identification
  work_summarize: string;   // Full work summary text
  sessionId?: string;       // Optional session association
  work_tasks?: any;         // Static snapshot of tasks at save time
}
```

### 2. LRU Cache Implementation

```typescript
class WorkInfoLRUCache {
  private cache: Map<string, WorkInfo>;
  private maxSize: number;
  private accessOrder: string[]; // Track access order for LRU
  
  constructor(maxSize: number = 10);
  set(workInfo: WorkInfo): void;
  get(workId: string): WorkInfo | null;
  getRecentList(): Array<{workId: string, work_timestamp: string, work_description: string}>;
  private evictLRU(): void;
  private updateAccessOrder(workId: string): void;
}
```

### 3. Work ID Generator

```typescript
class WorkIdGenerator {
  private static usedIds: Set<string> = new Set();
  
  static generateUniqueId(): string {
    // Generate 8-digit numeric ID (10000000-99999999)
    // Ensure uniqueness within current session
  }
  
  static isValidWorkId(id: string): boolean {
    // Validate 8-digit numeric format
  }
}
```

### 4. MCP Tool Interfaces

#### save_current_work_info
```typescript
interface SaveWorkInfoInput {
  work_summarize: string;    // Required: work summary text
  work_description: string;  // Required: short description
  sessionId?: string;        // Optional: session association
}

interface SaveWorkInfoOutput {
  workId: string;
  message: string;
  timestamp: string;
}
```

#### get_recent_works_info
```typescript
interface GetRecentWorksOutput {
  works: Array<{
    workId: string;
    work_timestamp: string;
    work_description: string;
  }>;
}
```

#### get_work_by_id
```typescript
interface GetWorkByIdInput {
  workId: string;
}

interface GetWorkByIdOutput {
  workId: string;
  work_timestamp: string;
  work_description: string;
  work_summarize: string;
  work_tasks?: any; // Static task snapshot from save time if sessionId was provided
}
```

## Data Models

### Work Information Storage

The work information will be stored in an LRU cache with the following characteristics:

- **Storage**: In-memory Map with access tracking
- **Capacity**: Default 10 entries, configurable
- **Eviction**: Least Recently Used when capacity exceeded
- **Persistence**: None (in-memory only, consistent with existing task storage)

### Session Association

Work information can be optionally associated with existing task sessions:

- **Validation**: Check if sessionId exists in taskStore when provided
- **Flexibility**: Allow saving even if sessionId doesn't exist (with warning)
- **Static Task Binding**: Capture and store task state at save time, not query time

### ID Generation Strategy

- **Format**: 8-digit numeric strings (10000000-99999999)
- **Uniqueness**: Maintained within current server instance
- **Collision Handling**: Retry generation if collision detected
- **Validation**: Strict format validation on input

## Error Handling

### Input Validation

1. **save_current_work_info**:
   - Validate work_summarize is non-empty string
   - Validate work_description is non-empty string (max 200 chars)
   - Validate sessionId format if provided
   - Log warning if sessionId doesn't exist but continue operation

2. **get_work_by_id**:
   - Validate workId is 8-digit numeric string
   - Return clear error if workId not found
   - Handle missing session gracefully

3. **get_recent_works_info**:
   - No input validation required
   - Always return valid JSON array (empty if no works)

### Error Response Format

```typescript
interface ErrorResponse {
  content: [{
    type: "text";
    text: string; // Clear error message
  }];
}
```

### Logging Strategy

- Use existing pino logger for consistency
- Log all work info operations with relevant context
- Log LRU evictions for debugging
- Log session association warnings
- Log ID generation collisions

## Testing Strategy

### Unit Tests

1. **LRU Cache Functionality**:
   - Test basic set/get operations
   - Test LRU eviction behavior
   - Test access order updates
   - Test capacity limits

2. **Work ID Generation**:
   - Test unique ID generation
   - Test format validation
   - Test collision handling

3. **Tool Input Validation**:
   - Test all required/optional parameters
   - Test edge cases and invalid inputs
   - Test error message clarity

### Integration Tests

1. **End-to-End Workflows**:
   - Save work info → Get recent works → Get by ID
   - Session association workflows
   - LRU eviction scenarios

2. **Task Integration**:
   - Save work with sessionId → Modify tasks → Get work by ID
   - Verify task state reflects snapshot from save time, not current status

3. **Error Scenarios**:
   - Invalid inputs across all tools
   - Non-existent work IDs
   - Session ID edge cases

### Performance Tests

1. **Cache Performance**:
   - Test with maximum capacity
   - Test frequent access patterns
   - Memory usage validation

2. **Concurrent Access**:
   - Multiple rapid saves/gets
   - Session association under load

## Implementation Considerations

### Integration Points

1. **Existing Code Structure**:
   - Add new tools alongside existing ones
   - Reuse validation patterns and error handling
   - Maintain consistent logging approach

2. **Shared Utilities**:
   - Leverage existing session validation
   - Use consistent error response format
   - Follow existing TypeScript patterns

### Memory Management

1. **LRU Cache Size**:
   - Default 10 entries balances functionality and memory
   - Each entry estimated ~1-5KB depending on summary length
   - Total memory impact: ~50KB maximum

2. **Cleanup Strategy**:
   - Automatic LRU eviction handles capacity
   - No manual cleanup required
   - Consistent with existing in-memory task storage

### Extensibility

1. **Future Enhancements**:
   - Configurable cache size via environment variable
   - Optional persistence layer
   - Work info expiration based on age
   - Enhanced search capabilities

2. **API Stability**:
   - Tool interfaces designed for backward compatibility
   - Internal implementation can evolve
   - Clear separation between public API and internal logic