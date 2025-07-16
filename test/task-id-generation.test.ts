import assert from 'assert';

// Import the functions we need to test
// Since these are internal functions, we'll need to extract them or make them exportable
// For now, let's duplicate the functions here for testing purposes

interface Task {
  taskId: string;
  description: string;
  status: 'TODO' | 'DONE';
  children?: Task[];
}

/**
 * Generates a unique task ID that is 1-20 characters long, allowing letters, numbers, and symbols
 * @returns A valid task ID string
 */
function generateTaskId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_@#$%&+=!.';
  
  // Generate random length between 3-8 characters (keeping reasonable default range for usability)
  // While the validation allows 1-20 characters, we generate shorter IDs for better user experience
  const length = Math.floor(Math.random() * 6) + 3; // 3 to 8 characters
  let id = '';
  
  for (let i = 0; i < length; i++) {
    // Any character from the allowed set
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Since our validation is now very permissive, generated IDs should always be valid
  // But we still validate as a safety check
  if (!validateTaskId(id)) {
    // This should rarely happen, but provide a fallback
    return 'task' + Math.floor(Math.random() * 1000);
  }
  
  return id;
}

/**
 * Validates that a task ID meets the format requirements
 * @param id The task ID to validate
 * @returns true if the ID is valid, false otherwise
 */
