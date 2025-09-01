# Loops Extension - Feature Ideas & Roadmap

## 🎯 Current Focus

- [x] Core save functionality (Alt+R, Alt+T)
- [x] Save with notes (Alt+Shift+R/T)
- [x] Dashboard with search and bulk operations
- [x] Export/import functionality
- [x] Dynamic tab count badge with color coding
- [ ] **Smart tab management (in progress)**

## 💡 Feature Ideas

### ⚙️ Options Page

- **Customizable thresholds**
  - Let users set their own green/amber/red tab count limits
  - Some users might want green at 50+ tabs!
- **Keyboard shortcut customization**
  - Override default shortcuts
  - Add additional shortcuts for power users
- **Auto-archive settings**
  - Archive items older than X days
  - Move to separate archive list
- **Theme selection**
  - Dark mode
  - Custom accent colors
  - Compact vs comfortable density
- **Behavior settings**
  - Auto-close tabs after saving (toggle)
  - Show confirmation before bulk delete
  - Default list (Read Later vs Tasks)
- **Import/export settings**
  - Backup all preferences
  - Sync settings across devices

### 🧠 Smart Features

#### Tab Management & Grouping

- **Smart tab grouping**
  - Group by domain
  - Group by similarity in title
  - Highlight differences for easy scanning
- **Bulk close suggestions**
  - "You have 5 GitHub tabs - close all but current?"
  - "These 3 tabs haven't been viewed in 2 hours"
- **Auto-categorization**
  - Detect blog posts → suggest Read Later
  - Detect documentation → suggest Tasks
  - Detect social media → suggest close
- **Duplicate detection**
  - "This URL is already in Read Later"
  - "Similar tab already open in window 2"
  - Merge duplicates option

#### Content Intelligence

- **Smart suggestions based on content**
  - Blog posts → Read Later
  - Documentation/tutorials → Tasks
  - News articles → Read Later with expiry
  - Shopping → Tasks with deadline
- **Time-based hints**
  - "You've had this tab open for 3 days"
  - "This news article is from 2 weeks ago"
- **Reading time estimates**
  - Show estimated reading time for articles
  - Sort by quick reads vs long reads

### 👥 Collaboration & Sharing

- **Share lists**
  - Generate shareable link for a list
  - Export as markdown for notes/documentation
- **Team workspaces**
  - Shared task lists for teams
  - Collaborative research collections
- **Send to devices**
  - Send tab to phone/other computer
  - QR code generation

### 📊 Analytics & Insights

- **Tab habits dashboard**
  - Average tabs open over time
  - Most saved domains
  - Peak tab times
  - Success rate (saved vs just closed)
- **Productivity metrics**
  - Time saved by using Loops
  - Number of tabs managed
  - Most productive hours
- **Weekly reports**
  - "You saved 127 tabs this week"
  - "Your tab hygiene improved by 23%"

### 🎨 UI/UX Improvements

- **Mini dashboard in popup**
  - Quick stats
  - Recent saves
  - One-click actions
- **Floating action button**
  - Quick access to save without shortcuts
  - Drag & drop tabs to save
- **Tab preview on hover**
  - Show thumbnail of saved pages
  - Quick preview without opening
- **Better mobile view**
  - Responsive dashboard for different screen sizes
  - Touch-friendly controls

### 🚀 Power User Features

- **Command palette**
  - Cmd+K style quick actions
  - Fuzzy search everything
- **Bulk operations**
  - Save all tabs from specific domain
  - Close all tabs except pinned
  - Move tabs between windows
- **Advanced search**
  - Search within page content (if cached)
  - Regex support
  - Date range filters
- **Automation rules**
  - "Auto-save YouTube videos to Read Later"
  - "Close social media tabs after 10 minutes"
  - "Archive read articles after 7 days"

### 🔒 Privacy & Security

- **Privacy mode**
  - Don't save certain domains
  - Incognito tab handling
- **Data encryption**
  - Encrypt saved data locally
  - Password protection for sensitive lists
- **Audit log**
  - Track all actions for security
  - Export for compliance

### 🌐 Integration Ideas

- **Browser sync**
  - Sync across Chrome profiles
  - Firefox version
- **Third-party integrations**
  - Send to Notion/Obsidian
  - Save to Pocket/Instapaper
  - Create tasks in Todoist/Trello
- **API for developers**
  - Let other extensions integrate
  - Webhook support

## 📅 Potential Roadmap

### Phase 1: Polish (Before Chrome Store)

- [ ] Smart tab management
- [ ] Options page (basic)
- [ ] Onboarding flow
- [ ] Privacy policy

### Phase 2: Intelligence (Post-launch)

- [ ] Content detection
- [ ] Duplicate handling
- [ ] Auto-categorization
- [ ] Time-based suggestions

### Phase 3: Power Features

- [ ] Analytics dashboard
- [ ] Automation rules
- [ ] Command palette
- [ ] Advanced search

### Phase 4: Ecosystem

- [ ] Team features
- [ ] API
- [ ] Mobile app
- [ ] Cross-browser support

## 📝 User Feedback Ideas

_To be populated after launch_

## 🐛 Known Issues

_None currently_

## 💭 Random Thoughts

- Could we predict when someone is about to open too many tabs?
- What if we had a "tab budget" feature - limit yourself to X tabs?
- Integration with focus/pomodoro timers?
- Social features - share reading lists with friends?
- AI summaries of saved articles?
