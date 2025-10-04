(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.loopsSettingsStore = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_SETTINGS = deepFreeze({
    chromeSync: {
      enabled: true,
      maxItems: 50,
      autoSyncInterval: 300000,
    },
    githubSync: {
      enabled: false,
      token: '',
      gistId: null,
      isPublic: false,
      description: 'Loops Browser Extension - Saved Tabs',
      lastSynced: null,
    },
    gdriveSync: {
      enabled: false,
    },
    confirmDelete: true,
    autoClose: true,
    inactiveTabThreshold: 8,
    theme: 'light',
    showShortcuts: true,
  });

  function deepFreeze(object) {
    Object.getOwnPropertyNames(object).forEach((prop) => {
      const value = object[prop];
      if (value && typeof value === 'object') {
        deepFreeze(value);
      }
    });
    return Object.freeze(object);
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function deepMerge(target, source) {
    if (!source || typeof source !== 'object') {
      return target;
    }

    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      if (Array.isArray(sourceValue)) {
        target[key] = sourceValue.slice();
        return;
      }

      if (sourceValue && typeof sourceValue === 'object') {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        deepMerge(target[key], sourceValue);
        return;
      }

      target[key] = sourceValue;
    });

    return target;
  }

  function cloneDefaults() {
    return deepClone(DEFAULT_SETTINGS);
  }

  function mergeWithDefaults(partialSettings = {}) {
    const merged = cloneDefaults();
    deepMerge(merged, partialSettings);
    return merged;
  }

  function createSettingsStore(chrome) {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      throw new Error('Chrome storage API is required');
    }

    const storage = chrome.storage.local;

    function callStorage(method, payload) {
      return new Promise((resolve, reject) => {
        storage[method](payload, (result) => {
          const error = chrome.runtime?.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve(result);
        });
      });
    }

    return {
      async load() {
        const result = await callStorage('get', ['loopsSettings']);
        return mergeWithDefaults(result?.loopsSettings || {});
      },
      async save(nextSettings) {
        const payload = deepClone(nextSettings);
        await callStorage('set', { loopsSettings: payload });
      },
    };
  }

  return {
    DEFAULT_SETTINGS: cloneDefaults(),
    cloneDefaults,
    mergeWithDefaults,
    createSettingsStore,
  };
});
