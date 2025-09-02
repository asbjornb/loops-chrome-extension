let currentList = 'readLater';
let allItems = [];
let filteredItems = [];
const selectedItems = new Set();

// DOM elements
const searchInput = document.getElementById('searchInput');
const itemsContainer = document.getElementById('itemsContainer');
const emptyState = document.getElementById('emptyState');
const bulkActions = document.getElementById('bulkActions');
const selectedCount = document.getElementById('selectedCount');
const clearAllBtn = document.getElementById('clearAllBtn');

// Load and display items
async function loadList(listName) {
  currentList = listName;
  const storage = await chrome.storage.local.get([listName]);
  allItems = storage[listName] || [];

  // Apply current search filter
  filterItems(searchInput.value);

  // Update tab appearance
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.list === listName);
  });

  updateCounts();
  updateClearButton();
}

// Filter items based on search query
function filterItems(query) {
  if (!query.trim()) {
    filteredItems = [...allItems];
  } else {
    const searchTerm = query.toLowerCase();
    filteredItems = allItems.filter(
      (item) =>
        item.title?.toLowerCase().includes(searchTerm) ||
        item.url?.toLowerCase().includes(searchTerm) ||
        item.note?.toLowerCase().includes(searchTerm)
    );
  }

  renderItems();
}

// Render items to the page
function renderItems() {
  selectedItems.clear();
  updateBulkActions();

  if (filteredItems.length === 0) {
    itemsContainer.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  itemsContainer.style.display = 'grid';
  emptyState.style.display = 'none';

  itemsContainer.innerHTML = filteredItems
    .map(
      (item) => `
    <div class="item-card" data-id="${item.id}">
      <input type="checkbox" class="checkbox" data-id="${item.id}">
      ${
        item.favIconUrl
          ? `<img src="${item.favIconUrl}" class="item-favicon" onerror="this.style.display='none'">`
          : '<div class="item-favicon" style="background:#f3f4f6;border-radius:3px;"></div>'
      }
      <div class="item-content">
        <div class="item-title" data-url="${item.url}">${item.title || 'Untitled'}</div>
        <div class="item-url">${item.url}</div>
        ${item.note ? `<div class="item-note">${item.note}</div>` : ''}
      </div>
      <div class="item-meta">
        <div class="item-time">${formatTime(item.savedAt)}</div>
        <div class="item-actions">
          <button class="action-btn action-btn-delete" data-id="${item.id}" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join('');

  // Add event listeners
  addEventListeners();
}

// Add event listeners to items
function addEventListeners() {
  // Click to open tab
  document.querySelectorAll('.item-title').forEach((title) => {
    title.addEventListener('click', () => {
      chrome.tabs.create({ url: title.dataset.url });
    });
  });

  // Delete buttons
  document.querySelectorAll('.action-btn-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      deleteItem(id);
    });
  });

  // Checkboxes
  document.querySelectorAll('.checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id);
      if (e.target.checked) {
        selectedItems.add(id);
      } else {
        selectedItems.delete(id);
      }
      updateBulkActions();
    });
  });
}

// Delete a single item
async function deleteItem(itemId) {
  const storage = await chrome.storage.local.get([currentList]);
  const items = storage[currentList] || [];
  const filtered = items.filter((item) => item.id !== itemId);

  await chrome.storage.local.set({ [currentList]: filtered });
  loadList(currentList);
}

// Delete multiple items
async function deleteSelectedItems() {
  if (selectedItems.size === 0) return;

  if (confirm(`Delete ${selectedItems.size} selected items?`)) {
    const storage = await chrome.storage.local.get([currentList]);
    const items = storage[currentList] || [];
    const filtered = items.filter((item) => !selectedItems.has(item.id));

    await chrome.storage.local.set({ [currentList]: filtered });
    loadList(currentList);
  }
}

// Clear all items in current list
async function clearAllItems() {
  if (confirm(`Clear all items in ${currentList === 'readLater' ? 'Read Later' : 'Tasks'}?`)) {
    await chrome.storage.local.set({ [currentList]: [] });
    loadList(currentList);
  }
}

// Update bulk actions visibility
function updateBulkActions() {
  const count = selectedItems.size;
  selectedCount.textContent = `${count} selected`;
  bulkActions.classList.toggle('visible', count > 0);
}

// Update counts in tabs
async function updateCounts() {
  const storage = await chrome.storage.local.get(['readLater', 'tasks']);

  const readLaterCount = (storage.readLater || []).length;
  const tasksCount = (storage.tasks || []).length;

  document.getElementById('readLaterCount').textContent = readLaterCount;
  document.getElementById('tasksCount').textContent = tasksCount;
}

// Update clear all button visibility
function updateClearButton() {
  clearAllBtn.style.display = allItems.length > 0 ? 'block' : 'none';
}

// Format time helper
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;

  return date.toLocaleDateString();
}

// Export functionality
function exportData() {
  chrome.storage.local.get(['readLater', 'tasks'], (data) => {
    const exportData = {
      readLater: data.readLater || [],
      tasks: data.tasks || [],
      exportDate: new Date().toISOString(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `loops-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  });
}

// Import functionality
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (confirm('This will replace all current data. Continue?')) {
          chrome.storage.local.set(
            {
              readLater: data.readLater || [],
              tasks: data.tasks || [],
            },
            () => {
              loadList(currentList);
              alert('Data imported successfully!');
            }
          );
        }
      } catch {
        alert('Error importing file: Invalid format');
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

// Event listeners
searchInput.addEventListener('input', (e) => {
  filterItems(e.target.value);
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    loadList(tab.dataset.list);
  });
});

