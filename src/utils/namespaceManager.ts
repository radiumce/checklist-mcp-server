/**
 * Namespace Manager for Multi-User Isolation
 * Manages separate cache instances for different namespaces
 */

import { WorkInfoLRUCache } from './workInfoLRUCache.js';
import { TaskStoreLRUCache } from './taskStoreLRUCache.js';
import pino from 'pino';

const logger = pino({ level: 'info' }, pino.destination(2));

/**
 * Cache instances for a specific namespace
 */
interface NamespaceCaches {
  workInfoCache: WorkInfoLRUCache;
  taskStoreCache: TaskStoreLRUCache;
}

/**
 * Singleton manager for namespace-isolated caches
 */
class NamespaceManager {
  private namespaces: Map<string, NamespaceCaches>;
  private maxSessions: number;

  constructor() {
    this.namespaces = new Map();
    this.maxSessions = parseInt(process.env.MAX_SESSIONS || '100', 10);
    logger.info({ maxSessions: this.maxSessions }, 'NamespaceManager initialized');
  }

  /**
   * Get or create cache instances for a namespace
   * @param namespace The namespace identifier (defaults to 'default')
   * @returns Cache instances for the namespace
   */
  getCaches(namespace: string = 'default'): NamespaceCaches {
    if (!this.namespaces.has(namespace)) {
      logger.info({ namespace }, 'Creating new namespace caches');
      
      const caches: NamespaceCaches = {
        workInfoCache: new WorkInfoLRUCache(10),
        taskStoreCache: new TaskStoreLRUCache(this.maxSessions),
      };
      
      this.namespaces.set(namespace, caches);
    }
    
    return this.namespaces.get(namespace)!;
  }

  /**
   * Get all active namespaces
   * @returns Array of namespace identifiers
   */
  getActiveNamespaces(): string[] {
    return Array.from(this.namespaces.keys());
  }

  /**
   * Get statistics for all namespaces
   * @returns Object with namespace statistics
   */
  getStats(): Record<string, { workInfoCount: number; taskStoreCount: number }> {
    const stats: Record<string, { workInfoCount: number; taskStoreCount: number }> = {};
    
    for (const [namespace, caches] of this.namespaces.entries()) {
      stats[namespace] = {
        workInfoCount: caches.workInfoCache.size(),
        taskStoreCount: caches.taskStoreCache.size(),
      };
    }
    
    return stats;
  }

  /**
   * Clear all caches for a specific namespace
   * @param namespace The namespace to clear
   * @returns True if namespace existed and was cleared, false otherwise
   */
  clearNamespace(namespace: string): boolean {
    if (this.namespaces.has(namespace)) {
      logger.info({ namespace }, 'Clearing namespace caches');
      this.namespaces.delete(namespace);
      return true;
    }
    return false;
  }

  /**
   * Get the total number of active namespaces
   * @returns Number of namespaces
   */
  getNamespaceCount(): number {
    return this.namespaces.size;
  }
}

// Export singleton instance
export const namespaceManager = new NamespaceManager();
