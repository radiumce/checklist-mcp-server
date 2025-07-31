/**
 * LRU Cache for Task Store Management
 * Implements Least Recently Used cache for session-based task storage
 * Manages both task data and session-to-workId mappings
 */

import { Task } from '../server.js';
import pino from 'pino';

// Configure logger for task store LRU operations
const logger = pino({ level: 'info' }, pino.destination(2));

/**
 * LRU Cache implementation for task store management
 * Maintains session task lists and their access order for memory management
 */
export class TaskStoreLRUCache {
  private taskStore: Map<string, Task[]>;
  private sessionToWorkIdMap: Map<string, string>;
  private accessOrder: string[]; // Track access order for LRU (most recent at end)
  private maxSize: number;

  /**
   * Creates a new TaskStoreLRUCache instance
   * @param maxSize Maximum number of sessions to store (default: 100)
   */
  constructor(maxSize: number = 100) {
    this.taskStore = new Map();
    this.sessionToWorkIdMap = new Map();
    this.accessOrder = [];
    this.maxSize = maxSize;
    
    logger.info({ maxSize }, 'TaskStoreLRUCache initialized');
  }

  /**
   * Sets task list for a session
   * Updates access order and evicts LRU session if necessary
   * @param sessionId The session identifier
   * @param tasks The task list to store
   */
  setTasks(sessionId: string, tasks: Task[]): void {
    logger.debug({ sessionId, taskCount: tasks.length }, 'Setting tasks for session');

    const exists = this.taskStore.has(sessionId);
    
    // Always set the new value
    this.taskStore.set(sessionId, tasks);

    if (exists) {
      // If session existed, just update its access order
      this.updateAccessOrder(sessionId);
      logger.debug({ sessionId }, 'Updated existing session tasks');
    } else {
      // If it's a new session, check for eviction and add to access order
      if (this.taskStore.size > this.maxSize) {
        this.evictLRU();
      }
      this.accessOrder.push(sessionId);
      logger.debug({ sessionId, cacheSize: this.taskStore.size }, 'Added new session');
    }
  }

  /**
   * Gets task list for a session
   * Updates access order to mark as most recently used
   * @param sessionId The session identifier
   * @returns The task list or undefined if not found
   */
  getTasks(sessionId: string): Task[] | undefined {
    const tasks = this.taskStore.get(sessionId);
    
    if (tasks) {
      // Update access order to mark as most recently used
      this.updateAccessOrder(sessionId);
      logger.debug({ sessionId }, 'Retrieved tasks for session');
      return tasks;
    }
    
    logger.debug({ sessionId }, 'Session not found in cache');
    return undefined;
  }

  /**
   * Checks if a session exists in the cache
   * Does NOT update access order (read-only check)
   * @param sessionId The session identifier
   * @returns True if session exists, false otherwise
   */
  hasSession(sessionId: string): boolean {
    return this.taskStore.has(sessionId);
  }

  /**
   * Sets the workId mapping for a session
   * @param sessionId The session identifier
   * @param workId The work identifier
   */
  setWorkIdMapping(sessionId: string, workId: string): void {
    this.sessionToWorkIdMap.set(sessionId, workId);
    logger.debug({ sessionId, workId }, 'Set workId mapping for session');
  }

  /**
   * Gets the workId mapping for a session
   * @param sessionId The session identifier
   * @returns The work identifier or undefined if not found
   */
  getWorkIdMapping(sessionId: string): string | undefined {
    return this.sessionToWorkIdMap.get(sessionId);
  }

  /**
   * Gets the current cache size
   * @returns Number of sessions in the cache
   */
  size(): number {
    return this.taskStore.size;
  }

  /**
   * Gets the maximum cache size
   * @returns Maximum number of sessions allowed
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Updates the access order for a given sessionId
   * Moves the sessionId to the end of the access order (most recent)
   * @param sessionId The session ID to update access order for
   */
  private updateAccessOrder(sessionId: string): void {
    // Remove sessionId from current position
    const index = this.accessOrder.indexOf(sessionId);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    // Add to end (most recent)
    this.accessOrder.push(sessionId);
  }

  /**
   * Evicts the least recently used session from the cache
   * Removes both task data and workId mapping
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      logger.warn('Attempted to evict from empty cache');
      return;
    }
    
    // Get least recently used sessionId (first in access order)
    const lruSessionId = this.accessOrder[0];
    const evictedTasks = this.taskStore.get(lruSessionId);
    const evictedWorkId = this.sessionToWorkIdMap.get(lruSessionId);
    
    // Remove from both maps and access order
    this.taskStore.delete(lruSessionId);
    this.sessionToWorkIdMap.delete(lruSessionId);
    this.accessOrder.shift();
    
    logger.info({ 
      evictedSessionId: lruSessionId,
      evictedWorkId,
      taskCount: evictedTasks?.length || 0,
      newCacheSize: this.taskStore.size 
    }, 'Evicted LRU session from cache');
  }
}