// Create and show note dialog
function showNoteDialog(listName) {
  // Remove any existing dialog
  const existingDialog = document.getElementById('loops-note-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }

  // Create dialog HTML
  const dialog = document.createElement('div');
  dialog.id = 'loops-note-dialog';
  dialog.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      padding: 24px;
      width: 400px;
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #111;">
        Add a note for this ${listName === 'readLater' ? 'Read Later' : 'Task'}
      </h3>
      <textarea 
        id="loops-note-input"
        placeholder="What's this tab about? Why save it?"
        style="
          width: 100%;
          height: 80px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          resize: none;
          box-sizing: border-box;
          font-family: inherit;
        "
      ></textarea>
      <div style="display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end;">
        <button id="loops-cancel" style="
          padding: 8px 16px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        ">Cancel</button>
        <button id="loops-save" style="
          padding: 8px 16px;
          border: none;
          background: linear-gradient(135deg, #4F46E5, #7C3AED);
          color: white;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        ">Save</button>
      </div>
    </div>
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999998;
    "></div>
  `;

  document.body.appendChild(dialog);

  // Focus the textarea
  const textarea = document.getElementById('loops-note-input');
  textarea.focus();

  // Handle save
  document.getElementById('loops-save').addEventListener('click', () => {
    const note = textarea.value.trim();
    chrome.runtime.sendMessage({
      action: 'saveWithNote',
      listName: listName,
      note: note,
    });
    dialog.remove();
  });

  // Handle cancel
  document.getElementById('loops-cancel').addEventListener('click', () => {
    dialog.remove();
  });

  // Handle escape key
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dialog.remove();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      document.getElementById('loops-save').click();
    }
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (request.action === 'showNoteDialog') {
    showNoteDialog(request.listName);
  }
});
