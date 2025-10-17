/**
 * Test namespace LRU eviction mechanism
 */

import { namespaceManager } from '../src/utils/namespaceManager.js';

console.log('Testing Namespace LRU Eviction Mechanism\n');

// Test 1: Create namespaces up to the limit
console.log('Test 1: Creating namespaces up to limit (32)...');
const maxNamespaces = parseInt(process.env.MAX_NAMESPACES || '32', 10);

// Create default namespace first
namespaceManager.getCaches('default');
console.log(`✓ Created default namespace`);

// Create namespaces up to the limit (including default)
for (let i = 1; i < maxNamespaces; i++) {
  namespaceManager.getCaches(`namespace-${i}`);
}
console.log(`✓ Created ${maxNamespaces - 1} additional namespaces`);

let activeNamespaces = namespaceManager.getActiveNamespaces();
console.log(`✓ Total active namespaces: ${activeNamespaces.length}`);

if (activeNamespaces.length !== maxNamespaces) {
  console.error(`✗ Expected ${maxNamespaces} namespaces, got ${activeNamespaces.length}`);
  process.exit(1);
}

// Test 2: Create one more namespace, should evict the least recently used
console.log('\nTest 2: Creating namespace beyond limit...');
const oldestNamespace = 'namespace-1'; // This should be evicted
namespaceManager.getCaches('namespace-new');

activeNamespaces = namespaceManager.getActiveNamespaces();
console.log(`✓ Total active namespaces after eviction: ${activeNamespaces.length}`);

if (activeNamespaces.length !== maxNamespaces) {
  console.error(`✗ Expected ${maxNamespaces} namespaces after eviction, got ${activeNamespaces.length}`);
  process.exit(1);
}

if (activeNamespaces.includes(oldestNamespace)) {
  console.error(`✗ Oldest namespace '${oldestNamespace}' was not evicted`);
  process.exit(1);
}

if (!activeNamespaces.includes('namespace-new')) {
  console.error(`✗ New namespace 'namespace-new' was not created`);
  process.exit(1);
}

console.log(`✓ Oldest namespace '${oldestNamespace}' was evicted`);
console.log(`✓ New namespace 'namespace-new' was created`);

// Test 3: Access an old namespace to make it recently used
console.log('\nTest 3: Testing LRU access order...');
const targetNamespace = 'namespace-2'; // This should be the next to evict
namespaceManager.getCaches(targetNamespace); // Access it to make it recently used

// Create another new namespace
namespaceManager.getCaches('namespace-newer');

activeNamespaces = namespaceManager.getActiveNamespaces();

if (activeNamespaces.includes(targetNamespace)) {
  console.log(`✓ Accessed namespace '${targetNamespace}' was not evicted (LRU working)`);
} else {
  console.error(`✗ Accessed namespace '${targetNamespace}' was evicted (LRU not working)`);
  process.exit(1);
}

// Test 4: Verify default namespace is never evicted
console.log('\nTest 4: Verifying default namespace protection...');
if (!activeNamespaces.includes('default')) {
  console.error(`✗ Default namespace was evicted!`);
  process.exit(1);
}
console.log(`✓ Default namespace is still active`);

// Test 5: Try to clear default namespace (should fail)
console.log('\nTest 5: Testing default namespace protection from clearing...');
const cleared = namespaceManager.clearNamespace('default');
if (cleared) {
  console.error(`✗ Default namespace was cleared!`);
  process.exit(1);
}
console.log(`✓ Default namespace cannot be cleared`);

// Test 6: Clear a regular namespace
console.log('\nTest 6: Testing namespace clearing...');
// Use a namespace that still exists (not evicted)
const clearTarget = 'namespace-10'; // This should still exist
const clearedSuccess = namespaceManager.clearNamespace(clearTarget);
if (!clearedSuccess) {
  console.error(`✗ Failed to clear namespace '${clearTarget}'`);
  process.exit(1);
}

activeNamespaces = namespaceManager.getActiveNamespaces();
if (activeNamespaces.includes(clearTarget)) {
  console.error(`✗ Namespace '${clearTarget}' still exists after clearing`);
  process.exit(1);
}
console.log(`✓ Namespace '${clearTarget}' was cleared successfully`);

// Test 7: Statistics
console.log('\nTest 7: Checking namespace statistics...');
const stats = namespaceManager.getStats();
console.log(`✓ Statistics retrieved for ${Object.keys(stats).length} namespaces`);

console.log('\n=== All tests passed! ===\n');
console.log('Summary:');
console.log(`- Max namespaces: ${maxNamespaces}`);
console.log(`- Active namespaces: ${namespaceManager.getActiveNamespaces().length}`);
console.log(`- Default namespace protected: ✓`);
console.log(`- LRU eviction working: ✓`);
console.log(`- Namespace clearing working: ✓`);
