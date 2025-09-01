// Storage helper functions
async function getStorageData(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] || []);
    });
  });
}

async function saveToStorage(key, data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: data }, resolve);
  });
}

// Save tab to a list
async function saveTabToList(listName, note = '') {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab) return;

  const tabData = {
    id: Date.now(),
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl,
    savedAt: new Date().toISOString(),
    note: note,
  };

  const list = await getStorageData(listName);
  list.unshift(tabData); // Add to beginning of list
  await saveToStorage(listName, list);

  // Show save success notification briefly
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
  setTimeout(() => {
    // Restore the count badge
    updateBadge();
  }, 1500);

  // Close the tab after saving
  chrome.tabs.remove(tab.id);
}

// Show note dialog in content script
async function showNoteDialog(listName) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab) return;

  // Inject the content script if needed
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['note-dialog.js'],
    });

    // Send message to show dialog
    chrome.tabs.sendMessage(tab.id, {
      action: 'showNoteDialog',
      listName: listName,
    });
  } catch (error) {
    // If injection fails (e.g., on chrome:// pages), save without note
    console.warn('Could not inject note dialog:', error);
    await saveTabToList(listName);
  }
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'save-read-later':
      await saveTabToList('readLater');
      break;

    case 'save-task':
      await saveTabToList('tasks');
      break;

    case 'save-read-later-note':
      await showNoteDialog('readLater');
      break;

    case 'save-task-note':
      await showNoteDialog('tasks');
      break;
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (request.action === 'saveWithNote') {
    saveTabToList(request.listName, request.note);
  }
});

// Update badge with current open tab count
async function updateBadge() {
  try {
    const tabs = await chrome.tabs.query({});
    const tabCount = tabs.length;

    if (tabCount > 1) {
      // Don't show badge for just 1 tab
      chrome.action.setBadgeText({
        text: tabCount > 99 ? '99+' : tabCount.toString(),
      });

      // Color coding based on tab count (adjusted for tab hoarders)
      if (tabCount < 25) {
        chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green - reasonable
      } else if (tabCount < 50) {
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // Amber - getting heavy
      } else {
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // Red - seriously, clean up!
      }
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Failed to update badge:', error);
  }
}

// Update badge when extension starts
updateBadge();

// Update badge when tabs change
chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);
chrome.tabs.onUpdated.addListener(updateBadge);

console.warn('Loops extension loaded - Save with notes enabled');

// Load sync module
try {
  importScripts('sync.js');
  console.log('Sync module loaded in service worker');

  // Verify sync is available
  if (typeof self.loopsSync !== 'undefined') {
    console.log('Sync functions available:', Object.keys(self.loopsSync));
  } else {
    console.warn('Sync module loaded but loopsSync not available');
  }
} catch (error) {
  console.error('Failed to load sync module:', error.message);
  console.error('Sync functionality will be disabled');
}
