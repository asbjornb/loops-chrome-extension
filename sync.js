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

    // Take only the most recent items that fit in sync storage
    const syncData = {
      readLater: (localData.readLater || []).slice(0, SYNC_CONFIG.maxItemsPerList),
      tasks: (localData.tasks || []).slice(0, SYNC_CONFIG.maxItemsPerList),
      lastSyncedAt: new Date().toISOString(),
      deviceId: await getDeviceId(),
    };

    // Check size before syncing
    const dataSize = JSON.stringify(syncData).length;
    if (dataSize > 100000) {
      // Chrome sync total quota is ~100KB
      console.warn('Sync data too large, reducing items');
      // Reduce items if needed
      syncData.readLater = syncData.readLater.slice(0, 25);
      syncData.tasks = syncData.tasks.slice(0, 25);
    }

    await chrome.storage.sync.set(syncData);
    console.log('Data synced to cloud:', {
      readLater: syncData.readLater.length,
      tasks: syncData.tasks.length,
      size: JSON.stringify(syncData).length,
    });

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
    const [localData, syncData] = await Promise.all([
      chrome.storage.local.get(['readLater', 'tasks']),
      chrome.storage.sync.get(['readLater', 'tasks', 'lastSyncedAt', 'deviceId']),
    ]);

    // Don't merge if sync data is empty or from same device
    if (!syncData.lastSyncedAt) {
      console.log('No sync data found');
      return { success: true, merged: false };
    }

    const currentDeviceId = await getDeviceId();
    if (syncData.deviceId === currentDeviceId) {
      console.log('Sync data is from current device, skipping merge');
      return { success: true, merged: false };
    }

    // Merge the data
    const merged = mergeData(localData, syncData);

    // Save merged data to local storage
    await chrome.storage.local.set(merged);

    console.log('Data merged from cloud:', {
      readLater: merged.readLater.length,
      tasks: merged.tasks.length,
      lastSyncedAt: syncData.lastSyncedAt,
    });

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

// Full sync operation (pull then push)
async function performSync() {
  console.log('Starting sync operation...');

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

// Start auto-sync when script loads
if (SYNC_CONFIG.enabled) {
  startAutoSync();
}

console.log('Loops sync module loaded');
