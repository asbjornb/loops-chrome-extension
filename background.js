// Milestone 0: Minimal viable extension - just close tab with shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'close-tab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.remove(tabs[0].id);
      }
    });
  }
});

console.warn('Loops extension loaded - Milestone 0');
