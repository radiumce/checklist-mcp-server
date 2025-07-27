/**
 * Unit tests for WorkInfoLRUCache
 * Tests LRU eviction logic, access order tracking, and all cache operations
 */

import assert from 'assert';
import { WorkInfoLRUCache } from '../src/utils/workInfoLRUCache';
import { WorkInfo } from '../src/types/workInfo';

// Helper function to create test work info
const createWorkInfo = (id: string, description: string = `Work ${id}`, summarize: string = `Summary for ${id}`): WorkInfo => ({
  workId: id,
  work_timestamp: new Date().toISOString(),
  work_description: description,
  work_summarize: summarize
});

function testWorkInfoLRUCache() {
  console.log('--- Starting WorkInfoLRUCache Tests ---');
  
  let cache: WorkInfoLRUCache;
  
  // Test Constructor
  console.log('Testing constructor...');
  const defaultCache = new WorkInfoLRUCache();
  assert.strictEqual(defaultCache.size(), 0, 'Default cache should start empty');
  assert.strictEqual(defaultCache.isEmpty(), true, 'Default cache should be empty');

  const customCache = new WorkInfoLRUCache(5);
  assert.strictEqual(customCache.size(), 0, 'Custom cache should start empty');
  assert.strictEqual(customCache.isEmpty(), true, 'Custom cache should be empty');
  console.log('Constructor tests PASSED');

  // Test Basic Operations
  console.log('Testing basic operations...');
  cache = new WorkInfoLRUCache(3);
  
  const workInfo = createWorkInfo('12345678', 'Test work', 'Test summary');
  cache.set(workInfo);
  const retrieved = cache.get('12345678');
  
  assert.deepStrictEqual(retrieved, workInfo, 'Retrieved work info should match stored');
  assert.strictEqual(cache.size(), 1, 'Cache size should be 1');
  assert.strictEqual(cache.isEmpty(), false, 'Cache should not be empty');

  const nonExistent = cache.get('99999999');
  assert.strictEqual(nonExistent, null, 'Non-existent work should return null');

  const workInfo1 = createWorkInfo('12345678', 'Original work', 'Original summary');
  const workInfo2 = createWorkInfo('12345678', 'Updated work', 'Updated summary');
  
  cache.set(workInfo1);
  cache.set(workInfo2);
  
  const updated = cache.get('12345678');
  assert.deepStrictEqual(updated, workInfo2, 'Updated work info should match');
  assert.strictEqual(cache.size(), 1, 'Size should not increase for update');
  console.log('Basic operations tests PASSED');

  // Test LRU Eviction Logic
  console.log('Testing LRU eviction logic...');
  cache = new WorkInfoLRUCache(3);
  
  // Fill cache to capacity
  cache.set(createWorkInfo('11111111', 'Work 1'));
  cache.set(createWorkInfo('22222222', 'Work 2'));
  cache.set(createWorkInfo('33333333', 'Work 3'));
  
  assert.strictEqual(cache.size(), 3, 'Cache should be at capacity');
  
  // Add one more - should evict first entry
  cache.set(createWorkInfo('44444444', 'Work 4'));
  
  assert.strictEqual(cache.size(), 3, 'Cache should maintain max size');
  assert.strictEqual(cache.get('11111111'), null, 'First entry should be evicted');
  assert.notStrictEqual(cache.get('22222222'), null, 'Second entry should exist');
  assert.notStrictEqual(cache.get('33333333'), null, 'Third entry should exist');
  assert.notStrictEqual(cache.get('44444444'), null, 'Fourth entry should exist');

  // Test access order update
  cache = new WorkInfoLRUCache(3);
  cache.set(createWorkInfo('11111111', 'Work 1'));
  cache.set(createWorkInfo('22222222', 'Work 2'));
  cache.set(createWorkInfo('33333333', 'Work 3'));
  
  // Access first entry to make it most recent
  cache.get('11111111');
  
  // Add new entry - should evict second entry (now LRU)
  cache.set(createWorkInfo('44444444', 'Work 4'));
  
  assert.notStrictEqual(cache.get('11111111'), null, 'Accessed entry should still exist');
  assert.strictEqual(cache.get('22222222'), null, 'Second entry should be evicted');
  assert.notStrictEqual(cache.get('33333333'), null, 'Third entry should exist');
  assert.notStrictEqual(cache.get('44444444'), null, 'Fourth entry should exist');
  console.log('LRU eviction logic tests PASSED');

  // Test Recent List Functionality
  console.log('Testing recent list functionality...');
  cache = new WorkInfoLRUCache(3);
  
  const emptyList = cache.getRecentList();
  assert.deepStrictEqual(emptyList, [], 'Empty cache should return empty list');

  const work1 = createWorkInfo('11111111', 'Work 1');
  const work2 = createWorkInfo('22222222', 'Work 2');
  const work3 = createWorkInfo('33333333', 'Work 3');
  
  cache.set(work1);
  cache.set(work2);
  cache.set(work3);
  
  const recentList = cache.getRecentList();
  
  assert.strictEqual(recentList.length, 3, 'Recent list should have 3 entries');
  assert.strictEqual(recentList[0].workId, '33333333', 'Most recent should be first');
  assert.strictEqual(recentList[1].workId, '22222222', 'Second most recent should be second');
  assert.strictEqual(recentList[2].workId, '11111111', 'Least recent should be last');

  // Test access order update in recent list
  cache.get('11111111');
  const updatedList = cache.getRecentList();
  
  assert.strictEqual(updatedList[0].workId, '11111111', 'Accessed entry should be most recent');
  assert.strictEqual(updatedList[1].workId, '33333333', 'Previous most recent should be second');
  assert.strictEqual(updatedList[2].workId, '22222222', 'Previous second should be least recent');

  // Test summary format
  cache = new WorkInfoLRUCache(3);
  const testWorkInfo = createWorkInfo('12345678', 'Test Description', 'Test Summary');
  cache.set(testWorkInfo);
  
  const summaryList = cache.getRecentList();
  
  assert.strictEqual(summaryList.length, 1, 'Summary list should have 1 entry');
  assert.deepStrictEqual(summaryList[0], {
    workId: '12345678',
    work_timestamp: testWorkInfo.work_timestamp,
    work_description: 'Test Description'
  }, 'Summary format should be correct');
  assert.strictEqual(summaryList[0].hasOwnProperty('work_summarize'), false, 'Summary should not include work_summarize');
  console.log('Recent list functionality tests PASSED');

  // Test Cache Management
  console.log('Testing cache management...');
  cache = new WorkInfoLRUCache(3);
  cache.set(createWorkInfo('11111111', 'Work 1'));
  cache.set(createWorkInfo('22222222', 'Work 2'));
  
  assert.strictEqual(cache.size(), 2, 'Cache should have 2 entries');
  
  cache.clear();
  
  assert.strictEqual(cache.size(), 0, 'Cache should be empty after clear');
  assert.strictEqual(cache.isEmpty(), true, 'Cache should be empty');
  assert.deepStrictEqual(cache.getRecentList(), [], 'Recent list should be empty after clear');

  // Test multiple evictions
  cache = new WorkInfoLRUCache(3);
  for (let i = 1; i <= 10; i++) {
    cache.set(createWorkInfo(`${i.toString().padStart(8, '0')}`, `Work ${i}`));
  }
  
  assert.strictEqual(cache.size(), 3, 'Cache should maintain max size');
  
  // Only last 3 entries should remain
  assert.notStrictEqual(cache.get('00000008'), null, 'Entry 8 should exist');
  assert.notStrictEqual(cache.get('00000009'), null, 'Entry 9 should exist');
  assert.notStrictEqual(cache.get('00000010'), null, 'Entry 10 should exist');
  
  // Earlier entries should be evicted
  assert.strictEqual(cache.get('00000001'), null, 'Entry 1 should be evicted');
  assert.strictEqual(cache.get('00000007'), null, 'Entry 7 should be evicted');
  console.log('Cache management tests PASSED');

  // Test Edge Cases
  console.log('Testing edge cases...');
  const singleCache = new WorkInfoLRUCache(1);
  
  singleCache.set(createWorkInfo('11111111', 'Work 1'));
  assert.strictEqual(singleCache.size(), 1, 'Single cache should have 1 entry');
  
  singleCache.set(createWorkInfo('22222222', 'Work 2'));
  assert.strictEqual(singleCache.size(), 1, 'Single cache should still have 1 entry');
  assert.strictEqual(singleCache.get('11111111'), null, 'First entry should be evicted');
  assert.notStrictEqual(singleCache.get('22222222'), null, 'Second entry should exist');

  // Test work info with optional fields
  const workInfoWithSession: WorkInfo = {
    workId: '12345678',
    work_timestamp: new Date().toISOString(),
    work_description: 'Work with session',
    work_summarize: 'Summary with session',
    sessionId: 'test-session',
    work_tasks: { task1: 'TODO' }
  };
  
  cache = new WorkInfoLRUCache(3);
  cache.set(workInfoWithSession);
  const retrievedWithSession = cache.get('12345678');
  
  assert.deepStrictEqual(retrievedWithSession, workInfoWithSession, 'Work info with session should match');
  assert.strictEqual(retrievedWithSession?.sessionId, 'test-session', 'Session ID should match');
  assert.deepStrictEqual(retrievedWithSession?.work_tasks, { task1: 'TODO' }, 'Work tasks should match');
  console.log('Edge cases tests PASSED');

  console.log('--- All WorkInfoLRUCache Tests PASSED ---');
}

// Run the tests
testWorkInfoLRUCache();