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

  // Show notification
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
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

console.warn('Loops extension loaded - Save with notes enabled');
