const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

function createChromeStub(initialData = {}) {
  const localStore = { ...initialData };

  return {
    storage: {
      local: {
        get(keys, callback) {
          if (!keys) {
            callback({ ...localStore });
            return;
          }

          if (Array.isArray(keys)) {
            const result = {};
            keys.forEach((key) => {
              result[key] = localStore[key];
            });
            callback(result);
            return;
          }

          if (typeof keys === 'string') {
            callback({ [keys]: localStore[keys] });
            return;
          }

          throw new Error('Unsupported key type for chrome.storage.local.get');
        },
        set(values, callback) {
          Object.keys(values).forEach((key) => {
            localStore[key] = values[key];
          });
          if (callback) {
            callback();
          }
        },
      },
    },
    runtime: {
      lastError: null,
    },
  };
}

async function runTests() {
  const settingsStore = require('./settings-store.js');
  const chrome = createChromeStub();
  const store = settingsStore.createSettingsStore(chrome);

  console.log('🧪 Testing settings persistence...');

  const modified = settingsStore.cloneDefaults();
  modified.chromeSync.enabled = false;
  modified.chromeSync.autoSyncInterval = 600000;
  modified.githubSync.token = 'ghp_testtoken';
  modified.githubSync.gistId = 'gist123';
  modified.showShortcuts = false;

  await store.save(modified);

  const reloaded = await store.load();
  assert(reloaded.chromeSync.enabled === false, 'chromeSync.enabled should persist');
  assert(
    reloaded.chromeSync.autoSyncInterval === 600000,
    'chromeSync.autoSyncInterval should persist'
  );
  assert(reloaded.githubSync.token === 'ghp_testtoken', 'GitHub token should persist');
  assert(reloaded.githubSync.gistId === 'gist123', 'GitHub gistId should persist');
  assert(reloaded.showShortcuts === false, 'UI setting should persist');

  reloaded.chromeSync.enabled = true;
  const secondReload = await store.load();
  assert(
    secondReload.chromeSync.enabled === false,
    'load() should return a fresh clone, not share state'
  );

  console.log('✅ Persistence test passed');

  console.log('🧪 Testing merge with defaults...');
  const partialChrome = createChromeStub({
    loopsSettings: {
      githubSync: {
        token: 'abc',
      },
    },
  });
  const partialStore = settingsStore.createSettingsStore(partialChrome);
  const merged = await partialStore.load();

  assert(merged.githubSync.token === 'abc', 'Existing GitHub token should be preserved');
  assert(
    merged.chromeSync.maxItems === settingsStore.DEFAULT_SETTINGS.chromeSync.maxItems,
    'Default maxItems should be applied when missing'
  );
  assert(
    merged.confirmDelete === settingsStore.DEFAULT_SETTINGS.confirmDelete,
    'General defaults should be applied'
  );

  console.log('✅ Merge defaults test passed');

  console.log('🧪 Testing save immutability...');
  const mutated = settingsStore.cloneDefaults();
  mutated.githubSync.token = 'mutated';
  await partialStore.save(mutated);
  mutated.githubSync.token = 'changed-after-save';
  const persisted = await partialStore.load();
  assert(persisted.githubSync.token === 'mutated', 'Saving should clone data before storing');

  console.log('✅ Save immutability test passed');

  console.log('🎉 All settings store tests passed!');
}

runTests().catch((error) => {
  console.error('❌ Settings store tests failed:', error);
  process.exitCode = 1;
});
