/**
 * Tests for work information data structures and utilities
 */

import assert from 'assert';
import { WorkIdGenerator } from '../src/utils/workIdGenerator';
import { 
  validateWorkSummarize,
  validateWorkDescription,
  validateSessionId,
  validateWorkId,
  validateSaveWorkInfoInput,
  validateGetWorkByIdInput,
  validateWorkInfo,
  createTimestamp,
  isValidTimestamp
} from '../src/utils/workInfoValidation';
import type { WorkInfo, SaveWorkInfoInput, GetWorkByIdInput } from '../src/types/workInfo';

function testWorkIdGenerator() {
  console.log('--- Starting WorkIdGenerator Tests ---');
  
  // Reset used IDs before each test group
  WorkIdGenerator.resetUsedIds();

  console.log('Testing unique ID generation...');
  const id1 = WorkIdGenerator.generateUniqueId();
  const id2 = WorkIdGenerator.generateUniqueId();
  
  assert(/^\d{8}$/.test(id1), `ID1 should be 8 digits: ${id1}`);
  assert(/^\d{8}$/.test(id2), `ID2 should be 8 digits: ${id2}`);
  assert(id1 !== id2, 'IDs should be unique');
  console.log('✓ Unique ID generation test passed');

  console.log('Testing ID range validation...');
  const id = WorkIdGenerator.generateUniqueId();
  const numId = parseInt(id, 10);
  
  assert(numId >= 10000000, `ID should be >= 10000000: ${numId}`);
  assert(numId <= 99999999, `ID should be <= 99999999: ${numId}`);
  console.log('✓ ID range validation test passed');

  console.log('Testing work ID format validation...');
  assert(WorkIdGenerator.isValidWorkId('12345678') === true, 'Valid 8-digit ID should pass');
  assert(WorkIdGenerator.isValidWorkId('10000000') === true, 'Minimum valid ID should pass');
  assert(WorkIdGenerator.isValidWorkId('99999999') === true, 'Maximum valid ID should pass');
  
  assert(WorkIdGenerator.isValidWorkId('1234567') === false, '7 digits should fail');
  assert(WorkIdGenerator.isValidWorkId('123456789') === false, '9 digits should fail');
  assert(WorkIdGenerator.isValidWorkId('1234567a') === false, 'Letters should fail');
  assert(WorkIdGenerator.isValidWorkId('09999999') === false, 'Leading zero should fail');
  assert(WorkIdGenerator.isValidWorkId('') === false, 'Empty string should fail');
  console.log('✓ Work ID format validation test passed');

  console.log('Testing used ID tracking...');
  WorkIdGenerator.resetUsedIds();
  assert(WorkIdGenerator.getUsedIdCount() === 0, 'Should start with 0 used IDs');
  
  const trackedId1 = WorkIdGenerator.generateUniqueId();
  assert(WorkIdGenerator.getUsedIdCount() === 1, 'Should have 1 used ID');
  assert(WorkIdGenerator.isIdUsed(trackedId1) === true, 'Generated ID should be marked as used');
  
  const trackedId2 = WorkIdGenerator.generateUniqueId();
  assert(WorkIdGenerator.getUsedIdCount() === 2, 'Should have 2 used IDs');
  assert(WorkIdGenerator.isIdUsed(trackedId2) === true, 'Second generated ID should be marked as used');
  console.log('✓ Used ID tracking test passed');

  console.log('Testing manual ID marking...');
  WorkIdGenerator.resetUsedIds();
  WorkIdGenerator.markIdAsUsed('12345678');
  assert(WorkIdGenerator.isIdUsed('12345678') === true, 'Manually marked ID should be tracked');
  assert(WorkIdGenerator.getUsedIdCount() === 1, 'Should have 1 used ID after manual marking');
  console.log('✓ Manual ID marking test passed');

  console.log('Testing invalid ID marking error...');
  try {
    WorkIdGenerator.markIdAsUsed('invalid');
    assert(false, 'Should have thrown error for invalid ID');
  } catch (error: any) {
    assert(error.message.includes('Invalid work ID format'), 'Should throw correct error message');
  }
  console.log('✓ Invalid ID marking error test passed');

  console.log('--- All WorkIdGenerator Tests PASSED ---');
}

