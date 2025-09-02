# Loops — Chrome Extension

[![CI](https://github.com/asbjornb/loops-chrome-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/asbjornb/loops-chrome-extension/actions/workflows/ci.yml)

> Close tabs, keep context.

A Chrome extension that helps you manage tabs better by saving them to Read Later or Task lists, keeping your browser clean while maintaining context of what matters.

## Key Features

- **Save tabs to lists** - Quickly save tabs to Read Later or Tasks with keyboard shortcuts
- **Add notes** - Attach context to saved tabs so you remember why they matter
- **Smart tab management** - Group similar tabs, detect duplicates, suggest organization
- **Cross-device sync** - Sync recent items across your Chrome browsers (limited)
- **Export/Import** - Full backup and restore capabilities
- **Stay focused** - Keep only essential tabs open without losing important links

## Keyboard Shortcuts

Loops extends Chrome's built-in tab management shortcuts with smart saving capabilities.

### Chrome + Loops Shortcuts Cheat Sheet

| Chrome Built-in                 | Loops Extension                              |
| ------------------------------- | -------------------------------------------- |
| `Ctrl+W` - Close tab            | `Alt+R` - Save to Read Later & close         |
| `Ctrl+Tab` - Next tab           | `Alt+T` - Save to Tasks & close              |
| `Ctrl+Shift+Tab` - Previous tab | `Alt+Shift+R` - Save to Read Later with note |
| `Ctrl+Shift+A` - Search tabs    | `Alt+Shift+T` - Save to Tasks with note      |

### Default Loops Shortcuts

| Shortcut      | Action                                             | Status            |
| ------------- | -------------------------------------------------- | ----------------- |
| `Alt+R`       | Save current tab to Read Later list (and close it) | ✅ Auto-works     |
| `Alt+T`       | Save current tab to Tasks list (and close it)      | ✅ Auto-works     |
| `Alt+Shift+R` | Save to Read Later with a custom note              | ⚠️ Manual setup\* |
| `Alt+Shift+T` | Save to Tasks with a custom note                   | ⚠️ Manual setup\* |

**\* Alt+Shift shortcuts need manual configuration:**

1. Go to `chrome://extensions/shortcuts`
2. Find "Loops - Close tabs, keep context"
3. Set shortcuts for "Save to Read Later with note" and "Save to Tasks with note"
4. Chrome blocks Alt+Shift by default due to OS conflicts (e.g., language switching)

### Additional Commands (Configure Manually)

The extension popup can be opened with a custom shortcut:

1. In `chrome://extensions/shortcuts`, find "Loops"
2. Set a shortcut for **"Activate the extension"** (e.g., `Alt+E` or `Ctrl+Shift+L`)

## Getting Started

### Installation

#### From Source (Development)

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project directory

### Usage

1. **Save tabs quickly**: Use `Alt+R` or `Alt+T` to save and close tabs
2. **Add context**: Use `Alt+Shift+R` or `Alt+Shift+T` to add notes
3. **View saved tabs**: Click the Loops icon in your toolbar
4. **Manage tabs**: Use "🗂️ Manage Tabs" for bulk operations and smart suggestions
5. **Reopen tabs**: Click any saved item to open it in a new tab
6. **Sync across devices**: Your recent items automatically sync across Chrome browsers
7. **Manage items**: Hover over items to delete, or use "Clear All"

## Cross-Device Sync

Loops provides **limited automatic sync** of your recent items across Chrome browsers using Chrome's built-in sync.

### How It Works

- **Automatic**: No setup required - sync happens in the background
- **Recent items only**: Syncs your last ~50 items per list to fit Chrome's storage limits
- **Best effort**: Items may be lost if you have many devices or save items frequently
- **Manual trigger**: Click the sync status in the dashboard to force sync

### Limitations

- **Chrome only**: Only works within Chrome browser ecosystem
- **Storage limit**: Chrome sync has a ~100KB total limit for extensions
- **Not comprehensive**: Older items may be lost when storage fills up
- **No conflict resolution**: If the same URL is saved on multiple devices, newest wins

### Recommended for Full Backup

For complete data safety and unlimited storage, use the **Export/Import** feature:

1. Click "Export" in the dashboard to download all your data
2. Store the JSON file in your cloud storage (Google Drive, Dropbox, etc.)
3. Use "Import" to restore on other devices or after data loss

### Future Sync Options

We're planning to add optional integrations with:

- **Google Drive** - Store your data in your personal Google Drive
- **GitHub Gists** - Version-controlled storage with public/private options
- **Dropbox** - Alternative cloud storage integration

Until then, Chrome sync + manual export is the recommended approach.

## Development

See [spec.md](spec.md) for detailed specifications and development roadmap.

## License

MIT
