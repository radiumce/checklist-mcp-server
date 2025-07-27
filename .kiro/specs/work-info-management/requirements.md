# Requirements Document

## Introduction

This feature adds work information management capabilities to the existing Checklist MCP Server. The system will provide an LRU (Least Recently Used) cache to store, retrieve, and manage work summaries that can be shared between LLM agents. This enables agents to relay work information, including task completion status, to subsequent agents in a workflow.

## Requirements

### Requirement 1

**User Story:** As an LLM agent, I want to save my current work information with a summary, so that I can preserve my progress and context for future reference or handoff to other agents.

#### Acceptance Criteria

1. WHEN an agent calls save_current_work_info THEN the system SHALL store the work information in an LRU cache
2. WHEN saving work info THEN the system SHALL require a summarize text parameter containing the work summary
3. WHEN saving work info THEN the system SHALL require a work_description parameter for easy identification
4. WHEN saving work info THEN the system SHALL accept an optional sessionId parameter to associate the work with current tasks
5. WHEN saving work info THEN the system SHALL generate a unique 8-digit numeric workId for the entry
6. WHEN saving work info THEN the system SHALL record the current timestamp as a human-readable string (ISO format)
7. WHEN the same sessionId is provided THEN the system SHALL overwrite the existing entry with that sessionId
8. WHEN the LRU cache exceeds the maximum size (default 10) THEN the system SHALL remove the least recently used entry

### Requirement 2

**User Story:** As an LLM agent, I want to retrieve a list of recent work information, so that I can see what work has been done recently and select relevant context.

#### Acceptance Criteria

1. WHEN an agent calls get_recent_works_info THEN the system SHALL return a JSON list of recent work entries
2. WHEN returning recent works THEN each list item SHALL contain workId, work_timestamp, and work_description
3. WHEN returning recent works THEN the list SHALL be ordered by most recently used first
4. WHEN the cache is empty THEN the system SHALL return an empty JSON array
5. WHEN the cache contains entries THEN the system SHALL return up to the maximum cache size entries

### Requirement 3

**User Story:** As an LLM agent, I want to retrieve detailed work information by ID, so that I can access the full context and associated task information for a specific work item.

#### Acceptance Criteria

1. WHEN an agent calls get_work_by_id with a valid workId THEN the system SHALL return detailed work information in JSON format
2. WHEN returning work details THEN the response SHALL include workId, work_timestamp, work_description, and work_summarize
3. WHEN the work has an associated sessionId THEN the response SHALL include work_tasks with current task status
4. WHEN the work has no associated sessionId THEN the work_tasks field SHALL be omitted from the response
5. WHEN an invalid workId is provided THEN the system SHALL return an appropriate error message
6. WHEN a workId does not exist THEN the system SHALL return an appropriate error message

### Requirement 4

**User Story:** As a system administrator, I want the work information cache to have configurable size limits, so that I can control memory usage and retention policies.

#### Acceptance Criteria

1. WHEN the system initializes THEN the LRU cache SHALL have a default maximum size of 10 entries
2. WHEN the cache reaches maximum capacity THEN the system SHALL automatically remove the least recently used entry
3. WHEN an entry is accessed via save_current_work_info (including overwrites) THEN it SHALL be moved to the most recently used position
4. WHEN an entry is accessed via get_work_by_id THEN it SHALL be moved to the most recently used position
5. WHEN entries are removed due to capacity limits THEN the system SHALL log the removal for debugging purposes

### Requirement 5

**User Story:** As an LLM agent, I want work information to be associated with task sessions, so that I can understand the current state of tasks related to the work.

#### Acceptance Criteria

1. WHEN saving work info with a sessionId THEN the system SHALL validate the sessionId exists in the task store
2. WHEN saving work info with a valid sessionId THEN the system SHALL capture and store a static snapshot of the current task hierarchy
3. WHEN retrieving work by ID with associated sessionId THEN the system SHALL include the static task snapshot from save time
4. WHEN a sessionId is provided but doesn't exist THEN the system SHALL still save the work info but log a warning
5. WHEN task status changes after work info is saved THEN subsequent retrievals SHALL show the original task snapshot, not updated status