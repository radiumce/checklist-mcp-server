/**
 * Task ID Generation Utilities
 * Shared between server implementation and tests
 */

/**
 * Generates a unique task ID that is 1-20 characters long, allowing letters, numbers, and symbols
 * @returns A valid task ID string
 */
export function generateTaskId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_@#$%&+=!.';
  
  // Generate random length between 3-8 characters (keeping reasonable default range for usability)
  // While the validation allows 1-20 characters, we generate shorter IDs for better user experience
  const length = Math.floor(Math.random() * 6) + 3; // 3 to 8 characters
  let id = '';
  
  for (let i = 0; i < length; i++) {
    // Any character from the allowed set
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Since our validation is now very permissive, generated IDs should always be valid
  // But we still validate as a safety check
  if (!validateTaskId(id)) {
    // This should rarely happen, but provide a fallback
    return 'task' + Math.floor(Math.random() * 1000);
  }
  
  return id;
}

/**
 * Validates that a task ID meets the format requirements
 * @param id The task ID to validate
 * @returns true if the ID is valid, false otherwise
 */
export function validateTaskId(id: string): boolean {
  // Check length (1-20 characters, allowing more flexibility)
  if (id.length < 1 || id.length > 20) {
    return false;
  }
  
  // Allow letters, numbers, and common symbols
  // Excluding only characters that might cause issues in paths or parsing: / \ : * ? " < > |
  const validCharsRegex = /^[a-zA-Z0-9\-_@#$%&+=!.]+$/;
  if (!validCharsRegex.test(id)) {
    return false;
  }
  
  // No additional restrictions - pure numbers, symbols, etc. are all allowed
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