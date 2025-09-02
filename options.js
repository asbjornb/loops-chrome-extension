// Options page functionality
let settings = {};

// Default settings
const DEFAULT_SETTINGS = {
  // Sync settings
  chromeSync: {
    enabled: true,
    maxItems: 50, // Fixed at 50, no longer user-configurable
    autoSyncInterval: 300000, // 5 minutes
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
    // Future settings
  },

  // General settings
  confirmDelete: true,
  autoClose: true,

  // UI settings
  theme: 'light', // For future dark mode
};

// Load settings on page load
async function loadSettings() {
  try {
    const stored = await chrome.storage.local.get(['loopsSettings']);
    settings = { ...DEFAULT_SETTINGS, ...(stored.loopsSettings || {}) };
    updateUI();
    updateSyncStatus();
  } catch (error) {
    console.error('Failed to load settings:', error);
    settings = DEFAULT_SETTINGS;
    updateUI();
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    await chrome.storage.local.set({ loopsSettings: settings });

    // Update sync configuration
    if (window.loopsSync) {
      window.loopsSync.setEnabled(settings.chromeSync.enabled);
      // Update sync interval if changed
      const syncConfig = window.loopsSync.getConfig();
      if (syncConfig.syncInterval !== settings.chromeSync.autoSyncInterval) {
        syncConfig.syncInterval = settings.chromeSync.autoSyncInterval;
        syncConfig.maxItemsPerList = settings.chromeSync.maxItems;

        // Restart auto-sync with new settings
        if (settings.chromeSync.enabled) {
          window.loopsSync.stopAutoSync();
          window.loopsSync.startAutoSync();
        }
      }
    }

    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('Failed to save settings: ' + error.message, 'error');
  }
}

// Update UI elements with current settings
function updateUI() {
  // Chrome sync settings
  document.getElementById('chromeEnabled').checked = settings.chromeSync.enabled;
  document.getElementById('autoSync').value = settings.chromeSync.autoSyncInterval;

  // GitHub sync settings
  document.getElementById('githubToken').value = settings.githubSync.token;
  document.getElementById('githubPublic').checked = settings.githubSync.isPublic;
  document.getElementById('githubDescription').value = settings.githubSync.description;
  document.getElementById('githubGistId').value = settings.githubSync.gistId || '';

  // General settings
  document.getElementById('confirmDelete').checked = settings.confirmDelete;
  document.getElementById('autoClose').checked = settings.autoClose;

  // Update provider states
  updateProviderStates();
}

// Update settings object from UI
function updateSettingsFromUI() {
  settings.chromeSync.enabled = document.getElementById('chromeEnabled').checked;
  settings.chromeSync.autoSyncInterval = parseInt(document.getElementById('autoSync').value);

  settings.githubSync.token = document.getElementById('githubToken').value.trim();
  settings.githubSync.isPublic = document.getElementById('githubPublic').checked;
  settings.githubSync.description = document.getElementById('githubDescription').value.trim();

  // Handle gist ID (extract from URL if needed)
  let gistId = document.getElementById('githubGistId').value.trim();
  if (gistId) {
    // Extract gist ID from URL if a full URL was pasted
    const gistMatch = gistId.match(/gist\.github\.com\/[^\/]+\/([a-f0-9]+)/);
    if (gistMatch) {
      gistId = gistMatch[1];
    }
    settings.githubSync.gistId = gistId;
  }

  settings.githubSync.enabled = !!settings.githubSync.token;

  settings.confirmDelete = document.getElementById('confirmDelete').checked;
  settings.autoClose = document.getElementById('autoClose').checked;
}

// Update visual state of sync providers
function updateProviderStates() {
  const chromeProvider = document.getElementById('chromeProvider');
  const githubProvider = document.getElementById('githubProvider');

  // Chrome provider
  if (settings.chromeSync.enabled) {
    chromeProvider.classList.add('active');
    chromeProvider.classList.remove('disabled');
  } else {
    chromeProvider.classList.remove('active');
    chromeProvider.classList.add('disabled');
  }

  // GitHub provider
  if (settings.githubSync.enabled && settings.githubSync.token) {
    githubProvider.classList.add('active');
    githubProvider.classList.remove('disabled');
  } else {
    githubProvider.classList.remove('active');
  }
}

