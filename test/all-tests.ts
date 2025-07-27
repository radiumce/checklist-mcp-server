#!/usr/bin/env node

import { spawn } from 'child_process';

// List of all test files to run
const testFiles = [
  'test/core-functionality.test.ts',
  'test/task-id-generation.test.ts', 
  'test/error-handling-validation.test.ts',
  'test/run_tests.ts', // Basic integration tests
  'test/integration-comprehensive.test.ts', // Comprehensive integration tests
  'test/work-info-data-structures.test.ts', // Work info data structures and validation tests
  'test/workInfoLRUCache.test.ts', // LRU cache unit tests
  'test/save-current-work-info.test.ts', // Save work info integration tests
  'test/get-recent-works-info.test.ts', // Get recent works integration tests
  'test/get-work-by-id.test.ts', // Get work by ID integration tests
  'test/work-info-comprehensive.test.ts', // Comprehensive work info tests
  'test/final-validation.test.ts' // Final requirements validation
];

async function runTest(testFile: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    console.log(`\n=== Running ${testFile} ===`);
    
    const child = spawn('npx', ['ts-node', testFile], {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      const success = code === 0;
      const fullOutput = output + (errorOutput ? '\nSTDERR:\n' + errorOutput : '');
      
      if (success) {
        console.log(`✅ ${testFile} PASSED`);
      } else {
        console.log(`❌ ${testFile} FAILED (exit code: ${code})`);
      }
      
      resolve({ success, output: fullOutput });
    });

    child.on('error', (error) => {
      console.error(`❌ ${testFile} ERROR: ${error.message}`);
      resolve({ success: false, output: error.message });
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Test Suite');
  console.log('=====================================');
  
  const results: Array<{ file: string; success: boolean; output: string }> = [];
  
  // Run each test file
  for (const testFile of testFiles) {
    const result = await runTest(testFile);
    results.push({
      file: testFile,
      success: result.success,
      output: result.output
    });
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.file}`);
  });
  
  console.log(`\nTotal: ${results.length} test suites`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Test run interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test run terminated');
  process.exit(1);
});

// Run all tests
runAllTests().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});