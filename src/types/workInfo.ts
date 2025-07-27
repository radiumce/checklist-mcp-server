/**
 * Work Information Data Structures
 * Types and interfaces for work information management
 */

/**
 * Core work information interface
 */
export interface WorkInfo {
  workId: string;           // 8-digit numeric ID
  work_timestamp: string;   // Human-readable timestamp string (ISO format)
  work_description: string; // Short description for identification
  work_summarize: string;   // Full work summary text
  sessionId?: string;       // Optional session association
  work_tasks?: any;         // Static snapshot of tasks at save time
}

/**
 * Input interface for saving work information
 */
export interface SaveWorkInfoInput {
  work_summarize: string;    // Required: work summary text
  work_description: string;  // Required: short description
  sessionId?: string;        // Optional: session association
}

/**
 * Output interface for saving work information
 */
export interface SaveWorkInfoOutput {
  workId: string;
  message: string;
  timestamp: string;
}

/**
 * Output interface for getting recent works
 */
export interface GetRecentWorksOutput {
  works: Array<{
    workId: string;
    work_timestamp: string;
    work_description: string;
  }>;
}

/**
 * Input interface for getting work by ID
 */
export interface GetWorkByIdInput {
  workId: string;
}

/**
 * Output interface for getting work by ID
 */
export interface GetWorkByIdOutput {
  workId: string;
  work_timestamp: string;
  work_description: string;
  work_summarize: string;
  work_tasks?: any; // Static task snapshot from save time if sessionId was provided
}

/**
 * Work information summary for recent works list
 */
export interface WorkInfoSummary {
  workId: string;
  work_timestamp: string;
  work_description: string;
}