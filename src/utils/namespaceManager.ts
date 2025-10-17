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
  private maxNamespaces: number;
  private namespaceAccessOrder: string[]; // Track access order for LRU

  constructor() {
    this.namespaces = new Map();
    this.maxSessions = parseInt(process.env.MAX_SESSIONS || '100', 10);
    this.maxNamespaces = parseInt(process.env.MAX_NAMESPACES || '32', 10);
    this.namespaceAccessOrder = [];
    logger.info({ maxSessions: this.maxSessions, maxNamespaces: this.maxNamespaces }, 'NamespaceManager initialized');
  }

  /**
   * Get or create cache instances for a namespace
   * @param namespace The namespace identifier (defaults to 'default')
   * @returns Cache instances for the namespace
   */
  getCaches(namespace: string = 'default'): NamespaceCaches {
    // Update access order for LRU
    this.updateAccessOrder(namespace);
    
    if (!this.namespaces.has(namespace)) {
      // Check if we need to evict a namespace
      this.evictIfNeeded();
      
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
   * Update the access order for LRU tracking
   * @param namespace The namespace being accessed
   */
  private updateAccessOrder(namespace: string): void {
    // Remove namespace from current position if it exists
    const index = this.namespaceAccessOrder.indexOf(namespace);
    if (index > -1) {
      this.namespaceAccessOrder.splice(index, 1);
    }
    
    // Add to the end (most recently used)
    this.namespaceAccessOrder.push(namespace);
  }

  /**
   * Evict the least recently used namespace if limit is reached
   * The 'default' namespace is never evicted
   */
  private evictIfNeeded(): void {
    if (this.namespaces.size < this.maxNamespaces) {
      return; // No need to evict
    }
    
    // Find the least recently used namespace that is not 'default'
    for (const namespace of this.namespaceAccessOrder) {
      if (namespace !== 'default' && this.namespaces.has(namespace)) {
        logger.info({ namespace, totalNamespaces: this.namespaces.size }, 'Evicting namespace due to LRU limit');
        
        // Remove from map and access order
        this.namespaces.delete(namespace);
        const index = this.namespaceAccessOrder.indexOf(namespace);
        if (index > -1) {
          this.namespaceAccessOrder.splice(index, 1);
        }
        
        return; // Only evict one namespace at a time
      }
    }
    
    // If we get here, all namespaces are 'default' (shouldn't happen in practice)
    logger.warn({ totalNamespaces: this.namespaces.size }, 'Cannot evict: only default namespace exists');
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
    if (namespace === 'default') {
      logger.warn({ namespace }, 'Cannot clear default namespace');
      return false;
    }
    
    if (this.namespaces.has(namespace)) {
      logger.info({ namespace }, 'Clearing namespace caches');
      this.namespaces.delete(namespace);
      
      // Remove from access order
      const index = this.namespaceAccessOrder.indexOf(namespace);
      if (index > -1) {
        this.namespaceAccessOrder.splice(index, 1);
      }
      
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
