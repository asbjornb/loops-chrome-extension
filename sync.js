// Chrome Storage Sync Module
// Provides cross-device sync for recent items (best-effort, not guaranteed complete)

const SYNC_CONFIG = {
  maxItemsPerList: 50, // Keep last 50 items per list
  maxItemSize: 8000, // Chrome's limit is 8192 bytes per item
  syncInterval: 5 * 60 * 1000, // Sync every 5 minutes
  enabled: true, // Can be toggled in settings later
};

// Merge strategy for syncing data across devices
function mergeData(localData, syncData) {
  const merged = {};

  ['readLater', 'tasks'].forEach((listName) => {
    const local = localData[listName] || [];
    const synced = syncData[listName] || [];

    // Create a map of items by URL for deduplication
    const itemMap = new Map();

    // Add all items, with newer savedAt times taking precedence
    [...local, ...synced].forEach((item) => {
      const existing = itemMap.get(item.url);
      if (!existing || new Date(item.savedAt) > new Date(existing.savedAt)) {
        itemMap.set(item.url, item);
      }
    });

    // Convert back to array and sort by savedAt (newest first)
    merged[listName] = Array.from(itemMap.values()).sort(
      (a, b) => new Date(b.savedAt) - new Date(a.savedAt)
    );
  });

  return merged;
}

// Sync local data to chrome.storage.sync
async function pushToSync() {
  if (!SYNC_CONFIG.enabled) return;

  try {
    const localData = await chrome.storage.local.get(['readLater', 'tasks']);

    // Get settings for syncing (including GitHub tokens for better UX)
    const settingsData = await chrome.storage.local.get(['loopsSettings']);
    const settings = settingsData.loopsSettings || {};

    // Take only the most recent items that fit in sync storage
    const syncData = {
      readLater: (localData.readLater || []).slice(0, SYNC_CONFIG.maxItemsPerList),
      tasks: (localData.tasks || []).slice(0, SYNC_CONFIG.maxItemsPerList),
      settings: settings, // Sync all settings including GitHub tokens for UX
      lastSyncedAt: new Date().toISOString(),
      deviceId: await getDeviceId(),
      extensionId: chrome.runtime.id, // Help with debugging
    };

    // Use a shared key that's the same across all installations
    const sharedSyncKey = 'loops_extension_data';

    // Check size before syncing
    const dataSize = JSON.stringify(syncData).length;
    if (dataSize > 100000) {
      // Chrome sync total quota is ~100KB
      console.warn('Sync data too large, reducing items');
      // Reduce items if needed
      syncData.readLater = syncData.readLater.slice(0, 25);
      syncData.tasks = syncData.tasks.slice(0, 25);
    }

    // Store data under a shared key instead of separate keys
    await chrome.storage.sync.set({ [sharedSyncKey]: syncData });
    // Data synced to cloud successfully

    return { success: true, itemsSynced: syncData.readLater.length + syncData.tasks.length };
  } catch (error) {
    console.error('Sync push failed:', error);
    return { success: false, error: error.message };
  }
}

// Pull and merge data from chrome.storage.sync
async function pullFromSync() {
  if (!SYNC_CONFIG.enabled) return;

  try {
    const sharedSyncKey = 'loops_extension_data';
    const [localData, syncStorage] = await Promise.all([
      chrome.storage.local.get(['readLater', 'tasks']),
      chrome.storage.sync.get([sharedSyncKey]),
    ]);

    const syncData = syncStorage[sharedSyncKey] || {};

    // Also check old format for backward compatibility
    if (!syncData.lastSyncedAt) {
      const oldFormat = await chrome.storage.sync.get([
        'readLater',
        'tasks',
        'lastSyncedAt',
        'deviceId',
      ]);
      if (oldFormat.lastSyncedAt) {
        // Migrating from old sync format
        syncData.readLater = oldFormat.readLater || [];
        syncData.tasks = oldFormat.tasks || [];
        syncData.lastSyncedAt = oldFormat.lastSyncedAt;
        syncData.deviceId = oldFormat.deviceId;

        // Save in new format and clean up old keys
        await chrome.storage.sync.set({ [sharedSyncKey]: syncData });
        await chrome.storage.sync.remove(['readLater', 'tasks', 'lastSyncedAt', 'deviceId']);
      }
    }

    // Check if sync data exists and is valid
    if (!syncData.lastSyncedAt || (!syncData.readLater?.length && !syncData.tasks?.length)) {
      return { success: true, merged: false };
    }

    // Proceeding with sync data merge

    // Merge the data
    const merged = mergeData(localData, syncData);

    // Also merge settings if they exist in sync data
    let githubRecoveryNeeded = false;
    if (syncData.settings) {
      // Merging synced settings (including GitHub token if present)
      merged.loopsSettings = { ...syncData.settings };

      // Check if we have GitHub settings that might allow data recovery
      const githubSettings = syncData.settings.githubSync;
      if (githubSettings?.enabled && githubSettings?.token && githubSettings?.gistId) {
        githubRecoveryNeeded = true;
      }
    }

    // Save merged data and settings to local storage
    await chrome.storage.local.set(merged);

    // Attempt GitHub data recovery if settings were restored
    if (githubRecoveryNeeded) {
      try {
        // Attempting automatic GitHub data recovery
        setTimeout(async () => {
          try {
            const githubSync = new self.GitHubSync();
            await githubSync.init(merged.loopsSettings);
            await githubSync.pullFromGitHub();

            // GitHub recovery completed (items may have been recovered)
          } catch (error) {
            console.error('❌ Auto-recovery from GitHub failed:', error);
          }
        }, 1000);
      } catch (error) {
        console.error('Failed to setup GitHub auto-recovery:', error);
      }
    }

    // Data merged from cloud successfully

    return {
      success: true,
      merged: true,
      itemsMerged: merged.readLater.length + merged.tasks.length,
    };
  } catch (error) {
    console.error('Sync pull failed:', error);
    return { success: false, error: error.message };
  }
}