// Update sync status indicators
async function updateSyncStatus() {
  // Chrome sync status
  const chromeStatus = document.getElementById('chromeStatus');
  if (settings.chromeSync.enabled) {
    chromeStatus.className = 'status success';
    chromeStatus.textContent = '✓ Active';
  } else {
    chromeStatus.className = 'status warning';
    chromeStatus.textContent = '⚠️ Disabled';
  }

  // GitHub sync status
  const githubStatus = document.getElementById('githubStatus');
  if (settings.githubSync.enabled && settings.githubSync.token) {
    if (settings.githubSync.gistId) {
      githubStatus.className = 'status success';
      githubStatus.textContent = '✓ Connected';
    } else {
      githubStatus.className = 'status warning';
      githubStatus.textContent = '⚠️ Token set, no gist';
    }
  } else {
    githubStatus.className = 'status warning';
    githubStatus.textContent = '⚠️ Not configured';
  }
}

// Show status message
function showStatus(message, type = 'success') {
  const statusEl = document.getElementById('saveStatus');
  statusEl.className = `status ${type}`;
  statusEl.textContent = message;
  statusEl.classList.remove('hidden');

  // Hide after 3 seconds
  setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 3000);
}

// GitHub connection flow
async function connectGitHub() {
  const token = document.getElementById('githubToken').value.trim();
  if (!token) {
    showStatus('Please enter a GitHub Personal Access Token', 'error');
    return;
  }

  try {
    const connectBtn = document.getElementById('githubConnect');
    connectBtn.textContent = 'Connecting...';
    connectBtn.disabled = true;

    // Load GitHub sync module if needed
    if (!window.GitHubSync) {
      const script = document.createElement('script');
      script.src = 'github-sync.js';
      document.head.appendChild(script);
      await new Promise((resolve) => {
        script.onload = resolve;
      });
    }

    // Test connection
    const githubSync = new window.GitHubSync();
    const result = await githubSync.testConnection(token);

    if (!result.success) {
      throw new Error(result.error);
    }

    // Update settings
    updateSettingsFromUI();
    settings.githubSync.token = token;
    settings.githubSync.enabled = true;

    await saveSettings();

    showStatus(`✅ Connected to GitHub as ${result.user.login} with gist permissions!`, 'success');

    // If a gist ID was provided, try to pull data from it
    if (settings.githubSync.gistId) {
      try {
        // Attempting data recovery from existing gist
        const githubSync = new window.GitHubSync();
        await githubSync.init(settings);
        const pullResult = await githubSync.pullFromGitHub();

        if (pullResult.success && pullResult.merged) {
          showStatus(
            `✅ Connected and recovered ${pullResult.itemsMerged} items from existing gist!`,
            'success'
          );
        }
      } catch (error) {
        console.error('Failed to recover data from gist:', error);
        showStatus(`Connected to GitHub, but failed to recover data: ${error.message}`, 'warning');
      }
    }

    updateSyncStatus();
    updateProviderStates();
  } catch (error) {
    console.error('GitHub connection failed:', error);
    showStatus('Failed to connect to GitHub: ' + error.message, 'error');
  } finally {
    const connectBtn = document.getElementById('githubConnect');
    connectBtn.textContent = 'Test Connection & Permissions';
    connectBtn.disabled = false;
  }
}

// Test sync functionality
async function testSync() {
  const testBtn = document.getElementById('testSync');
  testBtn.textContent = '🧪 Testing...';
  testBtn.disabled = true;

  try {
    updateSettingsFromUI();

    const results = [];

    // Test Chrome sync
    if (settings.chromeSync.enabled && window.loopsSync) {
      try {
        const result = await window.loopsSync.performSync();
        results.push(
          `Chrome Sync: ${result.pullSuccess && result.pushSuccess ? 'Success' : 'Failed'}`
        );
      } catch (error) {
        results.push(`Chrome Sync: Failed - ${error.message}`);
      }
    }

    // Test GitHub sync
    if (settings.githubSync.enabled && settings.githubSync.token) {
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

        const githubSync = new window.GitHubSync();
        await githubSync.init(settings);
        const result = await githubSync.performSync();

        results.push(
          `GitHub Sync: ${result.pullSuccess && result.pushSuccess ? 'Success' : 'Failed'}`
        );
      } catch (error) {
        results.push(`GitHub Sync: Failed - ${error.message}`);
      }
    }

    if (results.length === 0) {
      showStatus('No sync methods enabled', 'warning');
    } else {
      showStatus(
        results.join(' | '),
        results.every((r) => r.includes('Success') || r.includes('Ready')) ? 'success' : 'error'
      );
    }
  } catch (error) {
    showStatus('Sync test failed: ' + error.message, 'error');
  } finally {
    testBtn.textContent = '🧪 Test Sync';
    testBtn.disabled = false;
  }
}

