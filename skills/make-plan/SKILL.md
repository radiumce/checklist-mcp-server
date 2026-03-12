---
name: "make-plan"
description: "Tool for planning and tracking tasks: Utilize the `plan-checklist` CLI to break down tasks, create execution plans, and strictly track progress."
version: "2.0.0"
---

# Prerequisites & Server Health Check
- This skill heavily relies on the `plan-checklist` CLI tool.
- **Fallback Rule**: If any `plan-checklist` CLI command fails due to a connection error, you should run `plan-checklist` (without arguments) to verify the server health and connection status. If the server is unreachable, you MUST explicitly ask the user to provide an available server URL. Once provided, configure the CLI by appending `--server <url>` to your next command (which will automatically save it to global configuration for future use).

# CLI Command Reference
The `plan-checklist` CLI exposes the following core capabilities. You should always prefer using standard input (`stdin` via pipelines or Heredoc `<<EOF`) or the `-t` argument for complex updates to avoid creating temporary files.

1. **Check Status**: `plan-checklist`
   - Validates configuration and checks the `/health` endpoint status.
2. **List Tasks**: `plan-checklist list <sessionId> [--namespace <ns>]`
   - Retrieves and displays the current task hierarchy in a formatted tree.
3. **Update Tasks**: `plan-checklist update <sessionId> [--path <path>] [--namespace <ns>]`
   - Adds or updates the task hierarchy at the specified path.
   - Usage Example (Inline JSON text): `plan-checklist update mysession -t '[{"taskId": "t1", "description": "do stuff"}]'`
   - Usage Example (Heredoc):
     ```bash
     plan-checklist update mysession << 'EOF'
     [
       { "taskId": "t1", "description": "parent", "children": [ { "taskId": "t2", "description": "child" } ] }
     ]
     EOF
     ```
4. **Mark Tasks Done**: `plan-checklist done <sessionId> <taskId...> [--namespace <ns>]`
   - Marks one or multiple tasks as `DONE`.
   - Usage Example: `plan-checklist done mysession t1 t2 t3`

# Core Concepts
- **Work**: The macroscopic, overall objective (e.g., "Deploy product website").
- **Task**: The specific unit of execution broken down from the work objective. It is the basic entry in the Checklist.

# Phase 1: Planning
Before beginning any complex work requiring multiple steps, the following steps must be executed:

1. **Structured Breakdown**
   - Develop a complete task execution plan based on the work objective.
   - **I/O Definition**: Clearly specify what the "input" and "output" should be for each task phase.
   - **Logical Sequencing**: Identify dependencies between tasks.

2. **Plan Persistence (Mandatory)**
   - It is strictly forbidden to plan verbally within the context alone.
   - **Action**: You must immediately invoke the `plan-checklist update` command to persist the broken-down task list into the system.

# Phase 2: Execution & Tracking
During the execution of the work, strictly adhere to the following status management rules:

1. **Mark Upon Completion**
   - Every time a task node is completed, you **MUST** immediately invoke the `plan-checklist done` command to mark it as `DONE`.
   - Do not stack multiple completed tasks to mark them all at once at the very end. Maintain real-time state accuracy.

2. **State Synchronization & Remediation**
   - After each `DONE` marking, inspect the returned task list status.
   - **Backfill Rule**: If you discover that a predecessor task (Previous Task) was actually completed but its status is still `TODO`, you must backfill it by marking it `DONE`.
   - **Omission Assessment**: If a predecessor task was truly not executed, immediately assess whether it needs to be retroactively completed, or if it is no longer necessary.

3. **Progress Confirmation**
   - When needing to confirm current progress or review the next steps in the plan, query the complete list via the `plan-checklist list` command.

# Phase 3: Iteration
1. **Plan Modification**
   - Dynamic adjustments to the plan are permitted based on actual circumstances.
   - **Action**: Use the `plan-checklist update` command to update the existing task list (adding new tasks, modifying existing ones, or adjusting their order), ensuring that the persisted plan aligns with the actual execution path.
