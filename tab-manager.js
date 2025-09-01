let allTabs = [];
let tabGroups = [];
const selectedTabs = new Set();

// DOM elements
const tabGroupsContainer = document.getElementById('tabGroups');
const bulkActions = document.getElementById('bulkActions');
const selectedCount = document.getElementById('selectedCount');

// Initialize
loadTabs();

// Load and analyze all tabs
async function loadTabs() {
  try {
    allTabs = await chrome.tabs.query({});
    await analyzeTabs();
    renderTabGroups();
    updateStats();
  } catch (error) {
    console.error('Failed to load tabs:', error);
    showError('Failed to load tabs. Please refresh the page.');
  }
}

// Analyze tabs for grouping and suggestions
async function analyzeTabs() {
  const groups = new Map();
  let duplicateCount = 0;
  let suggestedReads = 0;
  let inactiveCount = 0;

  // Track first occurrence of each URL
  const seenUrls = new Set();

  // Group tabs by domain
  for (const tab of allTabs) {
    const domain = new URL(tab.url).hostname;

    if (!groups.has(domain)) {
      groups.set(domain, {
        domain,
        tabs: [],
        favicon: null,
        suggestion: null,
        duplicates: 0,
      });
    }

    // Check for duplicates - mark as duplicate if we've seen this URL before
    const isDuplicate = seenUrls.has(tab.url);
    if (isDuplicate) {
      duplicateCount++;
    }
    seenUrls.add(tab.url);

    // Analyze tab for suggestions
    const analysis = analyzeTab(tab);

    if (analysis.suggestion === 'read-later') {
      suggestedReads++;
    }

    if (analysis.inactive) {
      inactiveCount++;
    }

    const tabData = {
      ...tab,
      isDuplicate,
      ...analysis,
    };

    // Also update the original tab in allTabs with the isDuplicate flag
    const originalTabIndex = allTabs.findIndex((t) => t.id === tab.id);
    if (originalTabIndex !== -1) {
      allTabs[originalTabIndex] = tabData;
    }

    const group = groups.get(domain);
    group.tabs.push(tabData);

    // Use first tab's favicon for the group
    if (!group.favicon && tab.favIconUrl) {
      group.favicon = tab.favIconUrl;
    }
  }

  // Determine group suggestions
  for (const group of groups.values()) {
    const readLaterCount = group.tabs.filter((t) => t.suggestion === 'read-later').length;
    const totalCount = group.tabs.length;

    if (readLaterCount >= Math.ceil(totalCount * 0.6)) {
      group.suggestion = 'read-later';
    }

    group.duplicates = group.tabs.filter((t) => t.isDuplicate).length;
  }

  // Sort groups by relevance (duplicates, suggestions, tab count)
  tabGroups = Array.from(groups.values()).sort((a, b) => {
    // Prioritize groups with suggestions or duplicates
    const aScore = (a.suggestion ? 10 : 0) + a.duplicates + a.tabs.length;
    const bScore = (b.suggestion ? 10 : 0) + b.duplicates + b.tabs.length;
    return bScore - aScore;
  });

  // Update global stats
  window.tabStats = {
    total: allTabs.length,
    duplicates: duplicateCount,
    suggested: suggestedReads,
    inactive: inactiveCount,
  };
}

// Analyze individual tab for suggestions
function analyzeTab(tab) {
  const analysis = {
    suggestion: null,
    inactive: false,
    age: Date.now() - (tab.lastAccessed || Date.now()),
    reason: '',
  };

  const url = tab.url.toLowerCase();
  const title = (tab.title || '').toLowerCase();

  // Detect blog posts and articles
  if (isBlogPost(url, title)) {
    analysis.suggestion = 'read-later';
    analysis.reason = 'Article/Blog post';
  }

  // Detect documentation
  if (isDocumentation(url, title)) {
    analysis.suggestion = 'tasks';
    analysis.reason = 'Documentation';
  }

  // Check if tab is inactive (not accessed in last 2 hours)
  if (tab.lastAccessed && Date.now() - tab.lastAccessed > 2 * 60 * 60 * 1000) {
    analysis.inactive = true;
  }

  return analysis;
}

// Detect if URL/title suggests a blog post or article
function isBlogPost(url, title) {
  const blogIndicators = [
    '/blog/',
    '/article/',
    '/post/',
    '/news/',
    'medium.com',
    'dev.to',
    'hashnode.com',
    'substack.com',
    'towards',
    'hackernoon',
    'freecodecamp',
  ];

  const titleIndicators = [
    'how to',
    'tutorial',
    'guide',
    'introduction to',
    'beginner',
    'explained',
    'deep dive',
    'complete guide',
  ];

  return (
    blogIndicators.some((indicator) => url.includes(indicator)) ||
    titleIndicators.some((indicator) => title.includes(indicator))
  );
}

