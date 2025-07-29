#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Publishing Checklist MCP Server to npm...\n');

// Read package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(`📦 Package: ${pkg.name}@${pkg.version}`);
console.log(`📝 Description: ${pkg.description}\n`);

// Pre-publish checks
console.log('🔍 Running pre-publish checks...');

try {
  // Check if logged in to npm
  console.log('  ✓ Checking npm authentication...');
  const whoami = execSync('npm whoami', { encoding: 'utf8' }).trim();
  console.log(`    Logged in as: ${whoami}`);

  // Build project
  console.log('  ✓ Building project...');
  execSync('npm run build', { stdio: 'inherit' });

  // Run tests
  console.log('  ✓ Running tests...');
  execSync('npm test', { stdio: 'inherit' });

  // Verify package
  console.log('  ✓ Verifying package...');
  execSync('npm run verify', { stdio: 'inherit' });

  // Check what will be published
  console.log('  ✓ Checking package contents...');
  const packOutput = execSync('npm pack --dry-run', { encoding: 'utf8' });
  console.log('    Files to be published:');
  packOutput.split('\n').forEach(line => {
    if (line.trim() && !line.includes('npm notice')) {
      console.log(`      ${line}`);
    }
  });

} catch (error) {
  console.error('❌ Pre-publish checks failed:', error.message);
  process.exit(1);
}

console.log('\n✅ All pre-publish checks passed!');

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\n🤔 Do you want to publish now? (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    try {
      console.log('\n📤 Publishing to npm...');
      execSync('npm publish', { stdio: 'inherit' });
      
      console.log('\n🎉 Successfully published to npm!');
      console.log('\n📋 Next steps:');
      console.log(`  • Test installation: npx ${pkg.name}@latest`);
      console.log(`  • View on npm: https://www.npmjs.com/package/${pkg.name}`);
      console.log(`  • Update documentation if needed`);
      console.log(`  • Create GitHub release (if using GitHub)`);
      
    } catch (error) {
      console.error('❌ Publishing failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n⏸️  Publishing cancelled.');
  }
  
  rl.close();
});