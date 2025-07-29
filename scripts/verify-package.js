#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying package configuration...\n');

// Check if all binary files exist
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const binaries = pkg.bin;

let allGood = true;

console.log('📦 Checking binary files:');
for (const [name, binPath] of Object.entries(binaries)) {
  const fullPath = path.resolve(binPath);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${name}: ${binPath}`);
  
  if (!exists) {
    allGood = false;
  } else {
    // Check if file is executable (has shebang)
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasShebang = content.startsWith('#!/usr/bin/env node');
    const shebangStatus = hasShebang ? '✅' : '⚠️';
    console.log(`    ${shebangStatus} Shebang: ${hasShebang ? 'Present' : 'Missing'}`);
  }
}

console.log('\n📋 Package info:');
console.log(`  Name: ${pkg.name}`);
console.log(`  Version: ${pkg.version}`);
console.log(`  Main: ${pkg.main}`);
console.log(`  Description: ${pkg.description}`);

console.log('\n🔧 Scripts:');
const importantScripts = ['build', 'start', 'test'];
for (const script of importantScripts) {
  const exists = pkg.scripts[script] ? '✅' : '❌';
  console.log(`  ${exists} ${script}: ${pkg.scripts[script] || 'Missing'}`);
}

if (allGood) {
  console.log('\n🎉 Package configuration looks good!');
  console.log('\nReady for npx usage:');
  console.log('  npx checklist-mcp-server');
  console.log('  npx checklist-mcp-server --help');
  console.log('  npx checklist-mcp-server --port 3000');
} else {
  console.log('\n❌ Some issues found. Please run "npm run build" first.');
  process.exit(1);
}