// Export settings
function exportSettings() {
  updateSettingsFromUI();

  // Create export data with metadata
  const exportData = {
    settings: settings,
    exportedAt: new Date().toISOString(),
    version: chrome.runtime.getManifest().version,
    exportType: 'loops-extension-settings',
    description:
      'Loops Browser Extension Settings Export - includes GitHub tokens for easy setup across devices',
  };

  // Note: Export includes GitHub token for easy setup across devices

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loops-settings-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const tokenIncluded = settings.githubSync?.token
    ? ' (including GitHub token for easy setup)'
    : '';
  showStatus(`Settings exported successfully${tokenIncluded}!`, 'success');
}

// Import settings
function importSettings() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate file format
      if (!importData.settings) {
        throw new Error('Invalid settings file format - missing settings object');
      }

      if (importData.exportType !== 'loops-extension-settings') {
        console.warn('Importing from non-standard format, proceeding with caution');
      }

      // Version compatibility check
      const currentVersion = chrome.runtime.getManifest().version;
      if (importData.version && importData.version !== currentVersion) {
        // Importing from different version - should work fine
      }

      // Merge with defaults to ensure all properties exist
      const newSettings = { ...DEFAULT_SETTINGS, ...importData.settings };

      // Ensure maxItems is always 50 (no longer user-configurable)
      if (newSettings.chromeSync) {
        newSettings.chromeSync.maxItems = 50;
      }

      settings = newSettings;

      await saveSettings();
      updateUI();
      updateSyncStatus();

      const hasGitHubToken = !!settings.githubSync?.token;
      const importMessage = hasGitHubToken
        ? 'Settings imported successfully (including GitHub token)!'
        : 'Settings imported successfully!';

      showStatus(importMessage, 'success');

      // Settings import completed successfully
    } catch (error) {
      console.error('Import error:', error);
      showStatus('Failed to import settings: ' + error.message, 'error');
    }
  };

  input.click();
}

// Reconnect to existing gist and sync immediately
async function reconnectAndSync() {
  const reconnectBtn = document.getElementById('reconnectSync');
  const gistIdInput = document.getElementById('githubGistId');
  const token = document.getElementById('githubToken').value.trim();

  if (!token) {
    showStatus('Please enter your GitHub token first', 'error');
    return;
  }

  const gistId = gistIdInput.value.trim();
  if (!gistId) {
    showStatus('Please enter a gist ID or URL', 'error');
    return;
  }

  try {
    reconnectBtn.textContent = '🔄 Reconnecting...';
    reconnectBtn.disabled = true;

    // Update settings with gist info
    updateSettingsFromUI();
    await saveSettings();

    // Load GitHub sync module if needed
    if (!window.GitHubSync) {
      const script = document.createElement('script');
      script.src = 'github-sync.js';
      document.head.appendChild(script);
      await new Promise((resolve) => {
        script.onload = resolve;
      });
    }

    // Initialize GitHub sync and pull data
    const githubSync = new window.GitHubSync();
    await githubSync.init(settings);

    const pullResult = await githubSync.pullFromGitHub();

    if (pullResult.success) {
      if (pullResult.merged) {
        showStatus(
          `✅ Successfully reconnected and recovered ${pullResult.itemsMerged} items!`,
          'success'
        );
      } else {
        showStatus('✅ Reconnected successfully (no new data to merge)', 'success');
      }

      updateSyncStatus();
      updateProviderStates();

      // Clear the gist ID field since it's now saved
      gistIdInput.value = '';
    } else {
      throw new Error(pullResult.error || 'Unknown sync error');
    }
  } catch (error) {
    console.error('Reconnect failed:', error);
    showStatus('Failed to reconnect: ' + error.message, 'error');
  } finally {
    reconnectBtn.textContent = '🔄 Reconnect & Sync Now';
    reconnectBtn.disabled = false;
  }
}

// Reset to defaults
async function resetSettings() {
  if (confirm('This will reset all settings to defaults. Are you sure?')) {
    settings = { ...DEFAULT_SETTINGS };
    await saveSettings();
    updateUI();
    updateSyncStatus();
    showStatus('Settings reset to defaults', 'success');
  }
}