// Get or create a unique device ID
async function getDeviceId() {
  const result = await chrome.storage.local.get(['deviceId']);
  if (result.deviceId) {
    return result.deviceId;
  }

  // Generate new device ID
  const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await chrome.storage.local.set({ deviceId });
  return deviceId;
}

// Check if Chrome sync is properly configured
async function checkChromeSync() {
  try {
    // Test if we can write to sync storage
    const testKey = 'loops_sync_test';
    const testValue = { timestamp: Date.now() };

    await chrome.storage.sync.set({ [testKey]: testValue });
    const result = await chrome.storage.sync.get(testKey);

    if (result[testKey]?.timestamp === testValue.timestamp) {
      await chrome.storage.sync.remove(testKey);
      return true;
    } else {
      console.error('Chrome sync storage test failed');
      return false;
    }
  } catch (error) {
    console.error('Chrome sync not available:', error.message);
    return false;
  }
}

// Debug function to inspect sync storage
async function debugSyncStorage() {
  // First check if sync is working
  const syncWorking = await checkChromeSync();
  if (!syncWorking) {
    return;
  }

  try {
    const sharedSyncKey = 'loops_extension_data';
    const allSyncData = await chrome.storage.sync.get();
    const syncData = allSyncData[sharedSyncKey] || allSyncData; // Fallback to old format

    // Warn if sync storage is empty (could indicate setup issues)
    if (syncData.readLater?.length === 0 && syncData.tasks?.length === 0) {
      console.warn('Chrome sync storage appears to be empty - check Chrome sync settings');
    }
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

// Full sync operation (pull then push)
async function performSync() {
  // Debug current state
  await debugSyncStorage();

  // First pull to get any changes from other devices
  const pullResult = await pullFromSync();

  // Then push our current state
  const pushResult = await pushToSync();

  // Update sync status
  const status = {
    lastSyncTime: new Date().toISOString(),
    pullSuccess: pullResult.success,
    pushSuccess: pushResult.success,
    itemsSynced: pushResult.itemsSynced || 0,
    itemsMerged: pullResult.itemsMerged || 0,
  };

  await chrome.storage.local.set({ syncStatus: status });

  return status;
}

// Set up automatic sync
let syncInterval = null;

function startAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Initial sync
  performSync();

  // Set up interval
  syncInterval = setInterval(() => {
    performSync();
  }, SYNC_CONFIG.syncInterval);
}

function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// Detect if we're in a service worker or regular page
const isServiceWorker = typeof window === 'undefined';
const globalContext = isServiceWorker ? self : window;

// Listen for storage changes to trigger sync
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && SYNC_CONFIG.enabled) {
    // Debounce syncing to avoid too frequent updates
    if (globalContext.syncDebounceTimer) {
      clearTimeout(globalContext.syncDebounceTimer);
    }

    globalContext.syncDebounceTimer = setTimeout(() => {
      // Only sync if actual data changed (not settings)
      if (changes.readLater || changes.tasks) {
        pushToSync();
      }
    }, 5000); // Wait 5 seconds after changes stop
  }
});

// Export functions for use in other scripts
const loopsSync = {
  performSync,
  pushToSync,
  pullFromSync,
  startAutoSync,
  stopAutoSync,
  debugSyncStorage,
  checkChromeSync,
  getConfig: () => SYNC_CONFIG,
  setEnabled: (enabled) => {
    SYNC_CONFIG.enabled = enabled;
    if (enabled) {
      startAutoSync();
    } else {
      stopAutoSync();
    }
  },
};

// Export to appropriate global context
if (isServiceWorker) {
  // In service worker, attach to self
  self.loopsSync = loopsSync;
} else {
  // In regular page, attach to window
  window.loopsSync = loopsSync;
}

// Check for possible GitHub data recovery on startup
async function checkInitialRecovery() {
  try {
    // Wait a moment for any initial Chrome sync to complete
    setTimeout(async () => {
      const stored = await chrome.storage.local.get(['loopsSettings', 'readLater', 'tasks']);
      const settings = stored.loopsSettings;

      // Check if we have GitHub settings but no local data (fresh install scenario)
      if (
        settings?.githubSync?.enabled &&
        settings?.githubSync?.token &&
        settings?.githubSync?.gistId
      ) {
        const hasLocalData = stored.readLater?.length > 0 || stored.tasks?.length > 0;

        if (!hasLocalData) {
          // Fresh install detected with GitHub settings - attempting data recovery
          try {
            if (self.GitHubSync) {
              const githubSync = new self.GitHubSync();
              await githubSync.init(settings);
              await githubSync.pullFromGitHub();

              // Data recovery completed (may have recovered items)
            }
          } catch (error) {
            console.error('Startup recovery failed:', error);
          }
        }
      }
    }, 3000); // Wait 3 seconds for Chrome sync to potentially complete
  } catch (error) {
    console.error('Initial recovery check failed:', error);
  }
}

// Start auto-sync when script loads
if (SYNC_CONFIG.enabled) {
  startAutoSync();
}

// Check for initial recovery needs
checkInitialRecovery();

// Loops sync module loaded
