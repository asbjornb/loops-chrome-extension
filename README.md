# Loops — Chrome Extension

[![CI](https://github.com/asbjornb/loops-chrome-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/asbjornb/loops-chrome-extension/actions/workflows/ci.yml)

> Close tabs, keep context.

A Chrome extension that helps you manage tabs better by saving them to Read Later or Task lists, keeping your browser clean while maintaining context of what matters.

## Key Features

- **Save tabs to lists** - Quickly save tabs to Read Later or Tasks with keyboard shortcuts
- **Add notes** - Attach context to saved tabs so you remember why they matter
- **Manage lists** - View and edit your saved tabs anytime
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

### Default Loops Shortcuts (Pre-configured)

| Shortcut      | Action                                             |
| ------------- | -------------------------------------------------- |
| `Alt+R`       | Save current tab to Read Later list (and close it) |
| `Alt+T`       | Save current tab to Tasks list (and close it)      |
| `Alt+Shift+R` | Save to Read Later with a custom note              |
| `Alt+Shift+T` | Save to Tasks with a custom note                   |

### Additional Commands (Configure Manually)

The extension popup can be opened with a custom shortcut:

1. Go to `chrome://extensions/shortcuts`
2. Find "Loops" and set a shortcut for **"Activate the extension"** (e.g., `Alt+E`)

**Notes:**

- If `Alt+Shift+T` doesn't work, it may conflict with another extension. You can reassign it in `chrome://extensions/shortcuts`
- To close tabs, just use Chrome's built-in `Ctrl+W` shortcut

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
4. **Reopen tabs**: Click any saved item to open it in a new tab
5. **Manage items**: Hover over items to delete, or use "Clear All"

## Development

See [spec.md](spec.md) for detailed specifications and development roadmap.

## License

MIT
