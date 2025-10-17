/**
 * Work Information Validation Utilities
 * Validation functions for work info data structures and inputs
 */

import { WorkInfo, SaveWorkInfoInput, GetWorkByIdInput } from '../types/workInfo.js';
import { WorkIdGenerator } from './workIdGenerator.js';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates work summary text
 * @param work_summarize The work summary to validate
 * @returns Validation result
 */
export function validateWorkSummarize(work_summarize: string): ValidationResult {
  const errors: string[] = [];

  if (!work_summarize) {
    errors.push('work_summarize is required');
  } else if (typeof work_summarize !== 'string') {
    errors.push('work_summarize must be a string');
  } else if (work_summarize.trim().length === 0) {
    errors.push('work_summarize cannot be empty');
  } else if (work_summarize.length > 5000) {
    errors.push('work_summarize cannot exceed 5000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates work description text
 * @param work_description The work description to validate
 * @returns Validation result
 */
export function validateWorkDescription(work_description: string): ValidationResult {
  const errors: string[] = [];

  if (!work_description) {
    errors.push('work_description is required');
  } else if (typeof work_description !== 'string') {
    errors.push('work_description must be a string');
  } else if (work_description.trim().length === 0) {
    errors.push('work_description cannot be empty');
  } else if (work_description.length > 200) {
    errors.push('work_description cannot exceed 200 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates session ID format
 * @param sessionId The session ID to validate
 * @returns Validation result
 */
export function validateSessionId(sessionId: string): ValidationResult {
  const errors: string[] = [];

  if (typeof sessionId !== 'string') {
    errors.push('sessionId must be a string');
  } else if (sessionId.length < 1 || sessionId.length > 100) {
    errors.push('sessionId must be between 1 and 100 characters long');
  } else {
    // Check for valid characters (alphanumeric, hyphens, underscores)
    const validSessionIdRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validSessionIdRegex.test(sessionId)) {
      errors.push('sessionId can only contain alphanumeric characters, hyphens, and underscores');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates work ID format
 * @param workId The work ID to validate
 * @returns Validation result
 */
export function validateWorkId(workId: string): ValidationResult {
  const errors: string[] = [];

  if (!workId) {
    errors.push('workId is required');
  } else if (typeof workId !== 'string') {
    errors.push('workId must be a string');
  } else if (!WorkIdGenerator.isValidWorkId(workId)) {
    errors.push('workId must be an 8-digit numeric string (10000000-99999999)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates SaveWorkInfoInput data
 * @param input The input data to validate
 * @returns Validation result
 */
export function validateSaveWorkInfoInput(input: any): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    errors.push('Input must be a valid object');
    return { isValid: false, errors };
  }

  // Validate work_summarize
  const summarizeValidation = validateWorkSummarize(input.work_summarize);
  errors.push(...summarizeValidation.errors);

  // Validate work_description
  const descriptionValidation = validateWorkDescription(input.work_description);
  errors.push(...descriptionValidation.errors);

  // Validate sessionId if provided
  if (input.sessionId !== undefined && input.sessionId !== null) {
    const sessionIdValidation = validateSessionId(input.sessionId);
    errors.push(...sessionIdValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates GetWorkByIdInput data
 * @param input The input data to validate
 * @returns Validation result
 */
export function validateGetWorkByIdInput(input: any): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    errors.push('Input must be a valid object');
    return { isValid: false, errors };
  }

  // Validate workId
  const workIdValidation = validateWorkId(input.workId);
  errors.push(...workIdValidation.errors);

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates complete WorkInfo object
 * @param workInfo The work info object to validate
 * @returns Validation result
 */
export function validateWorkInfo(workInfo: any): ValidationResult {
  const errors: string[] = [];

  if (!workInfo || typeof workInfo !== 'object') {
    errors.push('WorkInfo must be a valid object');
    return { isValid: false, errors };
  }

  // Validate workId
  const workIdValidation = validateWorkId(workInfo.workId);
  errors.push(...workIdValidation.errors);

  // Validate work_timestamp
  if (!workInfo.work_timestamp) {
    errors.push('work_timestamp is required');
  } else if (typeof workInfo.work_timestamp !== 'string') {
    errors.push('work_timestamp must be a string');
  } else {
    // Validate ISO format
    try {
      const date = new Date(workInfo.work_timestamp);
      if (isNaN(date.getTime())) {
        errors.push('work_timestamp must be a valid ISO date string');
      }
    } catch (e) {
      errors.push('work_timestamp must be a valid ISO date string');
    }
  }

  // Validate work_description
  const descriptionValidation = validateWorkDescription(workInfo.work_description);
  errors.push(...descriptionValidation.errors);

  // Validate work_summarize
  const summarizeValidation = validateWorkSummarize(workInfo.work_summarize);
  errors.push(...summarizeValidation.errors);

  // Validate sessionId if provided
  if (workInfo.sessionId !== undefined && workInfo.sessionId !== null) {
    const sessionIdValidation = validateSessionId(workInfo.sessionId);
    errors.push(...sessionIdValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a timestamp string in ISO format
 * @returns ISO formatted timestamp string
 */
export function createTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Validates timestamp format
 * @param timestamp The timestamp to validate
 * @returns true if valid ISO format, false otherwise
 */
export function isValidTimestamp(timestamp: string): boolean {
  try {
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && date.toISOString() === timestamp;
  } catch (e) {
    return false;
  }
}