// Detect documentation
function isDocumentation(url, _title) {
  const docIndicators = [
    '/docs/',
    '/documentation/',
    '/api/',
    '/reference/',
    'docs.',
    'api.',
    'developer.',
    '/man/',
    '/help/',
  ];

  return docIndicators.some((indicator) => url.includes(indicator));
}

// Render tab groups
function renderTabGroups() {
  if (tabGroups.length === 0) {
    tabGroupsContainer.innerHTML = `
      <div class="empty-state">
        <h3>No tabs to manage</h3>
        <p>You only have this tab open!</p>
      </div>
    `;
    return;
  }

  tabGroupsContainer.innerHTML = tabGroups
    .map(
      (group) => `
    <div class="domain-group">
      <div class="group-header">
        <div class="group-info">
          <input type="checkbox" class="group-checkbox" data-domain="${group.domain}">
          ${group.favicon ? `<img src="${group.favicon}" class="group-favicon">` : ''}
          <span class="group-title">${group.domain}</span>
          <span class="group-count">${group.tabs.length} tab${group.tabs.length > 1 ? 's' : ''}</span>
          ${group.suggestion ? `<span class="group-suggestion ${group.suggestion}">📚 ${group.suggestion === 'read-later' ? 'Read Later' : 'Tasks'}</span>` : ''}
          ${group.duplicates > 0 ? `<span class="group-suggestion">🔄 ${group.duplicates} duplicates</span>` : ''}
        </div>
        <div class="group-actions">
          ${group.suggestion ? `<button class="btn btn-sm btn-${group.suggestion === 'read-later' ? 'success' : 'primary'}" data-action="save-group" data-domain="${group.domain}" data-list="${group.suggestion === 'read-later' ? 'readLater' : 'tasks'}">Save All</button>` : ''}
          ${group.duplicates > 0 ? `<button class="btn btn-sm btn-warning" data-action="close-duplicates" data-domain="${group.domain}">Close Duplicates</button>` : ''}
        </div>
      </div>
      <div class="tab-list">
        ${group.tabs.map((tab) => renderTabItem(tab, group)).join('')}
      </div>
    </div>
  `
    )
    .join('');

  // Add event listeners
  addEventListeners();
}

// Render individual tab item
function renderTabItem(tab, group) {
  const age = tab.lastAccessed ? formatAge(Date.now() - tab.lastAccessed) : 'unknown';
  const titleWithHighlight = highlightDifferences(tab.title, group.tabs, tab.id);

  return `
    <div class="tab-item" data-tab-id="${tab.id}">
      <input type="checkbox" class="tab-checkbox" data-tab-id="${tab.id}">
      ${tab.favIconUrl ? `<img src="${tab.favIconUrl}" class="tab-favicon">` : ''}
      <div class="tab-content" data-action="switch-to-tab" data-tab-id="${tab.id}">
        <div class="tab-title">${titleWithHighlight}</div>
        <div class="tab-url">${tab.url}</div>
      </div>
      <div class="tab-meta">
        <span class="tab-age">${age}</span>
        ${tab.active ? '<span class="tab-status status-active">Active</span>' : ''}
        ${tab.inactive ? '<span class="tab-status status-inactive">Inactive</span>' : ''}
        ${tab.isDuplicate ? '<span class="tab-status status-duplicate">Duplicate</span>' : ''}
        ${tab.suggestion ? `<span class="tab-status status-${tab.suggestion === 'read-later' ? 'success' : 'primary'}">${tab.reason}</span>` : ''}
      </div>
    </div>
  `;
}

// Highlight differences in tab titles within the same group
function highlightDifferences(title, allTabsInGroup, _currentTabId) {
  if (!title || allTabsInGroup.length <= 1) return title;

  // Find common words across all titles in the group
  const allTitles = allTabsInGroup.map((t) => t.title || '');
  const words = title.split(' ');

  return words
    .map((word) => {
      // Count how many titles contain this word
      const occurrences = allTitles.filter(
        (t) => t && t !== title && t.toLowerCase().includes(word.toLowerCase())
      ).length;

      // If word appears in less than half of other titles, highlight it as unique
      if (occurrences < allTabsInGroup.length / 2) {
        return `<span class="highlight">${word}</span>`;
      }
      return word;
    })
    .join(' ');
}

// Format age of tab
function formatAge(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
}

