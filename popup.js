let currentList = 'readLater';
const { formatRelativeTime } = window.loopsUtils;

// Load and display list (limited to 5 items for popup)
async function loadList(listName) {
  const list = await chrome.storage.local.get([listName]);
  const items = list[listName] || [];

  const listContent = document.getElementById('listContent');
  const moreItems = document.getElementById('moreItems');

  const maxItems = 5;
  const displayItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  if (items.length === 0) {
    listContent.innerHTML = '<div class="empty-state">No items saved yet</div>';
    moreItems.style.display = 'none';
  } else {
    listContent.innerHTML = displayItems
      .map(
        (item) => `
      <div class="list-item" data-url="${item.url}" data-id="${item.id}">
        ${item.favIconUrl ? `<img src="${item.favIconUrl}" />` : '<div style="width:16px"></div>'}
        <div class="list-item-content">
          <div class="list-item-title">${item.title || 'Untitled'}</div>
          ${item.note ? `<div class="list-item-note">${item.note}</div>` : ''}
          <div class="list-item-time">${formatRelativeTime(item.savedAt)}</div>
        </div>
        <button class="delete-btn" data-id="${item.id}" title="Delete">×</button>
      </div>
    `
      )
      .join('');

    // Show "and X more" indicator
    if (hasMore) {
      const moreCount = items.length - maxItems;
      moreItems.textContent = `and ${moreCount} more...`;
      moreItems.style.display = 'block';
    } else {
      moreItems.style.display = 'none';
    }

    // Add click handlers to open tabs
    listContent.querySelectorAll('.list-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        // Don't open if clicking delete button
        if (e.target.classList.contains('delete-btn')) {
          return;
        }
        const url = item.dataset.url;
        chrome.tabs.create({ url });
      });
    });

    // Add delete handlers
    listContent.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        await deleteItem(listName, id);
        loadList(listName);
      });
    });
  }

  // Update counts
  updateCounts();
}

// Delete an item from a list
async function deleteItem(listName, itemId) {
  const storage = await chrome.storage.local.get([listName]);
  const items = storage[listName] || [];
  const filtered = items.filter((item) => item.id !== itemId);
  await chrome.storage.local.set({ [listName]: filtered });
}

// Clear all functionality removed - users can manage items through dashboard

// Update counts for both lists
async function updateCounts() {
  const storage = await chrome.storage.local.get(['readLater', 'tasks']);

  const readLaterCount = (storage.readLater || []).length;
  const tasksCount = (storage.tasks || []).length;

  document.getElementById('readLaterCount').textContent = readLaterCount;
  document.getElementById('tasksCount').textContent = tasksCount;

  // Clear button functionality removed for better UX
}

// Tab switching
document.querySelectorAll('.tab-button').forEach((button) => {
  button.addEventListener('click', () => {
    // Update active states
    document.querySelectorAll('.tab-button').forEach((b) => b.classList.remove('active'));
    button.classList.add('active');

    // Load the selected list
    currentList = button.dataset.list;
    loadList(currentList);
  });
});

// View All button - opens lists page
document.getElementById('viewAllBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

// Manage Tabs button - opens tab manager
document.getElementById('manageTabsBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('tab-manager.html') });
});

// Options button handler
document.getElementById('optionsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Load settings and initialize
async function initializePopup() {
  // Load settings to check if shortcuts should be shown
  try {
    const stored = await chrome.storage.local.get(['loopsSettings']);
    const settings = stored.loopsSettings || {};

    // Hide shortcuts section if setting is disabled
    if (settings.showShortcuts === false) {
      const shortcutsSection = document.querySelector('.shortcuts');
      if (shortcutsSection) {
        shortcutsSection.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }

  // Load the current list
  loadList(currentList);
}

// Initialize popup
initializePopup();
