# Loops — Chrome Extension Specification

## Overview

Loops is a Chrome extension for managing tabs better and closing "open loops" in your head. Instead of leaving tabs open as reminders, you save them into lists (Read Later or Tasks), so your browser stays clean while you still keep track of what matters.

## Core Features (v1)

### 1. Save to Lists

- **Save to Read Later**: Keyboard shortcut to save current tab to Read Later list
- **Save to Tasks**: Keyboard shortcut to save current tab to Tasks list
- **Save with Note**: Modifier key to add a note when saving (describing what the tab is about)

### 2. List Management

- **View Read Later List**: Open and edit your Read Later list
- **View Tasks List**: Open and edit your Tasks list
- **Keyboard Navigation**: Shortcuts for quickly opening these lists

### 3. Keyboard Shortcuts

Shortcuts should be positioned close to existing browser shortcuts for ease of use:

- `Ctrl+Tab` (Next tab)
- `Ctrl+Shift+Tab` (Previous tab)
- `Ctrl+W` (Close tab)
- `Ctrl+Shift+A` (Show all tabs)

## Future Features (v2)

### Sync & History

- **Cross-browser Sync**: Sync lists across browsers when logged in with the same account
- **Site Data Collection**: Save metadata on visited sites for enhanced history search

### Smart Tab Management

- **Classify All Tabs**:
  - Show and group all open tabs
  - Recommend actions (add to Read Later, add to Task, close, keep open)
  - Use heuristics initially, potentially ML later
- **Show Similar Tabs**:
  - Display all open tabs from the same domain
  - Help identify and close duplicates

## Development Approach

### Milestone 0: Minimal Viable Extension

The very first milestone is the smallest possible extension:

- Single keyboard shortcut that closes the current tab
- Nothing else
- Ensures we have working software before adding features

### Development Standards

- Pre-commit hooks from day one
- Linting configuration (ESLint)
- Testing framework setup
- Clean, maintainable code structure

## Technical Architecture

### Data Storage

- Chrome Storage API for lists and settings
- Local storage for temporary data
- Structured data format for tabs (URL, title, note, timestamp)

### User Interface

- Popup for quick actions
- Options page for settings
- List management interface

### Permissions Required

- `tabs` - Access to tab information
- `storage` - Store lists and settings
- `activeTab` - Interact with current tab
- Browser action - Add extension icon