// Add event listeners
function addEventListeners() {
  // Tab checkboxes
  document.querySelectorAll('.tab-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const tabId = parseInt(e.target.dataset.tabId);
      if (e.target.checked) {
        selectedTabs.add(tabId);
      } else {
        selectedTabs.delete(tabId);
      }

      // Update group checkbox state
      updateGroupCheckboxes();
      updateBulkActions();
    });
  });

  // Group checkboxes
  document.querySelectorAll('.group-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const domain = e.target.dataset.domain;
      const group = tabGroups.find((g) => g.domain === domain);

      group.tabs.forEach((tab) => {
        const tabCheckbox = document.querySelector(`.tab-checkbox[data-tab-id="${tab.id}"]`);
        if (tabCheckbox) {
          tabCheckbox.checked = e.target.checked;
          if (e.target.checked) {
            selectedTabs.add(tab.id);
          } else {
            selectedTabs.delete(tab.id);
          }
        }
      });

      updateBulkActions();
    });
  });

  // Event delegation for group action buttons and tab content
  tabGroupsContainer.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    e.preventDefault();
    e.stopPropagation();

    switch (action) {
      case 'save-group':
        const saveDomain = e.target.dataset.domain;
        const saveList = e.target.dataset.list;
        await saveGroupToList(saveDomain, saveList);
        break;

      case 'close-duplicates':
        const closeDomain = e.target.dataset.domain;
        await closeDuplicatesInGroup(closeDomain);
        break;

      case 'switch-to-tab':
        const tabId = parseInt(e.target.dataset.tabId);
        await switchToTab(tabId);
        break;

      case 'retry':
        loadTabs();
        break;
    }
  });
}

// Update group checkbox states based on their tabs
function updateGroupCheckboxes() {
  tabGroups.forEach((group) => {
    const groupCheckbox = document.querySelector(`.group-checkbox[data-domain="${group.domain}"]`);
    if (!groupCheckbox) return;

    const tabsInGroup = group.tabs.map((tab) => tab.id);
    const checkedTabsInGroup = tabsInGroup.filter((tabId) => selectedTabs.has(tabId));

    if (checkedTabsInGroup.length === 0) {
      // No tabs checked - uncheck group
      groupCheckbox.checked = false;
      groupCheckbox.indeterminate = false;
    } else if (checkedTabsInGroup.length === tabsInGroup.length) {
      // All tabs checked - check group
      groupCheckbox.checked = true;
      groupCheckbox.indeterminate = false;
    } else {
      // Some tabs checked - show indeterminate state
      groupCheckbox.checked = false;
      groupCheckbox.indeterminate = true;
    }
  });
}

// Update bulk actions visibility and count
function updateBulkActions() {
  const count = selectedTabs.size;
  selectedCount.textContent = `${count} selected`;
  bulkActions.classList.toggle('visible', count > 0);
}

// Update stats display
function updateStats() {
  if (window.tabStats) {
    document.getElementById('totalTabs').textContent = window.tabStats.total;
    document.getElementById('duplicateTabs').textContent = window.tabStats.duplicates;
    document.getElementById('suggestedReads').textContent = window.tabStats.suggested;
    document.getElementById('inactiveTabs').textContent = window.tabStats.inactive;
  }
}

// Switch to a specific tab
async function switchToTab(tabId) {
  try {
    await chrome.tabs.update(tabId, { active: true });
    const tab = await chrome.tabs.get(tabId);
    await chrome.windows.update(tab.windowId, { focused: true });
  } catch (error) {
    console.warn('Failed to switch to tab (may have been closed):', error);
    // Refresh the tab list since the tab may no longer exist
    loadTabs();
  }
}

// Save a group of tabs to a list
async function saveGroupToList(domain, listName) {
  const group = tabGroups.find((g) => g.domain === domain);
  if (!group) return;

  for (const tab of group.tabs) {
    await saveTabToStorage(tab, listName);
  }

  // Close the tabs after saving
  const tabIds = group.tabs.map((t) => t.id);
  try {
    await chrome.tabs.remove(tabIds);
  } catch (error) {
    console.warn('Some tabs could not be closed (may already be closed):', error);
  }

  // Clear selections and refresh the page
  selectedTabs.clear();
  loadTabs();
}

// Close duplicates in a specific group
async function closeDuplicatesInGroup(domain) {
  const group = tabGroups.find((g) => g.domain === domain);
  if (!group) return;

  const duplicateTabs = group.tabs.filter((t) => t.isDuplicate);
  const tabIds = duplicateTabs.map((t) => t.id);

  if (tabIds.length > 0) {
    try {
      await chrome.tabs.remove(tabIds);
    } catch (error) {
      console.warn('Some tabs could not be closed (may already be closed):', error);
    }
    selectedTabs.clear();
    loadTabs();
  }
}