function validateTaskId(id: string): boolean {
  // Check length (1-20 characters, allowing more flexibility)
  if (id.length < 1 || id.length > 20) {
    return false;
  }
  
  // Allow letters, numbers, and common symbols
  // Excluding only characters that might cause issues in paths or parsing: / \ : * ? " < > |
  const validCharsRegex = /^[a-zA-Z0-9\-_@#$%&+=!.]+$/;
  if (!validCharsRegex.test(id)) {
    return false;
  }
  
  // No additional restrictions - pure numbers, symbols, etc. are all allowed
  return true;
}

/**
 * Checks if a task ID is unique within the session's task hierarchy
 * @param id The task ID to check
 * @param sessionTasks The root tasks array for the session
 * @returns true if the ID is unique, false if it already exists
 */
function isUniqueInSession(id: string, sessionTasks: Task[]): boolean {
  function checkTasksRecursively(tasks: Task[]): boolean {
    for (const task of tasks) {
      if (task.taskId === id) {
        return false; // ID already exists
      }
      if (task.children && task.children.length > 0) {
        if (!checkTasksRecursively(task.children)) {
          return false; // ID found in children
        }
      }
    }
    return true; // ID not found (unique)
  }
  
  return checkTasksRecursively(sessionTasks);
}

// Test suite for task ID generation system
async function runTaskIdTests() {
  console.log('--- Starting Task ID Generation Tests ---');
  
  try {
    // Test 1: validateTaskId function
    console.log('Testing validateTaskId function...');
    
    // Valid IDs - letters, numbers, symbols
    assert(validateTaskId('abc') === true, 'Should accept 3-character ID with letters');
    assert(validateTaskId('a1b2c3d4') === true, 'Should accept 8-character mixed ID');
    assert(validateTaskId('auth1') === true, 'Should accept typical task ID');
    assert(validateTaskId('ui2') === true, 'Should accept short mixed ID');
    assert(validateTaskId('step') === true, 'Should accept all-letter ID');
    assert(validateTaskId('123') === true, 'Should accept pure numbers');
    assert(validateTaskId('12345') === true, 'Should accept longer pure numbers');
    assert(validateTaskId('ab-c') === true, 'Should accept IDs with hyphens');
    assert(validateTaskId('ab_c') === true, 'Should accept IDs with underscores');
    assert(validateTaskId('@task') === true, 'Should accept IDs with @ symbol');
    assert(validateTaskId('task#1') === true, 'Should accept IDs with # symbol');
    assert(validateTaskId('v1.0') === true, 'Should accept IDs with dots');
    assert(validateTaskId('user+admin') === true, 'Should accept IDs with + symbol');
    assert(validateTaskId('test!') === true, 'Should accept IDs with exclamation');
    assert(validateTaskId('x') === true, 'Should accept single character ID');
    
    // Invalid IDs - too long
    assert(validateTaskId('a'.repeat(21)) === false, 'Should reject IDs longer than 20 characters');
    
    // Invalid IDs - empty
    assert(validateTaskId('') === false, 'Should reject empty ID');
    
    // Invalid IDs - forbidden characters
    assert(validateTaskId('ab/c') === false, 'Should reject IDs with forward slash');
    assert(validateTaskId('ab\\c') === false, 'Should reject IDs with backslash');
    assert(validateTaskId('ab:c') === false, 'Should reject IDs with colon');
    assert(validateTaskId('ab*c') === false, 'Should reject IDs with asterisk');
    assert(validateTaskId('ab?c') === false, 'Should reject IDs with question mark');
    assert(validateTaskId('ab"c') === false, 'Should reject IDs with double quote');
    assert(validateTaskId('ab<c') === false, 'Should reject IDs with less than');
    assert(validateTaskId('ab>c') === false, 'Should reject IDs with greater than');
    assert(validateTaskId('ab|c') === false, 'Should reject IDs with pipe');
    assert(validateTaskId('ab c') === false, 'Should reject IDs with spaces');
    
    console.log('validateTaskId tests PASSED');
    
    // Test 2: generateTaskId function
    console.log('Testing generateTaskId function...');
    
    // Generate multiple IDs and verify they all meet requirements
    const generatedIds = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const id = generateTaskId();
      
      // Each generated ID should be valid
      assert(validateTaskId(id) === true, `Generated ID '${id}' should be valid`);
      
      // Check length is within range (generator still uses 3-8 for reasonable defaults)
      assert(id.length >= 3 && id.length <= 8, `Generated ID '${id}' should be 3-8 characters`);
      
      // Check it contains only allowed characters
      assert(/^[a-zA-Z0-9\-_@#$%&+=!.]+$/.test(id), `Generated ID '${id}' should contain only allowed characters`);
      
      generatedIds.add(id);
    }
    
    // Check that we get some variety in generated IDs (not all the same)
    assert(generatedIds.size > 1, 'Should generate varied IDs, not all identical');
    
    console.log(`Generated ${generatedIds.size} unique IDs out of 100 attempts`);
    console.log('generateTaskId tests PASSED');
    
    // Test 3: isUniqueInSession function
    console.log('Testing isUniqueInSession function...');
    
    // Create test task hierarchy
    const testTasks: Task[] = [
      {
        taskId: 'auth1',
        description: 'Authentication task',
        status: 'TODO',
        children: [
          {
            taskId: 'login',
            description: 'Login functionality',
            status: 'TODO'
          },
          {
            taskId: 'logout',
            description: 'Logout functionality', 
            status: 'DONE'
          }
        ]
      },
      {
        taskId: 'ui2',
        description: 'UI task',
        status: 'TODO',
        children: [
          {
            taskId: 'forms',
            description: 'Form components',
            status: 'TODO',
            children: [
              {
                taskId: 'valid8',
                description: 'Form validation',
                status: 'TODO'
              }
            ]
          }
        ]
      }
    ];
    
    // Test existing IDs (should not be unique)
    assert(isUniqueInSession('auth1', testTasks) === false, 'Should detect existing root task ID');
    assert(isUniqueInSession('login', testTasks) === false, 'Should detect existing child task ID');
    assert(isUniqueInSession('valid8', testTasks) === false, 'Should detect existing nested task ID');
    
    // Test non-existing IDs (should be unique)
    assert(isUniqueInSession('newId', testTasks) === true, 'Should allow new unique ID');
    assert(isUniqueInSession('test1', testTasks) === true, 'Should allow another unique ID');
    
    // Test empty task list
    assert(isUniqueInSession('anyId', []) === true, 'Should allow any ID in empty task list');
    
    console.log('isUniqueInSession tests PASSED');
    
    // Test 4: Integration test - generate unique IDs for existing session
    console.log('Testing integration scenario...');
    
    let uniqueId: string;
    let attempts = 0;
    const maxAttempts = 1000;
    
    do {
      uniqueId = generateTaskId();
      attempts++;
    } while (!isUniqueInSession(uniqueId, testTasks) && attempts < maxAttempts);
    
    assert(attempts < maxAttempts, 'Should be able to generate unique ID within reasonable attempts');
    assert(isUniqueInSession(uniqueId, testTasks), 'Generated ID should be unique in session');
    assert(validateTaskId(uniqueId), 'Generated unique ID should be valid');
    
    console.log(`Generated unique ID '${uniqueId}' in ${attempts} attempts`);
    console.log('Integration test PASSED');
    
    console.log('--- All Task ID Generation Tests PASSED ---');
    
  } catch (error) {
    console.error('--- Task ID Generation Tests FAILED ---');
    console.error(error);
    process.exitCode = 1;
  }
}

// Run the tests
runTaskIdTests();