// Load sync module
function loadSyncModule() {
  if (typeof window.loopsSync === 'undefined') {
    const script = document.createElement('script');
    script.src = 'sync.js';
    script.onload = () => {
      // Sync module loaded
    };
    document.head.appendChild(script);
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Load sync module
  loadSyncModule();

  // Load current settings
  await loadSettings();

  // Set up event listeners
  document.getElementById('saveSettings').addEventListener('click', async () => {
    updateSettingsFromUI();
    await saveSettings();
  });

  document.getElementById('resetSettings').addEventListener('click', resetSettings);
  document.getElementById('testSync').addEventListener('click', testSync);
  document.getElementById('exportSettings').addEventListener('click', exportSettings);
  document.getElementById('importSettings').addEventListener('click', importSettings);

  // GitHub connection
  document.getElementById('githubConnect').addEventListener('click', () => {
    const config = document.getElementById('githubConfig');
    if (config.classList.contains('hidden')) {
      config.classList.remove('hidden');
      document.getElementById('githubConnect').textContent = 'Test Connection & Permissions';
    } else {
      connectGitHub();
    }
  });

  // Auto-save on some changes
  document.getElementById('chromeEnabled').addEventListener('change', async () => {
    updateSettingsFromUI();
    await saveSettings();
    updateProviderStates();
    updateSyncStatus();
  });

  // Update version number
  document.getElementById('version').textContent = chrome.runtime.getManifest().version;

  // Reconnect to existing gist
  document.getElementById('reconnectSync').addEventListener('click', reconnectAndSync);

  // Enable/disable reconnect button based on inputs
  function updateReconnectButton() {
    const hasToken = document.getElementById('githubToken').value.trim().length > 0;
    const hasGistId = document.getElementById('githubGistId').value.trim().length > 0;
    document.getElementById('reconnectSync').disabled = !(hasToken && hasGistId);
  }

  document.getElementById('githubToken').addEventListener('input', updateReconnectButton);
  document.getElementById('githubGistId').addEventListener('input', updateReconnectButton);

  // Initial button state
  updateReconnectButton();

  // Dashboard links
  document.getElementById('openDashboard').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  document.getElementById('backToDashboard').addEventListener('click', (e) => {
    e.preventDefault();
    // Try to go back to dashboard tab if it exists, otherwise create new one
    chrome.tabs.query({ url: chrome.runtime.getURL('dashboard.html') }, (tabs) => {
      if (tabs.length > 0) {
        // Dashboard tab exists, switch to it
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.tabs.getCurrent((currentTab) => {
          if (currentTab) {
            chrome.tabs.remove(currentTab.id);
          }
        });
      } else {
        // No dashboard tab, create new one and close current
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') }, () => {
          chrome.tabs.getCurrent((currentTab) => {
            if (currentTab) {
              chrome.tabs.remove(currentTab.id);
            }
          });
        });
      }
    });
  });

  // Auto-save functionality
  let autoSaveTimeout;
  let hasUnsavedChanges = false;

  function showAutoSaveIndicator() {
    const indicator = document.getElementById('autoSaveIndicator');
    indicator.classList.add('show');
    setTimeout(() => {
      indicator.classList.remove('show');
    }, 2000);
  }

  function showStickySaveButton() {
    const stickyBtn = document.getElementById('stickySaveBtn');
    stickyBtn.classList.add('show');
    hasUnsavedChanges = true;
  }

  function hideStickySaveButton() {
    const stickyBtn = document.getElementById('stickySaveBtn');
    stickyBtn.classList.remove('show');
    hasUnsavedChanges = false;
  }

  async function autoSave() {
    if (hasUnsavedChanges) {
      updateSettingsFromUI();
      await saveSettings();
      hideStickySaveButton();
      showAutoSaveIndicator();
    }
  }

  function scheduleAutoSave() {
    showStickySaveButton();

    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    autoSaveTimeout = setTimeout(autoSave, 2000); // Auto-save after 2 seconds of inactivity
  }

  // Add auto-save to all form elements
  const formElements = [
    'autoSync',
    'githubToken',
    'githubPublic',
    'githubDescription',
    'githubGistId',
    'confirmDelete',
    'autoClose',
  ];

  formElements.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', scheduleAutoSave);
      element.addEventListener('change', scheduleAutoSave);
    }
  });

  // Sticky save button click
  document.getElementById('stickySaveBtn').addEventListener('click', async () => {
    updateSettingsFromUI();
    await saveSettings();
    hideStickySaveButton();
    showAutoSaveIndicator();
  });

  // Warn about unsaved changes when leaving
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    }
  });
});

// Loops options page loaded