document.getElementById('bulkDeleteBtn').addEventListener('click', deleteSelectedItems);
document.getElementById('deselectAllBtn').addEventListener('click', () => {
  selectedItems.clear();
  document.querySelectorAll('.checkbox').forEach((cb) => (cb.checked = false));
  updateBulkActions();
});

clearAllBtn.addEventListener('click', clearAllItems);
document.getElementById('exportBtn').addEventListener('click', exportData);
document.getElementById('importBtn').addEventListener('click', importData);
document.getElementById('optionsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Load sync modules and initialize sync status
async function loadSyncModule() {
  if (typeof window.loopsSync === 'undefined') {
    // Load sync.js if not already loaded
    const script = document.createElement('script');
    script.src = 'sync.js';
    script.onload = () => {
      console.log('Sync module loaded in dashboard');
      updateSyncStatus();
    };
    document.head.appendChild(script);
  } else {
    updateSyncStatus();
  }
}

// Initialize sync module
loadSyncModule();

// Sync status management
function updateSyncStatus() {
  chrome.storage.local.get(['syncStatus', 'loopsSettings'], (data) => {
    const syncStatus = document.getElementById('syncStatus');
    const syncIcon = syncStatus.querySelector('.sync-icon');
    const syncText = syncStatus.querySelector('.sync-text');
    const settings = data.loopsSettings;

    if (data.syncStatus) {
      const status = data.syncStatus;
      const lastSync = new Date(status.lastSyncTime);
      const timeSince = Date.now() - lastSync.getTime();
      const minutesSince = Math.floor(timeSince / 60000);

      if (status.pullSuccess && status.pushSuccess) {
        syncStatus.className = 'sync-status';
        syncIcon.textContent = '☁️';

        if (minutesSince < 1) {
          syncText.textContent = 'Sync: Just now';
        } else if (minutesSince < 60) {
          syncText.textContent = `Sync: ${minutesSince}m ago`;
        } else {
          syncText.textContent = 'Sync: 1h+ ago';
        }
      } else {
        syncStatus.className = 'sync-status error';
        syncIcon.textContent = '⚠️';
        syncText.textContent = 'Sync: Error';
      }

      // Build tooltip with provider info
      const enabledProviders = [];
      if (settings?.chromeSync?.enabled) enabledProviders.push('Chrome');
      if (settings?.githubSync?.enabled && settings?.githubSync?.token)
        enabledProviders.push('GitHub');

      const tooltip =
        `Providers: ${enabledProviders.length > 0 ? enabledProviders.join(', ') : 'None'}\n` +
        `Last sync: ${lastSync.toLocaleString()}\n` +
        `Items synced: ${status.itemsSynced || 0}\n` +
        `Items merged: ${status.itemsMerged || 0}\n` +
        `Status: ${status.pullSuccess && status.pushSuccess ? 'Success' : 'Error'}`;
      syncStatus.title = tooltip;
    } else {
      syncStatus.className = 'sync-status';
      syncIcon.textContent = '☁️';
      syncText.textContent = 'Sync: Ready';
      // Show which providers are enabled
      const enabledProviders = [];
      if (settings?.chromeSync?.enabled) enabledProviders.push('Chrome');
      if (settings?.githubSync?.enabled && settings?.githubSync?.token)
        enabledProviders.push('GitHub');

      syncStatus.title =
        enabledProviders.length > 0
          ? `Sync ready with: ${enabledProviders.join(', ')}`
          : 'No sync providers configured - visit Options to set up';
    }
  });
}

// Manual sync trigger
document.getElementById('syncStatus').addEventListener('click', async () => {
  const syncStatus = document.getElementById('syncStatus');
  const syncIcon = syncStatus.querySelector('.sync-icon');
  const syncText = syncStatus.querySelector('.sync-text');

  // Show syncing state
  syncStatus.className = 'sync-status syncing';
  syncIcon.textContent = '🔄';
  syncText.textContent = 'Syncing...';

  try {
    // Get current settings to determine which sync methods to use
    const data = await chrome.storage.local.get(['loopsSettings']);
    const settings = data.loopsSettings;

    // Track sync status for logging

    // Chrome sync
    if (window.loopsSync && settings?.chromeSync?.enabled) {
      try {
        await window.loopsSync.performSync();
      } catch (error) {
        console.error('Chrome sync failed:', error);
      }
    }

    // GitHub sync
    if (settings?.githubSync?.enabled && settings?.githubSync?.token) {
      try {
        // Load GitHub sync module if needed
        if (!window.GitHubSync) {
          const script = document.createElement('script');
          script.src = 'github-sync.js';
          document.head.appendChild(script);
          await new Promise((resolve) => {
            script.onload = resolve;
          });
        }

        const githubSyncInstance = new window.GitHubSync();
        await githubSyncInstance.init(settings);
        await githubSyncInstance.performSync();
      } catch (error) {
        console.error('GitHub sync failed:', error);
      }
    }

    // Refresh the current view after sync
    loadList(currentList);
  } catch (error) {
    console.error('Manual sync failed:', error);
  }

  // Update status after sync
  setTimeout(updateSyncStatus, 1000);
});

// Listen for sync status updates
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.syncStatus) {
    updateSyncStatus();
  }
});

// Initialize
loadList('readLater');

// Update sync status periodically
setInterval(updateSyncStatus, 30000); // Every 30 seconds

// Periodic refresh to keep data fresh
setInterval(() => {
  // Only refresh if the tab is visible (don't waste resources on background tabs)
  if (!document.hidden) {
    loadList(currentList);
  }
}, 30 * 1000); // Every 30 seconds (same as sync status)
