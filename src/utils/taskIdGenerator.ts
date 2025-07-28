/**
 * Task ID Generation Utilities
 * Shared between server implementation and tests
 */

/**
 * Generates a unique task ID that is 1-20 characters long, allowing letters, numbers, and symbols
 * @returns A valid task ID string
 */
export function generateTaskId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  
  // Generate random length between 8-12 characters
  const length = Math.floor(Math.random() * 5) + 8;
  let id = '';
  
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return id;
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