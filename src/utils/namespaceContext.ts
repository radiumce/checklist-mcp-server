/**
 * Namespace Context using AsyncLocalStorage
 * Provides request-scoped namespace context for MCP server
 */

import { AsyncLocalStorage } from 'async_hooks';
import pino from 'pino';

const logger = pino({ level: 'info' }, pino.destination(2));

interface NamespaceContext {
  namespace: string;
}

// Create AsyncLocalStorage instance for namespace context
const namespaceStorage = new AsyncLocalStorage<NamespaceContext>();

/**
 * Run a function within a namespace context
 * @param namespace The namespace identifier
 * @param fn The function to run within the context
 */
export function runInNamespace<T>(namespace: string, fn: () => T): T {
  logger.debug({ namespace }, 'Running in namespace context');
  return namespaceStorage.run({ namespace }, fn);
}

/**
 * Get the current namespace from the async context
 * @returns The current namespace, or 'default' if not in a namespace context
 */
export function getCurrentNamespace(): string {
  const context = namespaceStorage.getStore();
  const namespace = context?.namespace || 'default';
  logger.debug({ namespace, hasContext: !!context }, 'Getting current namespace');
  return namespace;
}

/**
 * Check if currently running within a namespace context
 * @returns True if in a namespace context, false otherwise
 */
export function hasNamespaceContext(): boolean {
  return namespaceStorage.getStore() !== undefined;
}
