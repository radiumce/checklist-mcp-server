/**
 * Task ID Generation Utilities
 * Shared between server implementation and tests
 */

/**
 * Generates a unique task ID that is 3-8 characters long, alphanumeric, and avoids pure numbers
 * @returns A valid task ID string
 */
export function generateTaskId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  let id: string;
  let attempts = 0;
  const maxAttempts = 100;
  
  do {
    // Generate random length between 3-8 characters
    const length = Math.floor(Math.random() * 6) + 3; // 3 to 8 characters
    id = '';
    
    // Ensure at least one letter to avoid pure numbers
    const letterPosition = Math.floor(Math.random() * length);
    
    for (let i = 0; i < length; i++) {
      if (i === letterPosition) {
        // Force a letter at this position
        id += letters.charAt(Math.floor(Math.random() * letters.length));
      } else {
        // Any alphanumeric character
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    attempts++;
    if (attempts >= maxAttempts) {
      // Fallback to ensure we don't get stuck in infinite loop
      id = 'task' + Math.floor(Math.random() * 1000);
      break;
    }
  } while (!validateTaskId(id));
  
  return id;
}

/**
 * Validates that a task ID meets the format requirements
 * @param id The task ID to validate
 * @returns true if the ID is valid, false otherwise
 */
export function validateTaskId(id: string): boolean {
  // Check length (3-8 characters)
  if (id.length < 3 || id.length > 8) {
    return false;
  }
  
  // Check that it's alphanumeric
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  if (!alphanumericRegex.test(id)) {
    return false;
  }
  
  // Check that it's not pure numbers (must contain at least one letter)
  const hasLetter = /[a-zA-Z]/.test(id);
  if (!hasLetter) {
    return false;
  }
  
  return true;
}

/**
 * Generates multiple unique task IDs
 * @param count Number of IDs to generate
 * @returns Array of unique task IDs
 */
export function generateMultipleTaskIds(count: number): string[] {
  const ids = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 10;
  
  while (ids.size < count && attempts < maxAttempts) {
    const id = generateTaskId();
    ids.add(id);
    attempts++;
  }
  
  if (ids.size < count) {
    throw new Error(`Could not generate ${count} unique task IDs after ${maxAttempts} attempts`);
  }
  
  return Array.from(ids);
}

/**
 * Creates a task ID generator that ensures uniqueness within a session
 * @param existingIds Set of existing task IDs to avoid
 * @returns Function that generates unique task IDs
 */
export function createUniqueIdGenerator(existingIds: Set<string> = new Set()): () => string {
  const usedIds = new Set(existingIds);
  
  return (): string => {
    let id: string;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      id = generateTaskId();
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new Error('Could not generate unique task ID after maximum attempts');
      }
    } while (usedIds.has(id));
    
    usedIds.add(id);
    return id;
  };
}