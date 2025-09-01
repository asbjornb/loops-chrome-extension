let currentList = 'readLater';

// Load and display list
async function loadList(listName) {
  const list = await chrome.storage.local.get([listName]);
  const items = list[listName] || [];

  const listContent = document.getElementById('listContent');

  if (items.length === 0) {
    listContent.innerHTML = '<div class="empty-state">No items saved yet</div>';
  } else {
    listContent.innerHTML = items
      .map(
        (item) => `
      <div class="list-item" data-url="${item.url}">
        ${item.favIconUrl ? `<img src="${item.favIconUrl}" />` : '<div style="width:16px"></div>'}
        <div class="list-item-content">
          <div class="list-item-title">${item.title || 'Untitled'}</div>
          <div class="list-item-time">${formatTime(item.savedAt)}</div>
        </div>
      </div>
    `
      )
      .join('');

    // Add click handlers to open tabs
    listContent.querySelectorAll('.list-item').forEach((item) => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        chrome.tabs.create({ url });
      });
    });
  }

  // Update counts
  updateCounts();
}

// Format time helper
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Update counts for both lists
async function updateCounts() {
  const storage = await chrome.storage.local.get(['readLater', 'tasks']);

  const readLaterCount = (storage.readLater || []).length;
  const tasksCount = (storage.tasks || []).length;

  document.getElementById('readLaterCount').textContent = readLaterCount;
  document.getElementById('tasksCount').textContent = tasksCount;
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

// Initial load
loadList(currentList);
