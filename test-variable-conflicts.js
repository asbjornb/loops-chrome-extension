#!/usr/bin/env node

/**
 * Test for variable conflicts between service worker modules
 * This test specifically looks for duplicate variable declarations
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing for variable conflicts...\n');

const serviceWorkerFiles = ['sync.js', 'github-sync.js'];
const globalVariables = new Map(); // variable name -> file that declares it
let conflictsFound = false;

// Common variable patterns to look for
const variablePatterns = [
  /^const\s+(\w+)/gm,
  /^let\s+(\w+)/gm,
  /^var\s+(\w+)/gm,
  /^function\s+(\w+)/gm,
];

for (const file of serviceWorkerFiles) {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${file}`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`📂 Checking ${file}...`);

  for (const pattern of variablePatterns) {
    let match;
    pattern.lastIndex = 0; // Reset regex state

    while ((match = pattern.exec(content)) !== null) {
      const variableName = match[1];

      // Skip some common/expected variables
      if (['console', 'chrome', 'self', 'window'].includes(variableName)) {
        continue;
      }

      if (globalVariables.has(variableName)) {
        const previousFile = globalVariables.get(variableName);
        console.error(`❌ Variable conflict found!`);
        console.error(`   Variable: ${variableName}`);
        console.error(`   First declared in: ${previousFile}`);
        console.error(`   Also declared in: ${file}`);
        conflictsFound = true;
      } else {
        globalVariables.set(variableName, file);
        console.log(`   ✓ ${variableName}`);
      }
    }
  }
}

console.log('\n' + '='.repeat(50));
if (conflictsFound) {
  console.log('💥 Variable conflicts found! These will cause service worker load errors.');
  console.log('\n💡 Solutions:');
  console.log('   - Rename conflicting variables to be unique');
  console.log('   - Use different prefixes (e.g., isServiceWorker vs isGitHubServiceWorker)');
  console.log('   - Wrap code in IIFEs or namespaces');
  process.exit(1);
} else {
  console.log('🎉 No variable conflicts detected!');
  process.exit(0);
}
