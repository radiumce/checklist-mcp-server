/**
 * LRU Cache for Work Information Storage
 * Implements Least Recently Used cache with Map-based storage and access order tracking
 */

import { WorkInfo, WorkInfoSummary } from '../types/workInfo.js';
import pino from 'pino';

// Configure logger for LRU cache operations
const logger = pino({ level: 'info' }, pino.destination(2));

/**
 * LRU Cache implementation for work information storage
 * Uses Map for O(1) access and maintains access order for LRU eviction
 */
export class WorkInfoLRUCache {
  private cache: Map<string, WorkInfo>;
  private accessOrder: string[]; // Track access order for LRU (most recent at end)
  private maxSize: number;

  /**
   * Creates a new WorkInfoLRUCache instance
   * @param maxSize Maximum number of entries to store (default: 10)
   */
  constructor(maxSize: number = 10) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxSize = maxSize;
    
    logger.info({ maxSize }, 'WorkInfoLRUCache initialized');
  }

  /**
   * Stores work information in the cache
   * If workId already exists, updates the entry and moves to most recent
   * If cache is at capacity, evicts least recently used entry
   * @param workInfo The work information to store
   */
  set(workInfo: WorkInfo): void {
    const { workId } = workInfo;
    
    logger.debug({ workId, description: workInfo.work_description }, 'Setting work info in cache');

    const exists = this.cache.has(workId);
    
    // Always set the new value, whether it's an update or a new entry
    this.cache.set(workId, workInfo);

    if (exists) {
      // If it existed, just update its access order
      this.updateAccessOrder(workId);
      logger.debug({ workId }, 'Updated existing work info entry');
    } else {
      // If it's a new entry, check for eviction and add to access order
      if (this.cache.size > this.maxSize) {
        this.evictLRU();
      }
      this.accessOrder.push(workId);
      logger.debug({ workId, cacheSize: this.cache.size }, 'Added new work info entry');
    }
  }

  /**
   * Retrieves work information by workId
   * Updates access order to mark as most recently used
   * @param workId The work ID to retrieve
   * @returns The work information or null if not found
   */
  get(workId: string): WorkInfo | null {
    const workInfo = this.cache.get(workId);
    
    if (workInfo) {
      // Update access order to mark as most recently used
      this.updateAccessOrder(workId);
      logger.debug({ workId }, 'Retrieved work info from cache');
      // Return a deep copy to prevent modification of the cached object
      return JSON.parse(JSON.stringify(workInfo));
    }
    
    logger.debug({ workId }, 'Work info not found in cache');
    return null;
  }

  /**
   * Returns a list of recent work information summaries
   * Ordered by most recently used first
   * @returns Array of work info summaries
   */
  getRecentList(): WorkInfoSummary[] {
    // Return in reverse order of accessOrder (most recent first)
    const recentWorkIds = [...this.accessOrder].reverse();
    
    const recentWorks: WorkInfoSummary[] = recentWorkIds
      .map(workId => {
        const workInfo = this.cache.get(workId);
        if (workInfo) {
          return {
            workId: workInfo.workId,
            work_timestamp: workInfo.work_timestamp,
            work_description: workInfo.work_description
          };
        }
        return null;
      })
      .filter((work): work is WorkInfoSummary => work !== null);

    logger.debug({ count: recentWorks.length }, 'Retrieved recent works list');
    return recentWorks;
  }

  /**
   * Gets the current cache size
   * @returns Number of entries in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Checks if the cache is empty
   * @returns True if cache is empty, false otherwise
   */
  isEmpty(): boolean {
    return this.cache.size === 0;
  }

  /**
   * Clears all entries from the cache
   */
  clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];
    logger.info({ previousSize }, 'Cache cleared');
  }

  /**
   * Updates the access order for a given workId
   * Moves the workId to the end of the access order (most recent)
   * @param workId The work ID to update access order for
   */
  private updateAccessOrder(workId: string): void {
    // Remove workId from current position
    const index = this.accessOrder.indexOf(workId);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    // Add to end (most recent)
    this.accessOrder.push(workId);
  }

  /**
   * Evicts the least recently used entry from the cache
   * Removes the entry at the beginning of the access order
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      logger.warn('Attempted to evict from empty cache');
      return;
    }
    
    // Get least recently used workId (first in access order)
    const lruWorkId = this.accessOrder[0];
    const evictedWork = this.cache.get(lruWorkId);
    
    // Remove from cache and access order
    this.cache.delete(lruWorkId);
    this.accessOrder.shift();
    
    logger.info({ 
      evictedWorkId: lruWorkId, 
      evictedDescription: evictedWork?.work_description,
      newCacheSize: this.cache.size 
    }, 'Evicted LRU entry from cache');
  }
}