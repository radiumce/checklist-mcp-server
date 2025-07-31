#!/usr/bin/env node

/**
 * Task Store LRU Cache Test Suite
 * Tests the LRU cache functionality for session management
 */

import { TaskStoreLRUCache } from '../src/utils/taskStoreLRUCache.js';
import { Task } from '../src/server.js';

console.log('--- Starting TaskStoreLRUCache Tests ---');

// Test data
const createTestTasks = (sessionId: string): Task[] => [
  {
    taskId: `task1-${sessionId}`,
    description: `First task for ${sessionId}`,
    status: 'TODO'
  },
  {
    taskId: `task2-${sessionId}`,
    description: `Second task for ${sessionId}`,
    status: 'DONE',
    children: [
      {
        taskId: `subtask1-${sessionId}`,
        description: `Subtask for ${sessionId}`,
        status: 'TODO'
      }
    ]
  }
];

// Test 1: Constructor and basic operations
console.log('Testing constructor and basic operations...');
const cache = new TaskStoreLRUCache(3); // Small cache for testing
console.assert(cache.size() === 0, 'Initial cache should be empty');
console.assert(cache.getMaxSize() === 3, 'Max size should be 3');

// Test 2: Setting and getting tasks
console.log('Testing set and get operations...');
const tasks1 = createTestTasks('session1');
cache.setTasks('session1', tasks1);
console.assert(cache.size() === 1, 'Cache size should be 1 after adding one session');

const retrievedTasks = cache.getTasks('session1');
console.assert(retrievedTasks !== undefined, 'Should retrieve tasks for session1');
console.assert(retrievedTasks!.length === 2, 'Should have 2 tasks');
console.assert(retrievedTasks![0].taskId === 'task1-session1', 'First task ID should match');

// Test 3: Session existence check
console.log('Testing session existence check...');
console.assert(cache.hasSession('session1') === true, 'Should find existing session');
console.assert(cache.hasSession('nonexistent') === false, 'Should not find non-existent session');

// Test 4: WorkId mapping
console.log('Testing workId mapping...');
cache.setWorkIdMapping('session1', 'work123');
console.assert(cache.getWorkIdMapping('session1') === 'work123', 'Should retrieve correct workId');
console.assert(cache.getWorkIdMapping('nonexistent') === undefined, 'Should return undefined for non-existent session');

// Test 5: LRU eviction
console.log('Testing LRU eviction...');
const tasks2 = createTestTasks('session2');
const tasks3 = createTestTasks('session3');
const tasks4 = createTestTasks('session4');

cache.setTasks('session2', tasks2);
cache.setTasks('session3', tasks3);
console.assert(cache.size() === 3, 'Cache should be at max capacity');

// Access session1 to make it most recent
cache.getTasks('session1');

// Add session4, should evict session2 (least recently used)
cache.setTasks('session4', tasks4);
console.assert(cache.size() === 3, 'Cache should still be at max capacity');
console.assert(cache.hasSession('session1') === true, 'session1 should still exist (recently accessed)');
console.assert(cache.hasSession('session2') === false, 'session2 should be evicted');
console.assert(cache.hasSession('session3') === true, 'session3 should still exist');
console.assert(cache.hasSession('session4') === true, 'session4 should exist (just added)');

// Test 6: WorkId mapping eviction consistency
console.log('Testing workId mapping eviction consistency...');
cache.setWorkIdMapping('session3', 'work333');
cache.setWorkIdMapping('session4', 'work444');

// Add session5, should evict session3 (least recently used)
const tasks5 = createTestTasks('session5');
cache.setTasks('session5', tasks5);

console.assert(cache.getWorkIdMapping('session3') === undefined, 'workId mapping for session3 should be evicted');
console.assert(cache.getWorkIdMapping('session1') === 'work123', 'workId mapping for session1 should still exist');
console.assert(cache.getWorkIdMapping('session4') === 'work444', 'workId mapping for session4 should still exist');

// Test 7: Update existing session (should not evict)
console.log('Testing update existing session...');
const updatedTasks1 = [...tasks1, {
  taskId: 'task3-session1',
  description: 'Third task for session1',
  status: 'TODO' as const
}];

const sizeBefore = cache.size();
cache.setTasks('session1', updatedTasks1);
console.assert(cache.size() === sizeBefore, 'Cache size should not change when updating existing session');

const retrievedUpdated = cache.getTasks('session1');
console.assert(retrievedUpdated!.length === 3, 'Should have 3 tasks after update');

// Test 8: Access order verification
console.log('Testing access order...');
// Current order should be: session5 (LRU), session4, session1 (MRU)
// Access session4 to make it MRU
cache.getTasks('session4');

// Add session6, should evict session5
const tasks6 = createTestTasks('session6');
cache.setTasks('session6', tasks6);

console.assert(cache.hasSession('session5') === false, 'session5 should be evicted');
console.assert(cache.hasSession('session4') === true, 'session4 should still exist (recently accessed)');
console.assert(cache.hasSession('session1') === true, 'session1 should still exist');
console.assert(cache.hasSession('session6') === true, 'session6 should exist (just added)');

console.log('✅ All TaskStoreLRUCache tests PASSED');
console.log('--- TaskStoreLRUCache Tests Finished ---');