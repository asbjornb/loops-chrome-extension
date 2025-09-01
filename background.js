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
async function saveTabToList(listName) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab) return;

  const tabData = {
    id: Date.now(),
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl,
    savedAt: new Date().toISOString(),
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

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'close-tab':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.remove(tabs[0].id);
        }
      });
      break;

    case 'save-read-later':
      await saveTabToList('readLater');
      break;

    case 'save-task':
      await saveTabToList('tasks');
      break;
  }
});

console.warn('Loops extension loaded - Save to Read Later & Tasks enabled');
