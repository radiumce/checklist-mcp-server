#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Pre-publish checklist...\n');

const checks = [];

// Check package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

checks.push({
  name: 'Package name is set',
  passed: pkg.name && pkg.name.length > 0,
  value: pkg.name
});

checks.push({
  name: 'Version is set',
  passed: pkg.version && pkg.version.length > 0,
  value: pkg.version
});

checks.push({
  name: 'Description is set',
  passed: pkg.description && pkg.description.length > 0,
  value: pkg.description
});

checks.push({
  name: 'Author is set',
  passed: pkg.author && pkg.author.length > 0,
  value: pkg.author
});

checks.push({
  name: 'License is set',
  passed: pkg.license && pkg.license.length > 0,
  value: pkg.license
});

checks.push({
  name: 'Repository is set',
  passed: pkg.repository && pkg.repository.url,
  value: pkg.repository?.url
});

checks.push({
  name: 'Keywords are set',
  passed: pkg.keywords && pkg.keywords.length > 0,
  value: `${pkg.keywords?.length || 0} keywords`
});

checks.push({
  name: 'Main entry point exists',
  passed: pkg.main && fs.existsSync(pkg.main),
  value: pkg.main
});

// Check binary files
if (pkg.bin) {
  for (const [name, binPath] of Object.entries(pkg.bin)) {
    checks.push({
      name: `Binary '${name}' exists`,
      passed: fs.existsSync(binPath),
      value: binPath
    });
  }
}

// Check required files
const requiredFiles = ['README.md', 'LICENSE', 'CHANGELOG.md'];
for (const file of requiredFiles) {
  checks.push({
    name: `${file} exists`,
    passed: fs.existsSync(file),
    value: file
  });
}

// Check dist directory
checks.push({
  name: 'dist/ directory exists',
  passed: fs.existsSync('dist') && fs.statSync('dist').isDirectory(),
  value: 'dist/'
});

// Check .npmignore
checks.push({
  name: '.npmignore exists',
  passed: fs.existsSync('.npmignore'),
  value: '.npmignore'
});

// Display results
let allPassed = true;
for (const check of checks) {
  const status = check.passed ? '✅' : '❌';
  console.log(`${status} ${check.name}: ${check.value || 'N/A'}`);
  if (!check.passed) allPassed = false;
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Ready to publish.');
  console.log('\nTo publish:');
  console.log('  npm run publish:interactive');
  console.log('  # or');
  console.log('  npm publish');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  process.exit(1);
}

// Show package size estimate
try {
  const { execSync } = require('child_process');
  const packOutput = execSync('npm pack --dry-run 2>/dev/null', { encoding: 'utf8' });
  const lines = packOutput.split('\n');
  const sizeLine = lines.find(line => line.includes('package size'));
  if (sizeLine) {
    console.log(`\n📦 ${sizeLine.trim()}`);
  }
} catch (error) {
  // Ignore errors in size calculation
}