// Save tab to storage (similar to background.js function)
async function saveTabToStorage(tab, listName) {
  const tabData = {
    id: Date.now() + Math.random(), // Ensure unique ID
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl,
    savedAt: new Date().toISOString(),
    note: '',
  };

  const storage = await chrome.storage.local.get([listName]);
  const list = storage[listName] || [];
  list.unshift(tabData);

  await chrome.storage.local.set({ [listName]: list });
}

// Event handlers for main action buttons
document.getElementById('saveAllSuggested').addEventListener('click', async () => {
  let savedCount = 0;

  for (const group of tabGroups) {
    if (group.suggestion) {
      await saveGroupToList(
        group.domain,
        group.suggestion === 'read-later' ? 'readLater' : 'tasks'
      );
      savedCount += group.tabs.length;
    }
  }

  if (savedCount > 0) {
    alert(`Saved ${savedCount} tabs based on suggestions!`);
    selectedTabs.clear();
    loadTabs();
  }
});

document.getElementById('closeInactive').addEventListener('click', async () => {
  const inactiveTabs = allTabs.filter(
    (tab) => tab.lastAccessed && Date.now() - tab.lastAccessed > 2 * 60 * 60 * 1000
  );

  if (inactiveTabs.length > 0 && confirm(`Close ${inactiveTabs.length} inactive tabs?`)) {
    const tabIds = inactiveTabs.map((t) => t.id);
    try {
      await chrome.tabs.remove(tabIds);
    } catch (error) {
      console.warn('Some tabs could not be closed (may already be closed):', error);
    }
    selectedTabs.clear();
    loadTabs();
  }
});

document.getElementById('closeDuplicates').addEventListener('click', async () => {
  const duplicateTabs = allTabs.filter((tab) => tab.isDuplicate);

  if (duplicateTabs.length > 0 && confirm(`Close ${duplicateTabs.length} duplicate tabs?`)) {
    const tabIds = duplicateTabs.map((t) => t.id);
    try {
      await chrome.tabs.remove(tabIds);
    } catch (error) {
      console.warn('Some tabs could not be closed (may already be closed):', error);
    }
    selectedTabs.clear();
    loadTabs();
  } else if (duplicateTabs.length === 0) {
    alert('No duplicate tabs found!');
  }
});

document.getElementById('selectAll').addEventListener('click', () => {
  document.querySelectorAll('.tab-checkbox').forEach((cb) => {
    cb.checked = true;
    selectedTabs.add(parseInt(cb.dataset.tabId));
  });
  updateBulkActions();
});

document.getElementById('deselectAll').addEventListener('click', () => {
  document.querySelectorAll('.tab-checkbox, .group-checkbox').forEach((cb) => (cb.checked = false));
  selectedTabs.clear();
  updateBulkActions();
});

document.getElementById('refresh').addEventListener('click', loadTabs);

// Bulk action handlers
document.getElementById('bulkSaveReadLater').addEventListener('click', async () => {
  await bulkSaveSelected('readLater');
});

document.getElementById('bulkSaveTasks').addEventListener('click', async () => {
  await bulkSaveSelected('tasks');
});

document.getElementById('bulkClose').addEventListener('click', async () => {
  if (selectedTabs.size > 0 && confirm(`Close ${selectedTabs.size} selected tabs?`)) {
    try {
      await chrome.tabs.remove(Array.from(selectedTabs));
    } catch (error) {
      console.warn('Some tabs could not be closed (may already be closed):', error);
    }
    selectedTabs.clear();
    loadTabs();
  }
});

document.getElementById('bulkDeselect').addEventListener('click', () => {
  document.getElementById('deselectAll').click();
});

// Bulk save selected tabs
async function bulkSaveSelected(listName) {
  const selectedTabObjects = allTabs.filter((tab) => selectedTabs.has(tab.id));

  for (const tab of selectedTabObjects) {
    await saveTabToStorage(tab, listName);
  }

  // Close saved tabs
  try {
    await chrome.tabs.remove(Array.from(selectedTabs));
  } catch (error) {
    console.warn('Some tabs could not be closed (may already be closed):', error);
  }
  selectedTabs.clear();
  loadTabs();
}

// Navigation
document.getElementById('backToDashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

// Show error message
function showError(message) {
  tabGroupsContainer.innerHTML = `
    <div class="empty-state">
      <h3>Error</h3>
      <p>${message}</p>
      <button class="btn btn-primary" data-action="retry">Try Again</button>
    </div>
  `;
}

// Functions are now handled via event delegation, no need for global assignments
