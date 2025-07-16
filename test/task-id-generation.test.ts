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
 * Generates a unique task ID that is 3-8 characters long, alphanumeric, and avoids pure numbers
 * @returns A valid task ID string
 */
function generateTaskId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  let id: string;
  let attempts = 0;
  const maxAttempts = 100;
  
  do {
    // Generate random length between 3-8 characters
    const length = Math.floor(Math.random() * 6) + 3; // 3 to 8 characters
    id = '';
    
    // Ensure at least one letter to avoid pure numbers
    const letterPosition = Math.floor(Math.random() * length);
    
    for (let i = 0; i < length; i++) {
      if (i === letterPosition) {
        // Force a letter at this position
        id += letters.charAt(Math.floor(Math.random() * letters.length));
      } else {
        // Any alphanumeric character
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    attempts++;
    if (attempts >= maxAttempts) {
      // Fallback to ensure we don't get stuck in infinite loop
      id = 'task' + Math.floor(Math.random() * 1000);
      break;
    }
  } while (!validateTaskId(id));
  
  return id;
}

/**
 * Validates that a task ID meets the format requirements
 * @param id The task ID to validate
 * @returns true if the ID is valid, false otherwise
 */
function validateTaskId(id: string): boolean {
  // Check length (3-8 characters)
  if (id.length < 3 || id.length > 8) {
    return false;
  }
  
  // Check that it's alphanumeric
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  if (!alphanumericRegex.test(id)) {
    return false;
  }
  
  // Check that it's not pure numbers (must contain at least one letter)
  const hasLetter = /[a-zA-Z]/.test(id);
  if (!hasLetter) {
    return false;
  }
  
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
    
    // Valid IDs
    assert(validateTaskId('abc') === true, 'Should accept 3-character ID with letters');
    assert(validateTaskId('a1b2c3d4') === true, 'Should accept 8-character mixed ID');
    assert(validateTaskId('auth1') === true, 'Should accept typical task ID');
    assert(validateTaskId('ui2') === true, 'Should accept short mixed ID');
    assert(validateTaskId('step') === true, 'Should accept all-letter ID');
    
    // Invalid IDs - too short/long
    assert(validateTaskId('ab') === false, 'Should reject 2-character ID');
    assert(validateTaskId('abcdefghi') === false, 'Should reject 9-character ID');
    
    // Invalid IDs - pure numbers
    assert(validateTaskId('123') === false, 'Should reject pure numbers');
    assert(validateTaskId('12345') === false, 'Should reject longer pure numbers');
    
    // Invalid IDs - special characters
    assert(validateTaskId('ab-c') === false, 'Should reject IDs with hyphens');
    assert(validateTaskId('ab_c') === false, 'Should reject IDs with underscores');
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
      
      // Check length is within range
      assert(id.length >= 3 && id.length <= 8, `Generated ID '${id}' should be 3-8 characters`);
      
      // Check it's alphanumeric
      assert(/^[a-zA-Z0-9]+$/.test(id), `Generated ID '${id}' should be alphanumeric`);
      
      // Check it has at least one letter
      assert(/[a-zA-Z]/.test(id), `Generated ID '${id}' should contain at least one letter`);
      
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