# Testing

This extension includes automated tests to catch common issues before deployment.

## Available Tests

### `npm test`

Runs the full test suite including both conflict detection and service worker compatibility tests.

### `npm run test:conflicts`

Checks for variable naming conflicts between service worker modules that would cause runtime errors.

**What it catches:**

- Duplicate `const`, `let`, `var`, or `function` declarations
- Variables that would conflict when multiple scripts are loaded together

**Example conflict:**

```javascript
// sync.js
const isServiceWorker = typeof window === 'undefined';

// github-sync.js
const isServiceWorker = typeof window === 'undefined'; // ❌ Conflict!
```

### `npm run test:sw`

Simulates the Chrome extension service worker environment to test compatibility.

**What it tests:**

- Individual module loading
- Combined module loading (simulating background.js)
- Chrome API mocking
- Background.js syntax validation
- ImportScripts file existence

## Pre-commit Hooks

Tests run automatically before each commit via Husky:

1. **Variable conflict detection** - Prevents service worker load errors
2. **Service worker compatibility** - Ensures all modules can be loaded together
3. **Linting and formatting** - Maintains code quality

## Debugging Test Failures

### "Identifier already been declared"

- Run `npm run test:conflicts` to find the conflicting variables
- Rename variables to be unique (e.g., `isServiceWorker` → `isGitHubServiceWorker`)

### "Cannot read properties of undefined"

- Missing Chrome API mocks in `test-service-worker.js`
- Add the required API to the mock object

### "File not found" errors

- Check that all files referenced in `importScripts()` exist
- Update file paths in background.js or add missing files

## Adding New Service Worker Modules

When adding new files that will be loaded in the service worker:

1. Add the filename to `serviceWorkerFiles` array in `test-service-worker.js`
2. Ensure unique variable names (avoid conflicts with existing modules)
3. Add any required Chrome API mocks
4. Test with `npm test` before committing