function testWorkInfoValidation() {
  console.log('--- Starting Work Info Validation Tests ---');
  
  console.log('Testing validateWorkSummarize...');
  const validSummaryResult = validateWorkSummarize('This is a valid work summary');
  assert(validSummaryResult.isValid === true, 'Valid work summary should pass');
  assert(validSummaryResult.errors.length === 0, 'Valid work summary should have no errors');

  assert(validateWorkSummarize('').isValid === false, 'Empty summary should fail');
  assert(validateWorkSummarize('   ').isValid === false, 'Whitespace-only summary should fail');
  assert(validateWorkSummarize(null as any).isValid === false, 'Null summary should fail');
  assert(validateWorkSummarize(undefined as any).isValid === false, 'Undefined summary should fail');
  assert(validateWorkSummarize(123 as any).isValid === false, 'Number summary should fail');

  const longText = 'a'.repeat(5001);
  const longSummaryResult = validateWorkSummarize(longText);
  assert(longSummaryResult.isValid === false, 'Long summary should fail');
  assert(longSummaryResult.errors[0].includes('cannot exceed 5000 characters'), 'Should have correct error message');
  console.log('✓ validateWorkSummarize tests passed');

  console.log('Testing validateWorkDescription...');
  const validDescResult = validateWorkDescription('Valid description');
  assert(validDescResult.isValid === true, 'Valid description should pass');
  assert(validDescResult.errors.length === 0, 'Valid description should have no errors');

  assert(validateWorkDescription('').isValid === false, 'Empty description should fail');
  assert(validateWorkDescription('   ').isValid === false, 'Whitespace-only description should fail');
  assert(validateWorkDescription(null as any).isValid === false, 'Null description should fail');
  assert(validateWorkDescription(undefined as any).isValid === false, 'Undefined description should fail');

  const longDesc = 'a'.repeat(201);
  const longDescResult = validateWorkDescription(longDesc);
  assert(longDescResult.isValid === false, 'Long description should fail');
  assert(longDescResult.errors[0].includes('cannot exceed 200 characters'), 'Should have correct error message');
  console.log('✓ validateWorkDescription tests passed');

  console.log('Testing validateSessionId...');
  assert(validateSessionId('session123').isValid === true, 'Valid session ID should pass');
  assert(validateSessionId('session-123').isValid === true, 'Session ID with dash should pass');
  assert(validateSessionId('session_123').isValid === true, 'Session ID with underscore should pass');
  assert(validateSessionId('ABC123').isValid === true, 'Alphanumeric session ID should pass');

  assert(validateSessionId('').isValid === false, 'Empty session ID should fail');
  assert(validateSessionId('a'.repeat(101)).isValid === false, 'Long session ID should fail');
  assert(validateSessionId('session@123').isValid === false, 'Session ID with @ should fail');
  assert(validateSessionId('session 123').isValid === false, 'Session ID with space should fail');
  assert(validateSessionId(123 as any).isValid === false, 'Number session ID should fail');
  console.log('✓ validateSessionId tests passed');

  console.log('Testing validateWorkId...');
  assert(validateWorkId('12345678').isValid === true, 'Valid work ID should pass');
  assert(validateWorkId('10000000').isValid === true, 'Minimum work ID should pass');
  assert(validateWorkId('99999999').isValid === true, 'Maximum work ID should pass');

  assert(validateWorkId('').isValid === false, 'Empty work ID should fail');
  assert(validateWorkId('1234567').isValid === false, '7-digit work ID should fail');
  assert(validateWorkId('123456789').isValid === false, '9-digit work ID should fail');
  assert(validateWorkId('1234567a').isValid === false, 'Work ID with letter should fail');
  assert(validateWorkId(null as any).isValid === false, 'Null work ID should fail');
  console.log('✓ validateWorkId tests passed');

  console.log('Testing validateSaveWorkInfoInput...');
  const validSaveInput: SaveWorkInfoInput = {
    work_summarize: 'Valid summary',
    work_description: 'Valid description',
    sessionId: 'session123'
  };
  const validSaveResult = validateSaveWorkInfoInput(validSaveInput);
  assert(validSaveResult.isValid === true, 'Valid save input should pass');
  assert(validSaveResult.errors.length === 0, 'Valid save input should have no errors');

  const inputWithoutSession = {
    work_summarize: 'Valid summary',
    work_description: 'Valid description'
  };
  const resultWithoutSession = validateSaveWorkInfoInput(inputWithoutSession);
  assert(resultWithoutSession.isValid === true, 'Input without session should pass');

  const invalidSaveInput = {
    work_summarize: '',
    work_description: '',
    sessionId: 'invalid@session'
  };
  const invalidSaveResult = validateSaveWorkInfoInput(invalidSaveInput);
  assert(invalidSaveResult.isValid === false, 'Invalid save input should fail');
  assert(invalidSaveResult.errors.length > 0, 'Invalid save input should have errors');
  console.log('✓ validateSaveWorkInfoInput tests passed');

  console.log('Testing validateGetWorkByIdInput...');
  const validGetInput: GetWorkByIdInput = {
    workId: '12345678'
  };
  const validGetResult = validateGetWorkByIdInput(validGetInput);
  assert(validGetResult.isValid === true, 'Valid get input should pass');
  assert(validGetResult.errors.length === 0, 'Valid get input should have no errors');

  const invalidGetInput = {
    workId: 'invalid'
  };
  const invalidGetResult = validateGetWorkByIdInput(invalidGetInput);
  assert(invalidGetResult.isValid === false, 'Invalid get input should fail');
  assert(invalidGetResult.errors.length > 0, 'Invalid get input should have errors');
  console.log('✓ validateGetWorkByIdInput tests passed');

  console.log('Testing validateWorkInfo...');
  const completeWorkInfo: WorkInfo = {
    workId: '12345678',
    work_timestamp: new Date().toISOString(),
    work_description: 'Test description',
    work_summarize: 'Test summary',
    sessionId: 'session123'
  };
  const completeResult = validateWorkInfo(completeWorkInfo);
  assert(completeResult.isValid === true, 'Complete work info should pass');
  assert(completeResult.errors.length === 0, 'Complete work info should have no errors');

  const minimalWorkInfo = {
    workId: '12345678',
    work_timestamp: new Date().toISOString(),
    work_description: 'Test description',
    work_summarize: 'Test summary'
  };
  const minimalResult = validateWorkInfo(minimalWorkInfo);
  assert(minimalResult.isValid === true, 'Minimal work info should pass');

  const invalidWorkInfo = {
    workId: 'invalid',
    work_timestamp: 'invalid-date',
    work_description: '',
    work_summarize: ''
  };
  const invalidWorkResult = validateWorkInfo(invalidWorkInfo);
  assert(invalidWorkResult.isValid === false, 'Invalid work info should fail');
  assert(invalidWorkResult.errors.length > 0, 'Invalid work info should have errors');
  console.log('✓ validateWorkInfo tests passed');

  console.log('Testing timestamp utilities...');
  const timestamp = createTimestamp();
  assert(typeof timestamp === 'string', 'Timestamp should be string');
  assert(isValidTimestamp(timestamp) === true, 'Created timestamp should be valid');

  const validTimestamp = new Date().toISOString();
  assert(isValidTimestamp(validTimestamp) === true, 'ISO timestamp should be valid');
  
  assert(isValidTimestamp('invalid') === false, 'Invalid timestamp should fail');
  assert(isValidTimestamp('2023-01-01') === false, 'Date-only timestamp should fail');
  assert(isValidTimestamp('') === false, 'Empty timestamp should fail');
  console.log('✓ Timestamp utilities tests passed');

  console.log('--- All Work Info Validation Tests PASSED ---');
}

// Run all tests
function runAllDataStructureTests() {
  console.log('=== Starting Work Info Data Structures Test Suite ===');
  
  try {
    testWorkIdGenerator();
    testWorkInfoValidation();
    
    console.log('\n🎉 All Work Info Data Structure Tests PASSED!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Work Info Data Structure Tests FAILED:', error);
    process.exit(1);
  }
}

// Run the tests
runAllDataStructureTests();