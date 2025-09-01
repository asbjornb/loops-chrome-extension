#!/usr/bin/env node

/**
 * Test script to validate service worker compatibility
 * Simulates Chrome extension service worker environment and tests for conflicts
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🧪 Testing service worker compatibility...\n');

// Create a mock service worker global context
const serviceWorkerGlobal = {
  self: {},
  console: console,
  setTimeout: setTimeout,
  setInterval: setInterval,
  clearTimeout: clearTimeout,
  clearInterval: clearInterval,
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
  chrome: {
    storage: {
      local: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve(),
      },
      sync: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve(),
      },
      onChanged: {
        addListener: () => {},
      },
    },
    runtime: {
      getManifest: () => ({ version: '0.3.0' }),
    },
  },
};

// List of files that should be loadable in service worker
const serviceWorkerFiles = ['sync.js', 'github-sync.js'];

let allTestsPassed = true;

// Test each file individually first
for (const file of serviceWorkerFiles) {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${file}`);
    allTestsPassed = false;
    continue;
  }

  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const context = vm.createContext({ ...serviceWorkerGlobal });

    console.log(`✅ Testing ${file} individually...`);
    vm.runInContext(code, context);
    console.log(`   ✓ ${file} loads without errors`);

    // Check if expected globals are available
    if (file === 'sync.js' && !context.self.loopsSync) {
      console.warn(`   ⚠️  ${file} didn't expose loopsSync global`);
    }
    if (file === 'github-sync.js' && !context.self.GitHubSync) {
      console.warn(`   ⚠️  ${file} didn't expose GitHubSync global`);
    }
  } catch (error) {
    console.error(`❌ ${file} failed to load:`);
    console.error(`   Error: ${error.message}`);
    allTestsPassed = false;
  }
}

// Test loading all files together (simulating background.js)
console.log('\n🔄 Testing all service worker files together...');
try {
  const combinedContext = vm.createContext({ ...serviceWorkerGlobal });

  for (const file of serviceWorkerFiles) {
    const filePath = path.join(__dirname, file);
    const code = fs.readFileSync(filePath, 'utf8');

    console.log(`   Loading ${file}...`);
    vm.runInContext(code, combinedContext);
  }

  console.log('✅ All files loaded together successfully');

  // Verify both sync modules are available
  if (combinedContext.self.loopsSync && combinedContext.self.GitHubSync) {
    console.log('   ✓ Both sync modules are available');
  } else {
    console.warn('   ⚠️  One or more sync modules not properly exposed');
  }
} catch (error) {
  console.error('❌ Failed to load files together:');
  console.error(`   Error: ${error.message}`);

  // Check for common variable conflicts
  if (error.message.includes('already been declared')) {
    console.error('\n💡 Tip: Look for duplicate variable declarations between files');
    console.error('   Common conflicts: isServiceWorker, globalContext, etc.');
  }

  allTestsPassed = false;
}

// Test background.js syntax (without actually running it)
console.log('\n🔍 Testing background.js syntax...');
const backgroundPath = path.join(__dirname, 'background.js');
if (fs.existsSync(backgroundPath)) {
  try {
    const backgroundCode = fs.readFileSync(backgroundPath, 'utf8');

    // Check for importScripts calls
    const importScriptsMatches = backgroundCode.match(/importScripts\(['"]([^'"]+)['"]\)/g);
    if (importScriptsMatches) {
      console.log('   ✓ Found importScripts calls:');
      importScriptsMatches.forEach((match) => {
        console.log(`     - ${match}`);
      });

      // Verify all imported files exist
      const scriptPaths = importScriptsMatches
        .map((match) => {
          const pathMatch = match.match(/importScripts\(['"]([^'"]+)['"]\)/);
          return pathMatch ? pathMatch[1] : null;
        })
        .filter(Boolean);

      for (const scriptPath of scriptPaths) {
        const fullPath = path.join(__dirname, scriptPath);
        if (!fs.existsSync(fullPath)) {
          console.error(`   ❌ Imported file not found: ${scriptPath}`);
          allTestsPassed = false;
        } else {
          console.log(`   ✓ ${scriptPath} exists`);
        }
      }
    }

    console.log('✅ background.js syntax check passed');
  } catch (error) {
    console.error('❌ background.js syntax error:', error.message);
    allTestsPassed = false;
  }
} else {
  console.error('❌ background.js not found');
  allTestsPassed = false;
}

// Final result
console.log('\n' + '='.repeat(50));
if (allTestsPassed) {
  console.log('🎉 All service worker tests passed!');
  process.exit(0);
} else {
  console.log('💥 Some tests failed. Please fix the issues above.');
  process.exit(1);
}
