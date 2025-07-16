# Requirements Document

## Introduction

This enhancement adds hierarchical task management capabilities to the existing tasklist MCP server. The core design philosophy remains unchanged - LLM agents can mark tasks as complete and receive full task state to maintain memory even in long contexts. The enhancement introduces subtask support and dynamic task plan modification during agent execution.

## Requirements

### Requirement 1

**User Story:** As an LLM agent, I want to create and manage hierarchical tasks with subtasks, so that I can organize complex workflows into manageable components.

#### Acceptance Criteria

1. WHEN creating tasks THEN the system SHALL support nested task structures with unlimited depth
2. WHEN a task has subtasks THEN the system SHALL maintain parent-child relationships
3. WHEN displaying tasks THEN the system SHALL show the hierarchical structure clearly
4. WHEN marking a parent task as done THEN the system SHALL preserve subtask states independently

### Requirement 2

**User Story:** As an LLM agent, I want to update task plans dynamically during execution, so that I can adapt to changing requirements or discoveries made during implementation.

#### Acceptance Criteria

1. WHEN updating tasks at any hierarchy level THEN the system SHALL accept a complete task list for that level
2. WHEN updating tasks THEN the system SHALL preserve unchanged tasks and their subtask relationships
3. WHEN specifying a path THEN the system SHALL support hierarchical path notation (/, /taskid/, /taskid1/taskid2/)
4. WHEN updating non-existent paths THEN the system SHALL return appropriate error messages

### Requirement 3

**User Story:** As an LLM agent, I want tasks to have unique, non-sequential identifiers, so that I can reference them unambiguously without confusion with ordinal numbers.

#### Acceptance Criteria

1. WHEN generating task IDs THEN the system SHALL use 1-20 character combinations allowing letters, numbers, and symbols (excluding / \ : * ? " < > | and spaces)
2. WHEN generating task IDs THEN the system SHALL allow pure numeric sequences and symbol-only sequences
3. WHEN generating task IDs THEN the system SHALL ensure uniqueness within the session
4. WHEN preserving tasks during updates THEN the system SHALL maintain existing task IDs

### Requirement 4

**User Story:** As an LLM agent, I want to receive complete hierarchical task views after operations, so that I maintain full context of the task structure and status.

#### Acceptance Criteria

1. WHEN completing any task operation THEN the system SHALL return the complete task hierarchy
2. WHEN displaying task hierarchies THEN the system SHALL use clear visual formatting with tree structure
3. WHEN showing task status THEN the system SHALL indicate TODO/DONE states clearly
4. WHEN tasks have subtasks THEN the system SHALL show the nested structure with appropriate indentation

### Requirement 5

**User Story:** As an LLM agent, I want to mark individual tasks as done at any hierarchy level, so that I can track progress granularly throughout the task tree.

#### Acceptance Criteria

1. WHEN marking a task as done THEN the system SHALL update only that specific task
2. WHEN marking a task as done THEN the system SHALL preserve all subtask states
3. WHEN marking a task as done THEN the system SHALL return the updated complete hierarchy
4. WHEN attempting to mark non-existent tasks THEN the system SHALL return appropriate error messages